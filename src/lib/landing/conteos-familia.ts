/**
 * El mapa del hero contado por familia (spec 2026-10-07-hero-tres-destacados,
 * PR 2): cuántos procesos de agua potable, de agua residual y de redes publicó
 * cada departamento en 2026, y cuántos de ellos reciben ofertas hoy.
 *
 * Puro y sin base: lo usan el mapa (servidor), que pinta los escalones, y el
 * hero (navegador), que lista los departamentos por cifra.
 *
 * Por qué «publicados en 2026» y no «reciben ofertas» (D4 del spec): con
 * recepción vigente solo hay ≈128 procesos en toda la base; repartidos en tres
 * familias y 33 departamentos, el mapa saldría casi entero en cero. Los que
 * reciben ofertas van al lado, como dato aparte.
 */

import type { FamiliaDestacada } from "./destacados-portada";
import type { ProcesoPortada } from "./proceso-portada";
import type { Escalon } from "../mapa/escala";
import { slugificar } from "../secop/slug";

/** Desde cuándo cuenta el mapa: el mismo corte de la ficha con ciclo de vida. */
export const DESDE_CONTEOS = "2026-01-01";

export interface ConteoFamilia {
  /** Publicados desde `DESDE_CONTEOS`, en cualquier etapa. */
  n: number;
  /** De ellos, los que reciben ofertas hoy (`condicionAbierto()`). */
  abiertos: number;
}

export interface ConteoDepartamento {
  /** Código DIVIPOLA de dos dígitos. */
  dpto: string;
  nombre: string;
  potable: ConteoFamilia;
  residual: ConteoFamilia;
  redes: ConteoFamilia;
}

/**
 * Escalones del mapa por familia. Cortes fijos y redondos, como los del mapa de
 * abiertos (`escala.ts`, que explica por qué no cuantiles), pero más bajos: aquí
 * se cuenta una sola familia por departamento.
 */
export const ESCALONES_FAMILIA: readonly Escalon[] = [
  { indice: 0, min: 0, max: 0, etiqueta: "Ninguno" },
  { indice: 1, min: 1, max: 9, etiqueta: "1–9" },
  { indice: 2, min: 10, max: 49, etiqueta: "10–49" },
  { indice: 3, min: 50, max: 199, etiqueta: "50–199" },
  { indice: 4, min: 200, max: 499, etiqueta: "200–499" },
  { indice: 5, min: 500, max: null, etiqueta: "500+" },
] as const;

export function escalonFamiliaDe(n: number): Escalon {
  if (!Number.isFinite(n) || n <= 0) return ESCALONES_FAMILIA[0];
  return ESCALONES_FAMILIA.find((e) => e.max === null || n <= e.max) ?? ESCALONES_FAMILIA[0];
}

const numero = new Intl.NumberFormat("es-CO");

/** «42 en 2026 · 3 reciben ofertas», con singular y sin «0 reciben». */
export function textoConteo(c: ConteoFamilia): string {
  if (c.n === 0) return "ninguno en 2026";
  const base = `${numero.format(c.n)} en 2026`;
  if (c.abiertos === 0) return `${base} · ninguno recibe ofertas`;
  return `${base} · ${numero.format(c.abiertos)} ${c.abiertos === 1 ? "recibe" : "reciben"} ofertas`;
}

/** Los departamentos con procesos de la familia, de más a menos; empate, por nombre. */
export function filasDeCapa(
  conteos: ConteoDepartamento[],
  familia: FamiliaDestacada
): { dpto: string; nombre: string; conteo: ConteoFamilia }[] {
  return conteos
    .filter((c) => c[familia].n > 0)
    .map((c) => ({ dpto: c.dpto, nombre: c.nombre, conteo: c[familia] }))
    .sort((a, b) => b.conteo.n - a.conteo.n || a.nombre.localeCompare(b.nombre, "es"));
}

/**
 * La vitrina con los que reciben ofertas de una familia en un departamento, de
 * mayor a menor presupuesto. Solo tiene sentido si hay alguno: la vitrina
 * enseña los abiertos, y su lista de departamentos solo trae los que tienen.
 */
export function hrefRegion(nombre: string, familia: FamiliaDestacada): string {
  return `/licitaciones?tipo=${familia}&departamento=${slugificar(nombre)}&orden=valor`;
}

/** Lo que el panel de la región pinta (`GET /api/portada/region/[dpto]/[familia]`). */
export interface ProcesoRegion extends ProcesoPortada {
  /** `fecha_recepcion` (`AAAA-MM-DD`), para «Recibe ofertas hasta…». */
  cierre: string | null;
}

export interface RegionFamilia {
  dpto: string;
  nombre: string;
  familia: FamiliaDestacada;
  /** Los mismos números del mapa: publicados en 2026 y, de ellos, abiertos. */
  conteo: ConteoFamilia;
  /** Los de mayor presupuesto, hasta `LIMITE_REGION`. */
  procesos: ProcesoRegion[];
}

export const LIMITE_REGION = 5;
