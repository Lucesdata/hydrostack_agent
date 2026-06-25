import { describe, it, expect } from 'vitest';
import { buildKeysetPage, buildSweepPage, cursorFromRow } from '@/src/lib/ingest/pagination';

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

describe('buildSweepPage (D21a)', () => {
  const SWEEP = {
    idField: 'id_contrato',
    watermarkField: 'ultima_actualizacion',
    limit: 500,
  };

  it('orders by id and filters for null watermark', () => {
    const p = buildSweepPage(SWEEP);
    expect(p.$order).toBe('id_contrato ASC');
    expect(p.$limit).toBe(500);
    expect(p.$where).toBe('ultima_actualizacion IS NULL');
  });

  it('adds an id-only cursor on subsequent pages', () => {
    const p = buildSweepPage({ ...SWEEP, sinceIdExclusive: 'CO1.PCCNTR.42' });
    expect(p.$where).toBe(
      "ultima_actualizacion IS NULL AND id_contrato > 'CO1.PCCNTR.42'",
    );
  });

  it('escapes single quotes in the cursor id', () => {
    const p = buildSweepPage({ ...SWEEP, sinceIdExclusive: "a'b" });
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

describe('filtro sectorial (ADR-0001 B1)', () => {
  const SECTOR = "(x like '%AGUA%') AND NOT (cat like 'V1.80%')";

  it('keyset backfill (sin cota/cursor): $where = solo el filtro sectorial', () => {
    const p = buildKeysetPage({ ...FIELDS, sectorWhere: SECTOR });
    expect(p.$where).toBe(`(${SECTOR})`);
  });

  it('keyset con ventana: (ventana) AND (sector)', () => {
    const p = buildKeysetPage({ ...FIELDS, sinceExclusive: '2024-06-01T00:00:00.000', sectorWhere: SECTOR });
    expect(p.$where).toBe(`(ultima_actualizacion > '2024-06-01T00:00:00.000') AND (${SECTOR})`);
  });

  it('keyset con cursor: la cláusula OR se parentiza antes de ANDear el sector', () => {
    const p = buildKeysetPage({
      ...FIELDS,
      cursor: { watermark: '2024-06-02T00:00:00.000', id: 'CO1.PCCNTR.123' },
      sectorWhere: SECTOR,
    });
    expect(p.$where).toBe(
      "(ultima_actualizacion > '2024-06-02T00:00:00.000' " +
        "OR (ultima_actualizacion = '2024-06-02T00:00:00.000' AND id_contrato > 'CO1.PCCNTR.123'))" +
        ` AND (${SECTOR})`,
    );
  });

  it('sin sectorWhere la salida es idéntica (compat hacia atrás)', () => {
    expect(buildKeysetPage(FIELDS).$where).toBeUndefined();
  });

  it('sweep: el filtro sectorial entra como condición AND extra', () => {
    const p = buildSweepPage({
      idField: 'id_contrato',
      watermarkField: 'ultima_actualizacion',
      limit: 500,
      sectorWhere: SECTOR,
    });
    expect(p.$where).toBe(`ultima_actualizacion IS NULL AND (${SECTOR})`);
  });
});
