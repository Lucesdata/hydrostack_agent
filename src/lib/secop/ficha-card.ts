/**
 * El modelo de vista del FichaCard.
 *
 * Mismo reparto que `semaforo.ts`: aquí QUÉ dice la tarjeta, en el componente
 * CÓMO se dibuja. Puro y probable sin montar React.
 *
 * Los textos de ausencia no son decorativos: `requisitos_proceso`,
 * `pliego_proceso` y `documento` están a 0 filas, y solo 242 de 35.518 procesos
 * abiertos traen fecha de cierre. La tarjeta se pasa la vida enseñando huecos,
 * así que cada hueco dice por qué lo es en vez de quedarse en blanco.
 */

import { formatCopCompact, sentenceCaseTitle } from "@/src/components/secop/format";

export type ClaveEtapa =
  | "abierto"
  | "cerrado"
  | "evaluacion"
  | "adjudicado"
  | "cancelado"
  | "suspendido"
  | "borrador"
  | "desconocido";

export interface EtapaVista {
  clave: ClaveEtapa;
  label: string;
}

/**
 * Los nueve valores que `proceso.estado_actual` tiene de verdad, medidos sobre
 * la base el 2026-09-21. El spec pedía ABIERTO · EN EVALUACIÓN · ADJUDICADO ·
 * DESIERTO · CANCELADO; "Desierto" no existe en la fuente y "Seleccionado" —que
 * son 37.188 filas— es el que de verdad significa adjudicado.
 */
export const ETAPA_POR_ESTADO: Record<string, EtapaVista> = {
  Publicado: { clave: "abierto", label: "ABIERTO" },
  Abierto: { clave: "abierto", label: "ABIERTO" },
  Evaluación: { clave: "evaluacion", label: "EN EVALUACIÓN" },
  "En aprobación": { clave: "evaluacion", label: "EN EVALUACIÓN" },
  Aprobado: { clave: "evaluacion", label: "EN EVALUACIÓN" },
  Seleccionado: { clave: "adjudicado", label: "ADJUDICADO" },
  Cancelado: { clave: "cancelado", label: "CANCELADO" },
  Suspendido: { clave: "suspendido", label: "SUSPENDIDO" },
  Borrador: { clave: "borrador", label: "BORRADOR" },
};

const ETAPA_DESCONOCIDA: EtapaVista = { clave: "desconocido", label: "SIN ESTADO" };

/**
 * Para un proceso que `estado_actual` da por abierto pero que ya no recibe
 * ofertas. La pastilla y la línea del plazo salen de campos distintos
 * (`estado_actual` y `fecha_recepcion`), y antes la tarjeta decía ABIERTO justo
 * encima de «Recepción cerrada el 03 oct 2026» (CO1.REQ.11144872, visto en
 * producción el 2026-10-04). Gana el dato más concreto: la fecha.
 */
const ETAPA_CERRADA: EtapaVista = { clave: "cerrado", label: "CERRADO A OFERTAS" };

export interface ProcesoParaCard {
  secopProcesoId: string;
  objeto: string | null;
  entidadNombre: string | null;
  departamento: string | null;
  municipio: string | null;
  valorEstimado: string | number | null;
  estadoActual: string | null;
  estadoApertura: string | null;
  fechaRecepcion: string | null;
  /** Para la etiqueta «Nuevo». Opcional: solo la vitrina la trae. */
  fechaPublicacion?: string | null;
  adjudicatario?: string | null;
  valorAdjudicacion?: string | number | null;
  fechaAdjudicacion?: string | null;
}

export interface FichaCardVista {
  id: string;
  etapa: EtapaVista;
  entidad: string;
  objeto: string;
  /** El objeto tal como lo publica SECOP, para el `title` de la tarjeta. */
  objetoOriginal: string | null;
  /** Solo la pinta la variante `compacta`: donde hay semáforo, lo dice su compuerta. */
  cuantia: string;
  /** `false` cuando `cuantia` es el texto de ausencia: no se pinta en grande. */
  cuantiaPublicada: boolean;
  ubicacion: string;
  plazo: string;
  /** Sustituye al plazo cuando el proceso ya se adjudicó. `null` si no aplica. */
  adjudicacion: string | null;
  /** La columna «Cierre de ofertas» de la vitrina. */
  cierre: CierreVista;
  /** Publicado hoy o ayer (día en Colombia). */
  nuevo: boolean;
}

/**
 * "29 sept 2026". Con año, porque sin él no se distingue un proceso de 2025 de
 * uno de 2026.
 *
 * Los dos `replace` son los mismos que usa `formatShortDate` en `format.ts`: la
 * salida cruda de ICU para es-CO es "29 de sept de 2026", con las preposiciones
 * dentro. Medido en Node 24. El mes abreviado se queda como lo da ICU —"sept",
 * no "sep"—, que es lo que ya se ve en la fila densa.
 *
 * Mediodía UTC y `timeZone: "UTC"`: la columna es `date` y sin fijar la hora,
 * un navegador al oeste de Greenwich resta horas y pinta el día anterior.
 */
/** `null` si `iso` no es una fecha real: mismo criterio que `formatShortDate` y
 * `FilaProceso.fecha`, que guardan contra un ISO corrupto en vez de dejar pasar
 * "Invalid Date". */
function fechaCorta(iso: string): string | null {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d
    .toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    })
    .replace(/\bde\s+/g, "")
    .replace(/\./g, "");
}

/** Días naturales entre dos fechas, ignorando la hora. `null` si `iso` no es una
 * fecha real: sin la guarda, un ISO corrupto no da NaN al parsear sino que
 * arrastra el NaN hasta el texto de la tarjeta ("faltan NaN días"). */
function diasHasta(iso: string, hoy: Date): number | null {
  const dia = 24 * 60 * 60 * 1000;
  const a = Date.parse(`${iso}T12:00:00Z`);
  if (Number.isNaN(a)) return null;
  const b = Date.parse(`${diaEnColombia(hoy)}T12:00:00Z`);
  return Math.round((a - b) / dia);
}

/**
 * El día de calendario de `hoy` en Colombia (UTC−5, sin horario de verano).
 * La recepción cierra al final del día en Colombia: con el día UTC, de 7 p. m.
 * a medianoche la tarjeta daba por cerrado un proceso que aún recibía ofertas.
 */
function diaEnColombia(hoy: Date): string {
  return new Date(hoy.getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function numero(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * El plazo (decisión A del 2026-09-21).
 *
 * El dataset no publica fecha de cierre: 242 de 35.518 abiertos traen
 * `fecha_recepcion`. La señal fiable es `estado_apertura`, que es binaria y está
 * en el 100 % de las filas. La cuenta atrás solo aparece donde hay fecha.
 */
export interface CierreVista {
  /** Lo que va en grande: «En 5 días», «Hoy», «Cerrada», «Sin fecha». */
  valor: string;
  /** La línea de debajo: la fecha, o por qué no la hay. */
  detalle: string | null;
  /** Quedan 3 días o menos: se pinta en ámbar. */
  urgente: boolean;
  /** Sin fecha publicada, o ya cerrada: se pinta pequeño y en gris. */
  apagado: boolean;
}

/** Días que se considera «Nuevo» un proceso: publicado hoy o ayer. */
const DIAS_NUEVO = 1;

/**
 * La cuenta atrás en grande. Solo con fecha de recepción hay cuenta; sin ella
 * se dice que no se publicó, nunca se inventa urgencia (242 de 35.518 abiertos
 * traen fecha, decisión A del 2026-09-21).
 */
function cierreDe(p: ProcesoParaCard, hoy: Date): CierreVista {
  if (p.fechaRecepcion) {
    const dias = diasHasta(p.fechaRecepcion, hoy);
    const cuando = fechaCorta(p.fechaRecepcion);
    if (dias !== null && cuando !== null) {
      const base = { urgente: false, apagado: false };
      if (dias < 0) return { ...base, valor: "Cerrada", detalle: `el ${cuando}`, apagado: true };
      if (dias === 0) return { ...base, valor: "Hoy", detalle: "último día", urgente: true };
      if (dias === 1) return { ...base, valor: "Mañana", detalle: cuando, urgente: true };
      return { ...base, valor: `En ${dias} días`, detalle: cuando, urgente: dias <= 3 };
    }
  }
  return p.estadoApertura === "Cerrado"
    ? { valor: "Cerrada", detalle: null, urgente: false, apagado: true }
    : { valor: "Sin fecha", detalle: "no se publicó el cierre", urgente: false, apagado: true };
}

function esNuevo(p: ProcesoParaCard, hoy: Date): boolean {
  if (!p.fechaPublicacion) return false;
  const dias = diasHasta(p.fechaPublicacion, hoy);
  return dias !== null && dias <= 0 && dias >= -DIAS_NUEVO;
}

function plazoDe(p: ProcesoParaCard, hoy: Date): string {
  if (p.fechaRecepcion) {
    const dias = diasHasta(p.fechaRecepcion, hoy);
    const cuando = fechaCorta(p.fechaRecepcion);
    // Un ISO corrupto cae aquí como si no hubiera fecha: es el mismo texto que
    // ya se usa cuando `fecha_recepcion` es null, así que no hace falta un
    // tercer mensaje para "hay valor pero no es una fecha real".
    if (dias !== null && cuando !== null) {
      if (dias < 0) return `Recepción cerrada el ${cuando}`;
      if (dias === 0) return `Recepción hasta el ${cuando} · último día`;
      return `Recepción hasta el ${cuando} · faltan ${dias} días`;
    }
  }
  return p.estadoApertura === "Abierto" ? "Abierto a ofertas" : "Cerrado a ofertas";
}

/** Adjudicado a X **por** $1.980 M: la preposición evita leer la cifra como si
 * fuera un dato aparte. Sin adjudicatario publicado no hay a quién atribuirle
 * el "por", así que el separador se queda como estaba. */
function adjudicacionDe(p: ProcesoParaCard): string | null {
  if (!p.fechaAdjudicacion) return null;
  const cuanto = numero(p.valorAdjudicacion);
  if (!p.adjudicatario) {
    const quien = "Adjudicatario no publicado";
    return cuanto === null ? quien : `${quien} · ${formatCopCompact(cuanto)}`;
  }
  const texto = `Adjudicado a ${p.adjudicatario}`;
  return cuanto === null ? texto : `${texto} por ${formatCopCompact(cuanto)}`;
}

/**
 * Paréntesis de trámite que SECOP pega al objeto: «(Manifestación de interés
 * (Menor Cuantía)) (Presentación de oferta)». Describen el procedimiento, no la
 * obra, y la modalidad ya tiene su sitio en la ficha. Solo se quitan los
 * paréntesis cuyo texto es de trámite: «(PTAR)» o «(Fase II)» se quedan.
 */
const TRAMITE =
  /^\s*$|manifestaci[oó]n|presentaci[oó]n|oferta|cuant[ií]a|invitaci[oó]n|convocatoria|licitaci[oó]n|selecci[oó]n|concurso|contrataci[oó]n directa|r[eé]gimen especial/i;

/** Cuántas letras tiene que tener un objeto para tratarlo como descriptivo. */
const MIN_LETRAS = 4;

/**
 * El objeto, legible en una tarjeta. La ficha conserva el texto oficial.
 *
 * - Quita los paréntesis de trámite, de dentro afuera para los anidados.
 * - Si viene en MAYÚSCULAS (lo común en SECOP), lo baja con `sentenceCaseTitle`
 *   —la misma de la ficha, con sus siglas— y devuelve la mayúscula a los nombres
 *   de `propios` (el municipio y el departamento del proceso). Los demás nombres
 *   propios quedan en minúscula: límite conocido, preferible a una tarjeta que
 *   grita.
 * - Un objeto sin texto («2026000088») no describe nada, y la tarjeta lo dice.
 */
export function objetoLegible(raw: string | null, propios: (string | null)[] = []): string {
  if (!raw || !raw.trim()) return "Objeto no publicado";
  if ((raw.match(/\p{L}/gu) ?? []).length < MIN_LETRAS) return "Objeto sin descripción publicada";

  let t = raw;
  for (;;) {
    const sig = t.replace(/\(([^()]*)\)/g, (_todo, dentro: string) =>
      TRAMITE.test(dentro) ? "" : `\u0000${dentro}\u0001`
    );
    if (sig === t) break;
    t = sig;
  }
  t = t.replace(/\u0000/g, "(").replace(/\u0001/g, ")");
  t = t
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:)])/g, "$1")
    .replace(/[\s\-–—:,;]+$/, "")
    .trim();
  if ((t.match(/\p{L}/gu) ?? []).length < MIN_LETRAS) t = raw.trim();

  const bajado = sentenceCaseTitle(t);
  if (bajado === t) return t;

  const nombres = new Set(
    propios
      .filter((n): n is string => !!n)
      .flatMap((n) => n.split(/[\s,.]+/))
      .filter((w) => w.length > 2)
      .map((w) => w.toLocaleLowerCase("es-CO"))
  );
  return bajado.replace(/\p{L}+/gu, (w) =>
    nombres.has(w) ? w.charAt(0).toLocaleUpperCase("es-CO") + w.slice(1) : w
  );
}

export function vistaFichaCard(p: ProcesoParaCard, hoy: Date): FichaCardVista {
  const valor = numero(p.valorEstimado);
  const lugar = [p.municipio, p.departamento].filter(Boolean).join(", ");
  // Si hay adjudicación, la etapa es ADJUDICADO mande lo que mande
  // `estado_actual`: medido en la base, 5 de los 191 procesos adjudicados
  // recientes llevan un estado_actual que no es "Seleccionado" (4 "Abierto", 1
  // "Evaluación"), y la tarjeta no puede decir "Adjudicado a X" bajo una
  // pastilla que dice ABIERTO.
  const etapaEstado: EtapaVista = p.fechaAdjudicacion
    ? ETAPA_POR_ESTADO["Seleccionado"]
    : (p.estadoActual && ETAPA_POR_ESTADO[p.estadoActual]) || ETAPA_DESCONOCIDA;
  const etapa =
    etapaEstado.clave === "abierto" && !recibeOfertas(p, hoy) ? ETAPA_CERRADA : etapaEstado;

  return {
    id: p.secopProcesoId,
    etapa,
    entidad: p.entidadNombre ?? "Entidad no informada",
    objeto: objetoLegible(p.objeto, [p.municipio, p.departamento]),
    objetoOriginal: p.objeto,
    cuantia: valor === null ? "Cuantía no publicada" : formatCopCompact(valor),
    cuantiaPublicada: valor !== null,
    ubicacion: lugar || "Ubicación no informada",
    plazo: plazoDe(p, hoy),
    cierre: cierreDe(p, hoy),
    nuevo: esNuevo(p, hoy),
    adjudicacion: adjudicacionDe(p),
  };
}

/**
 * ¿Sigue recibiendo ofertas? La fecha de recepción manda cuando existe y es
 * válida; sin ella, `estado_apertura`. Es la misma regla que `plazoDe`, así que
 * la pastilla y la línea del plazo ya no pueden contradecirse.
 */
function recibeOfertas(p: ProcesoParaCard, hoy: Date): boolean {
  if (p.fechaRecepcion) {
    const dias = diasHasta(p.fechaRecepcion, hoy);
    if (dias !== null) return dias >= 0;
  }
  return p.estadoApertura !== "Cerrado";
}
