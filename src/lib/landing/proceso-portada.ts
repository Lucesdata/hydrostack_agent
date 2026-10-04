/**
 * El contrato de un proceso del hero de la portada: lo que pintan a la vez la
 * minificha y su señal en el mapa (spec 2026-10-04-hero-cinco-minifichas §12).
 *
 * Puro y sin base: lo importan el servidor (la consulta y el mapa) y el
 * navegador (las minifichas). Que los dos lean el MISMO objeto es lo que impide
 * que el mapa enseñe un presupuesto o un lugar distinto al de la tarjeta.
 */

import { COLOR_TIPO, type FamiliaTipo } from "../classify/tipo-color";
import {
  clasificarTipoProyecto,
  TIPOS_PROYECTO,
  TIPO_PROYECTO,
  type TipoProyecto,
} from "../classify/tipo-proyecto";
import { ESTADOS_ABIERTO } from "../secop/estados-abierto";
import { montoConDato } from "../secop/monto";
import { idDesdeSlug, slugDeProceso } from "../secop/slug";

export interface ProcesoPortada {
  /** Identidad estable: `proceso.secop_proceso_id` (CO1.REQ.…). No se pinta. */
  id: string;
  /**
   * El número o referencia publicada del proceso (`proceso.referencia`), como
   * texto: conserva ceros iniciales, letras y guiones. No es el id interno.
   */
  numeroProceso: string;
  objeto: string;
  entidad: string | null;
  /** `true` solo si cumple la definición de abierto de `condicionAbierto()`. */
  abierto: boolean;
  /** El estado del trámite tal como lo publica la fuente (`estado_actual`). */
  estado: string | null;
  tipoProyecto: TipoProyecto | null;
  /** Aclara la evidencia que está en la descripción y no en el objeto abreviado. */
  contextoTipo?: string | null;
  /** Presupuesto oficial (`valor_estimado`) en pesos; `null` si no se publicó. */
  presupuesto: number | null;
  moneda: "COP";
  departamentoCodigo: string;
  departamento: string;
  /** `null` cuando la geografía resuelta es solo departamental. */
  municipio: string | null;
  /**
   * Qué significa la ubicación. Hoy solo hay una: la sede de la entidad
   * contratante. La fuente no publica el lugar de ejecución.
   */
  ubicacion: "entidad";
  /** Ruta de la ficha, `/licitaciones/<slug>`. */
  href: string;
}

/** Fila cruda de la consulta (`numeric` llega como texto desde pg). */
export interface FilaProcesoPortada {
  secopProcesoId: string | null;
  referencia: string | null;
  objeto: string | null;
  descripcion?: string | null;
  entidadNombre: string | null;
  estadoActual: string | null;
  estadoApertura: string | null;
  tipoProyecto: string | null;
  valorEstimado: string | number | null;
  departamentoCodigo: string | null;
  departamentoNombre: string | null;
  municipioNombre: string | null;
}

const texto = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/** "bogotá d.c." y "Bogotá D.C." son el mismo lugar: se compara sin tildes. */
const normal = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * La fila → el contrato, o `null` si el proceso no se puede mostrar en el hero:
 * sin id que resuelva una ficha, sin número de proceso, sin objeto o sin
 * departamento. La consulta ya filtra lo mismo; esto es la segunda puerta, y la
 * que se prueba sin base (spec §10, datos parciales).
 */
export function procesoPortadaDesdeFila(f: FilaProcesoPortada): ProcesoPortada | null {
  const id = texto(f.secopProcesoId);
  const numeroProceso = texto(f.referencia);
  const objeto = texto(f.objeto);
  const departamentoCodigo = texto(f.departamentoCodigo);
  const departamento = texto(f.departamentoNombre);
  if (!id || !numeroProceso || !objeto || !departamentoCodigo || !departamento) return null;

  const href = `/licitaciones/${slugDeProceso(objeto, id)}`;
  // La ficha resuelve el slug por el id del final: si no lo reconoce, la
  // tarjeta llevaría a un 404. Se excluye antes que enlazar mal.
  if (idDesdeSlug(href.slice("/licitaciones/".length)) !== id.toUpperCase()) return null;

  const municipio = texto(f.municipioNombre);
  const tipo = texto(f.tipoProyecto);
  const estado = texto(f.estadoActual);
  const tipoProyecto =
    tipo && (TIPOS_PROYECTO as readonly string[]).includes(tipo) ? (tipo as TipoProyecto) : null;
  let contextoTipo: string | null = null;
  if (tipoProyecto && tipoProyecto !== "otros" && texto(f.descripcion)) {
    // La clasificación persistida usa objeto + descripción, pero la minificha
    // solo enseña el objeto. Reutilizamos la evidencia y la poda de razón social
    // del clasificador; no cambiamos su regla ni reclasificamos la fila.
    const delObjeto = clasificarTipoProyecto({ objeto, entidadNombre: f.entidadNombre });
    if (!delObjeto.evidencia[tipoProyecto]?.length) {
      const deDescripcion = clasificarTipoProyecto({
        objeto: f.descripcion ?? null,
        entidadNombre: f.entidadNombre,
      });
      if (deDescripcion.evidencia[tipoProyecto]?.length) {
        contextoTipo = `Tipo según descripción: ${TIPO_PROYECTO[tipoProyecto].label}.`;
      }
    }
  }
  return {
    id,
    numeroProceso,
    objeto,
    entidad: texto(f.entidadNombre),
    abierto:
      f.estadoApertura === "Abierto" &&
      !!estado &&
      (ESTADOS_ABIERTO as readonly string[]).includes(estado),
    estado,
    tipoProyecto,
    contextoTipo,
    presupuesto: montoConDato(f.valorEstimado),
    moneda: "COP",
    departamentoCodigo,
    departamento,
    // Bogotá es municipio y departamento a la vez: «Bogotá D.C. · Bogotá D.C.»
    // no dice nada más que «Bogotá D.C.».
    municipio: municipio && normal(municipio) !== normal(departamento) ? municipio : null,
    ubicacion: "entidad",
    href,
  };
}

/** «Cali · Valle del Cauca», o solo el departamento si no hay municipio. */
export function ubicacionDe(p: Pick<ProcesoPortada, "municipio" | "departamento">): string {
  return p.municipio ? `${p.municipio} · ${p.departamento}` : p.departamento;
}

/**
 * El departamento para una etiqueta del mapa, que mide 150 unidades: el
 * archipiélago se queda en «San Andrés», como su recuadro.
 */
export function departamentoCorto(nombre: string): string {
  return nombre
    .replace(/^Archipi[ée]lago de\s+/i, "")
    .split(",")[0]
    .trim();
}

const ENTERO = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0, useGrouping: "always" });

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

/** «$2.450 millones» para la tarjeta; texto explícito si no hay presupuesto. */
export function presupuestoLargo(valor: number | null): string {
  if (valor == null) return "Presupuesto no disponible";
  if (valor < 1_000_000) return COP.format(valor);
  const millones = Math.round(valor / 1_000_000);
  return `$${ENTERO.format(millones)} ${millones === 1 ? "millón" : "millones"}`;
}

/** «$2.450 M» para la etiqueta del mapa. */
export function presupuestoCorto(valor: number | null): string {
  if (valor == null) return "Sin presupuesto";
  if (valor < 1_000_000) return COP.format(valor);
  return `$${ENTERO.format(Math.round(valor / 1_000_000))} M`;
}

/**
 * La familia de color de un proceso. Un proceso sin tipo cae en `otros`, que
 * es la presentación neutra (contorno punteado, «Sin subsistema
 * identificado»), nunca en «Redes y alcantarillado» aunque los dos sean grises.
 */
export function familiaDe(tipo: TipoProyecto | null): FamiliaTipo {
  return tipo ? COLOR_TIPO[tipo].familia : "otros";
}

/** El estado que se pinta: «Abierto» solo si la regla de abierto lo respalda. */
export function estadoVisible(p: Pick<ProcesoPortada, "abierto" | "estado">): string {
  if (p.abierto) return "Abierto";
  return p.estado ?? "Estado no disponible";
}
