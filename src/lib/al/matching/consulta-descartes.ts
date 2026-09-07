/**
 * Consulta de la auditoría de descartes (SDD §6.2).
 *
 * Existe porque un fallo en la curación de UNSPSC o de sinónimos **no produce
 * falsos positivos: produce silencio**. La licitación simplemente no aparece y
 * nadie se entera. Estas dos consultas son el único mecanismo que hace ese
 * silencio visible: el agregado dice cuánto se descarta y por qué, y la muestra
 * aleatoria es la que de verdad detecta una curación pobre — leyendo a ojo 25
 * objetos que el motor tiró.
 */

import { sql } from "drizzle-orm";
import { db } from "@/src/lib/db/client";

export interface MotivoAgregado {
  [k: string]: unknown;
  capa: string;
  motivo: string;
  n: number;
  desde: string | null;
}

export interface DescarteMuestra {
  [k: string]: unknown;
  secopProcesoId: string;
  objetoResumen: string | null;
  unspscObservado: string | null;
  valorEstimado: string | null;
  motivo: string;
  capa: string;
  filtroNombre: string | null;
  redVersion: string;
}

/** Cuánto se descarta y por qué, en los últimos `dias`. */
export async function descartesPorMotivo(
  accountId: string,
  dias = 7
): Promise<MotivoAgregado[]> {
  const res = await db.execute<MotivoAgregado>(sql`
    SELECT capa,
           motivo,
           count(*)::int   AS n,
           min(creado_en)::text AS desde
      FROM al_descartes
     WHERE creado_en > now() - (${dias} || ' days')::interval
       AND (capa = 'ingesta' OR account_id = ${accountId})
     GROUP BY capa, motivo
     ORDER BY count(*) DESC
  `);
  return res.rows;
}

/**
 * Muestra ALEATORIA, no las primeras N. Las primeras siempre serían las mismas
 * y se dejarían de leer; el muestreo es lo que hace que revisar esto sirva.
 */
export async function muestraDeDescartes(
  accountId: string,
  params: { motivo?: string | null; limit?: number } = {}
): Promise<DescarteMuestra[]> {
  const limit = Math.min(params.limit ?? 25, 100);
  const motivo = params.motivo?.trim() || null;

  const res = await db.execute<DescarteMuestra>(sql`
    SELECT d.secop_proceso_id  AS "secopProcesoId",
           d.objeto_resumen    AS "objetoResumen",
           d.unspsc_observado  AS "unspscObservado",
           d.valor_estimado::text AS "valorEstimado",
           d.motivo,
           d.capa,
           f.nombre            AS "filtroNombre",
           d.red_version       AS "redVersion"
      FROM al_descartes d
      LEFT JOIN al_filtros_usuario f ON f.id = d.filtro_id
     WHERE (d.capa = 'ingesta' OR d.account_id = ${accountId})
       ${motivo ? sql`AND d.motivo = ${motivo}` : sql``}
     ORDER BY random()
     LIMIT ${limit}
  `);
  return res.rows;
}
