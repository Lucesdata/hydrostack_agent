/**
 * Búsqueda de entidades en servidor para el Radar institucional.
 *
 * El Radar lista las 50 entidades con más procesos abiertos; una institución
 * con pocos abiertos (o ninguno) como EMCALI —«EMPRESAS MUNICIPALES DE CALI»,
 * NIT 890399003— quedaba fuera. Esta consulta recorre toda la tabla `entidad`
 * (4.320 filas, un NIT por entidad) y trae los abiertos de cada coincidencia.
 *
 * Sin la extensión `unaccent`: se normaliza con `translate`, igual que
 * `sqlClaseEntidad`. Cada palabra de la búsqueda debe aparecer en el nombre
 * (orden libre); un texto de 6 a 12 dígitos busca además por NIT exacto.
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { entidad, geografia, proceso } from "../db/schema";
import { condicionAbierto } from "./agregados";
import { claseDeEntidad, CLASES_ENTIDAD, type ClaseEntidad } from "./clase-entidad";
import type { EntidadCompradora } from "./compradores";
import { aliasDeBusqueda } from "./alias-entidades";

export const MIN_CARACTERES_BUSQUEDA = 2;
export const MAX_RESULTADOS_BUSQUEDA = 20;
const POOL = 300;

export interface EntidadBuscada extends EntidadCompradora {
  nit: string | null;
}

export function normalizarBusqueda(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Palabras de la búsqueda, ya normalizadas (máx. 6, para acotar la consulta). */
export function palabrasDeBusqueda(texto: string): string[] {
  return normalizarBusqueda(texto).split(" ").filter(Boolean).slice(0, 6);
}

export function esClaseEntidad(valor: string | null | undefined): valor is ClaseEntidad {
  return !!valor && (CLASES_ENTIDAD as readonly string[]).includes(valor);
}

export async function buscarEntidades(
  texto: string,
  clase?: ClaseEntidad | null,
  limite = MAX_RESULTADOS_BUSQUEDA
): Promise<EntidadBuscada[]> {
  const palabras = palabrasDeBusqueda(texto);
  if (palabras.join("").length < MIN_CARACTERES_BUSQUEDA) return [];

  const nombreNorm = sql`translate(lower(${entidad.nombre}),'áéíóúüñ','aeiouun')`;
  const porNombre = palabras.map((p) => sql`${nombreNorm} like ${"%" + p + "%"}`);
  const soloDigitos = texto.replace(/[.\-\s]/g, "");
  const porNit = /^\d{6,12}$/.test(soloDigitos)
    ? sql`${entidad.nitCanonico} = ${soloDigitos.slice(0, 9)}`
    : null;
  const alias = aliasDeBusqueda(texto);
  const porAlias = alias ? sql`${entidad.nitCanonico} = ${alias.nit}` : null;
  const extras = [porNit, porAlias].filter((x) => x !== null);
  const coincide = extras.length
    ? sql`(${and(...porNombre)} or ${sql.join(extras, sql` or `)})`
    : and(...porNombre);

  // Paso 1: las entidades que coinciden (tabla pequeña, sin tocar `proceso`).
  // Unir `proceso` aquí hacía que el planificador recorriera la tabla entera por
  // entidad (8,4 s medidos en la base viva); separado son ~230 ms.
  const candidatas = await db
    .select({
      id: entidad.id,
      nombre: entidad.nombre,
      nit: entidad.nitCanonico,
      nivel: entidad.nivelGobierno,
      departamento: geografia.departamentoNombre,
    })
    .from(entidad)
    .leftJoin(geografia, eq(geografia.codigoDivipola, entidad.geografiaId))
    .where(coincide)
    .orderBy(entidad.nombre)
    .limit(POOL);
  if (candidatas.length === 0) return [];

  // Paso 2: una sola agregación de abiertos sobre esos ids.
  const abiertos = await db
    .select({
      entidadId: proceso.entidadId,
      n: sql<number>`count(*)::int`,
      monto: sql<string>`coalesce(sum(${proceso.valorEstimado}) filter (where ${proceso.valorEstimado} > 0), 0)`,
      nConMonto: sql<number>`(count(*) filter (where ${proceso.valorEstimado} > 0))::int`,
    })
    .from(proceso)
    .where(
      and(
        inArray(
          proceso.entidadId,
          candidatas.map((c) => c.id)
        ),
        condicionAbierto()
      )
    )
    .groupBy(proceso.entidadId);
  const porEntidad = new Map(abiertos.map((a) => [a.entidadId, a]));

  const filas = candidatas.map((c) => ({
    ...c,
    ...(porEntidad.get(c.id) ?? { n: 0, monto: "0", nConMonto: 0 }),
  }));
  // La entidad del alias va primero: es lo que la persona quiso decir con la sigla.
  const fijada = (nit: string | null) => (alias && nit === alias.nit ? 0 : 1);
  filas.sort(
    (x, y) =>
      fijada(x.nit) - fijada(y.nit) ||
      y.n - x.n ||
      (x.nombre ?? "").localeCompare(y.nombre ?? "", "es")
  );

  return filas
    .map((f) => {
      const monto = Number(f.monto ?? 0);
      return {
        id: f.id,
        nombre: f.nombre?.trim() || "Entidad sin nombre publicado",
        nit: f.nit,
        departamento: f.departamento,
        clase: claseDeEntidad(f.nombre, f.nivel),
        n: f.n,
        montoAbierto: Number.isFinite(monto) && monto > 0 ? monto : 0,
        nConMonto: f.nConMonto ?? 0,
      };
    })
    .filter((e) => !clase || e.clase === clase)
    .slice(0, limite);
}
