/**
 * Diagnóstico de preparación para licitar — contrato de tipos.
 *
 * Dominio del USUARIO que se autoevalúa antes de ofertar. Es la otra mitad del
 * "quién soy" del producto: `OferenteProfile` ([oferente/types.ts]) describe la
 * capacidad CUANTIFICADA (indicadores RUP, contratos en SMMLV) que consume
 * `habilitacionGate`; este módulo describe la preparación DECLARADA
 * (¿tienes RUP?, ¿estás al día en PILA?), que es cualitativa y no la sustituye.
 * Ver docs/diagnostico/02-cuestionario-co-apsb-v1.md §4.
 *
 * Convención del repo: interfaces planas y union types, sin clases ni zod. El
 * equivalente de un "value object" aquí es un union type más un guard puro,
 * igual que `GateStatus` en [secop/verdict.ts] o `PerfilMinimo` en
 * [oferente/perfil-minimo.ts].
 *
 * El contenido concreto (preguntas, puntajes, remedios) NO vive aquí: vive
 * versionado en ./cuestionario/co-apsb-v1.ts, para que un cambio normativo
 * futuro no invalide los diagnósticos ya respondidos.
 */

// ===========================================================================
//  Identificadores del cuestionario co-apsb-v1
// ===========================================================================

/** Las 10 preguntas, en el orden en que se presentan. */
export type PreguntaKey =
  "rup" | "unspsc" | "exp" | "fin" | "secop" | "poliza" | "tec" | "pila" | "antec" | "union";

/**
 * Las 6 categorías. Se usan como clave de `puntajeAreas` (jsonb), por eso son
 * slugs estables y no las etiquetas visibles — renombrar una etiqueta no debe
 * romper los diagnósticos guardados.
 */
export type CategoriaId =
  "juridica" | "experiencia" | "financiera" | "tecnica" | "secop" | "estrategia";

/** Los 17 remedios del catálogo. Un id por bloqueante detectable. */
export type RemedioId =
  | "antec_mal"
  | "pila_mora"
  | "rup_no"
  | "rup_vencido"
  | "fin_no"
  | "secop_no"
  | "fin_atraso"
  | "secop_frio"
  | "unspsc"
  | "exp_cero"
  | "exp_informal"
  | "poliza"
  | "tec"
  | "antec_rev"
  | "pila_sin"
  | "solo";

// ===========================================================================
//  Escalas derivadas
// ===========================================================================

/** Banda del veredicto. Umbrales en `bandaDePuntaje`. */
export type BandaPreparacion = "listo" | "casi" | "en_camino" | "inicio";

/** Escalón de contratación al que el oferente puede aspirar hoy. */
export type EscalonContratacion = "minima_cuantia" | "menor_cuantia" | "licitacion_publica";

/**
 * Estado del RUP declarado, derivado de la pregunta 1. Es el dato del
 * diagnóstico con más consecuencias aguas abajo: alimenta el aviso de
 * bloqueante a nivel de cuenta (Fase 4) y explica el escalón.
 */
export type EstadoRup = "vigente" | "sin_renovar" | "no_inscrito" | "desconocido";

/**
 * `hard` = trámite que hay que resolver antes de ofertar en su escalón.
 * `soft` = mejora que no impide presentarse.
 */
export type SeveridadBloqueante = "hard" | "soft";

/** Etiqueta de una barra por área en el resultado. */
export type EstadoArea = "listo" | "parcial" | "pendiente";

// ===========================================================================
//  Contenido (lo que implementa ./cuestionario/co-apsb-v1.ts)
// ===========================================================================

export interface Categoria {
  id: CategoriaId;
  /** Etiqueta visible, literal del prototipo. */
  label: string;
}

export interface OpcionPregunta {
  /** Texto literal de la opción. El orden fija el atajo de teclado (1..n). */
  texto: string;
  /** 0..10. El máximo de cada pregunta es 10 y hay 10 preguntas → total 0..100. */
  puntos: number;
  /** Remedio que dispara esta opción, si dispara alguno. */
  flag?: RemedioId;
}

export interface Pregunta {
  key: PreguntaKey;
  categoria: CategoriaId;
  texto: string;
  ayuda: string;
  opciones: readonly OpcionPregunta[];
}

export interface Remedio {
  id: RemedioId;
  severidad: SeveridadBloqueante;
  /**
   * Bloquea en CUALQUIER modalidad, mínima cuantía incluida. Solo `antec_mal` y
   * `pila_mora`: los demás `hard` son relativos al escalón, y la escalera ya se
   * autocorrige (sin RUP el escalón cae a mínima cuantía, que no exige RUP).
   * Ver docs/diagnostico/02-cuestionario-co-apsb-v1.md §5.1 y §5.2.
   */
  absoluto: boolean;
  titulo: string;
  detalle: string;
  chips: readonly string[];
}

export interface TextoVeredicto {
  antetitulo: string;
  titulo: string;
  texto: string;
}

export interface Peldano {
  escalon: EscalonContratacion;
  nombre: string;
  descripcion: string;
}

export interface TextoRuta {
  titulo: string;
  texto: string;
}

export interface Mito {
  afirmacion: string;
  respuesta: string;
}

export interface Fact {
  titulo: string;
  texto: string;
}

// ===========================================================================
//  Entrada y salida del motor
// ===========================================================================

/**
 * Respuestas del usuario: clave de pregunta → índice de la opción escogida.
 * Se guarda así (y no el texto) porque es compacto y estable; la trazabilidad
 * la da `version`, que viaja en la misma fila.
 */
export type RespuestasDiagnostico = Record<PreguntaKey, number>;

/** Respuestas parciales — el estado del cuestionario a medio responder. */
export type RespuestasParciales = Partial<RespuestasDiagnostico>;

export interface ResultadoDiagnostico {
  /** Versión del cuestionario que produjo este resultado. Ej.: "co-apsb-v1". */
  version: string;
  /** Suma de puntos de las 10 opciones escogidas. Entero 0..100. */
  puntajeTotal: number;
  banda: BandaPreparacion;
  /** Por categoría, 0..100 sobre el máximo de esa categoría. */
  puntajeAreas: Record<CategoriaId, number>;
  escalon: EscalonContratacion;
  estadoRup: EstadoRup;
  /** Remedios disparados: los `hard` primero, luego los `soft`, cada grupo en orden de pregunta. */
  bloqueantes: RemedioId[];
  /**
   * Subconjunto de `bloqueantes` con `absoluto: true`. Si no está vacío, el
   * resultado muestra un titular propio en vez del de la banda — el puntaje y
   * la banda NO se alteran. Ver 02-cuestionario §5.1.
   */
  bloqueoAbsoluto: RemedioId[];
}
