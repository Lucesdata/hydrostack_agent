/**
 * Registro de cuestionarios por versión.
 *
 * Único sitio que conoce qué catálogos existen. El motor, el store y la UI
 * resuelven por aquí en vez de importar un catálogo concreto: añadir una
 * variante (p. ej. `co-esp-v1` para empresas de servicios públicos, ver
 * docs/diagnostico/04-propuesta-co-esp-v1.md) es registrarla aquí y nada más.
 *
 * Los cuestionarios viejos NUNCA se retiran de este mapa aunque dejen de
 * ofrecerse: hay filas en `diagnostico` que apuntan a ellos y su resultado
 * tiene que seguir siendo interpretable.
 */

import { CUESTIONARIO_CO_APSB_V1 } from "./cuestionario/co-apsb-v1";
import type { Cuestionario } from "./types";

const CUESTIONARIOS: Readonly<Record<string, Cuestionario>> = {
  [CUESTIONARIO_CO_APSB_V1.version]: CUESTIONARIO_CO_APSB_V1,
};

/** El que se ofrece hoy a quien entra a /diagnostico. */
export const CUESTIONARIO_VIGENTE: Cuestionario = CUESTIONARIO_CO_APSB_V1;

/**
 * Catálogo de esa versión, o `null` si no se conoce — una fila guardada por
 * una versión que ya no está en el binario. Los consumidores deben degradar
 * en vez de asumir el catálogo vigente, que produciría textos que no
 * corresponden a lo que esa persona respondió.
 */
export function getCuestionario(version: string): Cuestionario | null {
  return CUESTIONARIOS[version] ?? null;
}

/** Versiones registradas, para diagnósticos y tests. */
export function versionesRegistradas(): string[] {
  return Object.keys(CUESTIONARIOS);
}
