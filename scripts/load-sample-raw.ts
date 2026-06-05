/**
 * Carga manual de la muestra de 0.2 (samples/*.json) → capa cruda raw_record.
 * Sub-fase 0.3. Carga directa y completa sobre la muestra; NO es incremental.
 *
 * Idempotente — reusa makeDbSink() del conector de producción (src/lib/ingest),
 * que compara el payload_hash contra el ÚLTIMO snapshot guardado de cada
 * registro:
 *   · hash igual → no inserta  (re-correr la carga no duplica).
 *   · hash nuevo → appendea fila nueva  (snapshot histórico para el diff de
 *     eventos de 0.1). raw_record es append-only: nunca UPDATE/DELETE.
 *
 * Fuera de alcance (es 0.5): watermark, sync_log, ventanas incrementales.
 *
 *   npm run db:load-sample                  # carga real (requiere DATABASE_URL)
 *   npm run db:load-sample -- --dry-run     # mapea e imprime, sin tocar la base
 */
import './_env';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import {
  SOURCE_PROCESOS,
  SOURCE_CONTRATOS,
  type IngestSource,
} from '@/src/lib/ingest/sources';
import { toRawRecord, type RawRecordInsert } from '@/src/lib/ingest/mapRecord';

const SAMPLES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'samples');
const DRY_RUN = process.argv.includes('--dry-run');
const CHUNK = 500;

async function readSample(file: string): Promise<Record<string, unknown>[]> {
  const data = JSON.parse(await readFile(resolve(SAMPLES_DIR, file), 'utf8'));
  if (!Array.isArray(data)) throw new Error(`${file} no es un array JSON`);
  return data as Record<string, unknown>[];
}

async function loadSource(source: IngestSource, file: string) {
  const rows = await readSample(file);
  const batchId = randomUUID();
  const records: RawRecordInsert[] = rows.map((r) => toRawRecord(r, source, batchId));

  if (DRY_RUN) {
    const s = records[0];
    process.stdout.write(
      `[dry-run] ${source.source}: ${records.length} filas mapeadas (batch ${batchId})\n` +
        `[dry-run]   ejemplo → recId=${s?.sourceRecordId} ` +
        `hash=${s?.payloadHash.slice(0, 16)}… ` +
        `updatedAt=${s?.sourceUpdatedAt ? s.sourceUpdatedAt.toISOString() : 'null'}\n`,
    );
    return { total: rows.length, inserted: 0, skipped: rows.length };
  }

  // Import diferido: solo aquí se toca el cliente DB (Pool con DATABASE_URL).
  const { makeDbSink } = await import('@/src/lib/ingest/dbIngest');
  const sink = makeDbSink(source.source);
  let inserted = 0;
  for (let i = 0; i < records.length; i += CHUNK) {
    inserted += await sink(records.slice(i, i + CHUNK));
  }
  return { total: rows.length, inserted, skipped: rows.length - inserted };
}

async function main() {
  if (!DRY_RUN && !process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL no definida. Provisiona la Neon branch y ponla en .env.local, o usa --dry-run.',
    );
  }

  const p = await loadSource(SOURCE_PROCESOS, 'procesos.json');
  process.stdout.write(`procesos:  ${p.inserted} insertados · ${p.skipped} sin cambio (de ${p.total})\n`);

  const c = await loadSource(SOURCE_CONTRATOS, 'contratos.json');
  process.stdout.write(`contratos: ${c.inserted} insertados · ${c.skipped} sin cambio (de ${c.total})\n`);

  if (!DRY_RUN) {
    const { pool } = await import('@/src/lib/db/client');
    await pool.end();
  }
}

main().catch((e) => {
  process.stderr.write(`✖ ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
