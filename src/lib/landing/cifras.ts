/**
 * Cifras del home. Tres conteos y ninguno más: cada uno tiene una sección que
 * lo consume, para que no haya cifras huérfanas que envejezcan sin dueño.
 *
 * Salen de Postgres por Drizzle, NO de Socrata. `landingStats.ts` consulta la
 * fuente en vivo por razones históricas; lo nuevo se alimenta de la base ya
 * ingerida, que es más rápida, no gasta cuota de la API pública y refleja
 * exactamente lo que el producto vigila.
 *
 * Degradación honesta, igual que `app/api/landing-stats/route.ts`: cada conteo
 * falla por separado y devuelve `null`, nunca lanza. La UI muestra "—" y la
 * frase sigue siendo cierta sin la cifra.
 */

import { sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { db } from "@/src/lib/db/client";
import { proceso } from "@/src/lib/db/schema/hechos";
import { alOferentesHistorico, alSanciones } from "@/src/lib/db/schema/aqualicita";

export interface CifrasSector {
  /** Procesos del sector ya ingeridos y vigilados. */
  procesosVigilados: number | null;
  /** Registros de quién se presentó a qué y por cuánto. */
  oferentesHistoricos: number | null;
  /** Sanciones cruzables contra un competidor. */
  sanciones: number | null;
}

/**
 * `count(*)` sobre una tabla. Nunca lanza: un fallo de red o SQL, o una fila
 * sin número utilizable, degradan igual a `null`. Así cada cifra falla por
 * su cuenta sin tumbar las otras dos.
 */
async function contar(tabla: PgTable): Promise<number | null> {
  try {
    const filas = await db.select({ n: sql<number>`count(*)::int` }).from(tabla);
    const n = filas[0]?.n;
    return typeof n === "number" && Number.isFinite(n) ? n : null;
  } catch {
    // Fallo de red o SQL: se degrada a null, igual que una fila sin número
    // utilizable. El caller no necesita distinguir el motivo.
    return null;
  }
}

export async function getCifrasSector(): Promise<CifrasSector> {
  const [procesosVigilados, oferentesHistoricos, sanciones] = await Promise.all([
    contar(proceso),
    contar(alOferentesHistorico),
    contar(alSanciones),
  ]);

  return { procesosVigilados, oferentesHistoricos, sanciones };
}
