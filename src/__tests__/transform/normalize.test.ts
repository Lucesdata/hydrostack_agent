import { describe, it, expect } from 'vitest';
import {
  stripAccents,
  cleanText,
  parseBool,
  parseMoney,
  parseDate,
} from '@/src/lib/transform/normalize';

describe('stripAccents', () => {
  it('removes diacritics', () => {
    expect(stripAccents('Bogotá Cundinamarca Ñ')).toBe('Bogota Cundinamarca N');
  });
});

describe('cleanText', () => {
  it('trims and keeps real text', () => {
    expect(cleanText('  Acueducto  ')).toBe('Acueducto');
  });

  it('maps sentinels to null (accent/case insensitive)', () => {
    expect(cleanText('No Definido')).toBeNull();
    expect(cleanText('NO DEFINIDO')).toBeNull();
    expect(cleanText('Sin Descripción')).toBeNull();
    expect(cleanText('No Adjudicado')).toBeNull();
    expect(cleanText('No aplica')).toBeNull();
  });

  it('treats empty and nullish as null', () => {
    expect(cleanText('')).toBeNull();
    expect(cleanText('   ')).toBeNull();
    expect(cleanText(null)).toBeNull();
    expect(cleanText(undefined)).toBeNull();
  });
});

describe('parseBool', () => {
  it('parses Si/No text in either accent/case', () => {
    expect(parseBool('Si')).toBe(true);
    expect(parseBool('Sí')).toBe(true);
    expect(parseBool('YES')).toBe(true);
    expect(parseBool('No')).toBe(false);
  });

  it('returns null for sentinel or ambiguous values', () => {
    expect(parseBool('No Definido')).toBeNull();
    expect(parseBool('quizás')).toBeNull();
    expect(parseBool('')).toBeNull();
  });
});

describe('parseMoney', () => {
  it('parses canonical decimal strings', () => {
    expect(parseMoney('1000000')).toBe(1000000);
    expect(parseMoney('1000000.50')).toBe(1000000.5);
  });

  it('strips currency symbols and spaces', () => {
    expect(parseMoney('$ 2.500,75')).toBe(2500.75); // formato colombiano
  });

  it('returns null for sentinels and non-numerics', () => {
    expect(parseMoney('No Definido')).toBeNull();
    expect(parseMoney('abc')).toBeNull();
    expect(parseMoney(null)).toBeNull();
  });
});

describe('parseDate', () => {
  it('keeps a date-only string', () => {
    expect(parseDate('2024-06-04')).toBe('2024-06-04');
  });

  it('truncates a datetime to the date', () => {
    expect(parseDate('2024-06-04T08:30:00.000')).toBe('2024-06-04');
  });

  it('returns null for sentinels and junk', () => {
    expect(parseDate('No Definido')).toBeNull();
    expect(parseDate('04/06/2024')).toBeNull();
  });
});
