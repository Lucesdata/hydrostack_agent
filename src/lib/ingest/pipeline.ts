/**
 * Orquestación de la ingesta incremental: corre las fuentes (keyset + sweep) y
 * el transform, y devuelve un resumen estructurado.
 *
 * Compartida por dos consumidores:
 *   · el CLI `scripts/run-ingest.ts` (proceso efímero — parsea flags, formatea
 *     la salida y cierra el pool al terminar);
 *   · el cron HTTP `app/api/cron/ingest` (route handler en Vercel).
 *
 * NO cierra el pool de conexiones: en el route la instancia de función se reusa
 * entre invocaciones (Fluid Compute), así que cerrar el pool rompería corridas
 * posteriores. El cierre es responsabilidad exclusiva del CLI.
 *
 * NO llama a Socrata por su cuenta: delega en los adaptadores de `dbIngest`
 * (que sí hacen IO de red + base) y en `runTransform` (que solo lee raw_record).
 */

import {
  ingestSource,
  sweepWithoutWatermark,
  type IngestSummary,
  type SweepSummary,
} from './dbIngest';
import { SOURCE_PROCESOS, SOURCE_CONTRATOS, type IngestSource } from './sources';
import { runTransform, type TransformSummary } from '@/src/lib/transform/orchestrator';

export interface PipelineOptions {
  source: 'procesos' | 'contratos' | 'both';
  /** Solo aterrizar a raw_record, sin reconstruir la canónica. */
  skipTransform?: boolean;
  /** Solo pasada 2 (D21a), sin keyset. */
  sweepOnly?: boolean;
  pageSize?: number;
  marginDays?: number;
  /** Tope de páginas por pasada (válvula anti-timeout en el cron). */
  maxPages?: number;
}

export interface SourceRun {
  keyset: IngestSummary | null;
  sweep: SweepSummary | null;
}

export interface RunOutput {
  startedAt: string;
  durationMs: number;
  procesos: SourceRun | null;
  contratos: SourceRun | null;
  transform: TransformSummary | null;
}

const SOURCES: Record<'procesos' | 'contratos', IngestSource> = {
  procesos: SOURCE_PROCESOS,
  contratos: SOURCE_CONTRATOS,
};

function emptyRun(): SourceRun {
  return { keyset: null, sweep: null };
}

async function runSource(
  key: 'procesos' | 'contratos',
  opts: PipelineOptions,
): Promise<SourceRun> {
  const source = SOURCES[key];
  const run = emptyRun();

  if (!opts.sweepOnly) {
    run.keyset = await ingestSource(source, {
      pageSize: opts.pageSize,
      marginDays: opts.marginDays,
      maxPages: opts.maxPages,
    });
  }

  // Sweep D21a aplica a contratos (procesos trae watermark ≈100%).
  if (key === 'contratos') {
    run.sweep = await sweepWithoutWatermark(source, {
      pageSize: opts.pageSize,
      maxPages: opts.maxPages,
    });
  }

  return run;
}

/**
 * Corre la ingesta completa según `opts` y devuelve el resumen. No cierra el
 * pool (ver nota de cabecera). Lanza si falta `DATABASE_URL` o si alguna fuente
 * falla (fail-fast — la corrida del día siguiente recupera vía watermark).
 */
export async function runIngestPipeline(opts: PipelineOptions): Promise<RunOutput> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL no definida.');
  }

  const t0 = Date.now();
  const startedAt = new Date().toISOString();
  const out: RunOutput = {
    startedAt,
    durationMs: 0,
    procesos: null,
    contratos: null,
    transform: null,
  };

  const toRun: ('procesos' | 'contratos')[] =
    opts.source === 'both' ? ['procesos', 'contratos'] : [opts.source];

  for (const key of toRun) {
    out[key] = await runSource(key, opts);
  }

  if (!opts.skipTransform) {
    out.transform = await runTransform();
  }

  out.durationMs = Date.now() - t0;
  return out;
}
