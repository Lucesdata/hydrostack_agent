import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  pickDatasetId,
  resolveDatasetId,
  clearDatasetIdCache,
  type CatalogResult,
} from '@/src/lib/secop/datasetResolver';
import { DATASETS, DATASET_NAMES } from '@/src/lib/secop/config';

const PROC_NAME = DATASET_NAMES.procesos;
const PROC_FALLBACK = DATASETS.procesos;

function result(name: string, id: string): CatalogResult {
  return { resource: { name, id } };
}

// --- Núcleo puro -----------------------------------------------------------

describe('pickDatasetId', () => {
  const descriptor = { name: PROC_NAME, fallbackId: PROC_FALLBACK };

  it('elige el id del recurso con name exacto y formato 4x4 válido', () => {
    const out = pickDatasetId([result(PROC_NAME, 'abcd-1234')], descriptor);
    expect(out).toEqual({ id: 'abcd-1234', resolved: true });
  });

  it('cae al fallback si el name coincide pero el id no es 4x4', () => {
    const out = pickDatasetId([result(PROC_NAME, 'no-es-valido')], descriptor);
    expect(out).toEqual({ id: PROC_FALLBACK, resolved: false });
  });

  it('cae al fallback si ningún name coincide exacto', () => {
    const out = pickDatasetId([result('Otro Dataset', 'abcd-1234')], descriptor);
    expect(out).toEqual({ id: PROC_FALLBACK, resolved: false });
  });

  it('cae al fallback con lista vacía', () => {
    expect(pickDatasetId([], descriptor)).toEqual({ id: PROC_FALLBACK, resolved: false });
  });

  it('ignora los que no son match exacto y toma el correcto', () => {
    const out = pickDatasetId(
      [result('SECOP II - Procesos', 'wxyz-9999'), result(PROC_NAME, 'abcd-1234')],
      descriptor,
    );
    expect(out).toEqual({ id: 'abcd-1234', resolved: true });
  });
});

// --- IO (fetch inyectado, sin red) -----------------------------------------

describe('resolveDatasetId', () => {
  beforeEach(() => {
    clearDatasetIdCache();
  });

  it('resuelve el id vigente desde el catálogo', async () => {
    const fetchCatalog = vi.fn(async () => [result(PROC_NAME, 'abcd-1234')]);
    const id = await resolveDatasetId('procesos', { fetchCatalog, now: () => 1000 });
    expect(id).toBe('abcd-1234');
    expect(fetchCatalog).toHaveBeenCalledWith(PROC_NAME);
  });

  it('memoiza: una 2ª llamada dentro del TTL no vuelve a consultar', async () => {
    const fetchCatalog = vi.fn(async () => [result(PROC_NAME, 'abcd-1234')]);
    await resolveDatasetId('procesos', { fetchCatalog, now: () => 1000 });
    const id = await resolveDatasetId('procesos', { fetchCatalog, now: () => 2000 });
    expect(id).toBe('abcd-1234');
    expect(fetchCatalog).toHaveBeenCalledTimes(1);
  });

  it('re-consulta cuando el TTL expiró', async () => {
    const fetchCatalog = vi.fn(async () => [result(PROC_NAME, 'abcd-1234')]);
    await resolveDatasetId('procesos', { fetchCatalog, now: () => 1000 });
    // 6h + 1ms después.
    await resolveDatasetId('procesos', { fetchCatalog, now: () => 1000 + 6 * 60 * 60 * 1000 + 1 });
    expect(fetchCatalog).toHaveBeenCalledTimes(2);
  });

  it('cae al fallback si el catálogo lanza (no propaga el error)', async () => {
    const fetchCatalog = vi.fn(async () => {
      throw new Error('red caída');
    });
    const id = await resolveDatasetId('procesos', { fetchCatalog, now: () => 1000 });
    expect(id).toBe(PROC_FALLBACK);
  });

  it('cae al fallback sin cachear cuando no hay match (reintenta luego)', async () => {
    const fetchCatalog = vi
      .fn()
      .mockResolvedValueOnce([result('Otro', 'abcd-1234')]) // sin match → fallback
      .mockResolvedValueOnce([result(PROC_NAME, 'wxyz-5678')]); // ahora sí
    const first = await resolveDatasetId('procesos', { fetchCatalog, now: () => 1000 });
    const second = await resolveDatasetId('procesos', { fetchCatalog, now: () => 1500 });
    expect(first).toBe(PROC_FALLBACK);
    expect(second).toBe('wxyz-5678');
    expect(fetchCatalog).toHaveBeenCalledTimes(2);
  });
});
