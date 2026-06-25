/**
 * ──────────────────────────────────────────────────────────────────────────
 *  Acceso documental (Fase B2/C) — estados y preclasificación barata
 * ──────────────────────────────────────────────────────────────────────────
 *
 *  Protege el test binario de Fase 0: el extractor de pliegos (Hydro_Agent)
 *  SOLO debe recibir procesos cuyos documentos son realmente descargables. Un
 *  HTML de login alimentado al extractor produce líneas de presupuesto
 *  alucinadas. Este módulo decide qué llega al extractor.
 *
 *  Dos capas (ver spec Fase B/C):
 *   · `preclassify()` — B2, AQUÍ. Solo METADATA, sin HTTP. Barre nacional en cada
 *     transform. Da una bandera PRELIMINAR: descarta lo que claramente no tiene
 *     documentos aún (`NOT_PUBLISHED`) y deja el resto en `UNKNOWN` pendiente de
 *     probe. NUNCA afirma `PUBLIC`: eso exige abrir el documento (Fase C).
 *   · `probeDocument()` — C, on-demand (cuando el usuario abre/se suscribe). Hace
 *     UN GET y resuelve `UNKNOWN` → `PUBLIC | RESTRICTED`. (Pendiente de Fase C.)
 *
 *  `NOT_PUBLISHED` y `UNKNOWN` se RE-EVALÚAN en cada corrida (B3): el estado
 *  cambia con la fase del proceso (un borrador hoy puede publicar mañana).
 * ──────────────────────────────────────────────────────────────────────────
 */

import { stripAccents } from '@/src/lib/transform/normalize';
import { FIELDS_PROCESOS } from './config';

export type DocumentAccess = 'PUBLIC' | 'RESTRICTED' | 'NOT_PUBLISHED' | 'UNKNOWN';

export interface DocumentAccessResult {
  state: DocumentAccess;
  /** Por qué — auditable, para depurar el gate sin adivinar. */
  reason: string;
  /** Cómo se determinó: `metadata` (B2) vs `probe` (C). */
  method: 'metadata' | 'probe';
}

/**
 * Fases/estados en los que los documentos definitivos AÚN no están publicados.
 * Texto normalizado (minúsculas, sin tildes). Conservador: solo señales claras;
 * "Convocado"/"Adjudicado"/"Desierto" NO van aquí (el pliego ya se publicó).
 */
const PRE_PUBLICACION = [
  'planeacion',
  'borrador',
  'proyecto de pliego',
  'aviso de convocatoria', // anuncio previo; los definitivos llegan después
];

function norm(value: unknown): string {
  return typeof value === 'string' ? stripAccents(value.toLowerCase()).trim() : '';
}

/** `urlproceso` llega como objeto `{ url }` o como string. */
export function extractUrl(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'url' in value) {
    const u = (value as { url?: unknown }).url;
    return typeof u === 'string' ? u : null;
  }
  return null;
}

type SecopPortal = 'secop_ii' | 'secop_i' | 'otro';

/** Clasifica el portal por dominio de la URL del proceso. */
export function secopPortal(url: string): SecopPortal {
  const u = url.toLowerCase();
  if (u.includes('secop.gov.co')) return 'secop_ii'; // community.secop.gov.co (SECOP II)
  if (u.includes('contratos.gov.co')) return 'secop_i'; // www.contratos.gov.co (SECOP I legacy)
  return 'otro';
}

/**
 * Preclasificación SOLO con metadata (sin HTTP). Deriva la bandera preliminar de
 * `fase`/`estado_del_procedimiento` + dominio de `urlproceso` + `modalidad`.
 *
 * Resultado: `NOT_PUBLISHED` (sin documentos aún) o `UNKNOWN` (publicado pero
 * requiere probe para confirmar PUBLIC vs RESTRICTED). Nunca `PUBLIC`/`RESTRICTED`
 * — eso lo decide `probeDocument` (Fase C).
 */
export function preclassify(row: Record<string, unknown>): DocumentAccessResult {
  const fase = norm(row[FIELDS_PROCESOS.fase]);
  const estado = norm(row[FIELDS_PROCESOS.estado]);
  const phase = `${fase} ${estado}`.trim();
  const modalidad =
    typeof row[FIELDS_PROCESOS.modalidad] === 'string'
      ? (row[FIELDS_PROCESOS.modalidad] as string)
      : null;
  const url = extractUrl(row[FIELDS_PROCESOS.url]);

  const preMatch = PRE_PUBLICACION.find((p) => phase.includes(p));
  if (preMatch) {
    const label = row[FIELDS_PROCESOS.fase] ?? row[FIELDS_PROCESOS.estado] ?? preMatch;
    return { state: 'NOT_PUBLISHED', reason: `fase pre-publicación (${label})`, method: 'metadata' };
  }

  if (!url) {
    return { state: 'NOT_PUBLISHED', reason: 'sin urlproceso en el dataset', method: 'metadata' };
  }

  const portal = secopPortal(url);
  if (portal === 'secop_i') {
    return {
      state: 'UNKNOWN',
      reason: 'SECOP I (contratos.gov.co): portal distinto, requiere probe específico',
      method: 'metadata',
    };
  }
  if (portal === 'otro') {
    return { state: 'UNKNOWN', reason: 'dominio de urlproceso no reconocido', method: 'metadata' };
  }

  // SECOP II publicado: no se puede confirmar acceso sin abrir el documento.
  return {
    state: 'UNKNOWN',
    reason: `SECOP II publicado${modalidad ? ` (${modalidad})` : ''}: pendiente de probe`,
    method: 'metadata',
  };
}

/** Mensaje para el usuario según el estado (SecopExplorer, Fase D). */
export function accessMessage(state: DocumentAccess): string {
  switch (state) {
    case 'PUBLIC':
      return 'Documentos públicos disponibles.';
    case 'RESTRICTED':
      return 'Documentos restringidos: ábrelos directamente en SECOP II (requiere iniciar sesión).';
    case 'NOT_PUBLISHED':
      return 'Aún sin documentos publicados; vuelve a revisar cuando avance la fase del proceso.';
    case 'UNKNOWN':
      return 'Acceso a documentos por confirmar.';
  }
}
