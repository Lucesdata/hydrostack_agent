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

import { formatCopCompact } from "@/src/components/secop/format";

export type ClaveEtapa =
  "abierto" | "evaluacion" | "adjudicado" | "cancelado" | "suspendido" | "borrador" | "desconocido";

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
  adjudicatario?: string | null;
  valorAdjudicacion?: string | number | null;
  fechaAdjudicacion?: string | null;
}

export interface FichaCardVista {
  id: string;
  etapa: EtapaVista;
  entidad: string;
  objeto: string;
  /** Solo la pinta la variante `compacta`: donde hay semáforo, lo dice su compuerta. */
  cuantia: string;
  ubicacion: string;
  plazo: string;
  /** Sustituye al plazo cuando el proceso ya se adjudicó. `null` si no aplica. */
  adjudicacion: string | null;
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
function fechaCorta(iso: string): string {
  return new Date(`${iso}T12:00:00Z`)
    .toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    })
    .replace(/\bde\s+/g, "")
    .replace(/\./g, "");
}

/** Días naturales entre dos fechas, ignorando la hora. */
function diasHasta(iso: string, hoy: Date): number {
  const dia = 24 * 60 * 60 * 1000;
  const a = Date.parse(`${iso}T12:00:00Z`);
  const b = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate(), 12);
  return Math.round((a - b) / dia);
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
function plazoDe(p: ProcesoParaCard, hoy: Date): string {
  if (p.fechaRecepcion) {
    const dias = diasHasta(p.fechaRecepcion, hoy);
    const cuando = fechaCorta(p.fechaRecepcion);
    if (dias < 0) return `Recepción cerrada el ${cuando}`;
    if (dias === 0) return `Recepción hasta el ${cuando} · último día`;
    return `Recepción hasta el ${cuando} · faltan ${dias} días`;
  }
  return p.estadoApertura === "Abierto" ? "Abierto a ofertas" : "Cerrado a ofertas";
}

function adjudicacionDe(p: ProcesoParaCard): string | null {
  if (!p.fechaAdjudicacion) return null;
  const quien = p.adjudicatario ?? "Adjudicatario no publicado";
  const cuanto = numero(p.valorAdjudicacion);
  const texto = p.adjudicatario ? `Adjudicado a ${quien}` : quien;
  return cuanto === null ? texto : `${texto} · ${formatCopCompact(cuanto)}`;
}

export function vistaFichaCard(p: ProcesoParaCard, hoy: Date): FichaCardVista {
  const valor = numero(p.valorEstimado);
  const lugar = [p.municipio, p.departamento].filter(Boolean).join(", ");

  return {
    id: p.secopProcesoId,
    etapa: (p.estadoActual && ETAPA_POR_ESTADO[p.estadoActual]) || ETAPA_DESCONOCIDA,
    entidad: p.entidadNombre ?? "Entidad no informada",
    objeto: p.objeto ?? "Objeto no publicado",
    cuantia: valor === null ? "Cuantía no publicada" : formatCopCompact(valor),
    ubicacion: lugar || "Ubicación no informada",
    plazo: plazoDe(p, hoy),
    adjudicacion: adjudicacionDe(p),
  };
}
