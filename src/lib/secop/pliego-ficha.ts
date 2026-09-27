/**
 * El pliego de un proceso, reducido a lo que pinta la §4 de la ficha
 * («Qué exige el pliego»).
 *
 * Lee `pliego_proceso`, que se llena cuando alguien sube el PDF (desde la ficha
 * o desde /mis-coincidencias). La fila guarda la extracción entera; la ficha
 * solo necesita una parte, y la necesita sin el literal `NO_ENCONTRADO`: lo que
 * el pliego no declara se convierte aquí en `null`, y es la vista la que dice
 * «el pliego no lo declara». Nunca se rellena un hueco con un valor.
 *
 * `procesoId` es el id nativo de SECOP (`CO1.REQ.…`), como en la tabla.
 */

import { eq } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { pliegoProceso } from "@/src/lib/db/schema/pliego";
import {
  NO_ENCONTRADO,
  type ConfianzaGeneral,
  type PliegoExtraction,
  type SeveridadLaguna,
} from "@/src/lib/pliego/schema";

export type OrigenCampo = "reglas" | "llm";

export interface RequisitoFicha {
  clave: "experiencia_especifica" | "capacidad_financiera" | "capacidad_organizacional";
  etiqueta: string;
  /** `null` si el pliego no lo declara. */
  texto: string | null;
}

export interface CapituloFicha {
  nombre: string;
  items: number;
  /** Suma de `valor_total` de sus ítems. */
  total: number;
}

export interface PliegoFicha {
  nombreArchivo: string;
  /** Última vez que se subió (ISO). */
  actualizado: string;
  /** El presupuesto cuadra ítem a ítem (`validatePliego`). */
  consistente: boolean;
  confianza: ConfianzaGeneral;
  /** `null` si el pliego no lo declara o lo declara en cero. */
  presupuestoOficialCop: number | null;
  fechaCierre: string | null;
  requisitos: RequisitoFicha[];
  causales: string[];
  cronograma: Array<{ hito: string; fecha: string | null }>;
  capitulos: CapituloFicha[];
  lagunas: Array<{ descripcion: string; severidad: SeveridadLaguna }>;
  origen: {
    requisitos: OrigenCampo;
    causales: OrigenCampo;
    capitulos: OrigenCampo;
  };
}

export interface FilaPliego {
  nombreArchivo: string;
  updatedAt: Date;
  gateMatematicoPasado: boolean;
  extraction: PliegoExtraction;
  origen: Record<"reglas_presupuesto" | "requisitos_habilitantes" | "capitulos", OrigenCampo>;
}

const ETIQUETAS_REQUISITO: Record<RequisitoFicha["clave"], string> = {
  experiencia_especifica: "Experiencia específica",
  capacidad_financiera: "Capacidad financiera",
  capacidad_organizacional: "Capacidad organizacional",
};

const declarado = (v: string): string | null => {
  const t = v.trim();
  return t === "" || t === NO_ENCONTRADO ? null : t;
};

/** Fila de `pliego_proceso` → lo que pinta la ficha. Puro. */
export function vistaPliegoFicha(fila: FilaPliego): PliegoFicha {
  const x = fila.extraction;
  const req = x.requisitos_habilitantes;

  return {
    nombreArchivo: fila.nombreArchivo,
    actualizado: fila.updatedAt.toISOString(),
    consistente: fila.gateMatematicoPasado,
    confianza: x.verificacion.confianza_general,
    presupuestoOficialCop: x.presupuesto_oficial_cop > 0 ? x.presupuesto_oficial_cop : null,
    fechaCierre: declarado(x.fecha_cierre),
    requisitos: (Object.keys(ETIQUETAS_REQUISITO) as RequisitoFicha["clave"][]).map((clave) => ({
      clave,
      etiqueta: ETIQUETAS_REQUISITO[clave],
      texto: declarado(req[clave]),
    })),
    causales: x.reglas_presupuesto.map((r) => r.trim()).filter((r) => declarado(r) !== null),
    cronograma: x.cronograma
      .filter((h) => declarado(h.hito) !== null)
      .map((h) => ({ hito: h.hito.trim(), fecha: declarado(h.fecha) })),
    capitulos: x.capitulos.map((c) => ({
      nombre: c.nombre,
      items: c.items.length,
      total: c.items.reduce((s, i) => s + (Number.isFinite(i.valor_total) ? i.valor_total : 0), 0),
    })),
    lagunas: x.lagunas_pendientes.map((l) => ({
      descripcion: l.descripcion,
      severidad: l.severidad,
    })),
    origen: {
      requisitos: fila.origen.requisitos_habilitantes,
      causales: fila.origen.reglas_presupuesto,
      capitulos: fila.origen.capitulos,
    },
  };
}

/** El pliego subido para un proceso, o `null` si nadie lo ha subido. */
export async function pliegoDeProceso(procesoId: string): Promise<PliegoFicha | null> {
  const [fila] = await db
    .select({
      nombreArchivo: pliegoProceso.nombreArchivo,
      updatedAt: pliegoProceso.updatedAt,
      gateMatematicoPasado: pliegoProceso.gateMatematicoPasado,
      extraction: pliegoProceso.extraction,
      origen: pliegoProceso.origen,
    })
    .from(pliegoProceso)
    .where(eq(pliegoProceso.procesoId, procesoId))
    .limit(1);

  if (!fila) return null;
  return vistaPliegoFicha({
    ...fila,
    extraction: fila.extraction as PliegoExtraction,
    origen: fila.origen as FilaPliego["origen"],
  });
}
