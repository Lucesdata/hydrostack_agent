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

import { and, asc, desc, eq, gte, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "../db/client";
import { entidad, geografia, proceso } from "../db/schema";
import { condicionAbierto } from "./agregados";
import { TIPOS_PROYECTO, type TipoProyecto } from "../classify/tipo-proyecto";
import {
  SIN_FILTROS,
  hayFiltros,
  patronIlike,
  queryDeFiltros,
  type EtapaFiltro,
  type FiltrosVitrina,
} from "./filtros-vitrina";
import { DESDE_CICLO_DE_VIDA } from "./como-se-contrato";
import { NOMBRE_ETAPA } from "./etapa";
import { patronDeActividad, tiposDeSistema } from "./busqueda-guiada";

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
  fechaPublicacion: string | null;
  tipoProyecto: TipoProyecto | null;
  adjudicatario: string | null;
  valorAdjudicacion: string | null;
  fechaAdjudicacion: string | null;
  /**
   * La etapa ya calculada, cuando la página viene del filtro de etapa: manda
   * sobre `estado_actual` en la pastilla de la tarjeta, que nunca puede decir
   * ABIERTO de un contrato en ejecución.
   */
  etapaCalculada?: string | null;
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
  fechaPublicacion: proceso.fechaPublicacion,
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

/**
 * El universo del filtro de etapa (PR 3), en SQL: procesos publicados desde
 * 2026, no cancelados, con un contrato **firmado** con una persona jurídica
 * (NIT) cuyas fechas lo ponen en esa etapa. Es la misma regla que
 * `etapaDeProceso()` para un contrato; si un proceso tiene varios, basta con
 * uno en la etapa (879 procesos tienen más de uno, M1c).
 *
 * `contrato` no tiene índice por `proceso_id`: el `IN (subconsulta)` se
 * resuelve como semijoin con una sola pasada por la tabla, no por fila.
 */
function condicionDeEtapa(etapa: EtapaFiltro): SQL {
  const hoy = sql`(now() at time zone 'America/Bogota')::date`;
  const fin = sql`coalesce(c.fecha_fin_actual, c.fecha_fin_inicial)`;
  const porFechas =
    etapa === "contratado"
      ? sql`(c.fecha_inicio is null or c.fecha_inicio > ${hoy})`
      : etapa === "en_ejecucion"
        ? sql`(c.fecha_inicio <= ${hoy} and (${fin} is null or ${fin} >= ${hoy}))`
        : sql`(c.fecha_inicio <= ${hoy} and ${fin} < ${hoy})`;
  return and(
    isNull(proceso.deletedAt),
    gte(proceso.fechaPublicacion, DESDE_CICLO_DE_VIDA),
    sql`coalesce(${proceso.estadoActual}, '') !~* '(cancel|desiert|revoc)'`,
    sql`${proceso.id} in (
      select c.proceso_id from contrato c
      join proveedor pv on pv.id = c.proveedor_id
      where c.deleted_at is null
        and c.proceso_id is not null
        and c.fecha_firma is not null
        and coalesce(c.estado_actual, '') !~* '^(borrador|enviado proveedor|en aprobaci[oó]n)$'
        and coalesce(c.estado_actual, '') !~* '(cancel|desiert|revoc)'
        and upper(trim(pv.tipo_documento)) = 'NIT'
        and ${porFechas}
    )`
  )!;
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
 * 2 · su `fecha_recepcion` ya pasó (el día en Colombia). Desde el 2026-10-05
 *     `condicionAbierto()` exige la recepción vigente, así que dentro de los
 *     abiertos este tramo ya no se da; se conserva como red por si la regla
 *     común vuelve a cambiar.
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
    f.tipo ? inArray(proceso.tipoProyecto, [...tiposDeSistema(f.tipo)]) : undefined,
    // Menciones en objeto o descripción, sin tildes ni mayúsculas: el mismo
    // criterio del buscador guiado de #109, que la vitrina absorbió.
    f.actividad
      ? sql`translate(lower(concat_ws(' ', ${proceso.objeto}, ${proceso.descripcion})), 'áéíóúüñ', 'aeiouun') ~ ${patronDeActividad(f.actividad)}`
      : undefined,
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
 * La búsqueda por número: id SECOP II o referencia, en abiertos **y cerrados**
 * (quien tiene el número busca ese proceso, esté como esté) y sin los demás
 * filtros. Primero las coincidencias exactas, sin distinguir mayúsculas; luego
 * las parciales. `%`, `_` y `\` se buscan como caracteres (`patronIlike`).
 */
function busquedaPorNumero(numero: string) {
  const exacta = sql`(lower(${proceso.secopProcesoId}) = lower(${numero}) or lower(${proceso.referencia}) = lower(${numero}))`;
  return {
    where: and(
      isNull(proceso.deletedAt),
      or(
        ilike(proceso.secopProcesoId, patronIlike(numero)),
        ilike(proceso.referencia, patronIlike(numero))
      )
    ),
    orden: [
      sql`case when ${exacta} then 0 else 1 end`,
      desc(proceso.fechaPublicacion),
      asc(proceso.id),
    ],
  };
}

/**
 * Los filtros solo se aplican a los abiertos: es la pestaña de trabajo. Los
 * adjudicados recientes son ~190 y se leen enteros. Con `numero`, la búsqueda
 * es otra (`busquedaPorNumero`).
 */
export async function procesosDeVitrina(
  pestana: PestanaVitrina,
  pagina = 1,
  opciones: { filtros?: FiltrosVitrina; departamentoCodigo?: string | null } = {}
): Promise<PaginaDeVitrina> {
  const filtros = pestana === "abiertos" ? (opciones.filtros ?? SIN_FILTROS) : SIN_FILTROS;
  const porNumero = filtros.numero ? busquedaPorNumero(filtros.numero) : null;
  const where =
    porNumero?.where ??
    and(
      // El filtro de etapa cambia el universo: ya no son oportunidades.
      pestana === "abiertos" && filtros.etapa
        ? condicionDeEtapa(filtros.etapa)
        : condicionDe(pestana),
      ...condicionesDeFiltros(filtros, opciones.departamentoCodigo ?? null)
    );
  // `proceso.id` como segunda clave: Postgres no garantiza orden estable entre
  // empates de `fecha_publicacion`/`fecha_adjudicacion` (columna `date`, con
  // empates masivos), y cada página es una entrada ISR generada en momentos
  // distintos — sin desempate, dos páginas contiguas pueden repetir un proceso
  // o saltárselo.
  const orden =
    porNumero?.orden ??
    (pestana === "abiertos"
      ? ordenDeAbiertos(filtros.orden)
      : [desc(proceso.fechaAdjudicacion), asc(proceso.id)]);

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

  // Con el filtro de etapa, la pastilla dice la etapa y no se nombra al
  // adjudicatario del proceso: puede ser una persona natural (decisión del
  // usuario del 2026-10-05). El contratista con NIT está en la ficha.
  const items =
    pestana === "abiertos" && filtros.etapa && !porNumero
      ? filas.map((f) => ({
          ...f,
          adjudicatario: null,
          etapaCalculada: NOMBRE_ETAPA[filtros.etapa!],
        }))
      : filas;

  return {
    items,
    total,
    pagina,
    porPagina: POR_PAGINA_VITRINA,
    pestana,
    filtros,
  };
}
