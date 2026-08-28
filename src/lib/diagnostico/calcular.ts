/**
 * Motor del diagnóstico — función pura, sin I/O, sin IA.
 *
 * Espeja el papel de [secop/verdict.ts] en el otro dominio: aquí está TODA la
 * lógica y ningún dato. El contenido vive en ./cuestionario/co-apsb-v1.ts, la
 * persistencia en ./diagnostico-store.ts. Un mismo conjunto de respuestas
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

import {
  CATEGORIAS,
  PREGUNTAS,
  REMEDIOS,
  VERSION_CUESTIONARIO,
} from "./cuestionario/co-apsb-v1";
import type {
  BandaPreparacion,
  CategoriaId,
  EscalonContratacion,
  EstadoArea,
  EstadoRup,
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

/** Estado del RUP según la opción escogida en la pregunta 1, por posición. */
const ESTADO_RUP_POR_OPCION: readonly EstadoRup[] = [
  "vigente",
  "sin_renovar",
  "no_inscrito",
  "desconocido",
];

/**
 * Estado del RUP declarado. Extraído aparte de `calcularDiagnostico` porque el
 * store lo necesita para reconstruirlo desde una fila guardada: no es columna,
 * se deriva de las respuestas.
 */
export function estadoRupDeRespuestas(respuestas: RespuestasDiagnostico): EstadoRup {
  return ESTADO_RUP_POR_OPCION[respuestas.rup] ?? "desconocido";
}

/**
 * Los bloqueantes que rigen en cualquier modalidad. Igual que el anterior: se
 * deriva del catálogo, no se guarda, y el store lo recalcula al leer.
 * Conserva el orden de la lista que recibe.
 */
export function filtrarBloqueoAbsoluto(bloqueantes: readonly RemedioId[]): RemedioId[] {
  return bloqueantes.filter((f) => REMEDIOS[f]?.absoluto);
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
export function parseRespuestas(input: unknown): RespuestasDiagnostico | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const crudo = input as Record<string, unknown>;
  const salida = {} as RespuestasDiagnostico;

  for (const pregunta of PREGUNTAS) {
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
export function calcularDiagnostico(respuestas: RespuestasDiagnostico): ResultadoDiagnostico {
  let puntajeTotal = 0;
  const flagsEnOrden: RemedioId[] = [];
  const acumuladoArea = new Map<CategoriaId, { obtenido: number; maximo: number }>(
    CATEGORIAS.map((c) => [c.id, { obtenido: 0, maximo: 0 }])
  );
  /** Puntos por pregunta — los necesita la escalera, que mira dos preguntas concretas. */
  const puntosPorPregunta = new Map<string, number>();

  for (const pregunta of PREGUNTAS) {
    const indice = respuestas[pregunta.key];
    const opcion = pregunta.opciones[indice];
    if (!opcion) {
      throw new RangeError(
        `Respuesta inválida para "${pregunta.key}": índice ${indice} fuera de rango`
      );
    }

    puntajeTotal += opcion.puntos;
    puntosPorPregunta.set(pregunta.key, opcion.puntos);
    if (opcion.flag) flagsEnOrden.push(opcion.flag);

    const area = acumuladoArea.get(pregunta.categoria)!;
    area.obtenido += opcion.puntos;
    area.maximo += Math.max(...pregunta.opciones.map((o) => o.puntos));
  }

  const puntajeAreas = {} as Record<CategoriaId, number>;
  for (const categoria of CATEGORIAS) {
    const { obtenido, maximo } = acumuladoArea.get(categoria.id)!;
    puntajeAreas[categoria.id] = maximo === 0 ? 0 : Math.round((obtenido / maximo) * 100);
  }

  // Plan de acción: los hard primero, luego los soft, cada grupo conservando el
  // orden de las preguntas. Ningún flag se repite entre preguntas, así que no
  // hace falta deduplicar (hay un test que lo blinda).
  const bloqueantes = [
    ...flagsEnOrden.filter((f) => REMEDIOS[f].severidad === "hard"),
    ...flagsEnOrden.filter((f) => REMEDIOS[f].severidad === "soft"),
  ];

  return {
    version: VERSION_CUESTIONARIO,
    puntajeTotal,
    banda: bandaDePuntaje(puntajeTotal),
    puntajeAreas,
    escalon: calcularEscalon(puntosPorPregunta, puntajeTotal),
    estadoRup: estadoRupDeRespuestas(respuestas),
    bloqueantes,
    bloqueoAbsoluto: filtrarBloqueoAbsoluto(bloqueantes),
  };
}

/**
 * Escalón al que se puede aspirar hoy. No se deriva de la banda: son dos ejes.
 * Nótese que sin RUP vigente el escalón cae a mínima cuantía por construcción
 * —que es justo la modalidad que no exige RUP—, y por eso `rup_no` y
 * `rup_vencido` no necesitan ser bloqueantes absolutos (02-cuestionario §5.2).
 */
function calcularEscalon(
  puntosPorPregunta: Map<string, number>,
  puntajeTotal: number
): EscalonContratacion {
  const tieneRup = (puntosPorPregunta.get("rup") ?? 0) >= 10;
  const tieneExperiencia = (puntosPorPregunta.get("exp") ?? 0) >= 8;

  if (tieneRup && tieneExperiencia && puntajeTotal >= 70) return "licitacion_publica";
  if (tieneRup && puntajeTotal >= 55) return "menor_cuantia";
  return "minima_cuantia";
}
