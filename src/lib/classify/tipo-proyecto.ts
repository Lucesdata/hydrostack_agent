/**
 * Taxonomía de tipo de proyecto — los CINCO valores del producto.
 *
 * Es la única fuente de verdad de "de qué trata este proceso". La consumen los
 * filtros del mapa, la leyenda, la faceta "Por tipo de proyecto", la etiqueta de
 * cada fila de la vitrina, la ficha y las rutas `/licitaciones/tipo/[slug]`.
 * Ningún sitio vuelve a escribir "ptar" a mano.
 *
 * ── Por qué es por texto y no por UNSPSC ────────────────────────────────────
 * El spec pedía clasificar por "CPV/UNSPSC + palabras clave". Se midió sobre las
 * 90.622 filas reales (2026-09-15) y el UNSPSC de este dataset NO discrimina el
 * subsistema: la clase 831015 concentra 16.444 procesos y contiene los cuatro
 * tipos a la vez (767 con señal de PTAR, 1.141 de PTAP, 2.263 de alcantarillado,
 * 2.697 de acueducto). Bajar a 8 dígitos no ayuda: el mejor código, 83101506,
 * llega al 21% de PTAR y el mayoritario 83101500 se queda en 3/1/15/17. Los
 * códigos que sí separarían —potabilización, redes de alcantarillado— casi no
 * aparecen: 721412 tiene 65 filas de 90.622.
 *
 * El UNSPSC dice que el proceso es de agua, que es justo lo que ya usa la
 * ingesta para traerlo. El subsistema solo está en el objeto. Por eso aquí el
 * texto manda y el UNSPSC entra como desempate débil.
 *
 * ── El problema que de verdad hay que resolver ──────────────────────────────
 * 8.559 objetos nombran una empresa de servicios públicos dentro del texto, y
 * 5.144 mencionan acueducto Y alcantarillado. Al mirar la muestra, la mayoría no
 * son proyectos de agua: son subsidios, recaudo, formatos de factura, dotación y
 * ferretería que arrastran "ACUEDUCTO, ALCANTARILLADO Y ASEO" porque así se
 * llama la entidad contratante o el paquete de servicios públicos.
 *
 * Un clasificador por palabras clave a secas etiquetaría un contrato de imprimir
 * facturas como "acueducto". Por eso el primer paso no es puntuar: es SUPRIMIR
 * del texto las menciones que son nombre de entidad o paquete de servicios. Lo
 * que sobreviva a esa poda sí es evidencia del subsistema. No hay lista negra de
 * "contratos administrativos": si tras podar no queda evidencia específica, el
 * resultado es `otros` por construcción.
 */

import { stripAccents } from "../transform/normalize";

/**
 * Los cinco. El orden es el de presentación: los dos sistemas de red, las dos
 * plantas, y el cajón. `otros` va siempre al final.
 */
export const TIPOS_PROYECTO = ["acueducto", "alcantarillado", "ptap", "ptar", "otros"] as const;

export type TipoProyecto = (typeof TIPOS_PROYECTO)[number];

/** Confianza de la clasificación. `otros` con confianza baja significa "no sé". */
export type ConfianzaTipo = "alta" | "media" | "baja";

export interface MetaTipoProyecto {
  /** Lo que lee el usuario. */
  label: string;
  /** Segmento de URL de `/licitaciones/tipo/[slug]`. Estable: es superficie SEO. */
  slug: string;
  /** Una frase, para la faceta y la metadata de la ruta. */
  descripcion: string;
}

export const TIPO_PROYECTO: Record<TipoProyecto, MetaTipoProyecto> = {
  acueducto: {
    label: "Acueducto",
    slug: "acueducto",
    descripcion: "Captación, aducción, conducción, almacenamiento y redes de distribución de agua.",
  },
  alcantarillado: {
    label: "Alcantarillado",
    slug: "alcantarillado",
    descripcion:
      "Recolección y transporte de aguas residuales y lluvias: redes, colectores e interceptores.",
  },
  ptap: {
    label: "PTAP",
    slug: "ptap",
    descripcion: "Plantas de tratamiento de agua potable — potabilización para consumo humano.",
  },
  ptar: {
    label: "PTAR",
    slug: "ptar",
    descripcion: "Plantas de tratamiento de aguas residuales — depuración antes del vertimiento.",
  },
  otros: {
    label: "Otros",
    slug: "otros",
    descripcion: "Procesos del sector sin un subsistema identificable en el objeto del contrato.",
  },
};

/** Índice inverso para resolver `/licitaciones/tipo/[slug]` sin recorrer el mapa. */
export const TIPO_POR_SLUG: Record<string, TipoProyecto> = Object.fromEntries(
  TIPOS_PROYECTO.map((t) => [TIPO_PROYECTO[t].slug, t])
) as Record<string, TipoProyecto>;

/**
 * Versión del clasificador de tipo. Subirla al cambiar diccionarios o reglas
 * obliga a recomputar — misma disciplina que `CLASIFICADOR_VERSION` del
 * clasificador sectorial, y por el mismo motivo: sin versión no se sabe qué
 * corrida produjo una fila.
 */
export const CLASIFICADOR_TIPO_VERSION = "1.0.0";

/**
 * Frases que mencionan agua sin que el proceso trate de agua. Se BORRAN del
 * texto antes de puntuar, no se usan como lista negra: así el efecto es local
 * (quita la evidencia falsa) y no tumba un proceso real que casualmente
 * contenga una de estas palabras.
 *
 * Las tres familias salen de mirar la muestra real, no de imaginarlas:
 *  1. El nombre de la entidad — "EMPRESA DE ACUEDUCTO, ALCANTARILLADO Y ASEO DE X".
 *  2. El paquete de servicios públicos domiciliarios, que va casi siempre con
 *     "aseo" pegado — la señal de que se habla del servicio, no de la obra.
 *  3. La coletilla E.S.P.
 */
const SUPRESIONES: readonly RegExp[] = [
  // "empresa(s) [municipal(es)/regional(es)] de acueducto[, y alcantarillado][ y aseo] [de X]"
  /empresas?\s+(?:[a-z]+\s+){0,3}de\s+acueducto(?:\s*[,y]\s*alcantarillado)?(?:\s*[,y]\s*aseo)?(?:\s+de\s+[a-z\s]{3,30})?/g,
  // "servicio(s) público(s) [domiciliario(s)] de acueducto, alcantarillado y aseo"
  /servicios?\s+publicos?\s+(?:domiciliarios?\s+)?de\s+acueducto(?:\s*[,y]\s*alcantarillado)?(?:\s*[,y]\s*aseo)?/g,
  // "acueducto, alcantarillado y aseo" suelto: el trío con aseo es el paquete de
  // servicios, nunca una obra — no existe una obra "de aseo".
  /acueducto\s*[,y]\s*alcantarillado\s*[,y]\s*aseo/g,
  // Coletilla de razón social.
  /\be\.?\s?s\.?\s?p\.?\b/g,
];

/**
 * Evidencia por subsistema. Ordenadas de más específica a menos: la primera que
 * aparece pesa `PESO_FUERTE`, las demás suman `PESO_EXTRA` hasta el tope.
 *
 * Criterio de inclusión: el término tiene que nombrar el subsistema o una pieza
 * que solo existe en él. "agua" suelto no entra (agua embotellada); "planta de
 * tratamiento" a secas tampoco, porque no dice de cuál de las dos habla — esa
 * ambigüedad la resuelven `agua potable` / `aguas residuales`.
 */
interface Evidencia {
  /** El nombre del sistema. Aparece también cuando solo se le menciona de paso. */
  nucleo: readonly string[];
  /** Piezas que SOLO existen en ese sistema. Quien las nombra habla de él. */
  componente: readonly string[];
}

const EVIDENCIA: Record<Exclude<TipoProyecto, "otros">, Evidencia> = {
  ptar: {
    nucleo: ["ptar", "tratamiento de aguas residuales", "tratamiento de agua residual"],
    componente: [
      "planta de tratamiento de aguas residuales",
      "planta de tratamiento de agua residual",
      "laguna de oxidacion",
      "lodos activados",
      "reactor uasb",
      "filtro percolador",
      "lecho de secado",
      "tratamiento de lixiviados",
    ],
  },
  ptap: {
    nucleo: ["ptap", "potabilizacion", "potabilizar"],
    componente: [
      "planta de tratamiento de agua potable",
      "planta potabilizadora",
      "potabilizadora",
      "floculador",
      "sedimentador",
      "desarenador",
      "filtro lento",
      "planta compacta",
      "dosificacion de cloro",
      "cloracion",
    ],
  },
  alcantarillado: {
    nucleo: ["alcantarillado"],
    componente: [
      "colector",
      "interceptor",
      "emisario final",
      "emisario",
      "aguas lluvias",
      "aguas residuales domesticas",
      // "sumidero" se quitó: en la muestra real lo disparaba "sumidero de
      // carbono" de contratos ambientales, no de alcantarillado.
      "pozo de inspeccion",
      "vertimiento",
      "psmv",
    ],
  },
  acueducto: {
    nucleo: ["acueducto", "agua potable"],
    componente: [
      "bocatoma",
      "captacion",
      "aduccion",
      "linea de conduccion",
      "red de distribucion",
      "tanque de almacenamiento",
      "micromedicion",
      "macromedicion",
      "optimizacion del sistema de acueducto",
      "plan maestro de acueducto",
    ],
  },
};

/**
 * Prefijos UNSPSC que inclinan la balanza cuando el texto empata. Señal DÉBIL a
 * propósito: se midió que estos códigos contienen los cuatro tipos. Solo sirven
 * para desempatar, nunca para clasificar solos.
 */
const UNSPSC_PISTA: Record<string, Exclude<TipoProyecto, "otros">> = {
  "83101700": "ptap", // tratamiento y potabilización de agua
  "83101506": "ptar", // el código con más densidad de PTAR medida (21%)
  "72141200": "alcantarillado", // construcción de redes de alcantarillado
  "72141100": "acueducto", // construcción de redes de acueducto
};

/** Nombrar el sistema. Es la señal más débil: también la produce una mención de paso. */
const PESO_NUCLEO = 1;
/** Nombrar una pieza del sistema. Quien dice "colector" está hablando de alcantarillado. */
const PESO_COMPONENTE = 1.4;
/** Cada coincidencia adicional, del tipo que sea. */
const PESO_EXTRA = 0.35;
const TOPE = 3;
/** Pista de UNSPSC: menos que una sola palabra clave, por diseño. */
const PESO_UNSPSC = 0.3;

/**
 * Las plantas ganan a las redes cuando ambas tienen evidencia comparable: una
 * PTAR es el sujeto más específico, y "PTAR del sistema de alcantarillado de X"
 * habla de la planta. El spec lo pide explícitamente — `ptap` y `ptar` no se
 * solapan con `acueducto` ni `alcantarillado`.
 *
 * Dentro de cada rango, el desempate es por puntaje; si también empata, gana el
 * que aparece antes en esta lista. Determinista y documentado: sin un orden
 * fijo, dos corridas sobre la misma fila podrían diferir.
 */
const PRECEDENCIA: ReadonlyArray<Exclude<TipoProyecto, "otros">> = [
  "ptar",
  "ptap",
  "acueducto",
  "alcantarillado",
];
/** Cuánto tiene que sacarle una red a una planta para ganarle pese al rango. */
const VENTAJA_PARA_DESBANCAR_PLANTA = 0.7;

export interface EntradaTipoProyecto {
  /** Objeto del contrato. */
  objeto: string | null;
  /**
   * Descripción del procedimiento. Se concatena al objeto, y no es prescindible:
   * en 17.246 de las 90.622 filas (19%) la palabra del subsistema aparece solo
   * aquí, porque el objeto es un código administrativo ("INVITACIÓN PRIVADA 016
   * DE 2023") y el proyecto real está en la descripción. Ignorarla perdería una
   * quinta parte de la señal.
   */
  descripcion?: string | null;
  /**
   * Nombre de la entidad contratante. NO es una señal: es lo que hay que borrar.
   * Media descripción del SECOP arrastra la razón social —"EMPRESA DE ACUEDUCTO,
   * ALCANTARILLADO Y ASEO DE X"—, y sin quitarla un contrato de imprimir
   * facturas puntúa como acueducto. Se suprime la frase completa, nunca sus
   * palabras sueltas: borrar la palabra "acueducto" dejaría sin señal también a
   * los proyectos reales de esa misma entidad.
   */
  entidadNombre?: string | null;
  /** Código UNSPSC, con o sin el prefijo "V1.". Solo desempata. */
  unspsc?: string | null;
}

export interface ResultadoTipoProyecto {
  tipo: TipoProyecto;
  confianza: ConfianzaTipo;
  /** Puntaje del tipo ganador. 0 cuando no hubo ninguna evidencia. */
  puntaje: number;
  /** Qué disparó, por tipo: para auditar un falso positivo sin adivinar. */
  evidencia: Partial<Record<Exclude<TipoProyecto, "otros">, string[]>>;
  /** Frases podadas por ser nombre de entidad o paquete de servicios. */
  suprimido: string[];
  /** El segundo mejor, cuando lo hubo. Es lo que se pierde al forzar un valor. */
  segundo: Exclude<TipoProyecto, "otros"> | null;
  version: string;
}

/**
 * Coincidencia por PALABRA COMPLETA, no por subcadena.
 *
 * `texto.includes("colector")` casa dentro de "recolector", y eso etiquetaba
 * 1.890 procesos como alcantarillado por frases como "prestar los servicios
 * personales como recolector 1". El mismo fallo acecha en "captacion" dentro de
 * "recaptacion" o "aduccion" dentro de "reduccion". Los límites lo cierran.
 *
 * Las expresiones se compilan una vez al cargar el módulo: clasificar 90.000
 * filas recorre unas 45 palabras por fila, y recompilar en cada pasada
 * multiplicaría el trabajo por nada.
 */
const RE_CACHE = new Map<string, RegExp>();

function coincide(texto: string, frase: string): boolean {
  let re = RE_CACHE.get(frase);
  if (!re) {
    const escapada = frase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    re = new RegExp(`\\b${escapada}\\b`);
    RE_CACHE.set(frase, re);
  }
  return re.test(texto);
}

function normalizar(texto: string | null | undefined): string {
  if (!texto) return "";
  return stripAccents(texto.toLowerCase()).replace(/\s+/g, " ");
}

/** Quita el prefijo de versión "V1." y deja solo dígitos. */
function digitosUnspsc(unspsc: string | null | undefined): string {
  return (unspsc ?? "").replace(/^v\d+\./i, "").replace(/\D/g, "");
}

/**
 * Clasifica un proceso en uno de los cinco tipos. Función PURA: sin red, sin
 * base, sin fecha — la misma entrada da siempre la misma salida, que es lo que
 * permite recomputar 90.000 filas y comparar dos versiones del clasificador.
 */
export function clasificarTipoProyecto(entrada: EntradaTipoProyecto): ResultadoTipoProyecto {
  const crudo = normalizar([entrada.objeto, entrada.descripcion].filter(Boolean).join(" "));

  // 1. Poda: fuera el nombre de la entidad y los paquetes de servicios.
  const suprimido: string[] = [];
  let texto = crudo;

  // Primero la razón social exacta, que es la fuente principal de ruido. Se exige
  // que sea larga para que sea un nombre y no una palabra suelta: una entidad
  // que se llamara solo "Acueducto" dejaría a todos sus procesos sin señal.
  const entidad = normalizar(entrada.entidadNombre);
  if (entidad.length >= 12 && texto.includes(entidad)) {
    texto = texto.split(entidad).join(" ");
    suprimido.push(entidad);
  }

  for (const re of SUPRESIONES) {
    texto = texto.replace(re, (m) => {
      suprimido.push(m.trim());
      return " ";
    });
  }

  // 2. Puntaje por subsistema sobre lo que sobrevivió a la poda.
  const evidencia: ResultadoTipoProyecto["evidencia"] = {};
  const puntajes = new Map<Exclude<TipoProyecto, "otros">, number>();

  for (const tipo of PRECEDENCIA) {
    const { nucleo, componente } = EVIDENCIA[tipo];
    const enNucleo = nucleo.filter((kw) => coincide(texto, kw));
    const enComponente = componente.filter((kw) => coincide(texto, kw));
    const encontradas = [...enComponente, ...enNucleo];
    if (encontradas.length === 0) continue;
    evidencia[tipo] = encontradas;
    // La base la pone la señal más fuerte que haya; las demás suman poco.
    const base = enComponente.length > 0 ? PESO_COMPONENTE : PESO_NUCLEO;
    puntajes.set(tipo, Math.min(base + (encontradas.length - 1) * PESO_EXTRA, TOPE));
  }

  // 3. Pista de UNSPSC, solo si ese tipo ya tenía algo de evidencia textual: un
  //    código no debe inventar un subsistema que el texto no menciona.
  const digitos = digitosUnspsc(entrada.unspsc);
  const pista = Object.entries(UNSPSC_PISTA).find(([codigo]) => digitos.startsWith(codigo));
  if (pista) {
    const tipoPista = pista[1];
    const actual = puntajes.get(tipoPista);
    if (actual !== undefined) puntajes.set(tipoPista, actual + PESO_UNSPSC);
  }

  if (puntajes.size === 0) {
    return {
      tipo: "otros",
      confianza: crudo ? "media" : "baja",
      puntaje: 0,
      evidencia,
      suprimido,
      segundo: null,
      version: CLASIFICADOR_TIPO_VERSION,
    };
  }

  // 4. Orden: puntaje, y a igualdad el orden de PRECEDENCIA.
  const ordenados = [...puntajes.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return PRECEDENCIA.indexOf(a[0]) - PRECEDENCIA.indexOf(b[0]);
  });

  // 5. Las plantas ganan a las redes salvo que la red saque ventaja clara.
  const esPlanta = (t: Exclude<TipoProyecto, "otros">) => t === "ptar" || t === "ptap";
  let [ganador, puntaje] = ordenados[0];
  if (!esPlanta(ganador)) {
    const planta = ordenados.find(([t]) => esPlanta(t));
    if (planta && puntaje - planta[1] < VENTAJA_PARA_DESBANCAR_PLANTA) {
      [ganador, puntaje] = planta;
    }
  }

  const segundo = ordenados.find(([t]) => t !== ganador)?.[0] ?? null;

  // Alta cuando la evidencia es específica —una pieza que solo existe en ese
  // sistema— o cuando no tuvo rival. Media cuando se decidió entre dos señales
  // igual de genéricas: ahí la etiqueta es una elección, no una lectura.
  const confianza: ConfianzaTipo =
    puntaje >= PESO_COMPONENTE || segundo === null ? "alta" : "media";

  return {
    tipo: ganador,
    confianza,
    puntaje: Math.round(puntaje * 100) / 100,
    evidencia,
    suprimido,
    segundo,
    version: CLASIFICADOR_TIPO_VERSION,
  };
}
