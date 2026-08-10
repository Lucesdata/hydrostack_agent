import { describe, it, expect } from 'vitest';
import { SMMLV_2026 } from '@/src/lib/config/smmlv';

describe('SMMLV_2026', () => {
  it('es un número positivo en pesos colombianos', () => {
    expect(typeof SMMLV_2026).toBe('number');
    expect(SMMLV_2026).toBeGreaterThan(0);
    expect(SMMLV_2026).toBe(1_423_500);
  });
});
