/**
 * Utilidades puras de presentación para la sección Licitaciones.
 * Sin React ni red: testeables de forma aislada.
 */

import type { Verdict } from "@/src/lib/secop/verdict";
import type { VerdictPublico } from "@/src/lib/secop/verdict-publico";
import { montoConDato } from "@/src/lib/secop/monto";

/** Siglas del sector que deben conservarse en mayúsculas al normalizar títulos. */
const ACRONYMS = [
  "PTAP",
  "PTAR",
  "PTAT",
  "PTARD",
  "ESP",
  "SENA",
  "INVIAS",
  "PDA",
  "SGP",
  "PSMV",
  "PMAA",
  "PUEAA",
  "EPM",
  "EAAB",
  "RUP",
  "SECOP",
  "UNSPSC",
  "GPS",
  "GNSS",
  "PVC",
  "HDPE",
  "PEAD",
  "GRP",
  "II",
  "III",
  "IV",
  "VII",
  "VIII",
  "IX",
  "XI",
  "XII",
];

/**
 * SECOP publica títulos EN MAYÚSCULAS. Los baja a sentence case preservando
 * siglas conocidas. Los títulos que ya vienen en caso mixto no se tocan.
 */
export function sentenceCaseTitle(raw: string): string {
  // SECOP a veces trunca el nombre de la entidad con ".." sobrante (artefacto
  // de exportación, no una abreviatura real como "E.S.P."). Se recorta antes
  // de decidir el casing.
  const s = raw.trim().replace(/\s*\.{2,}$/, "");
  if (!s) return s;
  const letters = s.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g, "");
  const isShouting = letters.length > 0 && letters === letters.toUpperCase();
  if (!isShouting) return s;
  let out = s.toLowerCase();
  for (const a of ACRONYMS) {
    out = out.replace(new RegExp(`\\b${a.toLowerCase()}\\b`, "g"), a);
  }
  return out.charAt(0).toUpperCase() + out.slice(1);
}

const COP_FULL = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

/** Valor COP completo ("$ 2.450.000.000") o guion si es null. */
export function formatCopFull(value: number | null): string {
  return value == null ? "—" : COP_FULL.format(value);
}

/** Valor COP abreviado en millones ("$2.450 M") para la lista compacta. */
export function formatCopCompact(value: number | null): string {
  if (value == null) return "—";
  if (value < 1_000_000) return COP_FULL.format(value);
  const millones = Math.round(value / 1_000_000);
  return `$${millones.toLocaleString("es-CO")} M`;
}

/**
 * El valor de un proceso para una tarjeta: el adjudicado si lo hay, si no el
 * presupuesto. El 0 del SECOP es "sin dato", no "gratis": nunca se pinta "$0".
 */
export function formatValorProceso(p: {
  valorAdjudicacion: number | null;
  precioBase: number | null;
}): string {
  const v = montoConDato(p.valorAdjudicacion) ?? montoConDato(p.precioBase);
  return v == null ? "Sin presupuesto publicado" : formatCopCompact(v);
}

/**
 * Monto agregado en la escala que se usa en Colombia: "$1,96 billones"
 * (10¹²), "$114 mil M" (10⁹); por debajo, igual que `formatCopCompact`.
 * Para sumas de muchos procesos, donde "$1.958.900 M" ya no se lee de un vistazo.
 */
export function formatCopEscala(value: number | null): string {
  if (value == null) return "—";
  const decimal = (n: number) =>
    n.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: n < 10 ? 2 : 1 });
  if (value >= 1e12) {
    const cifra = decimal(value / 1e12);
    // Singular solo para "1 billón" exacto: "1,96 billones" va en plural.
    return `$${cifra} ${cifra === "1" ? "billón" : "billones"}`;
  }
  if (value >= 1e9) return `$${Math.round(value / 1e9).toLocaleString("es-CO")} mil M`;
  return formatCopCompact(value);
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
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d
    .toLocaleDateString("es-CO", { day: "numeric", month: "short" })
    .replace(/\bde\s+/g, "")
    .replace(/\./g, "");
}

export type ScoreTone = "success" | "warn" | "fail" | "neutral";

export interface VerdictScore {
  pass: number;
  total: number;
  tone: ScoreTone;
}

/**
 * Marcador "N de M compuertas". Acepta tanto el veredicto completo como el
 * redactado: solo lee `status`, que la redacción conserva — por eso el
 * marcador sigue existiendo para quien no tiene cuenta.
 */
export function verdictScore(v: Verdict | VerdictPublico): VerdictScore {
  const statuses = Object.values(v.gates).map((g) => g.status);
  const total = statuses.length;
  const pass = statuses.filter((st) => st === "PASS").length;
  if (statuses.every((st) => st === "UNKNOWN")) return { pass, total, tone: "neutral" };
  const tone: ScoreTone = pass >= 4 ? "success" : pass >= 2 ? "warn" : "fail";
  return { pass, total, tone };
}

/** Conteo con separador de miles. `null` → "—", nunca "NaN". */
export function formatConteo(value: number | null): string {
  return value == null ? "—" : value.toLocaleString("es-CO");
}
