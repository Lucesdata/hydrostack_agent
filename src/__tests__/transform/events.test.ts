import { describe, it, expect } from 'vitest';
import {
  diffContrato,
  diffContratoRows,
  contratoSnapshotFromRow,
  type ContratoSnapshot,
} from '@/src/lib/transform/events';

const base: ContratoSnapshot = {
  valor: 1000,
  fechaFin: '2024-12-31',
  estado: 'En ejecución',
  docProveedor: '900123456',
};

describe('diffContrato', () => {
  it('emits adicion only when the value rises', () => {
    expect(diffContrato(base, { ...base, valor: 1500 })).toEqual([
      { tipoEvento: 'adicion', valorAnterior: 1000, valorNuevo: 1500 },
    ]);
    expect(diffContrato(base, { ...base, valor: 800 })).toEqual([]);
    expect(diffContrato(base, { ...base, valor: 1000 })).toEqual([]);
  });

  it('emits prorroga when the end date moves forward', () => {
    expect(diffContrato(base, { ...base, fechaFin: '2025-06-30' })).toEqual([
      { tipoEvento: 'prorroga', fechaAnterior: '2024-12-31', fechaNueva: '2025-06-30' },
    ]);
    expect(diffContrato(base, { ...base, fechaFin: '2024-01-01' })).toEqual([]);
  });

  it('emits suspension only on transition into the state', () => {
    expect(diffContrato(base, { ...base, estado: 'Suspendido' })).toEqual([
      { tipoEvento: 'suspension', estadoAnterior: 'En ejecución', estadoNuevo: 'Suspendido' },
    ]);
    const prevSusp = { ...base, estado: 'Suspendido' };
    expect(diffContrato(prevSusp, { ...prevSusp, estado: 'Suspendido' })).toEqual([]);
  });

  it('emits terminacion for terminado/cerrado/liquidado', () => {
    expect(diffContrato(base, { ...base, estado: 'Terminado' })[0].tipoEvento).toBe('terminacion');
    expect(diffContrato(base, { ...base, estado: 'Liquidado' })[0].tipoEvento).toBe('terminacion');
  });

  it('emits cesion when the provider document changes', () => {
    expect(diffContrato(base, { ...base, docProveedor: '800999888' })).toEqual([
      { tipoEvento: 'cesion', docProveedorAnterior: '900123456', docProveedorNuevo: '800999888' },
    ]);
  });

  it('emits multiple events from one snapshot (otrosí)', () => {
    const next = { ...base, valor: 1500, fechaFin: '2025-06-30' };
    expect(diffContrato(base, next).map((e) => e.tipoEvento)).toEqual(['adicion', 'prorroga']);
  });

  it('ignores nulls without inventing events', () => {
    expect(diffContrato({ ...base, valor: null }, { ...base, valor: 2000 })).toEqual([]);
  });
});

describe('contratoSnapshotFromRow', () => {
  it('extracts and normalizes the event-driving fields', () => {
    const snap = contratoSnapshotFromRow({
      valor_del_contrato: '1.000.000,50',
      fecha_de_fin_del_contrato: '2024-12-31T00:00:00.000',
      estado_contrato: 'En ejecución',
      documento_proveedor: '900123456-7',
      tipodocproveedor: 'NIT',
    });
    expect(snap).toEqual({
      valor: 1000000.5,
      fechaFin: '2024-12-31',
      estado: 'En ejecución',
      docProveedor: '900123456',
    });
  });
});

describe('diffContratoRows', () => {
  it('diffs two raw rows end to end', () => {
    const prev = { valor_del_contrato: '1000', estado_contrato: 'En ejecución' };
    const next = { valor_del_contrato: '1200', estado_contrato: 'En ejecución' };
    expect(diffContratoRows(prev, next)).toEqual([
      { tipoEvento: 'adicion', valorAnterior: 1000, valorNuevo: 1200 },
    ]);
  });
});
