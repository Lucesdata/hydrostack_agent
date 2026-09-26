/**
 * Quién compra: las entidades con más procesos abiertos de agua y saneamiento.
 *
 * Es la otra mitad de `/competidores` (quién se presenta y gana). Aquel pide
 * cuenta porque cruza histórico de adjudicaciones; esto son los mismos procesos
 * abiertos que cuentan las facetas, dato público, y se ve sin cuenta.
 *
 * Una sola consulta: el `count(*) over ()` se evalúa después del GROUP BY y
 * antes del LIMIT, así que trae cuántas entidades compran en total sin una
 * segunda ida a la base. El departamento es el de la entidad (su sede), el
 * mismo criterio que el mapa.
 */

import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { entidad, geografia, proceso } from "../db/schema";
import { condicionAbierto } from "./agregados";
import { claseDeEntidad, type ClaseEntidad } from "./clase-entidad";

export const LIMITE_COMPRADORES = 50;

export interface EntidadCompradora {
  id: string;
  nombre: string;
  departamento: string | null;
  clase: ClaseEntidad;
  /** Procesos abiertos. */
  n: number;
  /** Suma del presupuesto de los abiertos que lo publican (el 0 no cuenta). */
  montoAbierto: number;
  nConMonto: number;
}

export interface Compradores {
  entidades: EntidadCompradora[];
  /** Entidades distintas con al menos un proceso abierto, no solo las listadas. */
  totalEntidades: number;
}

export interface FilaCompradorSql {
  id: string;
  nombre: string | null;
  nivel: string | null;
  departamento: string | null;
  n: number;
  monto: string | number | null;
  nConMonto: number;
  total: number;
}

export function compradoresDesdeSql(filas: FilaCompradorSql[]): Compradores {
  return {
    totalEntidades: filas[0]?.total ?? 0,
    entidades: filas.map((f) => {
      const monto = Number(f.monto ?? 0);
      return {
        id: f.id,
        nombre: f.nombre?.trim() || "Entidad sin nombre publicado",
        departamento: f.departamento,
        clase: claseDeEntidad(f.nombre, f.nivel),
        n: f.n,
        montoAbierto: Number.isFinite(monto) && monto > 0 ? monto : 0,
        nConMonto: f.nConMonto ?? 0,
      };
    }),
  };
}

export async function entidadesCompradoras(limite = LIMITE_COMPRADORES): Promise<Compradores> {
  const n = sql<number>`count(*)::int`;
  const filas = await db
    .select({
      id: entidad.id,
      nombre: entidad.nombre,
      nivel: entidad.nivelGobierno,
      departamento: geografia.departamentoNombre,
      n,
      monto: sql<string>`coalesce(sum(${proceso.valorEstimado}) filter (where ${proceso.valorEstimado} > 0), 0)`,
      nConMonto: sql<number>`(count(*) filter (where ${proceso.valorEstimado} > 0))::int`,
      total: sql<number>`(count(*) over ())::int`,
    })
    .from(proceso)
    .innerJoin(entidad, eq(entidad.id, proceso.entidadId))
    .leftJoin(geografia, eq(geografia.codigoDivipola, entidad.geografiaId))
    .where(condicionAbierto())
    .groupBy(entidad.id, entidad.nombre, entidad.nivelGobierno, geografia.departamentoNombre)
    .orderBy(desc(n), entidad.nombre)
    .limit(limite);
  return compradoresDesdeSql(filas as unknown as FilaCompradorSql[]);
}
