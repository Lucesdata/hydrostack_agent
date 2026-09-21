/**
 * La capa de datos de la vitrina de fichas.
 *
 * Dos pestañas y nada más. `Cierran pronto` se cayó al medir: cubriría 88
 * procesos de 35.518, porque el dataset no publica fecha de cierre (decisión A,
 * 2026-09-21). El filtro por departamento tampoco vive aquí: la ruta facetada
 * `/licitaciones/departamento/[slug]` ya es esta misma vitrina filtrada
 * (decisión D).
 *
 * La definición de "abierto" se importa de `agregados.ts`. No se reescribe: si
 * cada superficie define la suya, la portada enseña cuatro cifras distintas del
 * mismo hecho.
 */

import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "../db/client";
import { entidad, geografia, proceso } from "../db/schema";
import { condicionAbierto } from "./agregados";
import type { TipoProyecto } from "../classify/tipo-proyecto";

export const PESTANAS_VITRINA = ["abiertos", "adjudicados"] as const;
export type PestanaVitrina = (typeof PESTANAS_VITRINA)[number];

/** Decisión D5 del spec: rejilla de 3×3 en escritorio. */
export const POR_PAGINA_VITRINA = 9;

/** "Reciente" para una adjudicación. Con 30 días son ~191 procesos. */
export const DIAS_ADJUDICACION_RECIENTE = 30;

export interface ProcesoDeVitrina {
  id: string;
  secopProcesoId: string;
  objeto: string | null;
  entidadNombre: string | null;
  departamento: string | null;
  municipio: string | null;
  valorEstimado: string | null;
  estadoActual: string | null;
  estadoApertura: string | null;
  fechaRecepcion: string | null;
  tipoProyecto: TipoProyecto | null;
  adjudicatario: string | null;
  valorAdjudicacion: string | null;
  fechaAdjudicacion: string | null;
}

export interface PaginaDeVitrina {
  items: ProcesoDeVitrina[];
  total: number;
  pagina: number;
  porPagina: number;
  pestana: PestanaVitrina;
}

/**
 * Valida el segmento `[n]` de la ruta. Devuelve `null` —y la ruta responde 404—
 * para cualquier cosa que no sea un entero mayor que 1, incluido el "1": su
 * ruta canónica es la base, y servir el mismo listado en dos URLs parte la
 * señal de SEO en dos.
 */
export function paginaValida(raw: string): number | null {
  if (!/^[1-9][0-9]*$/.test(raw)) return null;
  const n = Number(raw);
  return n > 1 ? n : null;
}

export function rutaVitrina(pestana: PestanaVitrina, pagina: number): string {
  const base = pestana === "abiertos" ? "/licitaciones" : "/licitaciones/adjudicados";
  return pagina <= 1 ? base : `${base}/pagina/${pagina}`;
}

const CAMPOS = {
  id: proceso.id,
  secopProcesoId: proceso.secopProcesoId,
  objeto: proceso.objeto,
  entidadNombre: entidad.nombre,
  departamento: geografia.departamentoNombre,
  municipio: geografia.municipioNombre,
  valorEstimado: proceso.valorEstimado,
  estadoActual: proceso.estadoActual,
  estadoApertura: proceso.estadoApertura,
  fechaRecepcion: proceso.fechaRecepcion,
  tipoProyecto: proceso.tipoProyecto,
  adjudicatario: proceso.adjudicatario,
  valorAdjudicacion: proceso.valorAdjudicacion,
  fechaAdjudicacion: proceso.fechaAdjudicacion,
};

/** El filtro de cada pestaña, en un solo sitio: la cuenta y la página deben cuadrar. */
function condicionDe(pestana: PestanaVitrina) {
  if (pestana === "abiertos") return condicionAbierto();
  return and(
    isNull(proceso.deletedAt),
    gte(
      proceso.fechaAdjudicacion,
      sql`current_date - make_interval(days => ${DIAS_ADJUDICACION_RECIENTE})`
    )
  );
}

export async function procesosDeVitrina(
  pestana: PestanaVitrina,
  pagina = 1
): Promise<PaginaDeVitrina> {
  const where = condicionDe(pestana);
  const orden =
    pestana === "abiertos" ? desc(proceso.fechaPublicacion) : desc(proceso.fechaAdjudicacion);

  const [filas, [{ total }]] = await Promise.all([
    db
      .select(CAMPOS)
      .from(proceso)
      .leftJoin(entidad, eq(entidad.id, proceso.entidadId))
      .leftJoin(geografia, eq(geografia.codigoDivipola, proceso.geografiaId))
      .where(where)
      .orderBy(orden)
      .limit(POR_PAGINA_VITRINA)
      .offset((pagina - 1) * POR_PAGINA_VITRINA),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(proceso)
      .where(where),
  ]);

  return {
    items: filas as ProcesoDeVitrina[],
    total,
    pagina,
    porPagina: POR_PAGINA_VITRINA,
    pestana,
  };
}
