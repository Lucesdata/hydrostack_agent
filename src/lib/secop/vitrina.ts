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

import { and, asc, desc, eq, gte, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "../db/client";
import { entidad, geografia, proceso } from "../db/schema";
import { condicionAbierto } from "./agregados";
import { TIPOS_PROYECTO, type TipoProyecto } from "../classify/tipo-proyecto";
import {
  SIN_FILTROS,
  hayFiltros,
  patronIlike,
  queryDeFiltros,
  type FiltrosVitrina,
} from "./filtros-vitrina";

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
  /** Los filtros aplicados. Solo los abiertos se filtran; ver `procesosDeVitrina`. */
  filtros: FiltrosVitrina;
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

/**
 * Sin filtros, la página va en el camino (`/licitaciones/pagina/3`): esas rutas
 * son ISR y las sigue un buscador. Con filtros va en la query
 * (`/licitaciones?tipo=ptar&pagina=3`), porque solo la base lee `searchParams`.
 */
export function rutaVitrina(
  pestana: PestanaVitrina,
  pagina: number,
  filtros: FiltrosVitrina = SIN_FILTROS
): string {
  const base = pestana === "abiertos" ? "/licitaciones" : "/licitaciones/adjudicados";
  if (pestana === "abiertos" && hayFiltros(filtros)) return base + queryDeFiltros(filtros, pagina);
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

/** Los cuatro tipos que afirman un subsistema de agua: todos menos `otros`. */
const TIPOS_DE_AGUA = TIPOS_PROYECTO.filter((t) => t !== "otros");

/**
 * Tramo de relevancia de un abierto, de 0 (primero) a 2 (al final).
 *
 * 0 · tiene uno de los cuatro tipos de agua y sigue recibiendo ofertas.
 * 1 · tipo `otros` o sin clasificar: entró por el filtro de la ingesta, pero el
 *     clasificador no le encuentra subsistema. En la vitrina del 2026-10-04 la
 *     primera fila eran unos GPS para una empresa de energía y el estudio de
 *     tramos de espacio público de EPM.
 * 2 · su `fecha_recepcion` ya pasó (el día en Colombia). Sigue en el conteo
 *     porque `condicionAbierto()` es la definición común y no se reescribe
 *     aquí; solo deja de ocupar la primera página.
 *
 * Ordena, no filtra: el total no cambia y nada desaparece de la vitrina.
 */
export function tramoDeRelevancia(): SQL<number> {
  const tiposDeAgua = sql.join(
    TIPOS_DE_AGUA.map((t) => sql`${t}`),
    sql`, `
  );
  return sql<number>`case
    when ${proceso.fechaRecepcion} < (now() at time zone 'America/Bogota')::date then 2
    when ${proceso.tipoProyecto} in (${tiposDeAgua}) then 0
    else 1
  end`;
}

/**
 * Las condiciones de los filtros. `departamentoCodigo` llega ya resuelto desde
 * el slug por quien llama, que tiene la lista de departamentos; un slug que no
 * existe llega como `null` y no filtra.
 */
function condicionesDeFiltros(f: FiltrosVitrina, departamentoCodigo: string | null) {
  return [
    f.q
      ? or(
          ilike(proceso.objeto, patronIlike(f.q)),
          ilike(entidad.nombre, patronIlike(f.q)),
          ilike(geografia.municipioNombre, patronIlike(f.q))
        )
      : undefined,
    f.tipo ? eq(proceso.tipoProyecto, f.tipo) : undefined,
    departamentoCodigo ? eq(geografia.departamentoCodigo, departamentoCodigo) : undefined,
    f.presupuestoMin ? gte(proceso.valorEstimado, String(f.presupuestoMin * 1_000_000)) : undefined,
  ];
}

function ordenDeAbiertos(orden: FiltrosVitrina["orden"]) {
  if (orden === "recientes") return [desc(proceso.fechaPublicacion), asc(proceso.id)];
  if (orden === "valor") return [sql`${proceso.valorEstimado} desc nulls last`, asc(proceso.id)];
  return [asc(tramoDeRelevancia()), desc(proceso.fechaPublicacion), asc(proceso.id)];
}

/**
 * Los filtros solo se aplican a los abiertos: es la pestaña de trabajo. Los
 * adjudicados recientes son ~190 y se leen enteros.
 */
export async function procesosDeVitrina(
  pestana: PestanaVitrina,
  pagina = 1,
  opciones: { filtros?: FiltrosVitrina; departamentoCodigo?: string | null } = {}
): Promise<PaginaDeVitrina> {
  const filtros = pestana === "abiertos" ? (opciones.filtros ?? SIN_FILTROS) : SIN_FILTROS;
  const where = and(
    condicionDe(pestana),
    ...condicionesDeFiltros(filtros, opciones.departamentoCodigo ?? null)
  );
  // `proceso.id` como segunda clave: Postgres no garantiza orden estable entre
  // empates de `fecha_publicacion`/`fecha_adjudicacion` (columna `date`, con
  // empates masivos), y cada página es una entrada ISR generada en momentos
  // distintos — sin desempate, dos páginas contiguas pueden repetir un proceso
  // o saltárselo.
  const orden =
    pestana === "abiertos"
      ? ordenDeAbiertos(filtros.orden)
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
    // Mismos joins que la página: los filtros leen entidad y geografía.
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(proceso)
      .leftJoin(entidad, eq(entidad.id, proceso.entidadId))
      .leftJoin(geografia, eq(geografia.codigoDivipola, proceso.geografiaId))
      .where(where),
  ]);

  return {
    items: filas,
    total,
    pagina,
    porPagina: POR_PAGINA_VITRINA,
    pestana,
    filtros,
  };
}
