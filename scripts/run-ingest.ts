/**
 * Ingesta incremental E2E (0.5) — CLI.
 *
 *   npm run db:ingest                          # keyset + sweep + transform
 *   npm run db:ingest -- --skip-transform      # solo aterrizar a raw_record
 *   npm run db:ingest -- --source procesos     # una sola fuente
 *   npm run db:ingest -- --source contratos
 *   npm run db:ingest -- --sweep-only          # solo D21a (sin keyset)
 *   npm run db:ingest -- --json                # output JSON estructurado
 *   npm run db:ingest -- --page-size 500 --margin-days 1 --max-pages 50
 *
 * Requiere:
 *   1. DATABASE_URL en .env.local.
 *   2. Migración 0001 aplicada (`npm run db:migrate`).
 *   3. Geografía sembrada (`npm run db:seed-geografia`).
 *
 * Este archivo es solo la cáscara CLI: parsea flags, formatea la salida y cierra
 * el pool. Toda la orquestación vive en `runIngestPipeline` (src/lib/ingest/
 * pipeline.ts), compartida con el cron HTTP `app/api/cron/ingest`.
 */

import './_env';
import { pool } from '@/src/lib/db/client';
import {
  runIngestPipeline,
  type RunOutput,
  type SourceRun,
} from '@/src/lib/ingest/pipeline';
import type { IngestSummary, SweepSummary } from '@/src/lib/ingest/dbIngest';
import type { TransformSummary } from '@/src/lib/transform/orchestrator';

// ============================================================================
// CLI args (parser mínimo — sin deps externas)
// ============================================================================

interface CliOptions {
  source: 'procesos' | 'contratos' | 'both';
  skipTransform: boolean;
  sweepOnly: boolean;
  json: boolean;
  pageSize?: number;
  marginDays?: number;
  maxPages?: number;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    source: 'both',
    skipTransform: false,
    sweepOnly: false,
    json: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = (): string => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`Falta valor para ${arg}`);
      return v;
    };
    switch (arg) {
      case '--source': {
        const v = next();
        if (v !== 'procesos' && v !== 'contratos' && v !== 'both') {
          throw new Error(`--source debe ser procesos|contratos|both, recibió ${v}`);
        }
        opts.source = v;
        break;
      }
      case '--skip-transform': opts.skipTransform = true; break;
      case '--sweep-only': opts.sweepOnly = true; break;
      case '--json': opts.json = true; break;
      case '--page-size': opts.pageSize = parseInt(next(), 10); break;
      case '--margin-days': opts.marginDays = parseInt(next(), 10); break;
      case '--max-pages': opts.maxPages = parseInt(next(), 10); break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
      // eslint-disable-next-line no-fallthrough
      default:
        if (arg.startsWith('--')) throw new Error(`Flag desconocido: ${arg}`);
    }
  }
  return opts;
}

function printHelp(): void {
  process.stdout.write(
    [
      'db:ingest — ingesta incremental SECOP II (0.5)',
      '',
      'Flags:',
      '  --source procesos|contratos|both   Fuente(s) a procesar (def: both)',
      '  --skip-transform                   No correr la transformación post-ingesta',
      '  --sweep-only                       Solo pasada 2 (D21a, sin keyset)',
      '  --json                             Imprimir resumen como JSON',
      '  --page-size N                      Tamaño de página SODA (def: 1000)',
      '  --margin-days N                    Solape D14 sobre el watermark (def: 1)',
      '  --max-pages N                      Tope de páginas por pasada (def: 10000)',
      '  --help, -h                         Esta ayuda',
      '',
    ].join('\n'),
  );
}

// ============================================================================
// Output legible
// ============================================================================

function fmtIngest(s: IngestSummary): string {
  return (
    `  keyset:  ${s.recordsIngested} ingested · ${s.pages} págs · ` +
    `watermark→${s.watermarkTo ?? 'null'}` +
    (s.reachedMaxPages ? ' [TRUNCADO]' : '')
  );
}

function fmtSweep(s: SweepSummary): string {
  return (
    `  sweep:   ${s.recordsIngested} ingested · ${s.totalScanned} scanned · ` +
    `${s.pages} págs` +
    (s.reachedMaxPages ? ' [TRUNCADO]' : '')
  );
}

function fmtSource(label: string, run: SourceRun): string {
  const parts: string[] = [`${label}:`];
  if (run.keyset) parts.push(fmtIngest(run.keyset));
  if (run.sweep) parts.push(fmtSweep(run.sweep));
  return parts.join('\n');
}

function fmtTransform(t: TransformSummary): string {
  return [
    `transform (batch ${t.batchId.slice(0, 8)}):`,
    `  procesos:  ${t.procesos.procesosUpsert} upsert · ${t.procesos.entidadesUpsert} entidades · ` +
      `geo ${t.procesos.geografiaResuelta}/${t.procesos.geografiaResuelta + t.procesos.geografiaNoResuelta} · ` +
      `cuarentena ${t.procesos.cuarentena}`,
    `  contratos: ${t.contratos.contratosUpsert} upsert · ${t.contratos.proveedoresUpsert} proveedores · ` +
      `geo ${t.contratos.geografiaResuelta}/${t.contratos.geografiaResuelta + t.contratos.geografiaNoResuelta} · ` +
      `centinela ${t.contratos.proveedorCentinela} · sin-proc ${t.contratos.procesoNoEncontrado} · ` +
      `cuarentena ${t.contratos.cuarentena}`,
    `  eventos:   ${t.eventos.eventosInsertados} insertados · ` +
      `${t.eventos.gruposMultiSnapshot} grupos multi-snapshot · ` +
      `adic ${t.eventos.porTipo.adicion} · pror ${t.eventos.porTipo.prorroga} · ` +
      `susp ${t.eventos.porTipo.suspension} · term ${t.eventos.porTipo.terminacion} · ` +
      `ces ${t.eventos.porTipo.cesion}`,
  ].join('\n');
}

function printHuman(out: RunOutput): void {
  process.stdout.write(`\ningesta iniciada: ${out.startedAt}\n\n`);
  if (out.procesos) process.stdout.write(fmtSource('procesos (secop_ii_procesos)', out.procesos) + '\n\n');
  if (out.contratos) process.stdout.write(fmtSource('contratos (secop_ii_contratos)', out.contratos) + '\n\n');
  if (out.transform) process.stdout.write(fmtTransform(out.transform) + '\n\n');
  process.stdout.write(`terminado en ${out.durationMs}ms\n`);
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  const out = await runIngestPipeline({
    source: opts.source,
    skipTransform: opts.skipTransform,
    sweepOnly: opts.sweepOnly,
    pageSize: opts.pageSize,
    marginDays: opts.marginDays,
    maxPages: opts.maxPages,
  });

  if (opts.json) {
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  } else {
    printHuman(out);
  }

  await pool.end();
}

main().catch((e) => {
  process.stderr.write(`✖ ${e instanceof Error ? e.message : String(e)}\n`);
  // Cierre best-effort del pool antes de salir.
  pool.end().catch(() => {}).finally(() => process.exit(1));
});
