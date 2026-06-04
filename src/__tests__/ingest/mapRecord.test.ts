import { describe, it, expect } from 'vitest';
import { toRawRecord } from '@/src/lib/ingest/mapRecord';
import { payloadHash } from '@/src/lib/ingest/hash';
import { SOURCE_CONTRATOS } from '@/src/lib/ingest/sources';

const BATCH = '00000000-0000-0000-0000-000000000001';

describe('toRawRecord', () => {
  const row = {
    id_contrato: 'CO1.PCCNTR.42',
    objeto_del_contrato: 'Construcción de acueducto',
    ultima_actualizacion: '2024-06-02T08:00:00.000',
    valor_pagado: '500',
  };

  it('maps source, native id and batch id', () => {
    const rec = toRawRecord(row, SOURCE_CONTRATOS, BATCH);
    expect(rec.source).toBe('secop_ii_contratos');
    expect(rec.sourceRecordId).toBe('CO1.PCCNTR.42');
    expect(rec.batchId).toBe(BATCH);
    expect(rec.payload).toBe(row);
  });

  it('computes the hash excluding the source volatile fields', () => {
    const rec = toRawRecord(row, SOURCE_CONTRATOS, BATCH);
    expect(rec.payloadHash).toBe(payloadHash(row, SOURCE_CONTRATOS.volatileFields));
  });

  it('parses the watermark field into a Date (floating interpreted as UTC)', () => {
    const rec = toRawRecord(row, SOURCE_CONTRATOS, BATCH);
    expect(rec.sourceUpdatedAt).toBeInstanceOf(Date);
    expect(rec.sourceUpdatedAt?.getTime()).toBe(Date.UTC(2024, 5, 2, 8, 0, 0, 0));
  });

  it('null watermark when unparseable, without dropping the row', () => {
    const rec = toRawRecord({ id_contrato: 'x', ultima_actualizacion: 'No Definido' }, SOURCE_CONTRATOS, BATCH);
    expect(rec.sourceUpdatedAt).toBeNull();
    expect(rec.sourceRecordId).toBe('x');
  });

  it('empty string id when the native id is absent', () => {
    const rec = toRawRecord({ objeto_del_contrato: 'x' }, SOURCE_CONTRATOS, BATCH);
    expect(rec.sourceRecordId).toBe('');
  });
});
