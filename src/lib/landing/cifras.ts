/**
 * Cifras del home. Un conteo y ninguno más: cada cifra tiene una sección que
 * la consume, para que no haya cifras huérfanas que envejezcan sin dueño.
 *
 * Salen de Postgres por Drizzle, NO de Socrata. `landingStats.ts` consulta la
 * fuente en vivo por razones históricas; lo nuevo se alimenta de la base ya
 * ingerida, que es más rápida, no gasta cuota de la API pública y refleja
 * exactamente lo que el producto vigila.
 *
 * Degradación honesta: el conteo que falla devuelve `null`, nunca lanza. La UI
 * muestra la frase sin la cifra.
 */

import { sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { db } from "@/src/lib/db/client";
import { proceso } from "@/src/lib/db/schema/hechos";

/**
 * `count(*)` sobre una tabla. Nunca lanza: un fallo de red o SQL, o una fila
 * sin número utilizable, degradan igual a `null`.
 *
 * `nombre` solo identifica la cifra en el log — igual que `getEnJuegoMes`
 * (`landingStats.ts`) logea con `console.warn` antes de degradar, para que un fallo real (drift de
 * esquema, conexión, permisos) deje rastro y no se quede solo como un "—"
 * silencioso en el home.
 */
async function contar(nombre: string, tabla: PgTable): Promise<number | null> {
  try {
    const filas = await db.select({ n: sql<number>`count(*)::int` }).from(tabla);
    const n = filas[0]?.n;
    return typeof n === "number" && Number.isFinite(n) ? n : null;
  } catch (err) {
    console.warn(
      `[cifras.contar:${nombre}] falló (${err instanceof Error ? err.message : String(err)})`
    );
    return null;
  }
}

/**
 * Procesos del sector ya ingeridos y vigilados: la línea bajo el CTA del hero,
 * vía `/api/landing-stats`. Era uno de tres conteos (`getCifrasSector`); los
 * otros dos —oferentes históricos y sanciones— los pintaba /competidores y se
 * fueron con esa página (2026-09-27).
 */
export function getProcesosVigilados(): Promise<number | null> {
  return contar("procesosVigilados", proceso);
}
