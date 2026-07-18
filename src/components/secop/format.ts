/**
 * Utilidades puras de presentación para la sección Licitaciones.
 * Sin React ni red: testeables de forma aislada.
 */

import type { Verdict } from '@/src/lib/secop/verdict';

/** Siglas del sector que deben conservarse en mayúsculas al normalizar títulos. */
const ACRONYMS = ['PTAP', 'PTAR', 'PTAT', 'ESP', 'SENA', 'INVIAS', 'PDA', 'SGP'];

/**
 * SECOP publica títulos EN MAYÚSCULAS. Los baja a sentence case preservando
 * siglas conocidas. Los títulos que ya vienen en caso mixto no se tocan.
 */
export function sentenceCaseTitle(raw: string): string {
  // SECOP a veces trunca el nombre de la entidad con ".." sobrante (artefacto
  // de exportación, no una abreviatura real como "E.S.P."). Se recorta antes
  // de decidir el casing.
  const s = raw.trim().replace(/\s*\.{2,}$/, '');
  if (!s) return s;
  const letters = s.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g, '');
  const isShouting = letters.length > 0 && letters === letters.toUpperCase();
  if (!isShouting) return s;
  let out = s.toLowerCase();
  for (const a of ACRONYMS) {
    out = out.replace(new RegExp(`\\b${a.toLowerCase()}\\b`, 'g'), a);
  }
  return out.charAt(0).toUpperCase() + out.slice(1);
}

const COP_FULL = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** Valor COP completo ("$ 2.450.000.000") o guion si es null. */
export function formatCopFull(value: number | null): string {
  return value == null ? '—' : COP_FULL.format(value);
}

/** Valor COP abreviado en millones ("$2.450 M") para la lista compacta. */
export function formatCopCompact(value: number | null): string {
  if (value == null) return '—';
  if (value < 1_000_000) return COP_FULL.format(value);
  const millones = Math.round(value / 1_000_000);
  return `$${millones.toLocaleString('es-CO')} M`;
}

/**
 * Fecha corta para la fila de lista ("2 jul"). Vacía si null/inválida.
 *
 * La normalización asume la salida ICU/CLDR de es-CO vigente al escribirla
 * (Node 22, ICU 76): `toLocaleDateString` produce "2 de jul" — con "de" y sin
 * punto tras el mes. Si un upgrade de ICU cambia esa forma cruda, el test
 * canario en format.test.ts ("salida ICU cruda") fallará y hay que revisar
 * estos replace().
 */
export function formatShortDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d
    .toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
    .replace(/\bde\s+/g, '')
    .replace(/\./g, '');
}

export type ScoreTone = 'success' | 'warn' | 'fail' | 'neutral';

export interface VerdictScore {
  pass: number;
  total: number;
  tone: ScoreTone;
}

/** Resume el veredicto como score n/5 con tono para el indicador de la lista. */
export function verdictScore(v: Verdict): VerdictScore {
  const statuses = Object.values(v.gates).map((g) => g.status);
  const total = statuses.length;
  const pass = statuses.filter((st) => st === 'PASS').length;
  if (statuses.every((st) => st === 'UNKNOWN')) return { pass, total, tone: 'neutral' };
  const tone: ScoreTone = pass >= 4 ? 'success' : pass >= 2 ? 'warn' : 'fail';
  return { pass, total, tone };
}

/**
 * Sumas grandes del landing (precio_base agregado por mes, proceso de mayor
 * cuantía) que en millones quedarían con 5+ cifras. Se queda en "$X M" hasta
 * mil millones, donde pasa a "$X mil M".
 */
export function formatCopMilM(value: number | null): string | null {
  if (value == null) return null;
  if (value < 1_000_000_000) return formatCopCompact(value);
  const milMillones = (value / 1_000_000_000).toLocaleString('es-CO', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `$${milMillones} mil M`;
}
