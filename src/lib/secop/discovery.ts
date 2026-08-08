/**
 * Colecciones inteligentes + búsqueda facetada de `/licitaciones/descubrir` —
 * lógica pura (sin red, sin React), testeable de forma aislada. Antes esto
 * vivía en `mock-licitaciones.ts` y filtraba un array inventado a mano; ahora
 * traduce pills a un `SecopQuery` real contra `/api/secop` (mismo backend que
 * Explorar), más un filtro residual client-side para lo que el query param
 * único de Socrata/Postgres no puede expresar en una sola llamada.
 *
 * Dos límites de datos reales que el mock no tenía que respetar (y que
 * definen qué colecciones son honestas de ofrecer):
 *   · el dataset Procesos de SECOP II NO trae fecha de cierre exacta (ver
 *     `EstadoApertura` en types.ts) — no existe "cierra en N días".
 *   · no hay ninguna señal de concurrencia/competencia de oferentes calculada
 *     en el pipeline — no existe "poca competencia".
 * Por eso las 3 colecciones se redefinen sobre atributos que sí existen:
 * apertura, adjudicación, valor y acceso documental.
 */

import { canExtract } from './document-access';
import type { SecopProceso, SecopQuery } from './types';

export type FilterPillType = 'coleccion' | 'sector' | 'ubicacion' | 'texto';

export interface FilterPill {
  /** Identificador estable para deduplicar y para el `key` de React. */
  id: string;
  type: FilterPillType;
  label: string;
  value: string;
}

export interface SmartCollection {
  id: string;
  titulo: string;
  descripcion: string;
  glyph: string;
  pills: FilterPill[];
}

/** Umbral usado por la colección "Alto valor". */
const ALTO_VALOR_MIN = 500_000_000;

export const SMART_COLLECTIONS: SmartCollection[] = [
  {
    id: 'abiertos-sin-adjudicar',
    titulo: 'Abiertos ahora',
    descripcion: 'Apertura activa y todavía sin adjudicar — aún se puede ofertar.',
    glyph: '🟢',
    pills: [
      { id: 'coleccion:abiertos-sin-adjudicar', type: 'coleccion', label: 'Abierto · sin adjudicar', value: 'abiertos-sin-adjudicar' },
    ],
  },
  {
    id: 'alto-valor',
    titulo: 'Alto valor',
    descripcion: `Precio base ≥ ${(ALTO_VALOR_MIN / 1_000_000).toLocaleString('es-CO')} millones COP.`,
    glyph: '💰',
    pills: [{ id: 'coleccion:alto-valor', type: 'coleccion', label: 'Alto valor', value: 'alto-valor' }],
  },
  {
    id: 'listos-para-extraer',
    titulo: 'Listos para extraer',
    descripcion: 'El pliego ya se probó como público — se puede analizar en /pliego.',
    glyph: '📄',
    pills: [
      { id: 'coleccion:listos-para-extraer', type: 'coleccion', label: 'Pliego público', value: 'listos-para-extraer' },
    ],
  },
];

/** Departamentos reconocidos por el parser de búsqueda (mismos que el workbench real). */
const DEPARTAMENTOS_CONOCIDOS = [
  'Valle del Cauca', 'Antioquia', 'Cundinamarca', 'Bogotá', 'Atlántico',
  'Bolívar', 'Santander', 'Nariño', 'Cauca', 'Córdoba', 'Magdalena', 'Tolima',
];

/** Palabras clave de sector reconocidas por el parser. */
const SECTOR_KEYWORDS: Record<string, string> = {
  psmv: 'PSMV',
  acueducto: 'Acueducto',
  alcantarillado: 'Alcantarillado',
  ptar: 'PTAR',
  ptap: 'PTAP',
  saneamiento: 'Saneamiento',
  interventoría: 'Interventoría',
  interventoria: 'Interventoría',
};

function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parser por palabras clave — NO es NLP real. Traduce texto libre a pills de
 * filtro objetivas (sector, ubicación) y deja el resto como texto libre.
 * No parsea plazos ("7 días"): sin fecha de cierre exacta en el dataset, esa
 * pill no tendría nada real que filtrar.
 */
export function parseSearchQuery(raw: string): FilterPill[] {
  const text = raw.trim();
  if (!text) return [];

  const pills: FilterPill[] = [];
  let remainder = text;

  for (const [kw, label] of Object.entries(SECTOR_KEYWORDS)) {
    const re = new RegExp(`\\b${escapeForRegex(kw)}\\b`, 'i');
    if (re.test(remainder)) {
      pills.push({ id: `sector:${label}`, type: 'sector', label, value: label });
      remainder = remainder.replace(new RegExp(escapeForRegex(kw), 'ig'), '').trim();
    }
  }

  for (const dep of DEPARTAMENTOS_CONOCIDOS) {
    const re = new RegExp(`\\b${escapeForRegex(dep)}\\b`, 'i');
    if (re.test(remainder)) {
      pills.push({ id: `ubicacion:${dep}`, type: 'ubicacion', label: dep, value: dep });
      remainder = remainder.replace(new RegExp(escapeForRegex(dep), 'ig'), '').trim();
    }
  }

  remainder = remainder.replace(/\s{2,}/g, ' ').trim();
  if (remainder) {
    pills.push({ id: `texto:${remainder.toLowerCase()}`, type: 'texto', label: `"${remainder}"`, value: remainder });
  }

  return pills;
}

export interface DiscoveryQueryPlan {
  /** Lo que sí se manda como filtro server-side. */
  query: SecopQuery;
  /** Pills que no caben en un único SecopQuery (más de un texto/sector, o
   *  atributos que /api/secop no filtra) — se re-chequean sobre la página
   *  ya traída, client-side. */
  residualPills: FilterPill[];
}

const DISCOVERY_PAGE_SIZE = 60;

/**
 * Traduce las pills activas a un SecopQuery. `q` y `departamento` son
 * parámetros únicos en /api/secop (una sola búsqueda de texto libre, un solo
 * departamento) — si hay más de un pill del mismo tipo, el primero gana el
 * query param y el resto pasa a `residualPills` para filtrarse sobre la
 * página ya traída.
 */
export function buildDiscoveryQuery(pills: FilterPill[]): DiscoveryQueryPlan {
  const query: SecopQuery = { soloAgua: true, pageSize: DISCOVERY_PAGE_SIZE, orden: 'fecha' };
  const residualPills: FilterPill[] = [];
  let qUsed = false;
  let departamentoUsed = false;

  for (const pill of pills) {
    switch (pill.type) {
      case 'ubicacion':
        if (!departamentoUsed) {
          query.departamento = pill.value;
          departamentoUsed = true;
        } else {
          residualPills.push(pill);
        }
        break;
      case 'sector':
      case 'texto':
        if (!qUsed) {
          query.q = pill.value;
          qUsed = true;
        } else {
          residualPills.push(pill);
        }
        break;
      case 'coleccion':
        if (pill.value === 'alto-valor') {
          query.valorMin = ALTO_VALOR_MIN;
          query.orden = 'valor';
        } else if (pill.value === 'abiertos-sin-adjudicar') {
          query.apertura = 'Abierto';
        }
        // Todas las colecciones también se re-chequean client-side: valorMin
        // filtra por precioBase pero la colección exige lo mismo semántico,
        // y adjudicado/documentAccess no son query params de /api/secop.
        residualPills.push(pill);
        break;
    }
  }

  return { query, residualPills };
}

function normalize(s: string | null | undefined): string {
  return (s ?? '').toLowerCase();
}

/** Re-chequeo client-side de una pill sobre un proceso ya traído del servidor. */
export function matchesResidualPill(item: SecopProceso, pill: FilterPill): boolean {
  switch (pill.type) {
    case 'ubicacion':
      return normalize(item.departamento) === pill.value.toLowerCase();
    case 'sector':
    case 'texto': {
      const q = pill.value.toLowerCase();
      return (
        normalize(item.nombre).includes(q) ||
        normalize(item.descripcion).includes(q) ||
        normalize(item.entidad).includes(q)
      );
    }
    case 'coleccion':
      if (pill.value === 'listos-para-extraer') return canExtract(item.documentAccess);
      if (pill.value === 'abiertos-sin-adjudicar') return item.estadoApertura === 'Abierto' && !item.adjudicado;
      if (pill.value === 'alto-valor') return (item.precioBase ?? 0) >= ALTO_VALOR_MIN;
      return true;
    default:
      return true;
  }
}

export function filterByResidualPills(items: SecopProceso[], pills: FilterPill[]): SecopProceso[] {
  if (pills.length === 0) return items;
  return items.filter((item) => pills.every((pill) => matchesResidualPill(item, pill)));
}

/** Serializa un SecopQuery a query string para `fetch('/api/secop?' + ...)`. */
export function secopQueryToSearchParams(query: SecopQuery): URLSearchParams {
  const sp = new URLSearchParams();
  if (query.q) sp.set('q', query.q);
  if (query.departamento) sp.set('departamento', query.departamento);
  if (query.estado) sp.set('estado', query.estado);
  if (query.valorMin != null) sp.set('valorMin', String(query.valorMin));
  if (query.desde) sp.set('desde', query.desde);
  if (query.apertura) sp.set('apertura', query.apertura);
  if (query.orden) sp.set('orden', query.orden);
  if (query.soloAgua === false) sp.set('soloAgua', 'false');
  if (query.page != null) sp.set('page', String(query.page));
  if (query.pageSize != null) sp.set('pageSize', String(query.pageSize));
  return sp;
}
