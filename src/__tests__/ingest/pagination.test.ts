import { describe, it, expect } from 'vitest';
import { buildKeysetPage, cursorFromRow } from '@/src/lib/ingest/pagination';

const FIELDS = { watermarkField: 'ultima_actualizacion', idField: 'id_contrato', limit: 1000 };

describe('buildKeysetPage', () => {
  it('orders by (watermark, id) ascending', () => {
    const p = buildKeysetPage(FIELDS);
    expect(p.$order).toBe('ultima_actualizacion ASC, id_contrato ASC');
    expect(p.$limit).toBe(1000);
  });

  it('first page with a window lower bound uses a strict >', () => {
    const p = buildKeysetPage({ ...FIELDS, sinceExclusive: '2024-06-01T00:00:00.000' });
    expect(p.$where).toBe("ultima_actualizacion > '2024-06-01T00:00:00.000'");
  });

  it('first page without bounds has no $where', () => {
    expect(buildKeysetPage(FIELDS).$where).toBeUndefined();
  });

  it('subsequent pages use the keyset cursor with id tiebreaker', () => {
    const p = buildKeysetPage({
      ...FIELDS,
      sinceExclusive: '2024-06-01T00:00:00.000',
      cursor: { watermark: '2024-06-02T00:00:00.000', id: 'CO1.PCCNTR.123' },
    });
    expect(p.$where).toBe(
      "ultima_actualizacion > '2024-06-02T00:00:00.000' " +
        "OR (ultima_actualizacion = '2024-06-02T00:00:00.000' AND id_contrato > 'CO1.PCCNTR.123')",
    );
  });

  it('escapes single quotes in cursor values', () => {
    const p = buildKeysetPage({
      ...FIELDS,
      cursor: { watermark: "2024-06-02T00:00:00.000", id: "a'b" },
    });
    expect(p.$where).toContain("id_contrato > 'a''b'");
  });
});

describe('cursorFromRow', () => {
  it('extracts watermark and id from a row', () => {
    const row = { id_contrato: 'CO1.PCCNTR.9', ultima_actualizacion: '2024-06-02T00:00:00.000' };
    expect(cursorFromRow(row, 'ultima_actualizacion', 'id_contrato')).toEqual({
      watermark: '2024-06-02T00:00:00.000',
      id: 'CO1.PCCNTR.9',
    });
  });

  it('returns null when the watermark is missing', () => {
    expect(cursorFromRow({ id_contrato: 'x' }, 'ultima_actualizacion', 'id_contrato')).toBeNull();
  });

  it('returns null when the id is missing', () => {
    expect(
      cursorFromRow({ ultima_actualizacion: '2024-06-02T00:00:00.000' }, 'ultima_actualizacion', 'id_contrato'),
    ).toBeNull();
  });
});
