/**
 * Route handler: GET /api/cron/alertas
 *
 * Disparador HTTP del envío diario de alertas (Fase 1.4). Lo invoca Vercel
 * Cron según `vercel.json` (`schedule: "0 12 * * *"` → una hora después de
 * `cron/ingest`, deliberadamente desacoplado: si la ingesta de ese día falló,
 * el matching corre igual sobre los datos del día anterior — degradación
 * aceptable, ver docs/plan-arquitectura-roadmap.md §3.4).
 *
 * Mismo patrón de seguridad que `cron/ingest`: `CRON_SECRET` es obligatorio;
 * si no está definido o no coincide como `Bearer`, responde 401 (fail-closed).
 *
 * La idempotencia (no duplicar correos en un reintento del cron) vive en
 * `runDailyAlertas` (envio_log, insert-first), no aquí.
 */

import { NextResponse } from "next/server";
import { runDailyAlertas } from "@/src/lib/alertas/run-daily";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/alertas] CRON_SECRET no definido — rechazando (fail-closed)");
    return NextResponse.json({ ok: false, error: "server misconfigured" }, { status: 401 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    console.log("[cron/alertas] start", new Date().toISOString());
    const summary = await runDailyAlertas();
    console.log("[cron/alertas] done", summary);
    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[cron/alertas] failed", error);
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}
