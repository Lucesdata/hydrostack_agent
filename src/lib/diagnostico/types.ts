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
//  Identificadores
// ===========================================================================

/**
 * Los tres identificadores de abajo son `string` y no uniones cerradas **a
 * propósito**: cada cuestionario trae su propio vocabulario, y una unión que
 * enumere las claves de `co-apsb-v1` haría imposible registrar un segundo
 * catálogo sin editar este archivo — justo lo que el versionado existe para
 * evitar. Cada cuestionario puede exportar su unión estrecha para sus propios
 * tests; el motor trabaja con la forma ancha.
 */

/** Clave de pregunta dentro de su cuestionario. Ej.: "rup", "unspsc". */
export type PreguntaKey = string;

/**
 * Slug de categoría. Se usa como clave de `puntajeAreas` (jsonb), por eso es
 * un slug estable y no la etiqueta visible — renombrar una etiqueta no debe
 * romper los diagnósticos guardados.
 */
export type CategoriaId = string;

/** Id de remedio. Un id por bloqueante detectable. */
export type RemedioId = string;

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
  /**
   * Entero 0..100. Es el porcentaje sobre el máximo alcanzable del
   * cuestionario, no la suma cruda: así dos cuestionarios con distinto número
   * de preguntas comparten escala, bandas y UI. En `co-apsb-v1` coinciden,
   * porque su máximo es justo 100.
   */
  puntajeTotal: number;
  banda: BandaPreparacion;
  /** Por categoría, 0..100 sobre el máximo de esa categoría. */
  puntajeAreas: Record<CategoriaId, number>;
  /**
   * `null` cuando el cuestionario no tiene escalera. La Ley 142 es el caso:
   * bajo derecho privado cada empresa fija sus modalidades en su manual, así
   * que no hay peldaños que asignar. Ver docs/diagnostico/03-variante-ley-142.md.
   */
  escalon: EscalonContratacion | null;
  /**
   * `null` cuando el cuestionario no pregunta por el RUP. Ojo: distinto de
   * `"desconocido"`, que significa que sí se preguntó y la respuesta fue que
   * no saben qué es.
   */
  estadoRup: EstadoRup | null;
  /** Remedios disparados: los `hard` primero, luego los `soft`, cada grupo en orden de pregunta. */
  bloqueantes: RemedioId[];
  /**
   * Subconjunto de `bloqueantes` con `absoluto: true`. Si no está vacío, el
   * resultado muestra un titular propio en vez del de la banda — el puntaje y
   * la banda NO se alteran. Ver 02-cuestionario §5.1.
   */
  bloqueoAbsoluto: RemedioId[];
}

// ===========================================================================
//  El cuestionario como unidad
// ===========================================================================

/**
 * Un cuestionario completo: su contenido más las dos derivaciones que le son
 * propias. Existe para que el motor (`calcular.ts`) no importe ningún catálogo
 * concreto y baste con registrar el nuevo en `registro.ts`.
 *
 * `escalon` y `estadoRup` son opcionales porque no todos los cuestionarios los
 * tienen: son conceptos de la Ley 80/1150, y un cuestionario para empresas de
 * servicios públicos (Ley 142) no puede producirlos. Ausentes → el resultado
 * lleva `null`, que es la respuesta honesta.
 */
export interface Cuestionario {
  version: string;
  /** Orden de presentación de las barras del resultado. */
  categorias: readonly Categoria[];
  preguntas: readonly Pregunta[];
  remedios: Readonly<Record<RemedioId, Remedio>>;
  veredictos: Readonly<Record<BandaPreparacion, TextoVeredicto>>;
  /**
   * Escalón al que puede aspirar el oferente. Recibe los puntos por pregunta y
   * el puntaje ya normalizado a 0..100. Omitir si el cuestionario no tiene
   * escalera.
   */
  escalon?: (
    puntosPorPregunta: ReadonlyMap<string, number>,
    puntajeTotal: number
  ) => EscalonContratacion;
  /** Estado del RUP declarado. Omitir si el cuestionario no lo pregunta. */
  estadoRup?: (respuestas: RespuestasDiagnostico) => EstadoRup;

  // ── Contenido que pinta la UI ──────────────────────────────────────────
  // Va aquí y no importado suelto por cada componente: todo lo que se muestra
  // pertenece al cuestionario que se respondió, y una fila vieja debe seguir
  // viéndose con los textos de SU versión.

  portada: Portada;
  /** Las afirmaciones que desmontan la barrera de entrada, en la portada. */
  facts: readonly Fact[];
  /** Sobreescribe el titular de la banda cuando hay un bloqueante absoluto. */
  veredictoBloqueado: TextoVeredicto;
  /** Qué decir cuando no se disparó ningún remedio. */
  planSinPendientes: Remedio2;
  mitos: readonly Mito[];
  disclaimer: string;
  /** Los peldaños. Omitir si el cuestionario no tiene escalera (Ley 142). */
  escalera?: readonly Peldano[];
  /** Texto de la vía recomendada por escalón. Va con `escalera`. */
  rutas?: Readonly<Record<EscalonContratacion, TextoRuta>>;
}

/** Entrada del plan cuando no hay pendientes: mismo shape visible que un remedio. */
export interface Remedio2 {
  titulo: string;
  detalle: string;
  chips: readonly string[];
}

export interface Portada {
  antetitulo: string;
  titulo: string;
  /** La parte del titular que va en color de acento. */
  tituloEnfasis: string;
  lede: string;
  cta: string;
}
