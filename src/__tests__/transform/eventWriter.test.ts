import { describe, it, expect } from 'vitest';
import {
  buildContratoEventos,
  groupAndSort,
  type ContratoSnapshotRow,
} from '@/src/lib/transform/eventWriter';

// --- Helpers ----------------------------------------------------------------

/** Construye el payload crudo que `contratoSnapshotFromRow` sabe leer. */
function payload(o: {
  valor?: string;
  fechaFin?: string;
  estado?: string;
  doc?: string;
  tipoDoc?: string;
}): Record<string, unknown> {
  return {
    valor_del_contrato: o.valor,
    fecha_de_fin_del_contrato: o.fechaFin,
    estado_contrato: o.estado,
    documento_proveedor: o.doc,
    tipodocproveedor: o.tipoDoc,
  };
}

function snap(
  rawRecordId: string,
  sourceUpdatedAt: Date | null,
  ingestedAt: Date,
  p: Parameters<typeof payload>[0],
  sourceRecordId = 'C-1',
): ContratoSnapshotRow {
  return { rawRecordId, sourceRecordId, sourceUpdatedAt, ingestedAt, payload: payload(p) };
}

const D = (iso: string) => new Date(iso);
/** Generador de correlation_id determinista para asertar agrupación. */
function counter() {
  let n = 0;
  return () => `corr-${n++}`;
}

// --- groupAndSort -----------------------------------------------------------

describe('groupAndSort', () => {
  it('agrupa por source_record_id y ordena por source_updated_at asc', () => {
    const rows: ContratoSnapshotRow[] = [
      snap('r2', D('2024-03-01T00:00:00Z'), D('2024-03-01T00:00:00Z'), {}, 'C-1'),
      snap('r1', D('2024-01-01T00:00:00Z'), D('2024-01-01T00:00:00Z'), {}, 'C-1'),
      snap('r3', D('2024-02-01T00:00:00Z'), D('2024-02-01T00:00:00Z'), {}, 'C-2'),
    ];
    const g = groupAndSort(rows);
    expect([...g.keys()].sort()).toEqual(['C-1', 'C-2']);
    expect(g.get('C-1')!.map((s) => s.rawRecordId)).toEqual(['r1', 'r2']);
    expect(g.get('C-2')!.map((s) => s.rawRecordId)).toEqual(['r3']);
  });

  it('pone los snapshots sin source_updated_at al final (NULLS LAST), desempata por ingested_at', () => {
    const rows: ContratoSnapshotRow[] = [
      snap('rNull', null, D('2024-05-01T00:00:00Z'), {}),
      snap('rTs', D('2024-01-01T00:00:00Z'), D('2024-06-01T00:00:00Z'), {}),
    ];
    const g = groupAndSort(rows);
    expect(g.get('C-1')!.map((s) => s.rawRecordId)).toEqual(['rTs', 'rNull']);
  });
});

// --- buildContratoEventos ---------------------------------------------------

describe('buildContratoEventos', () => {
  it('un grupo de un solo snapshot no produce eventos', () => {
    const groups = [[snap('r1', D('2024-01-01T00:00:00Z'), D('2024-01-01T00:00:00Z'), { valor: '1000' })]];
    expect(buildContratoEventos(groups, counter())).toEqual([]);
  });

  it('adicion + prorroga en la misma transición comparten correlation_id', () => {
    const groups = [[
      snap('r1', D('2024-01-01T00:00:00Z'), D('2024-01-01T00:00:00Z'), { valor: '1000', fechaFin: '2024-12-31' }),
      snap('r2', D('2024-02-01T00:00:00Z'), D('2024-02-01T00:00:00Z'), { valor: '1500', fechaFin: '2025-06-30' }),
    ]];
    const out = buildContratoEventos(groups, counter());
    expect(out.map((e) => e.tipoEvento).sort()).toEqual(['adicion', 'prorroga']);
    expect(new Set(out.map((e) => e.correlationId)).size).toBe(1);
    expect(out[0].correlationId).toBe('corr-0');
  });

  it('propaga source_observed_at y raw_record_id del snapshot `next`', () => {
    const groups = [[
      snap('r1', D('2024-01-01T00:00:00Z'), D('2024-01-01T00:00:00Z'), { valor: '1000' }),
      snap('r2', D('2024-02-01T00:00:00Z'), D('2024-02-01T00:00:00Z'), { valor: '1500' }),
    ]];
    const [ev] = buildContratoEventos(groups, counter());
    expect(ev.rawRecordId).toBe('r2');
    expect(ev.sourceObservedAt).toEqual(D('2024-02-01T00:00:00Z'));
    expect(ev.valorAnterior).toBe(1000);
    expect(ev.valorNuevo).toBe(1500);
  });

  it('detecta cesión con los documentos de proveedor crudos', () => {
    const groups = [[
      snap('r1', D('2024-01-01T00:00:00Z'), D('2024-01-01T00:00:00Z'), { doc: '900123456', tipoDoc: 'NIT' }),
      snap('r2', D('2024-02-01T00:00:00Z'), D('2024-02-01T00:00:00Z'), { doc: '800111222', tipoDoc: 'NIT' }),
    ]];
    const out = buildContratoEventos(groups, counter());
    expect(out).toHaveLength(1);
    expect(out[0].tipoEvento).toBe('cesion');
    expect(out[0].docProveedorAnterior).toBe('900123456');
    expect(out[0].docProveedorNuevo).toBe('800111222');
  });

  it('no emite cesión cuando el documento del proveedor no cambia', () => {
    const groups = [[
      snap('r1', D('2024-01-01T00:00:00Z'), D('2024-01-01T00:00:00Z'), { doc: '900123456', tipoDoc: 'NIT' }),
      snap('r2', D('2024-02-01T00:00:00Z'), D('2024-02-01T00:00:00Z'), { doc: '900123456', tipoDoc: 'NIT' }),
    ]];
    expect(buildContratoEventos(groups, counter())).toEqual([]);
  });

  it('suspensión y terminación en transiciones distintas usan correlation_id distintos', () => {
    const groups = [[
      snap('r1', D('2024-01-01T00:00:00Z'), D('2024-01-01T00:00:00Z'), { estado: 'En ejecución' }),
      snap('r2', D('2024-02-01T00:00:00Z'), D('2024-02-01T00:00:00Z'), { estado: 'Suspendido' }),
      snap('r3', D('2024-03-01T00:00:00Z'), D('2024-03-01T00:00:00Z'), { estado: 'Terminado' }),
    ]];
    const out = buildContratoEventos(groups, counter());
    expect(out.map((e) => e.tipoEvento)).toEqual(['suspension', 'terminacion']);
    expect(out[0].correlationId).toBe('corr-0');
    expect(out[1].correlationId).toBe('corr-1');
  });

  it('una transición sin cambios sustantivos no produce eventos', () => {
    const groups = [[
      snap('r1', D('2024-01-01T00:00:00Z'), D('2024-01-01T00:00:00Z'), { valor: '1000', estado: 'En ejecución' }),
      snap('r2', D('2024-02-01T00:00:00Z'), D('2024-02-01T00:00:00Z'), { valor: '1000', estado: 'En ejecución' }),
    ]];
    expect(buildContratoEventos(groups, counter())).toEqual([]);
  });
});
