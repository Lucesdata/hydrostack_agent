/**
 * La consulta del marketplace. Una sola lectura por petición, sobre la base
 * normalizada de AquaLicita (nunca Socrata en vivo), con **el mismo predicado**
 * que la vitrina: lista, indicadores y mapa comparten `condicionAbierto()` y
 * `condicionesDeFiltros()`, así que para los mismos filtros dan las mismas
 * cifras que `/licitaciones`.
 *
 * - Lista y total: `procesosDeVitrina("abiertos", …)`, con todos los filtros.
 * - Mapa: agrega con todos los filtros **salvo el territorial** (para poder
 *   cambiar de departamento), y cuenta aparte lo que no tiene ubicación.
 * - Indicadores: aplican el departamento. En la búsqueda por número tienen otro
 *   alcance (también cerrados) y se retiran en vez de mezclar universos.
 *
 * Una falla de la base no rompe la página: devuelve `no-disponible` y la vista
 * conserva la navegación. No hay snapshot de respaldo todavía, por eso el estado
 * `desactualizado` existe en el contrato pero esta consulta no lo produce.
 */

import { and, count, countDistinct, eq, inArray, max, sql } from "drizzle-orm";
import { db } from "../db/client";
import { entidad, geografia, proceso } from "../db/schema";
import { condicionAbierto } from "../secop/agregados";
import type { FiltrosVitrina } from "../secop/filtros-vitrina";
import { condicionesDeFiltros, procesosDeVitrina } from "../secop/vitrina";
import {
  metricasDesdeFila,
  oportunidadDesdeFila,
  regionesDesdeFilas,
  resolverDepartamento,
  type ExtraDeProceso,
} from "./adaptador";
import type { ConsultaMarketplace, Metricas } from "./tipos";
import { sinEtapa } from "./url";

async function extrasDe(ids: string[]): Promise<Map<string, ExtraDeProceso>> {
  if (ids.length === 0) return new Map();
  const filas = await db
    .select({
      id: proceso.secopProcesoId,
      referencia: proceso.referencia,
      url: proceso.url,
      departamentoCodigo: geografia.departamentoCodigo,
    })
    .from(proceso)
    .leftJoin(geografia, eq(geografia.codigoDivipola, proceso.geografiaId))
    // Un id puede aparecer en más de una fila: la primera basta para la tarjeta.
    .where(inArray(proceso.secopProcesoId, ids));
  const m = new Map<string, ExtraDeProceso>();
  for (const f of filas) if (!m.has(f.id)) m.set(f.id, f);
  return m;
}

async function metricasDe(
  filtros: FiltrosVitrina,
  departamentoCodigo: string | null
): Promise<Metricas> {
  const [f] = await db
    .select({
      abiertas: count(),
      entidades: countDistinct(proceso.entidadId),
      valor: sql<string | null>`sum(${proceso.valorEstimado}) filter (where ${proceso.valorEstimado} > 0)`,
      conValor: sql<number>`(count(*) filter (where ${proceso.valorEstimado} > 0))::int`,
    })
    .from(proceso)
    .leftJoin(entidad, eq(entidad.id, proceso.entidadId))
    .leftJoin(geografia, eq(geografia.codigoDivipola, proceso.geografiaId))
    .where(and(condicionAbierto(), ...condicionesDeFiltros(filtros, departamentoCodigo)));
  return metricasDesdeFila(f);
}

export async function consultarMarketplace(
  filtrosEntrada: FiltrosVitrina,
  pagina = 1
): Promise<ConsultaMarketplace> {
  const consultadoEn = new Date().toISOString();
  const filtros = sinEtapa(filtrosEntrada);
  try {
    // El mapa y los indicadores no leen `numero`: esa búsqueda es otro universo.
    const sinNumero: FiltrosVitrina = { ...filtros, numero: null };
    const sinTerritorio: FiltrosVitrina = { ...sinNumero, departamento: null };

    const filasRegion = await db
      .select({
        codigo: geografia.departamentoCodigo,
        nombre: sql<string | null>`min(${geografia.departamentoNombre})`,
        total: count(),
      })
      .from(proceso)
      .leftJoin(entidad, eq(entidad.id, proceso.entidadId))
      .leftJoin(geografia, eq(geografia.codigoDivipola, proceso.geografiaId))
      .where(and(condicionAbierto(), ...condicionesDeFiltros(sinTerritorio, null)))
      .groupBy(geografia.departamentoCodigo);
    const { regiones, sinUbicacion } = regionesDesdeFilas(filasRegion);

    const { seleccion, invalido } = resolverDepartamento(filtros.departamento, regiones);
    // Un slug inválido no filtra (la URL se dice «filtro inválido» y se retira).
    const filtrosEfectivos: FiltrosVitrina = invalido ? { ...filtros, departamento: null } : filtros;
    const departamentoCodigo = seleccion?.codigo ?? null;

    const [datos, metricas, [frescura]] = await Promise.all([
      procesosDeVitrina("abiertos", pagina, { filtros: filtrosEfectivos, departamentoCodigo }),
      filtros.numero
        ? Promise.resolve<Metricas | null>(null)
        : metricasDe({ ...sinNumero, departamento: seleccion?.slug ?? null }, departamentoCodigo),
      db.select({ ultima: max(proceso.updatedAt) }).from(proceso),
    ]);

    const extras = await extrasDe(datos.items.map((p) => p.secopProcesoId));
    return {
      estado: "disponible",
      consultadoEn,
      actualizadoEn: frescura?.ultima ? new Date(frescura.ultima).toISOString() : null,
      total: datos.total,
      items: datos.items.map((p) => oportunidadDesdeFila(p, extras.get(p.secopProcesoId))),
      porDepartamento: regiones,
      sinUbicacion,
      metricas,
      departamentoSeleccionado: seleccion,
      departamentoInvalido: invalido,
    };
  } catch (error) {
    // Sin términos de búsqueda ni tokens: solo qué falló.
    console.error("[marketplace] consulta no disponible:", error instanceof Error ? error.message : "desconocido");
    return { estado: "no-disponible", consultadoEn };
  }
}
