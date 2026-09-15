/**
 * Backfill / recomputo de `proceso.tipo_proyecto` (taxonomía de cinco).
 *
 * El valor es DERIVADO: sale de `clasificarTipoProyecto()` sobre el objeto, la
 * descripción y el nombre de la entidad. Este script es la forma de regenerarlo,
 * y hace falta cada vez que suba `CLASIFICADOR_TIPO_VERSION`.
 *
 * ── Por qué por lotes y con VACUUM ──────────────────────────────────────────
 * Un `UPDATE` de las 90.622 filas de una sentada reescribe cada fila: Postgres
 * no actualiza en sitio, crea una versión nueva y deja la vieja muerta. Con 138
 * MB de datos en `proceso`, eso puede añadir otros 138 MB antes de que pase el
 * autovacuum. La base vive en el plan Free de Supabase y el 2026-09-15 medía 504
 * MB contra un techo de 500 — un backfill de golpe la tumba, y con ella la
 * ingesta diaria.
 *
 * Por eso: lotes de 2.000 y un VACUUM cada 5. El VACUUM no devuelve espacio al
 * disco, pero marca las tuplas muertas como reutilizables DENTRO del archivo, y
 * eso es justo lo que se necesita: el lote siguiente reescribe encima en vez de
 * hacer crecer la tabla. El crecimiento queda acotado a un lote, no al total.
 *
 * Además vigila el tamaño de la base y se PARA si crece más de lo tolerable, en
 * vez de descubrirlo cuando ya no se puede escribir.
 *
 * Uso:
 *   npx tsx scripts/backfill-tipo-proyecto.ts --dry-run   # no escribe nada
 *   npx tsx scripts/backfill-tipo-proyecto.ts             # solo filas sin tipo
 *   npx tsx scripts/backfill-tipo-proyecto.ts --todas     # recomputa todo
 */

import { config } from "dotenv";
import pg from "pg";
import {
  CLASIFICADOR_TIPO_VERSION,
  TIPOS_PROYECTO,
  clasificarTipoProyecto,
  type TipoProyecto,
} from "../src/lib/classify/tipo-proyecto";

config({ path: ".env.local" });

const LOTE = 2000;
const VACUUM_CADA = 5;
/** Margen de crecimiento tolerado antes de abortar, en MB. */
const CRECIMIENTO_MAX_MB = 60;

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const todas = args.has("--todas");

type Fila = {
  id: string;
  objeto: string | null;
  descripcion: string | null;
  unspsc: string | null;
  entidad_nombre: string | null;
};

async function tamanoMb(c: pg.Client): Promise<number> {
  const r = await c.query<{ mb: string }>(
    `select round(pg_database_size(current_database())/1024.0/1024.0, 1)::text as mb`
  );
  return Number(r.rows[0].mb);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL");

  const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const inicial = await tamanoMb(c);
  console.log(`Base al empezar: ${inicial} MB`);
  console.log(`Versión del clasificador: ${CLASIFICADOR_TIPO_VERSION}`);
  console.log(dryRun ? "MODO SIMULACRO — no se escribe nada\n" : "");

  // `--todas` recomputa; por defecto solo las que no tienen tipo o lo tienen de
  // una versión anterior, para que re-ejecutarlo sea barato e idempotente.
  const filtro = todas
    ? "p.deleted_at is null"
    : `p.deleted_at is null and (p.tipo_proyecto is null or p.tipo_proyecto_version is distinct from '${CLASIFICADOR_TIPO_VERSION}')`;

  const { rows: pendientes } = await c.query<{ n: string }>(
    `select count(*)::text as n from proceso p where ${filtro}`
  );
  const total = Number(pendientes[0].n);
  console.log(`Filas a clasificar: ${total.toLocaleString("es-CO")}\n`);
  if (total === 0) {
    console.log("Nada que hacer.");
    await c.end();
    return;
  }

  const conteo = new Map<TipoProyecto, number>(TIPOS_PROYECTO.map((t) => [t, 0]));
  let procesadas = 0;
  let lote = 0;
  // Paginación por keyset sobre el id: estable aunque el UPDATE cambie filas.
  let ultimoId = "00000000-0000-0000-0000-000000000000";

  for (;;) {
    const { rows } = await c.query<Fila>(
      `select p.id, p.objeto, p.descripcion, p.unspsc, e.nombre as entidad_nombre
       from proceso p left join entidad e on e.id = p.entidad_id
       where ${filtro} and p.id > $1
       order by p.id limit $2`,
      [ultimoId, LOTE]
    );
    if (rows.length === 0) break;
    ultimoId = rows[rows.length - 1].id;

    const ids: string[] = [];
    const tipos: string[] = [];
    const confianzas: string[] = [];
    const segundos: (string | null)[] = [];
    const versiones: string[] = [];

    for (const f of rows) {
      const r = clasificarTipoProyecto({
        objeto: f.objeto,
        descripcion: f.descripcion,
        unspsc: f.unspsc,
        entidadNombre: f.entidad_nombre,
      });
      ids.push(f.id);
      tipos.push(r.tipo);
      confianzas.push(r.confianza);
      segundos.push(r.segundo);
      versiones.push(r.version);
      conteo.set(r.tipo, (conteo.get(r.tipo) ?? 0) + 1);
    }

    if (!dryRun) {
      // `updated_at` NO se toca: esto deriva un campo nuestro, no refleja un
      // cambio en la fuente. Bumpearlo haría creer que el SECOP publicó algo.
      await c.query(
        `update proceso p
         set tipo_proyecto = d.tipo,
             tipo_proyecto_confianza = d.confianza,
             tipo_proyecto_segundo = d.segundo,
             tipo_proyecto_version = d.version
         from (select * from unnest($1::uuid[], $2::text[], $3::text[], $4::text[], $5::text[])
               as t(id, tipo, confianza, segundo, version)) d
         where p.id = d.id`,
        [ids, tipos, confianzas, segundos, versiones]
      );
    }

    procesadas += rows.length;
    lote++;

    if (!dryRun && lote % VACUUM_CADA === 0) {
      await c.query("vacuum proceso");
      const ahora = await tamanoMb(c);
      const crecimiento = Math.round((ahora - inicial) * 10) / 10;
      console.log(
        `  ${procesadas.toLocaleString("es-CO")} / ${total.toLocaleString("es-CO")} — base ${ahora} MB (${crecimiento >= 0 ? "+" : ""}${crecimiento})`
      );
      if (crecimiento > CRECIMIENTO_MAX_MB) {
        console.error(
          `\nABORTADO: la base creció ${crecimiento} MB, por encima del margen de ${CRECIMIENTO_MAX_MB}.\n` +
            `Las filas ya escritas quedan válidas — el script es idempotente, se puede reanudar tras liberar espacio.`
        );
        await c.end();
        process.exit(1);
      }
    }
  }

  if (!dryRun) await c.query("vacuum analyze proceso");
  const final = await tamanoMb(c);

  console.log(`\n=== Reparto ===`);
  for (const t of TIPOS_PROYECTO) {
    const n = conteo.get(t) ?? 0;
    console.log(
      `  ${t.padEnd(15)} ${n.toLocaleString("es-CO").padStart(7)}  ${((n / procesadas) * 100).toFixed(1)}%`
    );
  }
  console.log(`\nFilas: ${procesadas.toLocaleString("es-CO")}`);
  console.log(
    `Base: ${inicial} MB → ${final} MB (${final - inicial >= 0 ? "+" : ""}${Math.round((final - inicial) * 10) / 10})`
  );

  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
