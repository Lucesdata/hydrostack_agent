/**
 * Del modelo normalizado de AquaLicita al contrato de vista del marketplace.
 * Puro: sin base. La fuente verificable es SECOP II (`p6dx-8zbt`) ya ingerida;
 * aquí solo se normaliza para presentar.
 */

import geojson from "@/data/geo/departamentos.geo.json";
import { montoConDato } from "../secop/monto";
import { slugDeProceso, slugificar } from "../secop/slug";
import { urlDetalleSecop } from "../secop/url-secop";
import type { ProcesoDeVitrina } from "../secop/vitrina";
import type { Metricas, Oportunidad, Region, RegionSeleccionada } from "./tipos";

/** Lo que la vitrina no trae y la tarjeta necesita. */
export interface ExtraDeProceso {
  referencia: string | null;
  url: string | null;
  departamentoCodigo: string | null;
}

export function oportunidadDesdeFila(p: ProcesoDeVitrina, extra?: ExtraDeProceso): Oportunidad {
  const monto = montoConDato(p.valorEstimado);
  return {
    id: p.secopProcesoId,
    referencia: extra?.referencia ?? null,
    objeto: p.objeto?.trim() || "",
    entidad: p.entidadNombre,
    departamentoCodigo: extra?.departamentoCodigo ?? null,
    departamento: p.departamento,
    municipio: p.municipio,
    tipo: p.tipoProyecto,
    estado: p.estadoActual,
    estadoApertura: p.estadoApertura,
    etapaCalculada: p.etapaCalculada ?? null,
    // Decimal como texto hasta formatear: nunca pasa por un float aquí.
    precioBaseCop: monto === null ? null : String(p.valorEstimado),
    fechaPublicacion: p.fechaPublicacion,
    fechaRecepcion: p.fechaRecepcion,
    fichaHref: `/licitaciones/${slugDeProceso(p.objeto, p.secopProcesoId)}`,
    secopHref: urlDetalleSecop(extra?.url),
  };
}

export interface FilaMetricas {
  abiertas: number;
  entidades: number | null;
  /** `sum(precio_base)` de los que lo publican; pg entrega `numeric` como texto. */
  valor: string | number | null;
  conValor: number | null;
}

/**
 * La suma solo se ofrece si hay al menos un precio publicado: «$0» de una suma
 * vacía diría que el presupuesto es cero (el 0 es un hueco, no un precio).
 */
export function metricasDesdeFila(f: FilaMetricas): Metricas {
  const conValor = f.conValor ?? 0;
  const valor = f.valor == null ? null : String(f.valor);
  const hay = conValor > 0 && valor !== null && Number(valor) > 0;
  return {
    abiertas: f.abiertas,
    entidades: f.entidades,
    valorEstimadoCop: hay ? valor : null,
    procesosConValor: f.conValor,
  };
}

export interface FilaRegion {
  codigo: string | null;
  nombre: string | null;
  total: number;
}

/**
 * Los departamentos del agregado, y los procesos que no se pueden ubicar. El
 * grupo sin código no es un departamento: se cuenta aparte, nunca en el mapa.
 */
export function regionesDesdeFilas(filas: FilaRegion[]): {
  regiones: Region[];
  sinUbicacion: number;
} {
  const regiones: Region[] = [];
  let sinUbicacion = 0;
  for (const f of filas) {
    if (!f.codigo || !f.nombre) sinUbicacion += f.total;
    else regiones.push({ codigo: f.codigo, nombre: f.nombre, slug: slugificar(f.nombre), total: f.total });
  }
  regiones.sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, "es"));
  return { regiones, sinUbicacion };
}

interface FeatureDane {
  properties: { dpto: string; nombre: string };
}

function comoTitulo(nombre: string): string {
  return nombre
    .toLocaleLowerCase("es")
    .replace(/(^|[\s(])([a-záéíóúñ])/g, (_, pre, letra) => pre + letra.toLocaleUpperCase("es"));
}

/** Los 33 departamentos del MGN 2025: el catálogo de lo que es un territorio válido. */
export const DEPARTAMENTOS_DANE: RegionSeleccionada[] = (
  geojson as unknown as { features: FeatureDane[] }
).features.map((f) => {
  const nombre = comoTitulo(f.properties.nombre);
  return { codigo: f.properties.dpto, nombre, slug: slugificar(nombre) };
});

/**
 * Resuelve el slug de la URL. Primero entre los departamentos que tienen
 * resultados (con el nombre de la base); si no está, en el catálogo DANE: una
 * región válida sin coincidencias conserva su selección y muestra cero. Un slug
 * que no es ninguna de las dos es un filtro inválido, que se dice y se retira.
 */
export function resolverDepartamento(
  slug: string | null,
  regiones: Region[]
): { seleccion: RegionSeleccionada | null; invalido: boolean } {
  if (!slug) return { seleccion: null, invalido: false };
  const r = regiones.find((x) => x.slug === slug);
  if (r) return { seleccion: { codigo: r.codigo, nombre: r.nombre, slug: r.slug }, invalido: false };
  const d = DEPARTAMENTOS_DANE.find((x) => x.slug === slug);
  return d ? { seleccion: d, invalido: false } : { seleccion: null, invalido: true };
}
