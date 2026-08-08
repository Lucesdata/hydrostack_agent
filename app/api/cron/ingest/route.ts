/**
 * Route handler:  GET /api/cron/ingest
 *
 * Disparador HTTP de la ingesta incremental diaria (D-009). Lo invoca Vercel
 * Cron según `vercel.json` (`schedule: "0 11 * * *"` → 06:00 hora Colombia).
 *
 * Reusa `runIngestPipeline` (la misma orquestación que el CLI `db:ingest`), con
 * un tope conservador de páginas como válvula anti-timeout: si una corrida se
 * trunca, el watermark idempotente continúa en la corrida del día siguiente.
 *
 * Seguridad: `CRON_SECRET` es obligatorio. Se exige como `Bearer` en cada
 * invocación; si la env var no está definida en el entorno, o no coincide,
 * el endpoint responde 401 (fail-closed) en vez de ejecutar la ingesta.
 *
 * Observabilidad: cada fuente ya registra su corrida en `sync_log`
 * (running → ok | partial | failed). Aquí solo se añaden logs de función y el
 * status HTTP (200/500), visible en el dashboard de Crons de Vercel.
 */

import { NextResponse } from "next/server";
import { runIngestPipeline } from "@/src/lib/ingest/pipeline";

// El pipeline usa el driver Neon serverless (ws) + transacciones → runtime Node.
export const runtime = "nodejs";
// Nunca cachear: cada invocación debe ejecutar la ingesta real.
export const dynamic = "force-dynamic";
// Tope de duración de la función (Fluid Compute). La ventana diaria cabe holgada.
export const maxDuration = 300;

/**
 * Tope de páginas por invocación del cron. Válvula de seguridad: una sola
 * corrida no puede desbordar el `maxDuration`. Con ingesta diaria la ventana es
 * pequeña y nunca se alcanza; si se alcanzara, la corrida queda `partial` y el
 * watermark continúa al día siguiente.
 */
const CRON_MAX_PAGES = 200;

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/ingest] CRON_SECRET no definido — rechazando (fail-closed)");
    return NextResponse.json({ ok: false, error: "server misconfigured" }, { status: 401 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    console.log("[cron/ingest] start", new Date().toISOString());
    const summary = await runIngestPipeline({ source: "both", maxPages: CRON_MAX_PAGES });
    console.log("[cron/ingest] done", {
      durationMs: summary.durationMs,
      batchId: summary.transform?.batchId ?? null,
    });
    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[cron/ingest] failed", error);
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}
