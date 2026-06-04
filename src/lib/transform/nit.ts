/**
 * Canonicalización de documento de proveedor/entidad (D5, 0.2 §3).
 *
 * El NIT canónico va SIN dígito de verificación (DV). Política D5: validamos el
 * DV pero NO rechazamos — marcamos `nitValidDv` y seguimos. La basura/centinela
 * se resuelve a `null` (no se inventa proveedor; D3). El DV se separa solo
 * cuando viene explícito (guion "900123456-7"); sin guion no asumimos split
 * para no cortar un dígito de una cédula-NIT — guardamos los dígitos como
 * canónico y dejamos `nitValidDv = null` (nada que validar).
 */

import { cleanText, stripAccents } from './normalize';

export interface CanonicalNit {
  /** NIT/documento sin DV. `null` si es basura/centinela. */
  nitCanonico: string | null;
  /** DV observado (con guion) o calculado de referencia. */
  nitDv: string | null;
  /** `true/false` si había DV explícito para validar; `null` si no aplica. */
  nitValidDv: boolean | null;
}

const DV_WEIGHTS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

/** DV oficial colombiano de un NIT (algoritmo DIAN). `null` si no hay dígitos. */
export function computeNitDv(nit: string): string | null {
  const digits = nit.replace(/\D/g, '');
  if (!digits) return null;
  const rev = digits.split('').reverse();
  let sum = 0;
  for (let i = 0; i < rev.length; i++) {
    sum += Number(rev[i]) * DV_WEIGHTS[i % DV_WEIGHTS.length];
  }
  const mod = sum % 11;
  return String(mod > 1 ? 11 - mod : mod);
}

/** Normaliza tipo de documento a un código corto estable. */
export function normalizeTipoDoc(value: unknown): string | null {
  const s = cleanText(value);
  if (s === null) return null;
  const k = stripAccents(s.toLowerCase());
  if (k.includes('nit')) return 'NIT';
  if (k.includes('extranjer')) return 'CE'; // cédula de extranjería
  if (k.includes('ciudadan') || k === 'cc') return 'CC';
  if (k.includes('pasaporte') || k === 'pa') return 'PASAPORTE';
  return s.toUpperCase();
}

export function canonicalizeNit(rawDoc: unknown, tipoDoc?: unknown): CanonicalNit {
  const empty: CanonicalNit = { nitCanonico: null, nitDv: null, nitValidDv: null };
  const cleaned = cleanText(rawDoc);
  if (cleaned === null) return empty;
  const digits = cleaned.replace(/\D/g, '');
  if (!digits) return empty;

  const tipo = normalizeTipoDoc(tipoDoc);

  // Solo el NIT lleva DV. Si viene con guion explícito, separamos y validamos.
  if (tipo === 'NIT' || tipo === null) {
    const dash = /(\d[\d.]*\d|\d)\s*-\s*(\d)\s*$/.exec(cleaned);
    if (dash) {
      const base = dash[1].replace(/\D/g, '');
      const dv = dash[2];
      return { nitCanonico: base, nitDv: dv, nitValidDv: computeNitDv(base) === dv };
    }
    // Sin guion: no asumimos split. Dígitos como canónico + DV de referencia.
    return { nitCanonico: digits, nitDv: computeNitDv(digits), nitValidDv: null };
  }

  // CC/CE/Pasaporte: el documento es el número tal cual, sin DV.
  return { nitCanonico: digits, nitDv: null, nitValidDv: null };
}
