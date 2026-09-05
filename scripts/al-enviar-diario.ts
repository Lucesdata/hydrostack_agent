/**
 * Envío diario agregado, ejecutable a mano (SDD Fase 6).
 *
 *   npm run al:enviar-diario -- --dry-run   # muestra el correo, NO escribe ni envía
 *   npm run al:enviar-diario                # corrida real: reserva, envía y registra
 *   npm run al:enviar-diario -- --repetir   # además, libera la reserva de hoy antes
 *
 * En producción esto lo dispara `/api/cron/alertas`. El script existe porque no
 * había forma de probarlo en local: no hay `CRON_SECRET` en `.env.local` y
 * `runDailyAlertas` no tenía entrada por CLI.
 *
 * `--dry-run` es el modo por el que conviene empezar: recopila las novedades y
 * renderiza el correo entero contra datos reales, pero **no toca `envio_log`, no
 * genera reporte y no envía nada**. Sirve para ver qué diría el correo sin
 * consumir la reserva del día ni depender de que Resend esté configurado.
 *
 * `--repetir` borra la fila de `envio_log` de hoy antes de correr. Hace falta
 * porque la idempotencia es justamente lo que impide un segundo envío el mismo
 * día: sin esto, si el cron de producción ya reservó (aunque fallara), la
 * corrida local se salta la cuenta creyendo que ya se envió.
 */

import "./_env";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { usuario, envioLog } from "@/src/lib/db/schema/cuentas";
import { runDailyAlertas } from "@/src/lib/alertas/run-daily";
import { recopilarNovedades } from "@/src/lib/al/notificacion/recopilar";
import { renderDigestAgregado } from "@/src/lib/al/notificacion/digest-agregado";

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function dryRun(): Promise<void> {
  const cuentas = await db.select({ id: usuario.id, email: usuario.email }).from(usuario);
  console.log(`Cuentas: ${cuentas.length}\n`);

  for (const c of cuentas) {
    const novedades = await recopilarNovedades(c.id);
    console.log(`── ${c.email} ──`);
    console.log(
      `   adendas ${novedades.adendas.length} · adjudicaciones ${novedades.adjudicaciones.length} · aperturas ${novedades.aperturas.length}`
    );

    if (novedades.total === 0) {
      console.log("   sin novedades → NO se enviaría correo\n");
      continue;
    }

    const digest = renderDigestAgregado(novedades, c, "https://ejemplo/reportes/dry-run");
    console.log(`   asunto: ${digest.subject}`);
    console.log("   ── cuerpo en texto plano ──");
    console.log(
      digest.text
        .split("\n")
        .slice(0, 25)
        .map((l) => `   ${l}`)
        .join("\n")
    );
    const restantes = digest.text.split("\n").length - 25;
    if (restantes > 0) console.log(`   … y ${restantes} líneas más`);
    console.log();
  }
  console.log("DRY RUN: no se escribió en envio_log, no se generó reporte, no se envió nada.");
}

async function liberarReserva(): Promise<void> {
  const res = await db
    .delete(envioLog)
    .where(and(eq(envioLog.tipo, "diario"), sql`${envioLog.fecha} = ${hoyIso()}::date`))
    .returning({ id: envioLog.id });
  console.log(`--repetir: liberadas ${res.length} reservas de hoy (${hoyIso()})\n`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--dry-run")) {
    await dryRun();
    process.exit(0);
  }

  if (args.includes("--repetir")) await liberarReserva();

  const r = await runDailyAlertas();
  console.log("Resumen:", r);
  if (r.errores > 0) {
    console.log(
      "\nHubo errores. Lo más probable: falta AUTH_RESEND_KEY o EMAIL_FROM en .env.local."
    );
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("✖", e instanceof Error ? e.message : e);
  process.exit(1);
});
