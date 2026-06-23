import { describe, it, expect } from 'vitest';
import { validatePliego } from '@/src/lib/pliego/validate';
import { parsePliegoExtraction, type PliegoExtraction } from '@/src/lib/pliego/schema';

function item(o: Partial<PliegoExtraction['capitulos'][number]['items'][number]> = {}) {
  return {
    descripcion: 'x',
    unidad: 'GLB',
    cantidad: 1,
    valor_unitario: 1000,
    valor_total: 1000,
    ...o,
  };
}

function extraction(o: Partial<PliegoExtraction> = {}): PliegoExtraction {
  return {
    proceso: 'P-1',
    entidad: 'E',
    presupuesto_oficial_cop: 1000,
    moneda: 'COP',
    capitulos: [{ nombre: 'Cap A', items: [item()] }],
    reglas_presupuesto: [],
    ...o,
  };
}

// --- validatePliego ---------------------------------------------------------

describe('validatePliego', () => {
  it('acepta una extracción consistente', () => {
    const r = validatePliego(extraction());
    expect(r.ok).toBe(true);
    expect(r.inconsistencias).toEqual([]);
  });

  it('tolera el redondeo al peso (±1)', () => {
    const r = validatePliego(
      extraction({
        presupuesto_oficial_cop: 333,
        capitulos: [{ nombre: 'A', items: [item({ cantidad: 3, valor_unitario: 111, valor_total: 333 })] }],
      }),
    );
    expect(r.ok).toBe(true);
  });

  it('detecta descuadre aritmético en un ítem', () => {
    const r = validatePliego(
      extraction({
        capitulos: [{ nombre: 'A', items: [item({ cantidad: 2, valor_unitario: 1000, valor_total: 1500 })] }],
      }),
    );
    expect(r.ok).toBe(false);
    expect(r.inconsistencias).toHaveLength(1);
    expect(r.inconsistencias[0].tipo).toBe('aritmetica_item');
  });

  it('detecta capítulos duplicados (nombre normalizado)', () => {
    const r = validatePliego(
      extraction({
        capitulos: [
          { nombre: 'Cap A', items: [item()] },
          { nombre: ' cap a ', items: [item()] },
        ],
      }),
    );
    expect(r.inconsistencias.some((i) => i.tipo === 'capitulo_duplicado')).toBe(true);
    expect(r.ok).toBe(false);
  });

  it('la suma vs presupuesto es nota informativa, no falla la extracción', () => {
    // valor_total pre-IVA suma 1000; presupuesto con IVA = 1190.
    const r = validatePliego(extraction({ presupuesto_oficial_cop: 1190 }));
    expect(r.ok).toBe(true); // aritmética por ítem OK → no falla
    expect(r.notas).toHaveLength(1);
    expect(r.notas[0]).toContain('1190');
  });
});

// --- parsePliegoExtraction --------------------------------------------------

describe('parsePliegoExtraction', () => {
  it('parsea una estructura válida', () => {
    const parsed = parsePliegoExtraction(extraction());
    expect(parsed.proceso).toBe('P-1');
    expect(parsed.capitulos[0].items[0].valor_total).toBe(1000);
  });

  it('lanza si falta un campo numérico', () => {
    const bad = { ...extraction(), presupuesto_oficial_cop: 'mil' };
    expect(() => parsePliegoExtraction(bad)).toThrow(/presupuesto_oficial_cop/);
  });

  it('lanza si capitulos no es array', () => {
    expect(() => parsePliegoExtraction({ ...extraction(), capitulos: {} })).toThrow(/capitulos/);
  });
});
