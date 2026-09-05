/**
 * Novedades del día para una cuenta (SDD §7.1, Fase 6).
 *
 * Agrega en una sola consulta por tipo lo que le pasó a los procesos que la
 * cuenta ya sigue (`coincidencia`), más lo que entró nuevo por sus filtros.
 *
 * El orden del correo lo fija el SDD y no es estético: **adendas primero**,
 * porque un cambio en un pliego que ya estás evaluando es más urgente que una
 * licitación nueva; después adjudicaciones, y al final aperturas.
 */

import { sql } from "drizzle-orm";
import { db } from "@/src/lib/db/client";

/** `db.execute` exige firma de índice — mismo motivo que en `sanciones/consulta.ts`. */
export interface NovedadEvento {
  [k: string]: unknown;
  secopProcesoId: string;
  titulo: string | null;
  entidad: string | null;
  url: string | null;
  valorEstimado: string | null;
  delta: Array<{ campo: string; etiqueta: string; antes: string | null; despues: string | null }> | null;
  estadoNuevo: string | null;
  valorNuevo: string | null;
}

export interface NovedadApertura {
  [k: string]: unknown;
  secopProcesoId: string;
  titulo: string | null;
  entidad: string | null;
  url: string | null;
  valorEstimado: string | null;
  filtroNombre: string | null;
}

export interface Novedades {
  adendas: NovedadEvento[];
  adjudicaciones: NovedadEvento[];
  aperturas: NovedadApertura[];
  total: number;
}

/** Campos de display que solo viven en el payload crudo. */
const DISPLAY = sql`
  (r.payload->>'nombre_del_procedimiento')      AS titulo,
  (r.payload->>'entidad')                       AS entidad,
  (r.payload->'urlproceso'->>'url')             AS url,
  p.valor_estimado::text                        AS valor_estimado
`;

async function eventosDe(
  accountId: string,
  tipo: "adenda" | "adjudicacion",
  desde: Date
): Promise<NovedadEvento[]> {
  const res = await db.execute<NovedadEvento>(sql`
    SELECT DISTINCT ON (e.secop_proceso_id)
           e.secop_proceso_id AS "secopProcesoId",
           ${DISPLAY},
           e.delta,
           e.estado_nuevo AS "estadoNuevo",
           e.valor_nuevo::text AS "valorNuevo"
      FROM al_proceso_evento e
      JOIN coincidencia c
        ON c.proceso_id = e.secop_proceso_id
       AND COALESCE(c.account_id, c.usuario_id) = ${accountId}
      JOIN proceso p ON p.secop_proceso_id = e.secop_proceso_id
      LEFT JOIN raw_record r ON r.id = p.raw_record_id_actual
     WHERE e.tipo_evento = ${tipo}
       AND e.detected_at >= ${desde}
     ORDER BY e.secop_proceso_id, e.detected_at DESC
  `);
  return res.rows;
}

/**
 * Aperturas = coincidencias que nacieron hoy de un filtro explícito. Las que
 * vienen del perfil de oferente las sigue reportando el digest de siempre; aquí
 * solo entra lo que el usuario declaró querer ver.
 */
async function aperturasDe(accountId: string, desde: Date): Promise<NovedadApertura[]> {
  const res = await db.execute<NovedadApertura>(sql`
    SELECT c.proceso_id AS "secopProcesoId",
           ${DISPLAY},
           f.nombre AS "filtroNombre"
      FROM coincidencia c
      JOIN al_filtros_usuario f ON f.id = c.filtro_id
      JOIN proceso p ON p.secop_proceso_id = c.proceso_id
      LEFT JOIN raw_record r ON r.id = p.raw_record_id_actual
     WHERE COALESCE(c.account_id, c.usuario_id) = ${accountId}
       AND c.filtro_id IS NOT NULL
       AND c.creado_en >= ${desde}
     ORDER BY p.valor_estimado DESC NULLS LAST
  `);
  return res.rows;
}

export async function recopilarNovedades(
  accountId: string,
  desde: Date = inicioDeHoy()
): Promise<Novedades> {
  const [adendas, adjudicaciones, aperturas] = await Promise.all([
    eventosDe(accountId, "adenda", desde),
    eventosDe(accountId, "adjudicacion", desde),
    aperturasDe(accountId, desde),
  ]);

  return {
    adendas,
    adjudicaciones,
    aperturas,
    total: adendas.length + adjudicaciones.length + aperturas.length,
  };
}

export function inicioDeHoy(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
