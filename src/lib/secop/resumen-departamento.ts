/** Tres procesos abiertos de mayor presupuesto de un departamento, pedidos al elegirlo. */

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { entidad, geografia, proceso } from "../db/schema";
import { condicionAbierto } from "./agregados";
import { mapRowToResumen, type ProcesoResumen } from "./recientes";
import { slugDeProceso } from "./slug";

export const N_DESTACADOS = 3;

export interface ResumenDepartamento {
  destacados: ProcesoResumen[];
}

/** El código DIVIPOLA de departamento: dos dígitos. Todo lo demás se rechaza. */
export function esCodigoDepartamento(v: unknown): v is string {
  return typeof v === "string" && /^\d{2}$/.test(v);
}

export async function resumenDepartamento(dpto: string): Promise<ResumenDepartamento> {
  const delDepartamento = eq(geografia.departamentoCodigo, dpto);
  const destacados = await db
    .select({
      secopProcesoId: proceso.secopProcesoId,
      referencia: proceso.referencia,
      objeto: proceso.objeto,
      modalidad: proceso.modalidad,
      estado: proceso.estadoActual,
      valorEstimado: proceso.valorEstimado,
      fechaPublicacion: proceso.fechaPublicacion,
      entidadNombre: entidad.nombre,
      departamento: geografia.departamentoNombre,
      municipio: geografia.municipioNombre,
      urlRaw: proceso.url,
      tipoProyecto: proceso.tipoProyecto,
    })
    .from(proceso)
    .innerJoin(geografia, eq(geografia.codigoDivipola, proceso.geografiaId))
    .leftJoin(entidad, eq(proceso.entidadId, entidad.id))
    .where(and(condicionAbierto(), delDepartamento))
    .orderBy(sql`${proceso.valorEstimado} DESC NULLS LAST`, desc(proceso.fechaPublicacion))
    .limit(N_DESTACADOS);

  return {
    destacados: destacados.map((r) => ({
      ...mapRowToResumen(r),
      ficha: `/licitaciones/${slugDeProceso(r.objeto, r.secopProcesoId)}`,
    })),
  };
}
