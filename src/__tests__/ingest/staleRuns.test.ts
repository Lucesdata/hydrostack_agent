import { describe, expect, it } from 'vitest';
import { findStaleRunningIds } from '@/src/lib/ingest/staleRuns';

describe('findStaleRunningIds', () => {
  it('marca como stale las filas cuyo startedAt supera el umbral', () => {
    const now = new Date('2026-07-08T12:30:00Z');
    const rows = [
      { id: 'old', startedAt: new Date('2026-07-08T11:41:56Z') }, // 48min antes
      { id: 'recent', startedAt: new Date('2026-07-08T12:29:00Z') }, // 1min antes
    ];

    const stale = findStaleRunningIds(rows, now, 15 * 60 * 1000);

    expect(stale).toEqual(['old']);
  });

  it('no marca nada si todas las filas están dentro del umbral', () => {
    const now = new Date('2026-07-08T12:30:00Z');
    const rows = [{ id: 'recent', startedAt: new Date('2026-07-08T12:20:00Z') }];

    expect(findStaleRunningIds(rows, now, 15 * 60 * 1000)).toEqual([]);
  });

  it('devuelve vacío para lista vacía', () => {
    expect(findStaleRunningIds([], new Date(), 15 * 60 * 1000)).toEqual([]);
  });

  it('una fila justo en el borde del umbral no se marca (comparación estricta)', () => {
    const now = new Date('2026-07-08T12:30:00Z');
    const rows = [{ id: 'edge', startedAt: new Date('2026-07-08T12:15:00Z') }];

    expect(findStaleRunningIds(rows, now, 15 * 60 * 1000)).toEqual([]);
  });
});
