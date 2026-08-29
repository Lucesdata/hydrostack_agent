/**
 * Motor del diagnóstico — función pura, sin I/O, sin IA.
 *
 * Espeja el papel de [secop/verdict.ts] en el otro dominio: aquí está TODA la
 * lógica y ningún dato. El contenido vive en ./cuestionario/*.ts y se resuelve
 * por ./registro.ts; la persistencia, en ./diagnostico-store.ts. El motor no
 * importa ningún catálogo concreto: recibe el que le toque, y por eso sirve
 * igual para un cuestionario de 10 preguntas que para uno de 8. Un mismo conjunto de respuestas
 * produce siempre el mismo resultado, incluido el orden de los arrays — el
 * recorrido es sobre `PREGUNTAS` y `CATEGORIAS`, nunca sobre las claves del
 * objeto de entrada, cuyo orden de inserción no es de fiar.
 *
 * Las reglas están transcritas del prototipo de referencia (ver
 * docs/diagnostico/02-cuestionario-co-apsb-v1.md §3), con una sola adición
 * documentada: `bloqueoAbsoluto` (§5.1). El prototipo escribe el puntaje con
 * una expresión más rebuscada (`liveScore`), pero como el máximo total es
 * exactamente 100 se reduce a la suma simple de puntos; el resultado es
 * idéntico y está cubierto por test.
 */

import { CUESTIONARIO_VIGENTE } from "./registro";
import type {
  BandaPreparacion,
  CategoriaId,
  Cuestionario,
  EstadoArea,
  RemedioId,
  RespuestasDiagnostico,
  ResultadoDiagnostico,
} from "./types";

// ===========================================================================
//  Escalas
// ===========================================================================

/** Umbrales del veredicto, literales del prototipo. */
export function bandaDePuntaje(puntaje: number): BandaPreparacion {
  if (puntaje >= 78) return "listo";
  if (puntaje >= 58) return "casi";
  if (puntaje >= 35) return "en_camino";
  return "inicio";
}

/**
 * Etiqueta de una barra por área. Escala propia (75/45), deliberadamente
 * distinta a la de las bandas del veredicto (78/58/35) — son dos lecturas
 * diferentes y el prototipo las mantiene separadas.
 */
export function estadoArea(porcentaje: number): EstadoArea {
  if (porcentaje >= 75) return "listo";
  if (porcentaje >= 45) return "parcial";
  return "pendiente";
}

/**
 * Los bloqueantes que rigen en cualquier modalidad. Se deriva del catálogo, no
 * se guarda, y el store lo recalcula al leer. Conserva el orden de la lista.
 */
export function filtrarBloqueoAbsoluto(
  bloqueantes: readonly RemedioId[],
  remedios: Cuestionario["remedios"]
): RemedioId[] {
  return bloqueantes.filter((f) => remedios[f]?.absoluto);
}

// ===========================================================================
//  Guard de frontera
// ===========================================================================

/**
 * Valida la entrada que llega de fuera (body de `/api/diagnostico`, fila de
 * `diagnostico.respuestas`). Devuelve un objeto nuevo con solo las 10 claves
 * del cuestionario — descarta lo que sobre — o `null` si algo no cuadra.
 *
 * Convención del repo: guard puro que devuelve `null`, no excepciones ni zod
 * (ver [oferente/validate.ts], [pliego/schema.ts]).
 */
export function parseRespuestas(
  input: unknown,
  cuestionario: Cuestionario = CUESTIONARIO_VIGENTE
): RespuestasDiagnostico | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const crudo = input as Record<string, unknown>;
  const salida = {} as RespuestasDiagnostico;

  for (const pregunta of cuestionario.preguntas) {
    const valor = crudo[pregunta.key];
    if (typeof valor !== "number" || !Number.isInteger(valor)) return null;
    if (valor < 0 || valor >= pregunta.opciones.length) return null;
    salida[pregunta.key] = valor;
  }
  return salida;
}

// ===========================================================================
//  Motor
// ===========================================================================

/**
 * Calcula el resultado completo. Asume respuestas ya validadas: un índice
 * fuera de rango es un error de programación, no un dato de usuario, así que
 * falla ruidosamente en vez de devolver un puntaje silenciosamente incorrecto.
 * Usa `parseRespuestas` en la frontera.
 */
export function calcularDiagnostico(
  respuestas: RespuestasDiagnostico,
  cuestionario: Cuestionario = CUESTIONARIO_VIGENTE
): ResultadoDiagnostico {
  let obtenido = 0;
  let maximo = 0;
  const flagsEnOrden: RemedioId[] = [];
  const acumuladoArea = new Map<CategoriaId, { obtenido: number; maximo: number }>(
    cuestionario.categorias.map((c) => [c.id, { obtenido: 0, maximo: 0 }])
  );
  /** Puntos por pregunta — los necesita la escalera, que mira preguntas concretas. */
  const puntosPorPregunta = new Map<string, number>();

  for (const pregunta of cuestionario.preguntas) {
    const indice = respuestas[pregunta.key];
    const opcion = pregunta.opciones[indice];
    if (!opcion) {
      throw new RangeError(
        `Respuesta inválida para "${pregunta.key}": índice ${indice} fuera de rango`
      );
    }
    const maxPregunta = Math.max(...pregunta.opciones.map((o) => o.puntos));

    obtenido += opcion.puntos;
    maximo += maxPregunta;
    puntosPorPregunta.set(pregunta.key, opcion.puntos);
    if (opcion.flag) flagsEnOrden.push(opcion.flag);

    const area = acumuladoArea.get(pregunta.categoria);
    if (area) {
      area.obtenido += opcion.puntos;
      area.maximo += maxPregunta;
    }
  }

  // Porcentaje sobre el máximo alcanzable, no suma cruda: así un cuestionario
  // de 8 preguntas comparte escala, bandas y UI con uno de 10. En co-apsb-v1
  // ambas coinciden, porque su máximo es justo 100.
  const puntajeTotal = maximo === 0 ? 0 : Math.round((obtenido / maximo) * 100);

  const puntajeAreas = {} as Record<CategoriaId, number>;
  for (const categoria of cuestionario.categorias) {
    const acumulado = acumuladoArea.get(categoria.id);
    const max = acumulado?.maximo ?? 0;
    puntajeAreas[categoria.id] = max === 0 ? 0 : Math.round((acumulado!.obtenido / max) * 100);
  }

  // Plan de acción: los hard primero, luego los soft, cada grupo conservando el
  // orden de las preguntas. Ningún flag se repite entre preguntas, así que no
  // hace falta deduplicar (hay un test que lo blinda).
  const bloqueantes = [
    ...flagsEnOrden.filter((f) => cuestionario.remedios[f]?.severidad === "hard"),
    ...flagsEnOrden.filter((f) => cuestionario.remedios[f]?.severidad === "soft"),
  ];

  return {
    version: cuestionario.version,
    puntajeTotal,
    banda: bandaDePuntaje(puntajeTotal),
    puntajeAreas,
    // Ausentes cuando el cuestionario no los tiene: la Ley 142 no tiene
    // escalera ni pregunta por el RUP.
    escalon: cuestionario.escalon?.(puntosPorPregunta, puntajeTotal) ?? null,
    estadoRup: cuestionario.estadoRup?.(respuestas) ?? null,
    bloqueantes,
    bloqueoAbsoluto: filtrarBloqueoAbsoluto(bloqueantes, cuestionario.remedios),
  };
}
