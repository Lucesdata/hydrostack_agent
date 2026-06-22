/**
 * Ingesta incremental E2E (0.5).
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
 * Flujo:
 *   - Pasada 1 (keyset, D14): `ingestSource()` mueve `sync_log.watermark_to`.
 *   - Pasada 2 (sweep, D21a): `sweepWithoutWatermark()` para contratos sin
 *     `ultima_actualizacion`; NO mueve watermark.
 *   - Transform: `runTransform()` reconstruye la canónica desde raw_record
 *     (idempotente; reconstruye TODO, no solo el batch nuevo — D28).
 *
 * Las dos fuentes son independientes (sus watermarks no se cruzan). El sweep
 * solo aplica a contratos (procesos trae `fecha_de_ultima_publicaci` ≈ 100%).
 */

import './_env';
import { pool } from '@/src/lib/db/client';
import {
  ingestSource,
  sweepWithoutWatermark,
  type IngestSummary,
  type SweepSummary,
} from '@/src/lib/ingest/dbIngest';
import {
  SOURCE_PROCESOS,
  SOURCE_CONTRATOS,
  type IngestSource,
} from '@/src/lib/ingest/sources';
import { runTransform, type TransformSummary } from '@/src/lib/transform/orchestrator';

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
// Output estructurado
// ============================================================================

interface SourceRun {
  keyset: IngestSummary | null;
  sweep: SweepSummary | null;
}

interface RunOutput {
  startedAt: string;
  durationMs: number;
  procesos: SourceRun | null;
  contratos: SourceRun | null;
  transform: TransformSummary | null;
}

function emptyRun(): SourceRun {
  return { keyset: null, sweep: null };
}

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

// ============================================================================
// Main
// ============================================================================

const SOURCES: Record<'procesos' | 'contratos', IngestSource> = {
  procesos: SOURCE_PROCESOS,
  contratos: SOURCE_CONTRATOS,
};

async function runSource(
  key: 'procesos' | 'contratos',
  opts: CliOptions,
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

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL no definida. Configúrala en .env.local.');
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

  if (opts.json) {
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  } else {
    process.stdout.write(`\ningesta iniciada: ${startedAt}\n\n`);
    if (out.procesos) process.stdout.write(fmtSource('procesos (secop_ii_procesos)', out.procesos) + '\n\n');
    if (out.contratos) process.stdout.write(fmtSource('contratos (secop_ii_contratos)', out.contratos) + '\n\n');
    if (out.transform) process.stdout.write(fmtTransform(out.transform) + '\n\n');
    process.stdout.write(`terminado en ${out.durationMs}ms\n`);
  }

  await pool.end();
}

main().catch((e) => {
  process.stderr.write(`✖ ${e instanceof Error ? e.message : String(e)}\n`);
  // Cierre best-effort del pool antes de salir.
  pool.end().catch(() => {}).finally(() => process.exit(1));
});
