import { describe, it, expect } from 'vitest';
import { runSweep, type SodaFetcher, type RawSink } from '@/src/lib/ingest/runIngest';
import { SOURCE_CONTRATOS } from '@/src/lib/ingest/sources';
import type { SodaPageParams } from '@/src/lib/ingest/pagination';

const BATCH = '00000000-0000-0000-0000-000000000088';

/** Row para sweep: lo importante es el id; el watermark va NULL (lo que el barrido busca). */
function row(id: string) {
  return { id_contrato: id, ultima_actualizacion: null, objeto_del_contrato: 'acueducto' };
}

function fakeFetch(pages: Record<string, unknown>[][]) {
  const calls: SodaPageParams[] = [];
  let i = 0;
  const fetchPage: SodaFetcher = async (_dataset, params) => {
    calls.push(params);
    return pages[i++] ?? [];
  };
  return { fetchPage, calls };
}

const countingSink: RawSink = async (records) => records.length;

describe('runSweep (D21a)', () => {
  it('paginates by id until a short page and reports the run', async () => {
    const { fetchPage, calls } = fakeFetch([
      [row('A'), row('B')],
      [row('C'), row('D')],
      [row('E')], // página corta → fin
    ]);

    const summary = await runSweep(
      { fetchPage, sink: countingSink },
      { source: SOURCE_CONTRATOS, batchId: BATCH, pageSize: 2 },
    );

    expect(summary.recordsIngested).toBe(5);
    expect(summary.totalScanned).toBe(5);
    expect(summary.pages).toBe(3);
    expect(summary.reachedMaxPages).toBe(false);
    expect(summary.batchId).toBe(BATCH);

    // Página 1 sin cursor; siguientes con cursor por id (no por watermark).
    // Ahora el sweep también lleva el filtro sectorial ANDeado (ADR-0001 B1).
    expect(calls[0].$where).toContain('ultima_actualizacion IS NULL');
    expect(calls[0].$where).toContain('AND NOT'); // filtro sectorial presente
    expect(calls[1].$where).toContain('ultima_actualizacion IS NULL');
    expect(calls[1].$where).toContain("id_contrato > 'B'");
    expect(calls[2].$where).toContain("id_contrato > 'D'");
    expect(calls[0].$order).toBe('id_contrato ASC');
  });

  it('stops on the first empty page', async () => {
    const { fetchPage, calls } = fakeFetch([[]]);
    const summary = await runSweep(
      { fetchPage, sink: countingSink },
      { source: SOURCE_CONTRATOS, batchId: BATCH, pageSize: 100 },
    );
    expect(summary.recordsIngested).toBe(0);
    expect(summary.totalScanned).toBe(0);
    expect(summary.pages).toBe(0);
    expect(calls).toHaveLength(1);
  });

  it('counts only what the sink actually inserted (hash dedup)', async () => {
    // El sweep escanea todo; el sink rechaza por hash duplicado.
    const dropAllSink: RawSink = async () => 0;
    const { fetchPage } = fakeFetch([[row('A'), row('B'), row('C')]]);
    const summary = await runSweep(
      { fetchPage, sink: dropAllSink },
      { source: SOURCE_CONTRATOS, batchId: BATCH, pageSize: 100 },
    );
    expect(summary.recordsIngested).toBe(0);
    expect(summary.totalScanned).toBe(3); // scanned ≠ ingested cuando hay dedup
    expect(summary.pages).toBe(1);
  });

  it('stops at maxPages and flags the truncation', async () => {
    let n = 0;
    const fetchPage: SodaFetcher = async () => [row(`id${n++}`)];
    const summary = await runSweep(
      { fetchPage, sink: countingSink },
      { source: SOURCE_CONTRATOS, batchId: BATCH, pageSize: 1, maxPages: 3 },
    );
    expect(summary.pages).toBe(3);
    expect(summary.reachedMaxPages).toBe(true);
  });

  it('stops if the last row has no usable id (cursor would be null)', async () => {
    // Row con id vacío → no podemos formar cursor → cortamos.
    const { fetchPage } = fakeFetch([
      [row('A'), { id_contrato: '', ultima_actualizacion: null }],
      [row('B')], // no llega: el cursor null cortó antes
    ]);
    const summary = await runSweep(
      { fetchPage, sink: countingSink },
      { source: SOURCE_CONTRATOS, batchId: BATCH, pageSize: 2 },
    );
    expect(summary.pages).toBe(1);
    expect(summary.totalScanned).toBe(2);
  });
});
