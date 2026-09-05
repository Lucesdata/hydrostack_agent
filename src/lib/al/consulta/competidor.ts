/**
 * Ruta rápida de consulta sobre el histórico (SDD §8.1). SQL parametrizado,
 * respuesta en milisegundos, coste cero por consulta. Sin IA.
 *
 * Responde las dos preguntas del módulo 2:
 *   - `historialCompetidor` → **contra quién compito** y con qué frecuencia gana.
 *   - `precioReferencia`    → **a qué precio se gana** en una familia y una zona.
 *
 * Limitación heredada de la fuente, y hay que decirla en la UI: el NIT solo
 * aparece en el 49% de las adjudicaciones. Un competidor sin NIT publicado se
 * consulta por `proveedorKey` (`nom:<nombre normalizado>`), que es la llave con
 * la que se deduplica.
 */

import { sql } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import {
  sancionesDeProveedor,
  type HistorialSancionatorio,
} from "@/src/lib/al/sanciones/consulta";

export interface AgregadoPorEntidad {
  entidad: string | null;
  entidadNit: string | null;
  participaciones: number;
  ganadas: number;
  valorGanado: string;
}

export interface AgregadoPorAnio {
  anio: number;
  participaciones: number;
  ganadas: number;
  valorGanado: string;
}

export interface Rival {
  proveedorKey: string;
  nombre: string;
  encuentros: number;
  /** Veces que el rival ganó un proceso en el que ambos se presentaron. */
  ganadosPorElRival: number;
}

export interface HistorialCompetidor {
  proveedor: { proveedorKey: string; nitCanonico: string | null; nombre: string | null };
  participaciones: number;
  adjudicaciones: number;
  /** adjudicaciones / participaciones. NULL sin participaciones. */
  tasaExito: number | null;
  valorTotalAdjudicado: string;
  /**
   * Mediana de valor_adjudicado / valor_estimado en lo que ganó. Por debajo de 1
   * ganó bajando el precio de referencia; por encima, la entidad subestimó.
   * NULL si no hay ninguna adjudicación con ambos valores.
   */
  ratioAdjudicadoSobreEstimado: number | null;
  porEntidad: AgregadoPorEntidad[];
  porAnio: AgregadoPorAnio[];
  /** Con quién se cruza más en los mismos procesos. Es el "contra quién compito". */
  rivalesFrecuentes: Rival[];
  /** Historial sancionatorio (módulo 3). NO son inhabilidades: son multas. */
  sanciones: HistorialSancionatorio;
}

/**
 * Drizzle no serializa un array de JS como array de Postgres: lo bindea como
 * escalar y el `::text[]` revienta con "malformed array literal". Se construye
 * el literal a mano; `null` deja el filtro inerte.
 */
function arrayLiteral(a: string[] | null | undefined): string | null {
  if (!a || a.length === 0) return null;
  return `{${a.map((s) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",")}}`;
}

/** Acepta el NIT (dígitos) o directamente la `proveedor_key`. */
function aKey(idOrNit: string): string {
  return /^\d+$/.test(idOrNit) ? `nit:${idOrNit}` : idOrNit;
}

export async function historialCompetidor(
  idOrNit: string,
  opts: { limiteEntidades?: number; limiteRivales?: number } = {}
): Promise<HistorialCompetidor | null> {
  const key = aKey(idOrNit);
  const topEntidades = opts.limiteEntidades ?? 10;
  const topRivales = opts.limiteRivales ?? 10;

  const base = await db.execute<{
    proveedor_key: string;
    proveedor_nit: string | null;
    nombre: string | null;
    participaciones: string;
    adjudicaciones: string;
    valor_total: string | null;
    ratio: string | null;
  }>(sql`
    SELECT
      h.proveedor_key,
      max(h.proveedor_nit)                                        AS proveedor_nit,
      max(h.proveedor_nombre)                                     AS nombre,
      count(*)                                                    AS participaciones,
      count(*) FILTER (WHERE h.adjudicado)                        AS adjudicaciones,
      coalesce(sum(h.valor_adjudicado) FILTER (WHERE h.adjudicado), 0) AS valor_total,
      percentile_cont(0.5) WITHIN GROUP (
        ORDER BY h.valor_adjudicado / h.valor_estimado
      ) FILTER (
        WHERE h.adjudicado AND h.valor_adjudicado IS NOT NULL
          AND h.valor_estimado IS NOT NULL AND h.valor_estimado > 0
      )                                                           AS ratio
    FROM al_oferentes_historico h
    WHERE h.proveedor_key = ${key}
    GROUP BY h.proveedor_key
  `);

  const b = base.rows[0];
  if (!b) return null;

  const porEntidad = await db.execute<{
    entidad: string | null;
    entidad_nit: string | null;
    participaciones: string;
    ganadas: string;
    valor_ganado: string;
  }>(sql`
    SELECT e.nombre AS entidad, h.entidad_nit,
           count(*) AS participaciones,
           count(*) FILTER (WHERE h.adjudicado) AS ganadas,
           coalesce(sum(h.valor_adjudicado) FILTER (WHERE h.adjudicado), 0) AS valor_ganado
    FROM al_oferentes_historico h
    LEFT JOIN entidad e ON e.id = h.entidad_id
    WHERE h.proveedor_key = ${key}
    GROUP BY 1, 2
    ORDER BY participaciones DESC
    LIMIT ${topEntidades}
  `);

  const porAnio = await db.execute<{
    anio: number;
    participaciones: string;
    ganadas: string;
    valor_ganado: string;
  }>(sql`
    SELECT extract(year FROM coalesce(h.fecha_adjudicacion, h.fecha_publicacion))::int AS anio,
           count(*) AS participaciones,
           count(*) FILTER (WHERE h.adjudicado) AS ganadas,
           coalesce(sum(h.valor_adjudicado) FILTER (WHERE h.adjudicado), 0) AS valor_ganado
    FROM al_oferentes_historico h
    WHERE h.proveedor_key = ${key}
      AND coalesce(h.fecha_adjudicacion, h.fecha_publicacion) IS NOT NULL
    GROUP BY 1
    ORDER BY 1
  `);

  /**
   * Rivales: quién más se presentó a los mismos procesos. Un self-join sobre
   * `secop_proceso_id` excluyéndose a sí mismo — la consulta que justifica que
   * el histórico guarde también a los que pierden.
   */
  const rivales = await db.execute<{
    proveedor_key: string;
    nombre: string;
    encuentros: string;
    ganados_por_el_rival: string;
  }>(sql`
    SELECT r.proveedor_key,
           max(r.proveedor_nombre) AS nombre,
           count(*) AS encuentros,
           count(*) FILTER (WHERE r.adjudicado) AS ganados_por_el_rival
    FROM al_oferentes_historico yo
    JOIN al_oferentes_historico r
      ON r.secop_proceso_id = yo.secop_proceso_id
     AND r.proveedor_key <> yo.proveedor_key
    WHERE yo.proveedor_key = ${key}
    GROUP BY r.proveedor_key
    ORDER BY encuentros DESC, ganados_por_el_rival DESC
    LIMIT ${topRivales}
  `);

  const sanciones = await sancionesDeProveedor(b.proveedor_nit ?? b.proveedor_key);

  const participaciones = Number(b.participaciones);
  const adjudicaciones = Number(b.adjudicaciones);

  return {
    proveedor: {
      proveedorKey: b.proveedor_key,
      nitCanonico: b.proveedor_nit,
      nombre: b.nombre,
    },
    participaciones,
    adjudicaciones,
    tasaExito: participaciones > 0 ? adjudicaciones / participaciones : null,
    valorTotalAdjudicado: b.valor_total ?? "0",
    ratioAdjudicadoSobreEstimado: b.ratio === null ? null : Number(b.ratio),
    porEntidad: porEntidad.rows.map((r) => ({
      entidad: r.entidad,
      entidadNit: r.entidad_nit,
      participaciones: Number(r.participaciones),
      ganadas: Number(r.ganadas),
      valorGanado: r.valor_ganado,
    })),
    porAnio: porAnio.rows.map((r) => ({
      anio: r.anio,
      participaciones: Number(r.participaciones),
      ganadas: Number(r.ganadas),
      valorGanado: r.valor_ganado,
    })),
    rivalesFrecuentes: rivales.rows.map((r) => ({
      proveedorKey: r.proveedor_key,
      nombre: r.nombre,
      encuentros: Number(r.encuentros),
      ganadosPorElRival: Number(r.ganados_por_el_rival),
    })),
    sanciones,
  };
}

export interface PrecioReferencia {
  n: number;
  medianaRatio: number | null;
  p25: number | null;
  p75: number | null;
  medianaValorAdjudicado: string | null;
}

/**
 * Distribución del ratio adjudicado/estimado. Solo cuenta adjudicaciones con
 * ambos valores: `precio_base = 0` es frecuente en la fuente y se guardó como
 * NULL, no como cero, precisamente para que no envenene esta mediana.
 */
export async function precioReferencia(params: {
  unspsc?: string[];
  divipola?: string[];
  desde?: string;
} = {}): Promise<PrecioReferencia> {
  const unspsc = arrayLiteral(params.unspsc);
  const divipola = arrayLiteral(params.divipola);

  const res = await db.execute<{
    n: string;
    mediana: string | null;
    p25: string | null;
    p75: string | null;
    mediana_valor: string | null;
  }>(sql`
    WITH base AS (
      SELECT h.valor_adjudicado, h.valor_estimado,
             h.valor_adjudicado / h.valor_estimado AS ratio
      FROM al_oferentes_historico h
      WHERE h.adjudicado
        AND h.valor_adjudicado IS NOT NULL
        AND h.valor_estimado IS NOT NULL AND h.valor_estimado > 0
        AND (${unspsc}::text[] IS NULL OR h.unspsc = ANY(${unspsc}::text[]))
        AND (${divipola}::text[] IS NULL OR EXISTS (
              SELECT 1 FROM unnest(${divipola}::text[]) d
              WHERE h.geografia_id LIKE d || '%'))
        AND (${params.desde ?? null}::date IS NULL
             OR h.fecha_adjudicacion >= ${params.desde ?? null}::date)
    )
    SELECT count(*) AS n,
           percentile_cont(0.5)  WITHIN GROUP (ORDER BY ratio) AS mediana,
           percentile_cont(0.25) WITHIN GROUP (ORDER BY ratio) AS p25,
           percentile_cont(0.75) WITHIN GROUP (ORDER BY ratio) AS p75,
           percentile_cont(0.5)  WITHIN GROUP (ORDER BY valor_adjudicado)::text AS mediana_valor
    FROM base
  `);

  const r = res.rows[0];
  return {
    n: Number(r.n),
    medianaRatio: r.mediana === null ? null : Number(r.mediana),
    p25: r.p25 === null ? null : Number(r.p25),
    p75: r.p75 === null ? null : Number(r.p75),
    medianaValorAdjudicado: r.mediana_valor,
  };
}
