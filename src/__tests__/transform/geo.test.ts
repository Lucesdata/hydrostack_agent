import { describe, it, expect } from 'vitest';
import { normalizeGeoText, municipioFromLocalizacion } from '@/src/lib/transform/geo';

describe('normalizeGeoText', () => {
  it('lowercases, strips accents and punctuation', () => {
    expect(normalizeGeoText('Distrito Capital de Bogotá')).toBe('distrito capital de bogota');
    expect(normalizeGeoText('Bogotá D.C.')).toBe('bogota d c');
  });

  it('collapses whitespace', () => {
    expect(normalizeGeoText('  Valle   del   Cauca ')).toBe('valle del cauca');
  });

  it('maps sentinels and empties to null', () => {
    expect(normalizeGeoText('No Definido')).toBeNull();
    expect(normalizeGeoText('')).toBeNull();
    expect(normalizeGeoText(null)).toBeNull();
  });
});

describe('municipioFromLocalizacion', () => {
  it('takes the most specific segment, dropping the country', () => {
    expect(municipioFromLocalizacion('Colombia, Cundinamarca, Soacha')).toBe('soacha');
    expect(municipioFromLocalizacion('Colombia, Bogotá, Bogotá')).toBe('bogota');
  });

  it('returns null when only the country is present', () => {
    expect(municipioFromLocalizacion('Colombia')).toBeNull();
    expect(municipioFromLocalizacion('No Definido')).toBeNull();
  });
});
