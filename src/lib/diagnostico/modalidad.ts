/**
 * Modalidad de contratación del proceso → escalón del diagnóstico.
 *
 * Cierra el enlace entre el diagnóstico y el catálogo: el escalón dice a qué
 * puede aspirar hoy el oferente y `proceso.modalidad` dice qué exige cada
 * proceso. Cruzarlos permite avisar —sin adivinar nada— cuando un proceso está
 * por encima de su alcance actual.
 *
 * La tabla de equivalencias NO está inventada: sale de un
 * `SELECT DISTINCT modalidad FROM proceso` sobre los datos reales
 * (2026-08-28, 15 valores distintos sobre ~89 000 filas). `modalidad` es texto
 * libre de SECOP, con variantes de acento, mayúsculas y sufijos, así que la
 * comparación se hace sobre el texto normalizado y por contención, no por
 * igualdad.
 *
 * Devolver `null` es una respuesta legítima y frecuente: régimen especial
 * (Ley 142), contratación directa, concurso de méritos y solicitudes de
 * información no están en la escalera de tres peldaños del diagnóstico. Es
 * preferible callar a encajarlos a la fuerza en un escalón que no les
 * corresponde.
 */

import type { EscalonContratacion } from "./types";

/** De menor a mayor exigencia. El índice es el orden de la escalera. */
export const ORDEN_ESCALON: readonly EscalonContratacion[] = [
  "minima_cuantia",
  "menor_cuantia",
  "licitacion_publica",
];

/** minúsculas, sin acentos y sin espacios repetidos. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Reglas en orden: la primera que coincide gana. El orden importa —
 * "licitacion publica acuerdo marco de precios" y "licitacion publica obra
 * publica" comparten prefijo, y "seleccion abreviada subasta inversa" no dice
 * "menor cuantia" pero exige RUP igual que ella.
 */
const REGLAS: ReadonlyArray<{ contiene: string; escalon: EscalonContratacion }> = [
  { contiene: "minima cuantia", escalon: "minima_cuantia" },
  { contiene: "licitacion publica", escalon: "licitacion_publica" },
  { contiene: "menor cuantia", escalon: "menor_cuantia" },
  // Subasta inversa es selección abreviada: pide RUP, experiencia e
  // indicadores, el mismo listón que la menor cuantía.
  { contiene: "seleccion abreviada", escalon: "menor_cuantia" },
];

/**
 * Escalón que exige esta modalidad, o `null` si no corresponde a ninguno de
 * los tres peldaños (régimen especial, contratación directa, concurso de
 * méritos, solicitud de información…).
 */
export function normalizarModalidad(
  modalidad: string | null | undefined
): EscalonContratacion | null {
  if (!modalidad) return null;
  const texto = normalizar(modalidad);
  for (const regla of REGLAS) {
    if (texto.includes(regla.contiene)) return regla.escalon;
  }
  return null;
}

/** ¿El oferente alcanza hoy este escalón? Alcanzar uno implica los de abajo. */
export function alcanzaEscalon(
  escalonOferente: EscalonContratacion,
  escalonProceso: EscalonContratacion
): boolean {
  return ORDEN_ESCALON.indexOf(escalonOferente) >= ORDEN_ESCALON.indexOf(escalonProceso);
}

/**
 * Aviso para un proceso que exige más de lo que el oferente alcanza hoy.
 * `null` cuando no hay nada que advertir: modalidad fuera de la escalera, o
 * proceso al alcance. Nunca dice que el oferente "no puede" — dice qué exige
 * la modalidad y dónde está él, que es lo único que el diagnóstico sabe.
 */
export function avisoEscalon(
  escalonOferente: EscalonContratacion,
  modalidad: string | null | undefined
): string | null {
  const escalonProceso = normalizarModalidad(modalidad);
  if (!escalonProceso) return null;
  if (alcanzaEscalon(escalonOferente, escalonProceso)) return null;
  return ETIQUETA[escalonProceso];
}

const ETIQUETA: Record<EscalonContratacion, string> = {
  minima_cuantia: "Exige más de lo que alcanzas hoy",
  menor_cuantia: "Pide RUP e indicadores",
  licitacion_publica: "Licitación pública",
};
