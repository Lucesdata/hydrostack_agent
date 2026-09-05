/**
 * Recarga del historial sancionatorio (SDD módulo 3, Fase 3).
 *
 * Son 2.262 filas entre las dos fuentes: se recargan **enteras** cada semana en
 * vez de incrementalmente. Un incremental aquí sería complejidad sin beneficio —
 * y peor: ninguna de las dos fuentes publica un watermark fiable, así que un
 * incremental mal hecho perdería correcciones en silencio.
 *
 * Tras escribir se resuelven las dos vías de cruce con un UPDATE por join:
 *   - `proveedor_id` por `nit_canonico` (vía A, SECOP I).
 *   - `proceso_id`   por `portafolio_id` (vía B, SECOP II).
 * Se hacen en SQL y no fila a fila porque son dos joins sobre índices ya
 * existentes; traerlo a memoria sería más lento y más código.
 */

import { sql } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { alSanciones } from "@/src/lib/db/schema/aqualicita";
import { sodaFetchPage } from "@/src/lib/ingest/sodaFetch";
import { mapearSancionSecopI, mapearSancionSecopII, type FilaSancion } from "./mapear";

/** Datasets verificados en la V-F-2 (2026-09-05). */
export const DATASET_SECOP_I = "4n4q-k399";
export const DATASET_SECOP_II = "it5q-hg94";

/** Holgado: las fuentes tienen 1.714 y 548 filas. Si crecen, el guard avisa. */
const LIMITE = 20_000;

export interface ResumenSanciones {
  secopI: number;
  secopII: number;
  proveedoresResueltos: number;
  procesosResueltos: number;
}

async function descargar(
  dataset: string,
  orden: string,
  mapear: (row: Record<string, unknown>) => FilaSancion | null
): Promise<FilaSancion[]> {
  const page = await sodaFetchPage(dataset, { $order: orden, $limit: LIMITE });
  if (page.length >= LIMITE) {
    throw new Error(
      `${dataset} devolvió ${page.length} filas, el tope. La fuente creció: hay que paginar.`
    );
  }
  const filas: FilaSancion[] = [];
  const vistas = new Set<string>();
  for (const row of page) {
    const f = mapear(row);
    if (!f) continue;
    // La fuente puede traer el mismo registro repetido; un upsert con la misma
    // llave dos veces en un solo INSERT revienta ("affect row a second time").
    if (vistas.has(f.registroKey)) continue;
    vistas.add(f.registroKey);
    filas.push(f);
  }
  return filas;
}

async function upsert(filas: FilaSancion[]): Promise<number> {
  if (filas.length === 0) return 0;
  await db
    .insert(alSanciones)
    .values(filas)
    .onConflictDoUpdate({
      target: [alSanciones.fuente, alSanciones.registroKey],
      set: {
        valorSancion: sql`excluded.valor_sancion`,
        tipo: sql`excluded.tipo`,
        fechaFirmeza: sql`excluded.fecha_firmeza`,
        proveedorNombre: sql`excluded.proveedor_nombre`,
        nitCanonico: sql`excluded.nit_canonico`,
        payload: sql`excluded.payload`,
        ingestedAt: new Date(),
      },
    });
  return filas.length;
}

export async function recargarSanciones(): Promise<ResumenSanciones> {
  const [i, ii] = await Promise.all([
    descargar(DATASET_SECOP_I, "numero_de_resolucion", mapearSancionSecopI),
    descargar(DATASET_SECOP_II, "id_proceso", mapearSancionSecopII),
  ]);

  const secopI = await upsert(i);
  const secopII = await upsert(ii);

  // Una recarga puede invalidar un NIT que antes se aceptaba (fila malformada,
  // documento comodín). El UPDATE de abajo solo asigna, nunca limpia, así que
  // el vínculo viejo sobreviviría a la corrección: hay que soltarlo primero.
  await db.execute(sql`
    UPDATE al_sanciones SET proveedor_id = NULL
     WHERE nit_canonico IS NULL AND proveedor_id IS NOT NULL
  `);

  // Vía A — por proveedor (SECOP I).
  const a = await db.execute(sql`
    UPDATE al_sanciones s
       SET proveedor_id = p.id
      FROM proveedor p
     WHERE p.nit_canonico = s.nit_canonico
       AND s.nit_canonico IS NOT NULL
       AND s.proveedor_id IS DISTINCT FROM p.id
  `);

  // Vía B — por proceso (SECOP II).
  const b = await db.execute(sql`
    UPDATE al_sanciones s
       SET proceso_id = pr.id
      FROM proceso pr
     WHERE pr.portafolio_id = s.portafolio_id
       AND s.portafolio_id IS NOT NULL
       AND s.proceso_id IS DISTINCT FROM pr.id
  `);

  return {
    secopI,
    secopII,
    proveedoresResueltos: a.rowCount ?? 0,
    procesosResueltos: b.rowCount ?? 0,
  };
}
