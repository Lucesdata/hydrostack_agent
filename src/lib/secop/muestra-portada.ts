/**
 * Los procesos del hero de la portada: hasta cinco abiertos, elegidos al azar
 * (spec 2026-10-04-hero-cinco-minifichas §5).
 *
 * **Una consulta**, no cinco: la portada la llama una vez al regenerarse (ISR de
 * 6 h, `app/page.js`) y el HTML resultante lleva la selección. Por eso es
 * estable durante la visita y entre servidor e hidratación —el navegador no
 * sortea nada— y puede cambiar al renovarse la caché, que es lo que pide el
 * spec. No hay endpoint público nuevo.
 *
 * El sorteo es `ORDER BY random() LIMIT n` sobre **todo** el conjunto elegible,
 * sin un tope previo de candidatos: muestreo sin reemplazo, sin sesgo hacia los
 * más recientes ni los de mayor presupuesto. Postgres lo resuelve con un top-N
 * sobre los ~35 mil abiertos; nada de eso viaja al navegador.
 *
 * Ni se equilibra por territorio ni se exige presupuesto: cinco del mismo
 * departamento es un resultado válido, y el mapa lo sabe dibujar.
 */

import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "../db/client";
import { entidad, geografia, proceso } from "../db/schema";
import { anclaDe, CODIGOS_CON_ANCLA } from "../mapa/etiquetas-procesos";
import {
  procesoPortadaDesdeFila,
  type FilaProcesoPortada,
  type ProcesoPortada,
} from "../landing/proceso-portada";
import { condicionAbierto } from "./agregados";

export const N_PROCESOS_PORTADA = 5;

/**
 * Elegibles (spec §5.2): abiertos según `condicionAbierto()` —la misma regla del
 * mapa y las facetas, sin deducir apertura de una fecha ausente—, con número de
 * proceso y objeto publicados, un id con la forma que resuelve la ficha y un
 * departamento que el mapa sabe anclar. La ingesta ya garantiza que es de agua.
 */
export async function muestraPortada(n = N_PROCESOS_PORTADA): Promise<ProcesoPortada[]> {
  const filas: FilaProcesoPortada[] = await db
    .select({
      secopProcesoId: proceso.secopProcesoId,
      referencia: proceso.referencia,
      objeto: proceso.objeto,
      entidadNombre: entidad.nombre,
      estadoActual: proceso.estadoActual,
      estadoApertura: proceso.estadoApertura,
      tipoProyecto: proceso.tipoProyecto,
      valorEstimado: proceso.valorEstimado,
      departamentoCodigo: geografia.departamentoCodigo,
      departamentoNombre: geografia.departamentoNombre,
      municipioNombre: geografia.municipioNombre,
    })
    .from(proceso)
    .innerJoin(geografia, eq(geografia.codigoDivipola, proceso.geografiaId))
    .leftJoin(entidad, eq(proceso.entidadId, entidad.id))
    .where(
      and(
        condicionAbierto(),
        isNotNull(proceso.referencia),
        sql`btrim(${proceso.referencia}) <> ''`,
        isNotNull(proceso.objeto),
        sql`btrim(${proceso.objeto}) <> ''`,
        sql`${proceso.secopProcesoId} ~* '^CO1\\.[A-Z]+\\.[0-9]+$'`,
        isNotNull(geografia.departamentoNombre),
        inArray(geografia.departamentoCodigo, CODIGOS_CON_ANCLA)
      )
    )
    .orderBy(sql`random()`)
    .limit(n);

  const procesos: ProcesoPortada[] = [];
  for (const f of filas) {
    const p = procesoPortadaDesdeFila(f);
    // La consulta ya filtra lo mismo; si algo se cuela, se registra y se deja
    // fuera en vez de pintar una tarjeta rota (spec §10, datos parciales).
    if (!p || !anclaDe(p.departamentoCodigo)) {
      console.warn("[muestra-portada] proceso excluido:", f.secopProcesoId ?? "(sin id)");
      continue;
    }
    if (!procesos.some((q) => q.id === p.id)) procesos.push(p);
  }
  return procesos;
}
