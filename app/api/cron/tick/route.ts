/**
 * Route handler: GET /api/cron/tick — despachador único (SDD §5.2, Fase 5).
 *
 * **Existe por una restricción de plataforma, no por gusto.** El plan de Vercel
 * es Hobby (V-F-5, verificado 2026-09-05): admite **2 cron jobs como máximo y
 * frecuencia diaria como mínimo**, y los dos slots ya estaban ocupados por
 * `/api/cron/ingest` y `/api/cron/alertas`. Cada etapa nueva del SDD habría
 * necesitado un cron propio que no existe. La salida, sin cambiar de
 * arquitectura (restricción R4), es un despachador que decide internamente qué
 * corre según la fecha; las demás etapas son funciones, no rutas de cron.
 *
 * `vercel.json` sigue declarando exactamente dos entradas: ésta y `alertas`.
 * `/api/cron/ingest` se conserva como disparador manual de la ingesta sola.
 *
 * **Ninguna etapa aborta a las siguientes.** Cada una va en su propio try/catch y
 * el resultado se devuelve etapa a etapa. Solo un fallo de la ingesta produce
 * 500: es la que alimenta a todas las demás, y si falla el resto trabaja sobre
 * datos viejos sin saberlo.
 *
 * Seguridad: idéntica a `/api/cron/ingest` — `CRON_SECRET` obligatorio como
 * `Bearer`, fail-closed con 401 si la env var no está definida.
 */

import { NextResponse } from "next/server";
import { runIngestPipeline } from "@/src/lib/ingest/pipeline";
import { correrDeteccionEventos } from "@/src/lib/al/eventos/correr";
import { correrFiltrosActivos } from "@/src/lib/al/matching/correr-filtros";
import { podarDescartes } from "@/src/lib/al/matching/registrar-descartes";
import { recargarSanciones } from "@/src/lib/al/sanciones/ingesta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Tope de páginas de la ingesta. Más bajo que los 200 de `/api/cron/ingest`
 * porque los 300 s del `maxDuration` ahora se reparten entre todas las etapas.
 * Si una corrida se trunca queda `partial` y el watermark continúa mañana.
 */
const CRON_MAX_PAGES = 120;

/** Lunes. La recarga de sanciones es semanal: 2.262 filas no necesitan más. */
const DIA_SANCIONES = 1;

type Etapa = { etapa: string; ok: boolean; resultado?: unknown; error?: string };

async function ejecutar(nombre: string, fn: () => Promise<unknown>): Promise<Etapa> {
  const t0 = Date.now();
  try {
    const resultado = await fn();
    console.log(`[cron/tick] ${nombre} ok en ${Date.now() - t0}ms`);
    return { etapa: nombre, ok: true, resultado };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`[cron/tick] ${nombre} FALLÓ:`, error);
    return { etapa: nombre, ok: false, error };
  }
}

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/tick] CRON_SECRET no definido — rechazando (fail-closed)");
    return NextResponse.json({ ok: false, error: "server misconfigured" }, { status: 401 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const ahora = new Date();
  console.log("[cron/tick] start", ahora.toISOString());
  const etapas: Etapa[] = [];

  // 1. Ingesta. Alimenta a todas las demás: su fallo sí es un 500.
  const ingesta = await ejecutar("ingesta", () =>
    runIngestPipeline({ source: "both", maxPages: CRON_MAX_PAGES })
  );
  etapas.push(ingesta);

  // 2. Eventos de proceso. Después de la ingesta: diffea contra lo recién traído.
  etapas.push(await ejecutar("eventos", () => correrDeteccionEventos()));

  // 3. Filtros de usuario. Después de los eventos, para que las coincidencias del
  //    día ya reflejen los procesos actualizados.
  etapas.push(
    await ejecutar("filtros", async () => {
      const r = await correrFiltrosActivos();
      const podados = await podarDescartes();
      return { ...r, descartesPodados: podados };
    })
  );

  // 4. Sanciones, solo los lunes.
  if (ahora.getUTCDay() === DIA_SANCIONES) {
    etapas.push(await ejecutar("sanciones", () => recargarSanciones()));
  }

  const status = ingesta.ok ? 200 : 500;
  console.log("[cron/tick] done", { status, etapas: etapas.map((e) => `${e.etapa}:${e.ok}`) });
  return NextResponse.json({ ok: ingesta.ok, etapas }, { status });
}
