/**
 * Relleno retroactivo de descripcion, url y unspsc en `proceso`.
 *
 * SOLO estos tres: son los que sostienen el buscador, y juntos caben en el
 * margen disponible (~30 MB de los 45 MB que deja soltar índices). El resto de
 * columnas las puebla la re-ingesta de la Tarea 12.
 *
 * Por lotes con VACUUM entre medias: cada UPDATE deja tuplas muertas, y sin
 * vacuum intermedio la tabla crece el doble de lo necesario — con solo ~26 MB
 * de margen en la base, ese doble no cabe.
 *
 * Umbral de aborto en 492 MB: por encima de eso el log avisa y el propio
 * script se detiene solo (no hace falta que el operador vigile con un
 * segundo cliente y corte con Ctrl-C a tiempo). El relleno es una
 * optimización de la experiencia del buscador, no un requisito del corte de
 * la Tarea 11 — abortar aquí nunca deja nada a medio escribir: cada vuelta
 * es su propia transacción implícita (una sentencia SQL) seguida de un
 * VACUUM, así que interrumpir entre vueltas no corrompe nada.
 *
 * Pre-requisito manual (brief Paso 1, fuera de este script — el operador lo
 * corre a mano contra la base, este archivo no ejecuta DDL de índices):
 * soltar los 5 índices recreables para abrir margen antes del relleno. Se
 * recrean en la Tarea 11 (`scripts/corte-raw-record.ts`), y como ese script
 * puede correr aunque este se haya saltado o interrumpido antes de llegar
 * aquí, el DROP también debe ser idempotente:
 *
 *   drop index if exists contrato_proveedor_idx;   -- 1384 kB, 0 escaneos
 *   drop index if exists contrato_entidad_idx;     -- 672 kB, 0 escaneos
 *   drop index if exists contrato_estado_idx;      -- 528 kB, 3 escaneos
 *   drop index if exists proceso_portafolio_idx;   -- 6656 kB, recreable
 *   drop index if exists proceso_doc_access_idx;   -- 1200 kB, recreable
 *
 *   npx tsx scripts/rellenar-columnas.ts
 */
import { sql } from "drizzle-orm";
import { db, pool } from "@/src/lib/db/client";

const LOTE = 2000;

// Techo de seguridad: la cuota del plan es 500 MB y a los 492 MB solo quedan
// 8 MB de margen — bajo eso, más vueltas de este script son las que
// menos falta hacen (Paso 4 del brief: la Tarea 11 no depende de este script).
const LIMITE_MB = 492;

async function tamanoBaseMb(): Promise<{ texto: string; mb: number }> {
  const [{ size, bytes }] = (await db.execute(
    sql`select pg_size_pretty(pg_database_size(current_database())) as size,
               pg_database_size(current_database()) as bytes`
  )) as unknown as { size: string; bytes: string }[];
  return { texto: size, mb: Number(bytes) / (1024 * 1024) };
}

async function main() {
  for (let vuelta = 1; ; vuelta++) {
    const res = await db.execute(sql`
      with pendientes as (
        select p.id,
               r.payload->>'descripci_n_del_procedimiento' as descripcion,
               r.payload->'urlproceso'->>'url'             as url,
               r.payload->>'codigo_principal_de_categoria' as unspsc
        from proceso p
        join raw_record r on r.id = p.raw_record_id_actual
        where p.descripcion is null and p.url is null and p.unspsc is null
          and r.payload is not null
        limit ${LOTE}
      )
      update proceso p
         set descripcion = pe.descripcion, url = pe.url, unspsc = pe.unspsc
        from pendientes pe
       where p.id = pe.id
      returning p.id
    `);

    const n = res.rowCount ?? 0;
    if (n === 0) break;

    await db.execute(sql`vacuum proceso`);
    const { texto, mb } = await tamanoBaseMb();
    console.log(`vuelta ${vuelta}: ${n} filas — base ${texto}`);

    if (mb > LIMITE_MB) {
      console.error(
        `abortando: base en ${texto} supera el límite de ${LIMITE_MB} MB. ` +
          `El relleno es opcional (brief Tarea 10, Paso 3) — seguir a la Tarea 11.`
      );
      process.exitCode = 1;
      return;
    }
  }

  console.log("relleno terminado");
}

try {
  await main();
} catch (err) {
  process.stderr.write(
    `\nrelleno fallido: ${err instanceof Error ? err.message : String(err)}\n`
  );
  process.exitCode = 1;
} finally {
  // Sin esto el pool (`keepAlive: true`) deja el event loop vivo y el
  // script nunca termina — igual que en export-raw-archive.ts.
  await pool.end();
}
