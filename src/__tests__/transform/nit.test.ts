import { describe, it, expect } from 'vitest';
import { computeNitDv, normalizeTipoDoc, canonicalizeNit } from '@/src/lib/transform/nit';

describe('computeNitDv', () => {
  it('implements the DIAN algorithm (weights start at 3 on the right)', () => {
    // '8': 8*3 = 24 → 24 % 11 = 2 → 11 - 2 = 9
    expect(computeNitDv('8')).toBe('9');
    // '12': 2*3 + 1*7 = 13 → 13 % 11 = 2 → 9
    expect(computeNitDv('12')).toBe('9');
  });

  it('always yields a single digit and ignores non-digits', () => {
    expect(computeNitDv('900.123.456')).toMatch(/^\d$/);
  });

  it('returns null without digits', () => {
    expect(computeNitDv('abc')).toBeNull();
  });
});

describe('normalizeTipoDoc', () => {
  it('maps common labels to short codes', () => {
    expect(normalizeTipoDoc('NIT')).toBe('NIT');
    expect(normalizeTipoDoc('Cédula de Ciudadanía')).toBe('CC');
    expect(normalizeTipoDoc('Cédula de Extranjería')).toBe('CE');
    expect(normalizeTipoDoc('Pasaporte')).toBe('PASAPORTE');
  });

  it('returns null for sentinels', () => {
    expect(normalizeTipoDoc('No Definido')).toBeNull();
  });
});

describe('canonicalizeNit', () => {
  it('strips an explicit DV and validates it', () => {
    const base = '900123456';
    const dv = computeNitDv(base)!;
    const res = canonicalizeNit(`${base}-${dv}`, 'NIT');
    expect(res.nitCanonico).toBe(base);
    expect(res.nitDv).toBe(dv);
    expect(res.nitValidDv).toBe(true);
  });

  it('flags an invalid DV without rejecting (D5)', () => {
    const base = '900123456';
    const wrong = String((Number(computeNitDv(base)) + 1) % 10);
    const res = canonicalizeNit(`${base}-${wrong}`, 'NIT');
    expect(res.nitCanonico).toBe(base);
    expect(res.nitValidDv).toBe(false);
  });

  it('parses dotted NIT with dash DV', () => {
    const res = canonicalizeNit('900.123.456-7', 'NIT');
    expect(res.nitCanonico).toBe('900123456');
    expect(res.nitDv).toBe('7');
  });

  it('does not split a dash-less NIT (validDv null)', () => {
    const res = canonicalizeNit('900123456', 'NIT');
    expect(res.nitCanonico).toBe('900123456');
    expect(res.nitValidDv).toBeNull();
    expect(res.nitDv).toBe(computeNitDv('900123456'));
  });

  it('treats a cédula as the number as-is, no DV', () => {
    const res = canonicalizeNit('1098765432', 'Cédula de Ciudadanía');
    expect(res.nitCanonico).toBe('1098765432');
    expect(res.nitDv).toBeNull();
    expect(res.nitValidDv).toBeNull();
  });

  it('resolves sentinel/garbage documents to null (D3)', () => {
    expect(canonicalizeNit('No Definido', 'NIT').nitCanonico).toBeNull();
    expect(canonicalizeNit('', 'NIT').nitCanonico).toBeNull();
    expect(canonicalizeNit('---', 'NIT').nitCanonico).toBeNull();
  });
});
