import { describe, it, expect } from 'vitest';
import {
  formatFloating,
  subtractDays,
  windowStart,
  maxWatermark,
} from '@/src/lib/ingest/watermark';

describe('formatFloating', () => {
  it('formats a Date as a zone-less Socrata timestamp', () => {
    const d = new Date(Date.UTC(2024, 0, 15, 9, 30, 5, 7));
    expect(formatFloating(d)).toBe('2024-01-15T09:30:05.007');
  });
});

describe('subtractDays', () => {
  it('subtracts whole days preserving the time component', () => {
    expect(subtractDays('2024-01-15T09:30:00.000', 1)).toBe('2024-01-14T09:30:00.000');
  });

  it('crosses month boundaries', () => {
    expect(subtractDays('2024-03-01T00:00:00.000', 1)).toBe('2024-02-29T00:00:00.000');
  });

  it('throws on an unparseable timestamp', () => {
    expect(() => subtractDays('not-a-date', 1)).toThrow(/inválido/);
  });
});

describe('windowStart', () => {
  it('returns null on first run (no previous watermark)', () => {
    expect(windowStart(null)).toBeNull();
    expect(windowStart(undefined)).toBeNull();
  });

  it('subtracts the overlap margin (D14) from the previous watermark', () => {
    expect(windowStart('2024-06-04T12:00:00.000', 1)).toBe('2024-06-03T12:00:00.000');
  });

  it('honors a custom margin', () => {
    expect(windowStart('2024-06-04T00:00:00.000', 3)).toBe('2024-06-01T00:00:00.000');
  });
});

describe('maxWatermark', () => {
  it('returns the lexicographically greatest value', () => {
    expect(
      maxWatermark(['2024-01-02T00:00:00.000', '2024-01-10T00:00:00.000', '2024-01-03T00:00:00.000']),
    ).toBe('2024-01-10T00:00:00.000');
  });

  it('ignores nulls and undefineds', () => {
    expect(maxWatermark([null, '2024-01-01T00:00:00.000', undefined])).toBe('2024-01-01T00:00:00.000');
  });

  it('returns null when there is nothing to compare', () => {
    expect(maxWatermark([null, undefined])).toBeNull();
    expect(maxWatermark([])).toBeNull();
  });
});
