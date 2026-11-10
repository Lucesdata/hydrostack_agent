/**
 * Detector PURO de cambios de contrato (CI-07). Sin SQL ni IO.
 *
 * Contexto: `contrato_evento` se eliminó el 2026-08-16 (drizzle/0011) y dejó sin
 * historial a `valor_actual`, `fecha_fin_actual` y `estado_actual`, que son
 * fotos que la ingesta sobrescribe. Este módulo compara la foto guardada
 * (`ci_contrato_estado`) con la nueva y devuelve QUÉ campos cambiaron; no dice
 * por qué. «Prórroga» o «adición» son lecturas de producto sobre el sentido del
 * cambio, y un cambio detectado NO es una adenda oficial.
 *
 * Reglas:
 *  · Sin línea base previa no hay cambios: se siembra en silencio (lo contrario
 *    inventaría miles de «cambios» el primer día).
 *  · Un campo que la fuente deja en blanco NO es un cambio: no se borra lo que
 *    ya se sabía (un blanco suele ser centinela o dato no publicado).
 *  · El dinero se compara como decimal exacto, sin pasar por float.
 */

export const CAMPOS_CONTRATO = ["valor_actual", "fecha_fin_actual", "estado_actual"] as const;
export type CampoContrato = (typeof CAMPOS_CONTRATO)[number];

/** Foto que se guarda y se compara. Todo en texto (las fechas como YYYY-MM-DD). */
export interface EstadoContrato {
  valorActual: string | null;
  fechaFinActual: string | null;
  estadoActual: string | null;
}

export interface CambioContrato {
  campo: CampoContrato;
  valorAnterior: string | null;
  valorNuevo: string;
}

/** Decimal canónico: sin ceros a la derecha del punto. `null` si no es un número. */
export function normalizarValor(v: string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const t = v.trim();
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  if (!t.includes(".")) return t;
  const sinCeros = t.replace(/0+$/, "").replace(/\.$/, "");
  return sinCeros === "-0" ? "0" : sinCeros;
}

function normalizarTexto(v: string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const t = v.trim().replace(/\s+/g, " ");
  return t === "" ? null : t;
}

function normalizarFecha(v: string | null | undefined): string | null {
  const t = normalizarTexto(v);
  return t && /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : null;
}

/** Normaliza una foto: lo que queda es lo que se compara y se guarda. */
export function normalizarEstado(e: EstadoContrato): EstadoContrato {
  return {
    valorActual: normalizarValor(e.valorActual),
    fechaFinActual: normalizarFecha(e.fechaFinActual),
    estadoActual: normalizarTexto(e.estadoActual),
  };
}

export function detectarCambiosContrato(
  anterior: EstadoContrato | null,
  nuevo: EstadoContrato
): CambioContrato[] {
  if (anterior === null) return [];
  const a = normalizarEstado(anterior);
  const n = normalizarEstado(nuevo);
  const pares: [CampoContrato, string | null, string | null][] = [
    ["valor_actual", a.valorActual, n.valorActual],
    ["fecha_fin_actual", a.fechaFinActual, n.fechaFinActual],
    ["estado_actual", a.estadoActual, n.estadoActual],
  ];
  const cambios: CambioContrato[] = [];
  for (const [campo, antes, despues] of pares) {
    if (despues === null) continue; // un blanco no es un cambio
    if (antes !== despues) cambios.push({ campo, valorAnterior: antes, valorNuevo: despues });
  }
  return cambios;
}

function compararDecimales(a: string, b: string): number {
  const [ai, af = ""] = a.replace("-", "").split(".");
  const [bi, bf = ""] = b.replace("-", "").split(".");
  const len = Math.max(af.length, bf.length);
  const ea = BigInt(ai + af.padEnd(len, "0")) * (a.startsWith("-") ? -1n : 1n);
  const eb = BigInt(bi + bf.padEnd(len, "0")) * (b.startsWith("-") ? -1n : 1n);
  return ea === eb ? 0 : ea > eb ? 1 : -1;
}

export type Sentido = "aumento" | "disminucion" | "cambio";

/**
 * Hacia dónde fue el cambio. Se calcula al leer, no se guarda. Sin valor
 * anterior no se afirma sentido; el estado nunca tiene sentido numérico.
 */
export function sentidoDelCambio(
  campo: CampoContrato,
  antes: string | null,
  despues: string | null
): Sentido {
  if (antes === null || despues === null || campo === "estado_actual") return "cambio";
  const c =
    campo === "valor_actual" ? compararDecimales(antes, despues) : antes.localeCompare(despues);
  return c < 0 ? "aumento" : c > 0 ? "disminucion" : "cambio";
}
