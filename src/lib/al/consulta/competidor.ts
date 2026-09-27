/**
 * Un rival visto desde una ficha: su historial en procesos **comparables** al
 * de la ficha (mismo tipo de proyecto, mismo departamento), no su perfil global.
 *
 * Es lo que queda del módulo 2 del SDD tras mudarlo a la ficha (plan «la ficha
 * como centro», PR 3, 2026-09-27). Antes vivía en /competidores/[key], una
 * página por empresa con todo su histórico; la pregunta de quien está en una
 * ficha es más estrecha — «¿cómo le va a este en obras como esta, aquí?» — y
 * la respuesta también.
 *
 * "Comparable" es exactamente el criterio de `competidoresComparables()`
 * (`src/lib/secop/ficha.ts`): el histórico unido a `proceso` por `proceso_id`,
 * mismo `tipo_proyecto`, misma `departamento_codigo` y excluido el propio
 * proceso. Si cambia allí, cambia aquí.
 *
 * Las sanciones NO se recortan: una multa pesa igual la haya recibido en esta
 * zona o en otra. Van con sus dos vías separadas (`sancionesDeProveedor`).
 *
 * Limitación heredada de la fuente: el NIT solo aparece en el 49% de las
 * adjudicaciones. Sin NIT, el rival se identifica por `nom:<nombre>` y sus
 * sanciones no se pueden cruzar por documento.
 */

import { sql } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { sancionesDeProveedor, type HistorialSancionatorio } from "@/src/lib/al/sanciones/consulta";
import { slugDeProceso } from "@/src/lib/secop/slug";
import type { TipoProyecto } from "@/src/lib/classify/tipo-proyecto";

export interface ProcesoDeReferencia {
  /** Uuid interno de `proceso`: el de la ficha, que se excluye. */
  id: string;
  tipoProyecto: TipoProyecto;
  departamentoCodigo: string;
}

export interface ParticipacionComparable {
  /** Slug de la ficha de ese proceso, para enlazarla. */
  slug: string;
  objeto: string | null;
  entidad: string | null;
  fecha: string | null;
  adjudicado: boolean;
}

export interface HistorialComparable {
  proveedorKey: string;
  nombre: string | null;
  nitCanonico: string | null;
  participaciones: number;
  adjudicaciones: number;
  /** adjudicaciones / participaciones; `null` sin participaciones. */
  tasaExito: number | null;
  /**
   * Mediana de valor_adjudicado / valor_estimado en lo que ganó aquí. Por debajo
   * de 1 ganó bajando el presupuesto. `null` si no hay adjudicación con ambos.
   */
  ratioAdjudicadoSobreEstimado: number | null;
  /** Las más recientes primero; como mucho `limiteRecientes`. */
  recientes: ParticipacionComparable[];
  sanciones: HistorialSancionatorio;
}

/** Las condiciones de "comparable", en SQL, sobre `h` (histórico) y `pr` (proceso). */
const comparable = (ref: ProcesoDeReferencia) => sql`
  pr.deleted_at IS NULL
  AND pr.tipo_proyecto = ${ref.tipoProyecto}
  AND pr.id <> ${ref.id}
  AND g.departamento_codigo = ${ref.departamentoCodigo}
`;

export async function historialComparable(
  proveedorKey: string,
  ref: ProcesoDeReferencia,
  opts: { limiteRecientes?: number } = {}
): Promise<HistorialComparable | null> {
  const limite = opts.limiteRecientes ?? 5;

  const base = await db.execute<{
    nombre: string | null;
    nit: string | null;
    participaciones: string;
    adjudicaciones: string;
    ratio: string | null;
  }>(sql`
    SELECT max(h.proveedor_nombre)                       AS nombre,
           max(h.proveedor_nit)                          AS nit,
           count(*)                                      AS participaciones,
           count(*) FILTER (WHERE h.adjudicado)          AS adjudicaciones,
           percentile_cont(0.5) WITHIN GROUP (
             ORDER BY h.valor_adjudicado / h.valor_estimado
           ) FILTER (
             WHERE h.adjudicado AND h.valor_adjudicado IS NOT NULL
               AND h.valor_estimado IS NOT NULL AND h.valor_estimado > 0
           )                                             AS ratio
    FROM al_oferentes_historico h
    JOIN proceso pr ON pr.id = h.proceso_id
    JOIN geografia g ON g.codigo_divipola = pr.geografia_id
    WHERE h.proveedor_key = ${proveedorKey} AND ${comparable(ref)}
  `);

  const b = base.rows[0];
  const participaciones = Number(b?.participaciones ?? 0);
  if (!b || participaciones === 0) return null;

  const recientes = await db.execute<{
    secop_proceso_id: string;
    objeto: string | null;
    entidad: string | null;
    fecha: string | null;
    adjudicado: boolean;
  }>(sql`
    SELECT pr.secop_proceso_id, pr.objeto, e.nombre AS entidad,
           coalesce(h.fecha_adjudicacion, h.fecha_publicacion)::text AS fecha,
           h.adjudicado
    FROM al_oferentes_historico h
    JOIN proceso pr ON pr.id = h.proceso_id
    JOIN geografia g ON g.codigo_divipola = pr.geografia_id
    LEFT JOIN entidad e ON e.id = pr.entidad_id
    WHERE h.proveedor_key = ${proveedorKey} AND ${comparable(ref)}
    ORDER BY coalesce(h.fecha_adjudicacion, h.fecha_publicacion) DESC NULLS LAST,
             pr.secop_proceso_id
    LIMIT ${limite}
  `);

  const adjudicaciones = Number(b.adjudicaciones);
  const sanciones = await sancionesDeProveedor(b.nit ?? proveedorKey);

  return {
    proveedorKey,
    nombre: b.nombre,
    nitCanonico: b.nit,
    participaciones,
    adjudicaciones,
    tasaExito: adjudicaciones / participaciones,
    ratioAdjudicadoSobreEstimado: b.ratio === null ? null : Number(b.ratio),
    recientes: recientes.rows.map((r) => ({
      slug: slugDeProceso(r.objeto, r.secop_proceso_id),
      objeto: r.objeto,
      entidad: r.entidad,
      fecha: r.fecha,
      adjudicado: r.adjudicado,
    })),
    sanciones,
  };
}
