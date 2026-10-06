/**
 * Los filtros de la vitrina, en la URL: `/licitaciones?q=…&tipo=ptar&
 * departamento=antioquia&presupuesto=500&orden=valor&pagina=2`.
 *
 * Desde el 2026-10-04 la vitrina absorbe «Explorar» y «Descubrir»
 * (`docs/superpowers/plans/2026-10-04-vitrina-radar.md`, fase 1). Los filtros
 * van en la query y no en estado de cliente porque `/licitaciones` ya es
 * `force-dynamic`: leer `searchParams` no cambia lo que cuesta cada visita, y a
 * cambio el formulario funciona sin JavaScript, el resultado se comparte con un
 * enlace y la consulta es la misma de la vitrina (`condicionAbierto()` y el
 * orden por relevancia), no la de `/api/secop`, que tiene otra definición de
 * «abierto».
 *
 * Puro: sin base, para que el componente y las pruebas lo usen sin conexión.
 * Lo que no se reconoce se ignora en vez de dar error: una URL vieja o mal
 * escrita enseña la vitrina sin ese filtro, no un 404.
 *
 * Desde el 2026-10-05 también es el único buscador: absorbe los criterios del
 * buscador guiado de #109 —el tipo agrupado por sistema (`potable`,
 * `residual`), la actividad y la búsqueda por número— y `/licitaciones/explorar`
 * redirige aquí (`desdeExplorar`).
 */

import {
  esActividad,
  esSistema,
  type ActividadBusqueda,
  type SistemaBusqueda,
} from "./busqueda-guiada";
import { slugificar } from "./slug";

export const ORDENES_VITRINA = ["relevancia", "recientes", "valor"] as const;
export type OrdenVitrina = (typeof ORDENES_VITRINA)[number];

export const ETIQUETA_ORDEN: Record<OrdenVitrina, string> = {
  relevancia: "Más relevantes",
  recientes: "Más recientes",
  valor: "Mayor presupuesto",
};

/**
 * Pisos de presupuesto, en millones de COP. Una lista cerrada y no un número
 * libre: un campo numérico abierto (lo que tenía Explorar) acepta «5» queriendo
 * decir cinco millones. 500 es el umbral de la colección «Alto valor» de
 * Descubrir.
 */
export const PRESUPUESTOS_MIN = [100, 500, 1000] as const;
export type PresupuestoMin = (typeof PRESUPUESTOS_MIN)[number];

/** Millones a texto: 1000 → «$1.000 M». */
export function etiquetaPresupuesto(m: PresupuestoMin): string {
  return `desde $${m.toLocaleString("es-CO")} M`;
}

/**
 * El filtro de etapa (PR 3 del plan 2026-10-05-ficha-viva-ciclo-de-vida),
 * **apagado por defecto** (decisión del usuario): sin él, la vitrina es la de
 * oportunidades. Con él, muestra procesos publicados desde 2026 que ya tienen
 * contrato firmado con una persona jurídica (NIT), según las fechas del
 * contrato. Las personas naturales no aparecen.
 */
export const ETAPAS_FILTRO = ["contratado", "en_ejecucion", "plazo_cumplido"] as const;
export type EtapaFiltro = (typeof ETAPAS_FILTRO)[number];

export const ETIQUETA_ETAPA_FILTRO: Record<EtapaFiltro, string> = {
  contratado: "Contratados (aún sin empezar)",
  en_ejecucion: "En ejecución",
  plazo_cumplido: "Plazo cumplido",
};

export interface FiltrosVitrina {
  /** Texto libre: objeto, entidad o municipio. */
  q: string | null;
  /** Uno de los cinco tipos, o un sistema que agrupa dos (`potable`, `residual`). */
  tipo: SistemaBusqueda | null;
  /** Menciones en el objeto o la descripción (`ACTIVIDADES_BUSQUEDA`). */
  actividad: ActividadBusqueda | null;
  /**
   * Número de proceso: id SECOP II o referencia de la entidad. Cuando viene,
   * manda sobre todo lo demás: busca también entre los cerrados y pone
   * primero las coincidencias exactas (`procesosDeVitrina`).
   */
  numero: string | null;
  /** Slug del departamento (`slugificar` del nombre), como las facetas. */
  departamento: string | null;
  presupuestoMin: PresupuestoMin | null;
  orden: OrdenVitrina;
  /** `null` = procesos que reciben ofertas (por defecto). */
  etapa?: EtapaFiltro | null;
}

export const SIN_FILTROS: FiltrosVitrina = {
  q: null,
  tipo: null,
  actividad: null,
  numero: null,
  departamento: null,
  presupuestoMin: null,
  orden: "relevancia",
  etapa: null,
};

/** Largo máximo de la búsqueda: el mismo que tenía el explorador. */
export const MAX_Q = 120;

/** Mismo tope que `paginaValida` en `vitrina.ts`: un OFFSET mayor desborda. */
const PAGINA_MAXIMA = 1_000_000;

type Params = URLSearchParams | Record<string, string | string[] | undefined>;

function leer(sp: Params, k: string): string | null {
  const v = sp instanceof URLSearchParams ? sp.get(k) : sp[k];
  const s = Array.isArray(v) ? v[0] : v;
  const t = s?.trim();
  return t ? t : null;
}

export function filtrosDesdeParams(sp: Params): { filtros: FiltrosVitrina; pagina: number } {
  const q = leer(sp, "q");
  const tipo = leer(sp, "tipo");
  const actividad = leer(sp, "actividad");
  const numero = leer(sp, "numero");
  const dep = leer(sp, "departamento");
  const pres = Number(leer(sp, "presupuesto"));
  const orden = leer(sp, "orden");
  const etapa = leer(sp, "etapa");
  const pag = leer(sp, "pagina");
  const n = pag && /^[1-9][0-9]*$/.test(pag) ? Number(pag) : 1;

  return {
    filtros: {
      q: q ? q.slice(0, MAX_Q) : null,
      tipo: tipo && esSistema(tipo) ? tipo : null,
      actividad: actividad && esActividad(actividad) ? actividad : null,
      numero: numero ? numero.slice(0, MAX_Q) : null,
      departamento: dep && /^[a-z0-9-]{2,60}$/.test(dep) ? dep : null,
      presupuestoMin: (PRESUPUESTOS_MIN as readonly number[]).includes(pres)
        ? (pres as PresupuestoMin)
        : null,
      orden:
        orden && (ORDENES_VITRINA as readonly string[]).includes(orden)
          ? (orden as OrdenVitrina)
          : "relevancia",
      etapa:
        etapa && (ETAPAS_FILTRO as readonly string[]).includes(etapa)
          ? (etapa as EtapaFiltro)
          : null,
    },
    pagina: n <= PAGINA_MAXIMA ? n : 1,
  };
}

/** ¿Recorta o reordena algo? El orden por defecto no cuenta. */
export function hayFiltros(f: FiltrosVitrina): boolean {
  return !!(
    f.q ||
    f.tipo ||
    f.actividad ||
    f.numero ||
    f.departamento ||
    f.presupuestoMin ||
    f.etapa ||
    f.orden !== "relevancia"
  );
}

/**
 * La query de unos filtros, con `?` delante, o "" si no hay nada que poner.
 * Solo escribe lo que difiere del valor por defecto, en un orden fijo: la misma
 * búsqueda da siempre la misma URL.
 */
export function queryDeFiltros(f: FiltrosVitrina, pagina = 1): string {
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.numero) sp.set("numero", f.numero);
  if (f.tipo) sp.set("tipo", f.tipo);
  if (f.actividad) sp.set("actividad", f.actividad);
  if (f.departamento) sp.set("departamento", f.departamento);
  if (f.presupuestoMin) sp.set("presupuesto", String(f.presupuestoMin));
  if (f.etapa) sp.set("etapa", f.etapa);
  if (f.orden !== "relevancia") sp.set("orden", f.orden);
  if (pagina > 1) sp.set("pagina", String(pagina));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** `%texto%` para `ilike`, con los comodines del usuario escapados. */
export function patronIlike(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/**
 * Los parámetros del explorador guiado (`/licitaciones/explorar`, #109) en
 * filtros de la vitrina, para redirigir sus enlaces viejos sin perder la
 * búsqueda. `sistema` pasa a `tipo`; `departamento` era un nombre y pasa a
 * slug (`slugificar`, como las facetas); `valorMin` (pesos) se redondea al piso de presupuesto más alto que no lo
 * supera; `orden=fecha` es «Más recientes». `apertura`, `page` y `pageSize` no
 * tienen equivalente y se descartan.
 */
export function desdeExplorar(sp: Params): FiltrosVitrina {
  const numero = leer(sp, "numero");
  const sistema = leer(sp, "sistema");
  const actividad = leer(sp, "actividad");
  const q = leer(sp, "q");
  const dep = leer(sp, "departamento");
  const valorMin = Number(leer(sp, "valorMin"));
  const orden = leer(sp, "orden");
  const piso = [...PRESUPUESTOS_MIN].reverse().find((m) => valorMin >= m * 1_000_000) ?? null;
  return {
    q: q ? q.slice(0, MAX_Q) : null,
    tipo: sistema && esSistema(sistema) ? sistema : null,
    actividad: actividad && esActividad(actividad) ? actividad : null,
    numero: numero ? numero.slice(0, MAX_Q) : null,
    departamento: dep && /^[a-z0-9-]{2,60}$/.test(slugificar(dep)) ? slugificar(dep) : null,
    presupuestoMin: piso,
    orden: orden === "fecha" ? "recientes" : orden === "valor" ? "valor" : "relevancia",
    etapa: null,
  };
}
