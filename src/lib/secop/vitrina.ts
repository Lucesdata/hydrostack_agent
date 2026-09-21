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

import { and, asc, desc, eq, gte, isNull, sql } from "drizzle-orm";
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
 * Tope de página. Sin él, `/licitaciones/pagina/2000000000000000000` pasa la
 * regex, el `OFFSET` calculado desborda el `bigint` de Postgres y la consulta
 * revienta con un 500 (vía `error.tsx`) donde tocaba un 404. Ninguna pestaña
 * llega ni de lejos a este número de páginas.
 */
const PAGINA_MAXIMA = 1_000_000;

/**
 * Valida el segmento `[n]` de la ruta. Devuelve `null` —y la ruta responde 404—
 * para cualquier cosa que no sea un entero mayor que 1 y hasta `PAGINA_MAXIMA`,
 * incluido el "1": su ruta canónica es la base, y servir el mismo listado en
 * dos URLs parte la señal de SEO en dos.
 */
export function paginaValida(raw: string): number | null {
  if (!/^[1-9][0-9]*$/.test(raw)) return null;
  const n = Number(raw);
  return n > 1 && n <= PAGINA_MAXIMA ? n : null;
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
  // `proceso.tipo_proyecto` es `text` en el esquema: sin este tipado explícito
  // Drizzle infiere `string | null` y el `as ProcesoDeVitrina[]` de más abajo
  // tapaba el único TypeError real —`TIPO_PROYECTO[p.tipoProyecto]` en
  // `compuertasAbsolutas` no tiene guarda para un valor fuera de los cinco.
  tipoProyecto: sql<TipoProyecto | null>`${proceso.tipoProyecto}`,
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
  // `proceso.id` como segunda clave: Postgres no garantiza orden estable entre
  // empates de `fecha_publicacion`/`fecha_adjudicacion` (columna `date`, con
  // empates masivos), y cada página es una entrada ISR generada en momentos
  // distintos — sin desempate, dos páginas contiguas pueden repetir un proceso
  // o saltárselo.
  const orden =
    pestana === "abiertos"
      ? [desc(proceso.fechaPublicacion), asc(proceso.id)]
      : [desc(proceso.fechaAdjudicacion), asc(proceso.id)];

  const [filas, [{ total }]] = await Promise.all([
    db
      .select(CAMPOS)
      .from(proceso)
      .leftJoin(entidad, eq(entidad.id, proceso.entidadId))
      .leftJoin(geografia, eq(geografia.codigoDivipola, proceso.geografiaId))
      .where(where)
      .orderBy(...orden)
      .limit(POR_PAGINA_VITRINA)
      .offset((pagina - 1) * POR_PAGINA_VITRINA),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(proceso)
      .where(where),
  ]);

  return {
    items: filas,
    total,
    pagina,
    porPagina: POR_PAGINA_VITRINA,
    pestana,
  };
}
