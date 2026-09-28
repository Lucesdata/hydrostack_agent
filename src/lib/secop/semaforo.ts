/**
 * El modelo de vista del semáforo de cinco compuertas.
 *
 * Existe para separar dos cosas que estaban pegadas: QUÉ dice cada compuerta y
 * CÓMO se dibuja. El cálculo vive en `verdict.ts` y la pintura en
 * `components/secop/semaforo/`; esto es el puente, y es puro — se puede probar
 * sin montar un componente.
 *
 * ── El quinto estado ────────────────────────────────────────────────────────
 * `verdict.ts` tiene cuatro: PASS, WARN, FAIL, UNKNOWN. Los cuatro presuponen un
 * perfil de oferente contra el que comparar. Sin perfil —que es como llega
 * cualquiera desde un buscador— no hay veredicto que dar, y pintar verde sería
 * mentir: el verde dice "calificas", no "el proceso es de acueducto".
 *
 * Por eso se añade `DATO`: la lectura absoluta, que enuncia lo que el proceso
 * EXIGE en ese eje sin juzgar a nadie. Es lo que el spec pide para el visitante
 * sin cuenta, y lo que convierte el semáforo en un gancho honesto — se ve la
 * forma de la respuesta, falta la mitad que compara.
 */

import type { GateStatus, Verdict } from "./verdict";
import type { VerdictRespuesta } from "./verdict-publico";
import { formatCopCompact } from "@/src/components/secop/format";
import { montoConDato } from "./monto";
import { TIPO_PROYECTO, type TipoProyecto } from "../classify/tipo-proyecto";

export type EstadoCompuerta = GateStatus | "DATO";

/** Las cinco, en el orden en que se muestran. Es el orden del spec. */
export const CLAVES_COMPUERTA = [
  "sectorial",
  "cuantia",
  "plazo",
  "ubicacion",
  "habilitacion",
] as const;
export type ClaveCompuerta = (typeof CLAVES_COMPUERTA)[number];

/**
 * El rótulo corto de cada compuerta. `ubicacion` se muestra como "Zona": el
 * código la llamó así antes de que el producto la llamara de la otra forma, y
 * renombrar la clave arrastraría `verdict.ts`, sus tests y el endpoint. El
 * usuario lee "Zona"; el código sigue diciendo `ubicacion`.
 */
export const ETIQUETA_COMPUERTA: Record<ClaveCompuerta, string> = {
  sectorial: "Sector",
  cuantia: "Cuantía",
  plazo: "Plazo",
  ubicacion: "Zona",
  habilitacion: "Habilitación",
};

/**
 * La palabra que acompaña al color. NUNCA se pinta un punto sin ella: es la
 * regla 4 del spec de rediseño, y la razón es que verde y ámbar difieren un 4%
 * en luminancia — para quien no distingue esos tonos, el color solo no dice nada.
 */
export const PALABRA_ESTADO: Record<EstadoCompuerta, string> = {
  PASS: "cumple",
  WARN: "revisar",
  FAIL: "no cumple",
  UNKNOWN: "sin datos",
  DATO: "exige",
};

export interface CompuertaVista {
  clave: ClaveCompuerta;
  etiqueta: string;
  estado: EstadoCompuerta;
  /** La frase que explica el estado. `null` cuando la política la redacta. */
  explicacion: string | null;
  /**
   * Lo que se muestra en la fila densa, donde no cabe la frase entera.
   *
   * No es la palabra del estado repetida cinco veces: en la lectura absoluta eso
   * daría "Sector exige · Cuantía exige · Plazo exige", que ocupa sitio y no
   * dice nada — se probó y se descartó. Aquí va el VALOR ("PTAR", "$49 M",
   * "Cundinamarca"), que es lo que distingue un proceso de otro de un vistazo.
   * En la lectura relativa sí es el estado, porque ahí el estado ES la
   * información.
   */
  valorCorto: string;
  /** true si hay explicación pero pide cuenta para verla (verdict-publico). */
  redactada: boolean;
  /** Solo habilitación: los indicadores del pliego que el perfil no declara. */
  faltanEnPerfil?: string[];
}

/** Las cinco compuertas de un veredicto real, con o sin explicación redactada. */
export function compuertasDesdeVeredicto(v: Verdict | VerdictRespuesta): CompuertaVista[] {
  return CLAVES_COMPUERTA.map((clave) => {
    const g = v.gates[clave];
    const redactada = "redactado" in g && g.redactado === true;
    return {
      clave,
      etiqueta: ETIQUETA_COMPUERTA[clave],
      estado: g.status,
      explicacion: redactada ? null : ((g as { reason: string }).reason ?? null),
      valorCorto: PALABRA_ESTADO[g.status],
      redactada,
      ...(!redactada && "faltanEnPerfil" in g && g.faltanEnPerfil
        ? { faltanEnPerfil: g.faltanEnPerfil }
        : {}),
    };
  });
}

/** Lo que hace falta saber del proceso para la lectura absoluta. */
export interface ProcesoParaSemaforo {
  tipoProyecto: TipoProyecto | null;
  valorEstimado: string | number | null;
  departamento: string | null;
  municipio: string | null;
  estadoApertura: string | null;
  fechaRecepcion: string | null;
}

/**
 * La lectura ABSOLUTA: qué exige el proceso en cada eje, sin compararlo con
 * nadie. Es la versión que ve quien llega sin perfil.
 *
 * Todas las compuertas salen en `DATO` salvo las que de verdad no tienen dato,
 * que salen en `UNKNOWN`. Ninguna sale en PASS o FAIL: sin perfil no hay nada
 * que aprobar ni que suspender, y fingirlo sería el tipo de veredicto a ciegas
 * que el producto dice no dar.
 */
export function compuertasAbsolutas(p: ProcesoParaSemaforo): CompuertaVista[] {
  const valor = montoConDato(p.valorEstimado);
  const lugar = [p.municipio, p.departamento].filter(Boolean).join(", ");

  const dato = (
    clave: ClaveCompuerta,
    valorCorto: string | null,
    explicacion: string | null
  ): CompuertaVista => ({
    clave,
    etiqueta: ETIQUETA_COMPUERTA[clave],
    estado: explicacion === null ? "UNKNOWN" : "DATO",
    explicacion,
    valorCorto: valorCorto ?? PALABRA_ESTADO.UNKNOWN,
    redactada: false,
  });

  return [
    dato(
      "sectorial",
      p.tipoProyecto ? TIPO_PROYECTO[p.tipoProyecto].label : null,
      p.tipoProyecto && p.tipoProyecto !== "otros"
        ? // Sin `toLowerCase()`: PTAP y PTAR son siglas y en minúscula quedaban
          // como "Proyecto de ptar", que parece una errata. Los otros dos
          // rótulos ya vienen en caja de frase.
          `Proyecto de ${TIPO_PROYECTO[p.tipoProyecto].label}.`
        : "El objeto no declara un subsistema concreto de agua o saneamiento."
    ),
    dato(
      "cuantia",
      // Sin `formatCopCompact(valor)` a secas: para "sin dato" esta compuerta
      // no dice "—" sino la palabra de UNKNOWN, que `dato()` pone cuando le
      // llega null.
      valor !== null ? formatCopCompact(valor) : null,
      // Sin presupuesto publicado no hay exigencia que enunciar. El 0 del
      // dataset ya vino filtrado por `montoConDato`, así que `valor === null`
      // cubre igual "no hay columna" y "la columna dice 0".
      valor !== null ? `Presupuesto oficial de ${formatCopCompact(valor)}.` : null
    ),
    dato(
      "plazo",
      p.fechaRecepcion
        ? new Date(p.fechaRecepcion).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })
        : p.estadoApertura === "Abierto"
          ? "abierto"
          : null,
      // El dataset del SECOP no trae fecha de cierre: solo la ventana binaria de
      // apertura y, en un 31% de las filas, una fecha de recepción. Se dice lo
      // que hay, no se deduce un plazo que nadie publicó.
      p.fechaRecepcion
        ? `Recepción de ofertas hasta el ${new Date(p.fechaRecepcion).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}.`
        : p.estadoApertura === "Abierto"
          ? "Abierto a ofertas. El SECOP no publica la fecha de cierre en este dataset."
          : null
    ),
    // La fuente publica la sede de la entidad contratante, no el lugar de la obra.
    dato(
      "ubicacion",
      p.departamento ?? p.municipio,
      lugar ? `Entidad contratante ubicada en ${lugar}. Lugar de ejecución no confirmado.` : null
    ),
    dato(
      "habilitacion",
      null,
      // Siempre UNKNOWN en Nivel 0, y aquí tampoco se puede enunciar: los
      // requisitos habilitantes viven en el pliego y `requisitos_proceso` está
      // vacía. Decirlo es más útil que dejar el hueco.
      null
    ),
  ];
}

// ───────────────────────────────────────────────────────────────────────────
//  El bloque de decisión de la ficha
//  Spec: docs/superpowers/specs/2026-09-28-ficha-bloque-decision.md
// ───────────────────────────────────────────────────────────────────────────

/** Cada compuerta con su artículo, para escribir frases y no listas de rótulos. */
const NOMBRE_EN_FRASE: Record<ClaveCompuerta, string> = {
  sectorial: "el sector",
  cuantia: "la cuantía",
  plazo: "el plazo",
  ubicacion: "la zona",
  habilitacion: "la habilitación",
};

/** "la zona", "la zona y el plazo", "la zona, el plazo y la cuantía". */
function enumerar(compuertas: CompuertaVista[]): string {
  const nombres = compuertas.map((c) => NOMBRE_EN_FRASE[c.clave]);
  if (nombres.length <= 1) return nombres.join("");
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

export interface FraseVeredicto {
  titulo: string;
  bajada: string;
}

/**
 * La frase del veredicto: una línea que resume las cinco compuertas.
 *
 * Sale SOLO del conteo de estados y de qué compuertas faltan: no es un juicio
 * aparte (`CONDUCTA.md` §6, el `overall` se agrega, nunca se emite por su
 * cuenta). Con los mismos estados, la misma frase.
 *
 * Sin perfil (`relativo === false`) no hay nada que contar: se dice lo que hay —
 * lecturas del proceso— y qué haría falta para convertirlas en un veredicto.
 */
export function fraseVeredicto(compuertas: CompuertaVista[], relativo: boolean): FraseVeredicto {
  if (!relativo) {
    return {
      titulo: "Esto exige el proceso. Si te sirve, depende de tu empresa.",
      bajada:
        "Con tu perfil de oferente, cada compuerta se abre o se cierra según tu especialidad, tu capacidad y tu zona.",
    };
  }

  const con = (e: EstadoCompuerta) => compuertas.filter((c) => c.estado === e);
  const fallan = con("FAIL");
  const revisar = con("WARN");
  const sinDato = con("UNKNOWN");
  const cumplen = con("PASS").length;
  const pliegoDecide = "Es una lectura, no un dictamen: quien decide si calificas es el pliego.";

  if (fallan.length > 0) {
    return {
      titulo: `Hoy no cumples en ${enumerar(fallan)}.`,
      bajada: `Mira el porqué antes de descartarlo: ${fallan.length === 1 ? "esa compuerta es" : "esas compuertas son"} lo que te deja fuera.`,
    };
  }

  if (cumplen === compuertas.length) {
    return {
      titulo: `Cumples en las ${compuertas.length} compuertas.`,
      bajada: `${pliegoDecide} Revísalo antes de preparar la oferta.`,
    };
  }

  const resto = [
    revisar.length > 0 ? `revisa ${enumerar(revisar)}` : null,
    sinDato.length > 0 ? `falta el dato de ${enumerar(sinDato)}` : null,
  ]
    .filter(Boolean)
    .join("; ");
  const inicio =
    cumplen === 0
      ? "Ninguna compuerta confirma todavía que encaje"
      : `Encaja con tu empresa en ${cumplen} de ${compuertas.length}`;

  const habilitacionSinDato = sinDato.some((c) => c.clave === "habilitacion");
  return {
    titulo: `${inicio}: ${resto}.`,
    bajada: habilitacionSinDato
      ? "La habilitación solo se sabe leyendo el pliego del proceso."
      : pliegoDecide,
  };
}

/** A dónde lleva cada botón. El componente lo traduce a una ruta o un ancla. */
export type DestinoPaso =
  | "definir-perfil"
  | "subir-pliego"
  | "completar-perfil"
  | "ver-porque"
  | "ofertar-secop"
  | "expediente-secop"
  | "requisitos-pliego"
  | "explorar";

export interface SiguientePaso {
  /** 0 = tu perfil, 1 = el pliego, 2 = ofertar en SECOP II. */
  paso: 0 | 1 | 2;
  cta: string;
  destino: DestinoPaso;
  ayuda: string;
  secundario: string;
  destinoSecundario: DestinoPaso;
}

/**
 * Un único siguiente paso según dónde está el usuario (tabla §2e del spec).
 * Nunca promete lo que no existe: ni alertas, ni seguimiento, ni un dictamen.
 */
export function siguientePaso(e: {
  relativo: boolean;
  conCuenta: boolean;
  conPliego: boolean;
  compuertas: CompuertaVista[];
}): SiguientePaso {
  if (!e.relativo) {
    return {
      paso: 0,
      cta: "Define tu perfil",
      destino: "definir-perfil",
      ayuda:
        "Un minuto y sin crear cuenta: especialidad, departamentos donde trabajas y rango de valor.",
      secundario: "Prefiero verlo en SECOP II",
      destinoSecundario: "expediente-secop",
    };
  }

  if (e.compuertas.some((c) => c.estado === "FAIL")) {
    return {
      paso: e.conPliego ? 2 : 1,
      cta: "Ver por qué",
      destino: "ver-porque",
      ayuda: "Revisa qué compuerta no cumples y por qué antes de descartar el proceso.",
      secundario: "Explorar procesos parecidos",
      destinoSecundario: "explorar",
    };
  }

  if (!e.conPliego) {
    return {
      paso: 1,
      cta: "Sube el pliego",
      destino: "subir-pliego",
      ayuda: e.conCuenta
        ? "Es el PDF que ya descargaste del SECOP II. Lo leemos y comparamos sus requisitos con tu perfil. Hasta 5 pliegos cada 24 horas."
        : "Es el PDF que ya descargaste del SECOP II. Para leerlo necesitas una cuenta gratuita; tu perfil pasa a ella.",
      secundario: "Abrir el expediente en SECOP II",
      destinoSecundario: "expediente-secop",
    };
  }

  const faltan = e.compuertas.find((c) => c.clave === "habilitacion")?.faltanEnPerfil ?? [];
  if (faltan.length > 0) {
    return {
      paso: 1,
      cta:
        faltan.length === 1
          ? `Completa tu ${faltan[0]}`
          : `Completa ${faltan.length} datos de tu perfil`,
      destino: "completar-perfil",
      ayuda: `El pliego lo exige y tu perfil no lo declara (${faltan.join(", ")}). Con ese dato la habilitación se resuelve sola.`,
      secundario: "Ver los requisitos del pliego",
      destinoSecundario: "requisitos-pliego",
    };
  }

  return {
    paso: 2,
    cta: "Preparar la oferta en SECOP II",
    destino: "ofertar-secop",
    ayuda: "La oferta se presenta en SECOP II. Aquí tienes los requisitos a mano para armarla.",
    secundario: "Ver los requisitos del pliego",
    destinoSecundario: "requisitos-pliego",
  };
}

const DIA_MS = 86_400_000;

/**
 * La ventana de ofertas: cuántos días quedan hasta la fecha de recepción y qué
 * parte del plazo (desde la publicación) ya pasó. `null` si falta cualquiera
 * de las dos fechas: el dataset solo trae la de recepción en un 31% de las
 * filas, y un plazo que nadie publicó no se deduce.
 *
 * Recibe `ahora` para ser pura: la ficha revalida cada 12 h, así que la cuenta
 * se hace en el navegador y no en el HTML cacheado (criterio 7 del spec).
 */
export function ventanaDeOfertas(
  publicacion: string | null,
  recepcion: string | null,
  ahora: number
): { diasRestantes: number; transcurrido: number } | null {
  if (!publicacion || !recepcion) return null;
  const inicio = Date.parse(publicacion);
  const fin = Date.parse(recepcion);
  if (Number.isNaN(inicio) || Number.isNaN(fin) || fin <= inicio) return null;
  const transcurrido = Math.min(1, Math.max(0, (ahora - inicio) / (fin - inicio)));
  return { diasRestantes: Math.ceil((fin - ahora) / DIA_MS), transcurrido };
}

/** "quedan 16 días", "queda 1 día", "cierra hoy", "plazo vencido". */
export function textoDiasRestantes(dias: number): string {
  if (dias > 1) return `quedan ${dias} días`;
  if (dias === 1) return "queda 1 día";
  if (dias === 0) return "cierra hoy";
  return "plazo vencido";
}

/**
 * Una línea para quien no sabe qué es cada modalidad (el «¿Qué significa?» de
 * la ficha). Solo las que el dataset trae con frecuencia; para el resto no se
 * inventa: `null` y la ficha no ofrece la explicación.
 */
export function explicacionModalidad(modalidad: string | null): string | null {
  const m = (modalidad ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (m.startsWith("licitacion publica"))
    return "Convocatoria abierta a cualquier oferente que cumpla el pliego. Es la regla general para los contratos de mayor valor.";
  if (m.startsWith("seleccion abreviada"))
    return "Un procedimiento más corto que la licitación, para los casos que fija la ley: menor cuantía, bienes de características uniformes y otros.";
  if (m.startsWith("minima cuantia"))
    return "Para contratos de valor bajo. El trámite es corto y se adjudica a la oferta de menor precio que cumpla.";
  if (m.startsWith("concurso de meritos"))
    return "Para consultorías e interventorías: se elige por experiencia y calidad del equipo, no por precio.";
  if (m.startsWith("contratacion directa"))
    return "La entidad elige al contratista sin convocatoria abierta, en los casos que permite la ley.";
  if (m.startsWith("contratacion regimen especial"))
    return "La entidad contrata con su propio manual y no con el Estatuto General, como hacen muchas empresas de servicios públicos.";
  return null;
}
