import { describe, it, expect } from 'vitest';
import { median, average, buildCicloProceso, MIN_SAMPLE_SIZE } from '@/src/lib/secop/landingMetrics';

describe('median', () => {
  it('lista impar: el valor central', () => {
    expect(median([1, 3, 2])).toBe(2);
  });
  it('lista par: promedio de los dos centrales', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  it('no muta el array original', () => {
    const nums = [3, 1, 2];
    median(nums);
    expect(nums).toEqual([3, 1, 2]);
  });
});

describe('average', () => {
  it('promedio simple', () => {
    expect(average([10, 20, 30])).toBe(20);
  });
});

describe('buildCicloProceso', () => {
  it('n=0: todo null, muestra_suficiente=false', () => {
    expect(buildCicloProceso([])).toEqual({
      promedio_dias: null,
      mediana_dias: null,
      n_muestra: 0,
      muestra_suficiente: false,
    });
  });

  it('n < MIN_SAMPLE_SIZE: calcula valores pero marca muestra insuficiente', () => {
    const r = buildCicloProceso([10, 20, 30]);
    expect(r.n_muestra).toBe(3);
    expect(r.muestra_suficiente).toBe(false);
    expect(r.promedio_dias).toBe(20);
    expect(r.mediana_dias).toBe(20);
  });

  it('n >= MIN_SAMPLE_SIZE: muestra_suficiente=true', () => {
    const r = buildCicloProceso([10, 20, 30, 40, 50]);
    expect(r.n_muestra).toBe(5);
    expect(r.muestra_suficiente).toBe(true);
    expect(MIN_SAMPLE_SIZE).toBe(5);
  });

  it('redondea promedio y mediana a días enteros', () => {
    const r = buildCicloProceso([1, 2, 3, 3, 3, 100]);
    expect(Number.isInteger(r.promedio_dias)).toBe(true);
    expect(Number.isInteger(r.mediana_dias)).toBe(true);
  });
});
