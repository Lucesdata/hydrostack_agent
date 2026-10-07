/**
 * Los tres procesos destacados del hero (spec 2026-10-07-hero-tres-destacados):
 * el más relevante de agua potable, el de agua residual y el de redes, uno por
 * pestaña.
 *
 * Puro y sin base: lo importan la consulta (servidor) y el hero (navegador).
 * Las familias son las de `tipo-color.ts` —potable = acueducto + PTAP,
 * residual = PTAR, redes = alcantarillado—, que son también las del color del
 * mapa y la leyenda: la pestaña, la ficha y el mapa no pueden agrupar distinto.
 */

import { COLOR_TIPO, type FamiliaTipo } from "../classify/tipo-color";
import { TIPOS_PROYECTO, type TipoProyecto } from "../classify/tipo-proyecto";
import type { ProcesoPortada } from "./proceso-portada";

/** Las tres pestañas, en su orden. `otros` no tiene pestaña: no afirma subsistema. */
export const FAMILIAS_DESTACADAS = [
  "potable",
  "residual",
  "redes",
] as const satisfies readonly FamiliaTipo[];
export type FamiliaDestacada = (typeof FAMILIAS_DESTACADAS)[number];

/**
 * «Más relevante» = mayor presupuesto entre los que reciben ofertas y les quedan
 * al menos estos días. Sin ese margen el de mayor presupuesto podía cerrar al
 * día siguiente: no da tiempo a preparar una oferta.
 */
export const DIAS_MINIMOS_DESTACADO = 5;

export interface DestacadoPortada {
  familia: FamiliaDestacada;
  /** `null` si hoy ningún proceso de la familia cumple. */
  proceso: ProcesoPortada | null;
  /** `fecha_recepcion` (`AAAA-MM-DD`): el último día para ofertar. */
  cierre: string | null;
  /**
   * `true` si le quedan al menos `DIAS_MINIMOS_DESTACADO` días. Si ninguno de
   * la familia los tiene, se toma el de mayor presupuesto igualmente y se dice
   * que cierra pronto.
   */
  holgado: boolean;
}

/** El texto de la pestaña: las palabras del usuario, cortas para caber en móvil. */
export const PESTANA: Record<FamiliaDestacada, string> = {
  potable: "Agua potable",
  residual: "Agua residual",
  redes: "Redes",
};

/** Los tipos de obra de una familia, desde la única fuente (`COLOR_TIPO`). */
export function tiposDeFamilia(familia: FamiliaDestacada): TipoProyecto[] {
  return TIPOS_PROYECTO.filter((t) => COLOR_TIPO[t].familia === familia);
}

/**
 * La vitrina con los procesos de la familia, de mayor a menor presupuesto. La
 * vitrina conoce las tres familias como sistemas (`busqueda-guiada.ts`) con los
 * mismos tipos (lo vigila un test).
 */
export function hrefDeFamilia(familia: FamiliaDestacada): string {
  return `/licitaciones?tipo=${familia}&orden=valor`;
}

/** «14 oct 2026», el día de calendario de un DATE, sin correrlo por zona horaria. */
export function fechaDeCierre(iso: string | null): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d
    .toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    })
    .replace(/\./g, "")
    .replace(/ de /g, " ");
}

/** La regla, escrita en la ficha: el usuario sabe por qué este y no otro. */
export function criterioDe(d: Pick<DestacadoPortada, "cierre" | "holgado">): string {
  const fecha = fechaDeCierre(d.cierre);
  if (d.holgado) {
    return `El de mayor presupuesto entre los que reciben ofertas ${DIAS_MINIMOS_DESTACADO} días o más.${fecha ? ` Cierre: ${fecha}.` : ""}`;
  }
  return `El de mayor presupuesto entre los que reciben ofertas.${fecha ? ` Cierra pronto: ${fecha}.` : ""}`;
}

/** Los procesos de los destacados que existen, en el orden de las pestañas. */
export function procesosDe(destacados: DestacadoPortada[] | null): ProcesoPortada[] {
  return (destacados ?? []).flatMap((d) => (d.proceso ? [d.proceso] : []));
}
