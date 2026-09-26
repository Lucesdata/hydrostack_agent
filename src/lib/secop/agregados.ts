/**
 * Conteos agregados de procesos abiertos, por territorio, tipo y clase de
 * entidad. Es la capa de datos de "Navega por los datos" (portada), del mapa
 * del hero y de las tres familias de rutas facetadas.
 *
 * Antes no existía ningún agregado en el producto: `/api/landing-stats` pedía
 * tres `count(*)` sueltos a Socrata y a Postgres, y no había un solo `GROUP BY`
 * en el código. Las cifras de la portada eran totales, nunca un reparto.
 *
 * Todo sale de `proceso` en Postgres, nunca de Socrata en vivo: la portada no
 * puede depender de que un tercero responda.
 */

import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../db/client";
import { geografia, proceso } from "../db/schema";
import { TIPOS_PROYECTO, TIPO_PROYECTO, type TipoProyecto } from "../classify/tipo-proyecto";
import { CLASES_ENTIDAD, CLASE_ENTIDAD, sqlClaseEntidad, type ClaseEntidad } from "./clase-entidad";
// Pura y sin base: vive en ./slug para que el navegador pueda importarla.
import { slugificar } from "./slug";

export { slugificar };

/**
 * Qué cuenta como "abierto ahora".
 *
 * `estado_apertura = 'Abierto'` a secas NO sirve: son 68.563 procesos e incluye
 * los ya seleccionados, evaluados y cancelados, porque ese campo describe la
 * ventana de recepción y no el estado del trámite. Cruzado con
 * `estado_actual in ('Publicado','Abierto')` quedan 35.222, que sí son los que
 * un oferente puede mirar hoy.
 *
 * Vive aquí y se exporta porque el mapa, la faceta, la vitrina y las rutas
 * tienen que contar EXACTAMENTE lo mismo: si cada uno define "abierto" a su
 * manera, la portada enseña cuatro cifras distintas del mismo hecho.
 */
export const ESTADOS_ABIERTO = ["Publicado", "Abierto"] as const;

export function condicionAbierto() {
  return and(
    isNull(proceso.deletedAt),
    eq(proceso.estadoApertura, "Abierto"),
    inArray(proceso.estadoActual, [...ESTADOS_ABIERTO])
  );
}

const conteo = sql<number>`count(*)::int`;

export interface FilaAgregado {
  /** Clave estable (código DIVIPOLA, tipo, clase). */
  clave: string;
  label: string;
  /** Segmento de la ruta facetada. */
  slug: string;
  n: number;
}

/**
 * Procesos abiertos por departamento, de mayor a menor.
 *
 * Los 12.822 procesos sin geografía resuelta NO se cuentan como un
 * departamento más: quedan fuera del reparto. Inventarles un "sin ubicación"
 * en un mapa sería pintar un territorio que no existe; el total de la banda de
 * métricas sigue siendo el de verdad y por eso no cuadra con la suma de esta
 * lista — que es correcto y hay que decirlo donde se muestre.
 */
export async function procesosPorDepartamento(): Promise<FilaAgregado[]> {
  const filas = await db
    .select({
      clave: geografia.departamentoCodigo,
      label: geografia.departamentoNombre,
      n: conteo,
    })
    .from(proceso)
    .innerJoin(geografia, eq(geografia.codigoDivipola, proceso.geografiaId))
    .where(condicionAbierto())
    .groupBy(geografia.departamentoCodigo, geografia.departamentoNombre)
    .orderBy(desc(conteo));

  return filas
    .filter((f): f is { clave: string; label: string; n: number } => !!f.clave && !!f.label)
    .map((f) => ({ clave: f.clave, label: f.label, slug: slugificar(f.label), n: f.n }));
}

/**
 * Procesos abiertos por tipo de proyecto. Devuelve SIEMPRE los cinco, incluso
 * los que están en cero: una leyenda a la que le faltan valores según el filtro
 * activo hace creer que la taxonomía cambia, y no cambia.
 */
export async function procesosPorTipo(): Promise<FilaAgregado[]> {
  const filas = await db
    .select({ tipo: proceso.tipoProyecto, n: conteo })
    .from(proceso)
    .where(condicionAbierto())
    .groupBy(proceso.tipoProyecto);

  const porTipo = new Map(filas.map((f) => [f.tipo as TipoProyecto, f.n]));
  return TIPOS_PROYECTO.map((t) => ({
    clave: t,
    label: TIPO_PROYECTO[t].label,
    slug: TIPO_PROYECTO[t].slug,
    n: porTipo.get(t) ?? 0,
  }));
}

/**
 * Procesos abiertos por clase de entidad contratante. La clase no es una
 * columna: se deriva con el mismo criterio que `claseDeEntidad()`, emitido a
 * SQL por `sqlClaseEntidad()` — ver ahí por qué la duplicación es segura.
 */
export async function procesosPorClaseEntidad(): Promise<FilaAgregado[]> {
  // Cuesta ~800 ms y se dejó así. Se probó calcular la clase en una subconsulta
  // sobre `entidad` —4.223 filas en vez de 35.222— pensando que el CASE de
  // expresiones regulares era el cuello; medido, salió IGUAL o peor (884 ms
  // contra 783). Ese truco sí funciona cuando la faceta FILTRA por una clase,
  // porque poda las entidades antes del join (ver `condicionDeFaceta`: 2.612 ms
  // → 363), pero aquí hacen falta todas las clases de todos modos.
  const claseExpr = sql.raw(sqlClaseEntidad("e.nombre", "e.nivel_gobierno"));
  const filas = await db
    .select({ clase: sql<string>`${claseExpr}`, n: conteo })
    .from(proceso)
    .innerJoin(sql`entidad e`, sql`e.id = ${proceso.entidadId}`)
    .where(condicionAbierto())
    .groupBy(sql`1`);

  const porClase = new Map(filas.map((f) => [f.clase as ClaseEntidad, f.n]));
  return CLASES_ENTIDAD.map((c) => ({
    clave: c,
    label: CLASE_ENTIDAD[c].label,
    slug: CLASE_ENTIDAD[c].slug,
    n: porClase.get(c) ?? 0,
  })).sort((a, b) => b.n - a.n);
}

/**
 * Un departamento de la portada con lo que su ficha del hero necesita. Es un
 * superconjunto de `FilaAgregado`, así que el mapa y la lista lo aceptan igual.
 */
export interface FilaDepartamento extends FilaAgregado {
  /** Abiertos cuya fecha de publicación cae en los últimos 7 días. */
  nuevos7d: number;
  /**
   * Suma del presupuesto oficial de los abiertos que lo publican. El 0 del
   * SECOP es "sin dato" (ver `montoConDato`), así que no suma ni cuenta.
   */
  montoAbierto: number;
  /** Cuántos de los `n` abiertos tienen presupuesto publicado. */
  nConMonto: number;
  /** Abiertos por tipo de proyecto. No suma `n`: hay procesos sin clasificar. */
  tipos: Record<TipoProyecto, number>;
}

/** Fila cruda de `detallePorDepartamento`: pg entrega `numeric` como texto. */
export interface FilaDepartamentoSql {
  clave: string | null;
  label: string | null;
  n: number;
  nuevos7d: number;
  monto: string | number | null;
  nConMonto: number;
  [tipo: `t_${string}`]: number;
}

export function filaDepartamentoDesdeSql(f: FilaDepartamentoSql): FilaDepartamento | null {
  if (!f.clave || !f.label) return null;
  const monto = Number(f.monto ?? 0);
  return {
    clave: f.clave,
    label: f.label,
    slug: slugificar(f.label),
    n: f.n,
    nuevos7d: f.nuevos7d ?? 0,
    montoAbierto: Number.isFinite(monto) && monto > 0 ? monto : 0,
    nConMonto: f.nConMonto ?? 0,
    tipos: Object.fromEntries(TIPOS_PROYECTO.map((t) => [t, f[`t_${t}`] ?? 0])) as Record<
      TipoProyecto,
      number
    >,
  };
}

/**
 * `procesosPorDepartamento` con el detalle de la ficha del hero, en **una sola
 * consulta** (conteos con `FILTER`). Solo la usa la portada: las facetas siguen
 * con la consulta ligera. No se añade como quinta consulta en paralelo porque
 * el pool ya se agotó una vez (PENDIENTES §40); sustituye a la de siempre.
 */
export async function detallePorDepartamento(): Promise<FilaDepartamento[]> {
  const porTipo = Object.fromEntries(
    TIPOS_PROYECTO.map((t) => [
      `t_${t}`,
      sql<number>`(count(*) filter (where ${proceso.tipoProyecto} = ${t}))::int`,
    ])
  );
  const filas = await db
    .select({
      clave: geografia.departamentoCodigo,
      label: geografia.departamentoNombre,
      n: conteo,
      nuevos7d: sql<number>`(count(*) filter (where ${proceso.fechaPublicacion} >= current_date - 7))::int`,
      monto: sql<string>`coalesce(sum(${proceso.valorEstimado}) filter (where ${proceso.valorEstimado} > 0), 0)`,
      nConMonto: sql<number>`(count(*) filter (where ${proceso.valorEstimado} > 0))::int`,
      ...porTipo,
    })
    .from(proceso)
    .innerJoin(geografia, eq(geografia.codigoDivipola, proceso.geografiaId))
    .where(condicionAbierto())
    .groupBy(geografia.departamentoCodigo, geografia.departamentoNombre)
    .orderBy(desc(conteo));

  return (filas as unknown as FilaDepartamentoSql[])
    .map(filaDepartamentoDesdeSql)
    .filter((f): f is FilaDepartamento => f !== null);
}

export interface AgregadosPortada {
  totalAbiertos: number;
  departamentos: FilaDepartamento[];
  tipos: FilaAgregado[];
  clasesEntidad: FilaAgregado[];
}

/** Las tres facetas y el total, en una sola ida a la base. */
export async function agregadosPortada(): Promise<AgregadosPortada> {
  const [total, departamentos, tipos, clasesEntidad] = await Promise.all([
    db.select({ n: conteo }).from(proceso).where(condicionAbierto()),
    detallePorDepartamento(),
    procesosPorTipo(),
    procesosPorClaseEntidad(),
  ]);
  return { totalAbiertos: total[0]?.n ?? 0, departamentos, tipos, clasesEntidad };
}
