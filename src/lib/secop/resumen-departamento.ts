/**
 * Tres procesos abiertos de mayor presupuesto: de un departamento, pedidos al
 * elegirlo, o del país entero, que es lo que ve la portada al llegar.
 */

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

/**
 * Sin departamento cuenta el país entero, también los procesos sin geografía
 * resuelta: son abiertos igual, y `totalAbiertos` los incluye. Con
 * departamento, el filtro sobre `geografia` en el WHERE los deja fuera, como
 * en el mapa (el `leftJoin` se comporta ahí como el `innerJoin` de antes).
 */
async function destacadosAbiertos(dpto: string | null): Promise<ProcesoResumen[]> {
  const filas = await db
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
      // Lo que pide la compuerta de plazo del semáforo (`compuertasAbsolutas`).
      estadoApertura: proceso.estadoApertura,
      fechaRecepcion: proceso.fechaRecepcion,
    })
    .from(proceso)
    .leftJoin(geografia, eq(geografia.codigoDivipola, proceso.geografiaId))
    .leftJoin(entidad, eq(proceso.entidadId, entidad.id))
    .where(
      dpto === null
        ? condicionAbierto()
        : and(condicionAbierto(), eq(geografia.departamentoCodigo, dpto))
    )
    .orderBy(sql`${proceso.valorEstimado} DESC NULLS LAST`, desc(proceso.fechaPublicacion))
    .limit(N_DESTACADOS);

  return filas.map((r) => ({
    ...mapRowToResumen(r),
    ficha: `/licitaciones/${slugDeProceso(r.objeto, r.secopProcesoId)}`,
  }));
}

export async function resumenDepartamento(dpto: string): Promise<ResumenDepartamento> {
  return { destacados: await destacadosAbiertos(dpto) };
}

/**
 * Los destacados del país, para la vista inicial del hero. Se calcula en el
 * servidor junto a los agregados de la portada (`app/page.js`) y no con una
 * petición del cliente: es lo que ve todo el que llega.
 */
export async function resumenNacional(): Promise<ResumenDepartamento> {
  return { destacados: await destacadosAbiertos(null) };
}
