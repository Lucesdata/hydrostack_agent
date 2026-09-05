/**
 * Carga inicial del histórico de oferentes (SDD Fase 2).
 *
 *   npm run al:backfill-historico            # las dos pasadas
 *   npm run al:backfill-historico -- --solo-adjudicatarios
 *   npm run al:backfill-historico -- --solo-proponentes
 *
 * **Guardia de tamaño.** La base venía del 96,8% de la cuota del plan Free y el
 * VACUUM FULL del 2026-09-05 la dejó en 432 MB. Este script mide
 * `pg_database_size` después de cada lote y aborta si supera el umbral, en vez
 * de llenar la base y dejar el proyecto en solo lectura (lo que tumbaría el
 * login, no solo la ingesta). Al abortar, lo ya escrito queda válido: las dos
 * pasadas son idempotentes y reanudar es volver a ejecutar.
 */

import "./_env";
import { db } from "@/src/lib/db/client";
import { sql } from "drizzle-orm";
import {
  backfillAdjudicatarios,
  backfillProponentes,
  procesosCompetitivos,
  type ResumenBackfill,
} from "@/src/lib/al/historico/backfill";

/** Por defecto, el límite del plan Free menos un colchón. `--max-mb` lo sube. */
const MAX_MB_DEFECTO = 470;

async function tamanoMb(): Promise<number> {
  // `db.execute` con el driver `pg` devuelve QueryResult, no un array.
  const res = await db.execute<{ mb: string }>(
    sql`SELECT round(pg_database_size(current_database())/1024.0/1024.0) AS mb`
  );
  return Number(res.rows[0].mb);
}

function log(etapa: string, r: ResumenBackfill, mb: number) {
  console.log(
    `[${etapa}] lote ${r.lotes} · procesados ${r.procesados} · escritos ${r.escritos} · omitidos ${r.omitidos} · base ${mb} MB`
  );
}

async function main() {
  const args = process.argv.slice(2);
  const soloAdj = args.includes("--solo-adjudicatarios");
  const soloProp = args.includes("--solo-proponentes");
  const maxMbArg = args.find((a) => a.startsWith("--max-mb="));
  const maxMb = maxMbArg ? Number(maxMbArg.split("=")[1]) : MAX_MB_DEFECTO;

  const inicio = await tamanoMb();
  console.log(`Base al empezar: ${inicio} MB · umbral de aborto: ${maxMb} MB`);
  if (inicio >= maxMb) {
    throw new Error(
      `La base ya está en ${inicio} MB, en o por encima del umbral. Sube el plan o pasa --max-mb=<n> si sabes que hay sitio.`
    );
  }

  const guardia = async (etapa: string) => async (r: ResumenBackfill) => {
    const mb = await tamanoMb();
    if (r.lotes % 10 === 0 || etapa === "adjudicatarios") log(etapa, r, mb);
    if (mb >= maxMb) {
      throw new Error(
        `ABORTADO: la base llegó a ${mb} MB (umbral ${maxMb}). Lo escrito es válido; reanudar es re-ejecutar.`
      );
    }
  };

  if (!soloProp) {
    const r = await backfillAdjudicatarios({ onLote: await guardia("adjudicatarios") });
    console.log(`✔ adjudicatarios: ${r.escritos} escritos, ${r.omitidos} omitidos`);
  }

  if (!soloAdj) {
    const procesos = await procesosCompetitivos();
    console.log(`Procesos de modalidad competitiva: ${procesos.length}`);
    const r = await backfillProponentes({ procesos, onLote: await guardia("proponentes") });
    console.log(`✔ proponentes: ${r.escritos} escritos, ${r.omitidos} omitidos`);
  }

  const fin = await tamanoMb();
  console.log(`Base al terminar: ${fin} MB (+${fin - inicio} MB)`);
  process.exit(0);
}

main().catch((e) => {
  console.error("✖", e instanceof Error ? e.message : e);
  process.exit(1);
});
