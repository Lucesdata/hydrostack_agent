/**
 * "El mercado del agua en Colombia": el informe del último mes completo.
 *
 * Mes completo y no el mes en curso: un informe que cambia cada día mientras
 * alguien lo descarga no es un informe. Cuenta **todos los publicados** en el
 * SECOP II durante el mes (abiertos o ya cerrados), que es el tamaño del
 * mercado de ese mes; lo abierto hoy va aparte y dicho como tal.
 *
 * Cuatro consultas en paralelo, pagadas una vez por revalidación de la página
 * (6 h), no por visita.
 */

import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { db } from "../db/client";
import { entidad, geografia, proceso } from "../db/schema";
import { TIPOS_PROYECTO, type TipoProyecto } from "../classify/tipo-proyecto";

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export interface MesInforme {
  /** Primer día del mes, `YYYY-MM-DD`. */
  desde: string;
  /** Primer día del mes siguiente (exclusivo). */
  hasta: string;
  /** "agosto de 2026". */
  etiqueta: string;
}

const iso = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, "0")}-01`;

/**
 * El último mes completo en la hora de Colombia (UTC−5, sin horario de
 * verano): el 1 de septiembre a las 23:00 en Bogotá todavía es 1 de septiembre,
 * así que el informe es el de agosto aunque en UTC ya sea día 2.
 */
export function mesDelInforme(ahora: Date = new Date()): MesInforme {
  const bogota = new Date(ahora.getTime() - 5 * 3_600_000);
  let y = bogota.getUTCFullYear();
  let m = bogota.getUTCMonth() - 1;
  if (m < 0) {
    m = 11;
    y -= 1;
  }
  const sigY = m === 11 ? y + 1 : y;
  const sigM = (m + 1) % 12;
  return { desde: iso(y, m), hasta: iso(sigY, sigM), etiqueta: `${MESES[m]} de ${y}` };
}

export interface FilaInforme {
  nombre: string;
  n: number;
  monto: number;
}

export interface Informe {
  mes: MesInforme;
  publicados: number;
  montoPublicado: number;
  nConMonto: number;
  porTipo: Record<TipoProyecto, number>;
  departamentos: FilaInforme[];
  entidades: FilaInforme[];
}

const aNumero = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export async function informeDelMes(mes: MesInforme = mesDelInforme()): Promise<Informe> {
  const delMes = and(
    isNull(proceso.deletedAt),
    gte(proceso.fechaPublicacion, mes.desde),
    lt(proceso.fechaPublicacion, mes.hasta)
  );
  const n = sql<number>`count(*)::int`;
  const monto = sql<string>`coalesce(sum(${proceso.valorEstimado}) filter (where ${proceso.valorEstimado} > 0), 0)`;

  const [resumen, tipos, deps, ents] = await Promise.all([
    db
      .select({
        n,
        monto,
        nConMonto: sql<number>`(count(*) filter (where ${proceso.valorEstimado} > 0))::int`,
      })
      .from(proceso)
      .where(delMes),
    db
      .select({ tipo: proceso.tipoProyecto, n })
      .from(proceso)
      .where(delMes)
      .groupBy(proceso.tipoProyecto),
    db
      .select({ nombre: geografia.departamentoNombre, n, monto })
      .from(proceso)
      .innerJoin(geografia, eq(geografia.codigoDivipola, proceso.geografiaId))
      .where(delMes)
      .groupBy(geografia.departamentoNombre)
      .orderBy(desc(n))
      .limit(10),
    db
      .select({ nombre: entidad.nombre, n, monto })
      .from(proceso)
      .innerJoin(entidad, eq(entidad.id, proceso.entidadId))
      .where(delMes)
      .groupBy(entidad.id, entidad.nombre)
      .orderBy(desc(n), entidad.nombre)
      .limit(10),
  ]);

  const porTipo = Object.fromEntries(TIPOS_PROYECTO.map((t) => [t, 0])) as Record<
    TipoProyecto,
    number
  >;
  for (const f of tipos) if (f.tipo && f.tipo in porTipo) porTipo[f.tipo as TipoProyecto] = f.n;
  const filas = (xs: { nombre: string | null; n: number; monto: unknown }[]) =>
    xs.map((f) => ({
      nombre: f.nombre ?? "Sin nombre publicado",
      n: f.n,
      monto: aNumero(f.monto),
    }));

  return {
    mes,
    publicados: resumen[0]?.n ?? 0,
    montoPublicado: aNumero(resumen[0]?.monto),
    nConMonto: resumen[0]?.nConMonto ?? 0,
    porTipo,
    departamentos: filas(deps),
    entidades: filas(ents),
  };
}
