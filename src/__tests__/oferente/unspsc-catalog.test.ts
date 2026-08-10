import { describe, it, expect } from 'vitest';
import { UNSPSC_CATALOG, searchUnspsc } from '@/src/lib/oferente/unspsc-catalog';

describe('UNSPSC_CATALOG', () => {
  it('cubre los segmentos del sector agua/saneamiento/obra civil', () => {
    const segmentos = new Set(UNSPSC_CATALOG.map((c) => c.codigo.slice(0, 2)));
    for (const seg of ['40', '41', '72', '77', '81', '83']) {
      expect(segmentos.has(seg)).toBe(true);
    }
  });

  it('cada entrada tiene código de 8 dígitos y etiqueta', () => {
    for (const c of UNSPSC_CATALOG) {
      expect(c.codigo).toMatch(/^\d{8}$/);
      expect(c.label.length).toBeGreaterThan(0);
    }
  });
});

describe('searchUnspsc', () => {
  it('filtra por texto en la etiqueta, sin distinguir mayúsculas/tildes', () => {
    const r = searchUnspsc('acueducto');
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((c) => c.label.toLowerCase().includes('acueducto'))).toBe(true);
  });

  it('filtra por prefijo de código', () => {
    const r = searchUnspsc('831015');
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((c) => c.codigo.startsWith('831015'))).toBe(true);
  });

  it('cadena vacía devuelve todo el catálogo', () => {
    expect(searchUnspsc('')).toHaveLength(UNSPSC_CATALOG.length);
  });
});
