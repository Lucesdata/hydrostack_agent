import { describe, it, expect } from 'vitest';
import { runIngest, type SodaFetcher, type RawSink } from '@/src/lib/ingest/runIngest';
import { SOURCE_CONTRATOS } from '@/src/lib/ingest/sources';
import type { SodaPageParams } from '@/src/lib/ingest/pagination';

const BATCH = '00000000-0000-0000-0000-000000000099';

/** Row con los campos que el keyset usa (watermark + id). */
function row(id: string, wm: string) {
  return { id_contrato: id, ultima_actualizacion: wm, objeto_del_contrato: 'acueducto' };
}

/** fetchPage que devuelve páginas pre-cargadas y captura los params recibidos. */
function fakeFetch(pages: Record<string, unknown>[][]) {
  const calls: SodaPageParams[] = [];
  let i = 0;
  const fetchPage: SodaFetcher = async (_dataset, params) => {
    calls.push(params);
    return pages[i++] ?? [];
  };
  return { fetchPage, calls };
}

/** Sink que cuenta todo lo que recibe (sin dedup). */
const countingSink: RawSink = async (records) => records.length;

describe('runIngest', () => {
  it('paginates by keyset until a short page and reports the run', async () => {
    const { fetchPage, calls } = fakeFetch([
      [row('A', '2024-01-01T00:00:00.000'), row('B', '2024-01-02T00:00:00.000')],
      [row('C', '2024-01-03T00:00:00.000'), row('D', '2024-01-04T00:00:00.000')],
      [row('E', '2024-01-05T00:00:00.000')], // página corta → fin
    ]);

    const summary = await runIngest(
      { fetchPage, sink: countingSink },
      { source: SOURCE_CONTRATOS, lastWatermark: null, batchId: BATCH, pageSize: 2 },
    );

    expect(summary.recordsIngested).toBe(5);
    expect(summary.pages).toBe(3);
    expect(summary.watermarkTo).toBe('2024-01-05T00:00:00.000');
    expect(summary.reachedMaxPages).toBe(false);
    expect(summary.batchId).toBe(BATCH);

    // Página 1 backfill: ahora SIEMPRE lleva el filtro sectorial (ADR-0001 B1),
    // ya no es undefined. Páginas siguientes: filtro AND cursor del último row.
    expect(calls[0].$where).toContain("like '%ACUEDUCTO%'");
    expect(calls[0].$where).toContain('AND NOT');
    expect(calls[1].$where).toContain("ultima_actualizacion > '2024-01-02T00:00:00.000'");
    expect(calls[1].$where).toContain('AND NOT'); // filtro sectorial sigue presente
    expect(calls[2].$where).toContain("ultima_actualizacion > '2024-01-04T00:00:00.000'");
  });

  it('stops on the first empty page', async () => {
    const { fetchPage, calls } = fakeFetch([[]]);
    const summary = await runIngest(
      { fetchPage, sink: countingSink },
      { source: SOURCE_CONTRATOS, lastWatermark: '2024-06-01T00:00:00.000', batchId: BATCH, pageSize: 100 },
    );
    expect(summary.recordsIngested).toBe(0);
    expect(summary.pages).toBe(0);
    expect(calls).toHaveLength(1);
    // Watermark no retrocede cuando no entra nada nuevo.
    expect(summary.watermarkTo).toBe('2024-06-01T00:00:00.000');
  });

  it('applies the overlap window (D14) on the first page', async () => {
    const { fetchPage, calls } = fakeFetch([[]]);
    await runIngest(
      { fetchPage, sink: countingSink },
      { source: SOURCE_CONTRATOS, lastWatermark: '2024-06-04T00:00:00.000', batchId: BATCH, marginDays: 1 },
    );
    // La ventana D14 sigue aplicando; ahora ANDeada con el filtro sectorial.
    expect(calls[0].$where).toContain("ultima_actualizacion > '2024-06-03T00:00:00.000'");
  });

  it('never lets the watermark go backwards below the previous one', async () => {
    // El solape re-trae filas más viejas que el watermark anterior.
    const { fetchPage } = fakeFetch([[row('A', '2024-05-01T00:00:00.000')]]);
    const summary = await runIngest(
      { fetchPage, sink: countingSink },
      { source: SOURCE_CONTRATOS, lastWatermark: '2024-06-04T00:00:00.000', batchId: BATCH, pageSize: 100 },
    );
    expect(summary.watermarkTo).toBe('2024-06-04T00:00:00.000');
  });

  it('counts only what the sink actually inserted (dedup)', async () => {
    const dropAllSink: RawSink = async () => 0;
    const { fetchPage } = fakeFetch([[row('A', '2024-01-01T00:00:00.000')]]);
    const summary = await runIngest(
      { fetchPage, sink: dropAllSink },
      { source: SOURCE_CONTRATOS, lastWatermark: null, batchId: BATCH, pageSize: 100 },
    );
    expect(summary.recordsIngested).toBe(0);
    expect(summary.pages).toBe(1);
  });

  it('stops at maxPages and flags the truncation', async () => {
    let n = 0;
    const fetchPage: SodaFetcher = async () => [row(`id${n}`, `2024-01-${String((n++ % 28) + 1).padStart(2, '0')}T00:00:00.000`)];
    const summary = await runIngest(
      { fetchPage, sink: countingSink },
      { source: SOURCE_CONTRATOS, lastWatermark: null, batchId: BATCH, pageSize: 1, maxPages: 3 },
    );
    expect(summary.pages).toBe(3);
    expect(summary.reachedMaxPages).toBe(true);
  });
});
