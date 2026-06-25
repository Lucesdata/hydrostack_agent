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

// ===========================================================================
//  Fase C — probe on-demand + gate del extractor
// ===========================================================================

/**
 * HALLAZGO VERIFICADO (2026-06-25): la URL pública de SECOP II
 * (`community.secop.gov.co/Public/Tendering/OpportunityDetail`) **redirige a un
 * muro de Google ReCaptcha** (`/Public/Common/GoogleReCaptcha/Index?previousUrl=…`)
 * para clientes no-navegador. Probado en 3 procesos: todos redirigen al captcha.
 *
 * Implicación: un probe server-side NUNCA obtiene el contenido del detalle →
 * cae en el muro → `RESTRICTED`. Eso ES el valor del gate: detectar que el
 * documento no es accesible por máquina y mantenerlo FUERA del extractor (un
 * HTML de captcha alimentado a Hydro_Agent = presupuesto alucinado). `PUBLIC`
 * solo es plausible para una URL de documento descargable directo (PDF), no para
 * la página de detalle. Coherente con `gate-verdict.md` (descarga manual).
 */
const WALL_URL_PATTERNS = [
  '/googlerecaptcha/',
  '/account/login',
  '/common/login',
  '/account/signin',
  'previousurl=', // SECOP II adjunta la url original al redirigir al captcha
];

/** Metadata de la respuesta HTTP del probe (desacoplada del fetch real). */
export interface ProbeResponseInput {
  /** Hubo respuesta (no error de red/timeout). */
  ok: boolean;
  status: number;
  /** URL efectiva tras seguir redirects (clave para detectar el muro). */
  finalUrl: string;
  contentType: string | null;
  /** Muestra del cuerpo (solo si es HTML), para marcadores de captcha/login. */
  bodySample?: string | null;
  error?: string;
}

/**
 * Clasifica la respuesta del probe → estado (PURO, testeable). Centrado en el
 * muro ReCaptcha (ver nota arriba): prioriza la URL final tras redirects.
 */
export function classifyProbeResponse(input: ProbeResponseInput): DocumentAccessResult {
  if (!input.ok) {
    return { state: 'UNKNOWN', reason: `probe sin respuesta${input.error ? `: ${input.error}` : ''}`, method: 'probe' };
  }
  const finalUrl = (input.finalUrl ?? '').toLowerCase();
  const ctype = (input.contentType ?? '').toLowerCase();
  const body = (input.bodySample ?? '').toLowerCase();

  // Muro de captcha/login: la señal más fiable es la URL final tras redirects.
  if (WALL_URL_PATTERNS.some((p) => finalUrl.includes(p)) || body.includes('recaptcha')) {
    return { state: 'RESTRICTED', reason: 'muro ReCaptcha/login: documento no accesible por máquina', method: 'probe' };
  }
  if (input.status === 404 || input.status === 410) {
    return { state: 'NOT_PUBLISHED', reason: `documento no encontrado (HTTP ${input.status})`, method: 'probe' };
  }
  if (input.status === 401 || input.status === 403) {
    return { state: 'RESTRICTED', reason: `acceso denegado (HTTP ${input.status})`, method: 'probe' };
  }
  if (input.status >= 500) {
    return { state: 'UNKNOWN', reason: `error de servidor (HTTP ${input.status})`, method: 'probe' };
  }
  // Documento descargable directo (PDF/binario) sin muro → accesible por máquina.
  if (input.status === 200 && (ctype.includes('application/pdf') || ctype.includes('octet-stream'))) {
    return { state: 'PUBLIC', reason: `documento descargable (${input.contentType})`, method: 'probe' };
  }
  if (input.status === 200) {
    return { state: 'UNKNOWN', reason: 'respuesta 200 sin marcador claro de documento ni de muro', method: 'probe' };
  }
  return { state: 'UNKNOWN', reason: `respuesta inesperada (HTTP ${input.status})`, method: 'probe' };
}

export interface ProbeDeps {
  /** fetch inyectable (tests sin red). Default: fetch global. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  bodySampleBytes?: number;
}

/**
 * C1 — probe ON-DEMAND (jamás en batch nacional): un GET ligero que sigue
 * redirects y clasifica el resultado. Solo lee el cuerpo si es HTML (para
 * marcadores de muro); un PDF no se descarga entero.
 */
export async function probeDocument(url: string | null, deps: ProbeDeps = {}): Promise<DocumentAccessResult> {
  if (!url) {
    return { state: 'NOT_PUBLISHED', reason: 'sin url para probar', method: 'probe' };
  }
  const fetchImpl = deps.fetchImpl ?? fetch;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), deps.timeoutMs ?? 15_000);
  try {
    const res = await fetchImpl(url, {
      redirect: 'follow',
      signal: ctl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (HydroStack probe)' },
    });
    const contentType = res.headers.get('content-type');
    let bodySample: string | null = null;
    if (contentType && contentType.toLowerCase().includes('text/html')) {
      bodySample = (await res.text()).slice(0, deps.bodySampleBytes ?? 4000);
    }
    return classifyProbeResponse({ ok: true, status: res.status, finalUrl: res.url, contentType, bodySample });
  } catch (e) {
    return classifyProbeResponse({
      ok: false,
      status: 0,
      finalUrl: url,
      contentType: null,
      error: e instanceof Error ? e.name : 'error',
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * C2 — gate del extractor: SOLO `PUBLIC` puede llegar a Hydro_Agent. Garantiza
 * que el extractor jamás reciba un HTML de captcha/login → cero líneas de
 * presupuesto alucinadas (parte del pass/fail de Fase 0).
 */
export function canExtract(state: DocumentAccess): boolean {
  return state === 'PUBLIC';
}

/** Lanza si el estado no permite extracción. Usar antes de alimentar el extractor. */
export function assertExtractable(state: DocumentAccess): void {
  if (!canExtract(state)) {
    throw new Error(
      `Gate de acceso documental: estado "${state}" — el extractor solo procesa documentos PUBLIC. ${accessMessage(state)}`,
    );
  }
}
