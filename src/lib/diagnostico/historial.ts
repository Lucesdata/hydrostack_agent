/**
 * Historial de diagnósticos: qué cambió entre uno y el siguiente.
 *
 * El veredicto de la banda más baja termina prometiendo que "en dos meses
 * tendrás un panorama distinto". Esto es lo que cierra esa promesa: sirve para
 * ver si el panorama cambió de verdad.
 *
 * La sutileza está en con QUÉ comparar. Un usuario puede haber respondido el
 * cuestionario de la Ley 80 y el de empresas de servicios públicos, y sus
 * puntajes **no son comparables**: son escalas distintas sobre preguntas
 * distintas. Restarlos daría un número con aspecto de progreso y sin
 * significado. Por eso la variación solo se calcula contra el diagnóstico
 * anterior **de la misma versión**, y queda en `null` cuando no lo hay.
 */

import type { DiagnosticoGuardado } from "./diagnostico-store";

export interface EntradaHistorial {
  diagnostico: DiagnosticoGuardado;
  /**
   * Diferencia de puntaje contra el anterior de su MISMA versión.
   * `null` si es el primero de esa versión — no hay con qué comparar.
   */
  variacion: number | null;
  /** Cuántos bloqueantes resolvió respecto a ese mismo anterior. `null` igual. */
  bloqueantesResueltos: number | null;
}

/**
 * Recibe los diagnósticos del más reciente al más antiguo (como los devuelve
 * el store) y los anota con su variación. Función pura.
 */
export function construirHistorial(
  diagnosticos: readonly DiagnosticoGuardado[]
): EntradaHistorial[] {
  return diagnosticos.map((d, i) => {
    // El siguiente en la lista es el inmediatamente ANTERIOR en el tiempo:
    // llegan en orden descendente.
    const previo = diagnosticos.slice(i + 1).find((p) => p.version === d.version);
    if (!previo) {
      return { diagnostico: d, variacion: null, bloqueantesResueltos: null };
    }
    const antes = new Set(previo.bloqueantes);
    const ahora = new Set(d.bloqueantes);
    return {
      diagnostico: d,
      variacion: d.puntajeTotal - previo.puntajeTotal,
      bloqueantesResueltos: [...antes].filter((id) => !ahora.has(id)).length,
    };
  });
}

/** Cuántas versiones distintas de cuestionario aparecen en el historial. */
export function versionesEnHistorial(diagnosticos: readonly DiagnosticoGuardado[]): string[] {
  return [...new Set(diagnosticos.map((d) => d.version))];
}
