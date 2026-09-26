/**
 * Lo que la ficha del hero enseña de un departamento además de sus conteos:
 * sus tres procesos abiertos de mayor presupuesto y cuántos procesos se
 * publicaron cada semana en las últimas doce.
 *
 * No va en `detallePorDepartamento()` a propósito. Aquello es una consulta para
 * los 33 departamentos que la portada paga en cada revalidación; esto se pide
 * para **uno** cuando alguien lo elige, por `/api/departamento/[dpto]/resumen`,
 * cacheado en el CDN. La portada sigue haciendo una sola consulta.
 *
 * **La serie cuenta todos los publicados, no solo los abiertos.** Los abiertos
 * se concentran en las semanas recientes —los viejos ya cerraron—, así que una
 * serie de abiertos subiría siempre aunque el mercado no creciera. Contando
 * todo lo publicado, la forma es la del mercado.
 */

import { and, desc, eq, gt, isNull, lte, sql } from "drizzle-orm";
import { db } from "../db/client";
import { entidad, geografia, proceso } from "../db/schema";
import { condicionAbierto } from "./agregados";
import { mapRowToResumen, type ProcesoResumen } from "./recientes";
import { slugDeProceso } from "./slug";

export const SEMANAS = 12;
export const N_DESTACADOS = 3;

export interface ResumenDepartamento {
  /** Abiertos de mayor presupuesto publicado; los que no lo publican van al final. */
  destacados: ProcesoResumen[];
  /**
   * Publicados por semana, de la más antigua a la más reciente. Cada semana son
   * siete días contados hacia atrás desde hoy: la última es "los últimos 7 días".
   */
  semanas: number[];
}

/** El código DIVIPOLA de departamento: dos dígitos. Todo lo demás se rechaza. */
export function esCodigoDepartamento(v: unknown): v is string {
  return typeof v === "string" && /^\d{2}$/.test(v);
}

/**
 * Filas `{ k, n }` (k = semanas hacia atrás, 0 la actual) → serie de la más
 * antigua a la más reciente, con cero donde no hubo publicaciones. Una semana
 * sin filas es una semana sin procesos, no un dato que falta.
 */
export function serieSemanal(filas: { k: number; n: number }[], semanas = SEMANAS): number[] {
  const serie = new Array<number>(semanas).fill(0);
  for (const { k, n } of filas) {
    if (Number.isInteger(k) && k >= 0 && k < semanas) serie[semanas - 1 - k] += n;
  }
  return serie;
}

export async function resumenDepartamento(dpto: string): Promise<ResumenDepartamento> {
  const delDepartamento = eq(geografia.departamentoCodigo, dpto);
  const semana = sql<number>`((current_date - ${proceso.fechaPublicacion}) / 7)::int`;

  const [destacados, porSemana] = await Promise.all([
    db
      .select({
        secopProcesoId: proceso.secopProcesoId,
        referencia: proceso.referencia,
        objeto: proceso.objeto,
        modalidad: proceso.modalidad,
        estado: proceso.estadoActual,
        valorEstimado: proceso.valorEstimado,
        fechaPublicacion: proceso.fechaPublicacion,
        entidadNombre: entidad.nombre,
        departamento: geografia.departamentoNombre,
        municipio: geografia.municipioNombre,
        urlRaw: proceso.url,
        tipoProyecto: proceso.tipoProyecto,
      })
      .from(proceso)
      .innerJoin(geografia, eq(geografia.codigoDivipola, proceso.geografiaId))
      .leftJoin(entidad, eq(proceso.entidadId, entidad.id))
      .where(and(condicionAbierto(), delDepartamento))
      .orderBy(sql`${proceso.valorEstimado} DESC NULLS LAST`, desc(proceso.fechaPublicacion))
      .limit(N_DESTACADOS),
    db
      .select({ k: semana, n: sql<number>`count(*)::int` })
      .from(proceso)
      .innerJoin(geografia, eq(geografia.codigoDivipola, proceso.geografiaId))
      .where(
        and(
          isNull(proceso.deletedAt),
          delDepartamento,
          // Constante del módulo, no dato del usuario: va escrita en el SQL y no como
          // parámetro, que `date - $1` sin tipo es ambiguo para Postgres.
          gt(proceso.fechaPublicacion, sql`current_date - ${sql.raw(String(SEMANAS * 7))}`),
          lte(proceso.fechaPublicacion, sql`current_date`)
        )
      )
      .groupBy(semana),
  ]);

  return {
    destacados: destacados.map((r) => ({
      ...mapRowToResumen(r),
      ficha: `/licitaciones/${slugDeProceso(r.objeto, r.secopProcesoId)}`,
    })),
    semanas: serieSemanal(porSemana),
  };
}
