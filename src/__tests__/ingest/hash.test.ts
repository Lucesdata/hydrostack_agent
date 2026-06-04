import { describe, it, expect } from 'vitest';
import { stableStringify, stripVolatile, payloadHash } from '@/src/lib/ingest/hash';

describe('stableStringify', () => {
  it('orders keys so insertion order does not matter', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }));
  });

  it('orders nested object keys too', () => {
    const a = { x: { p: 1, q: 2 }, list: [{ m: 1, n: 2 }] };
    const b = { list: [{ n: 2, m: 1 }], x: { q: 2, p: 1 } };
    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it('treats undefined as null', () => {
    expect(stableStringify({ a: undefined })).toBe('{"a":null}');
  });
});

describe('stripVolatile', () => {
  it('removes only the listed top-level fields', () => {
    const row = { id: '1', ultima_actualizacion: 'x', valor_pagado: '5', objeto: 'o' };
    expect(stripVolatile(row, ['ultima_actualizacion', 'valor_pagado'])).toEqual({
      id: '1',
      objeto: 'o',
    });
  });

  it('does not strip nested keys with the same name', () => {
    const row = { id: '1', nested: { valor_pagado: '5' } };
    expect(stripVolatile(row, ['valor_pagado'])).toEqual({ id: '1', nested: { valor_pagado: '5' } });
  });
});

describe('payloadHash', () => {
  const volatile = ['ultima_actualizacion', 'valor_pagado'];

  it('is stable across key order', () => {
    const a = { id: '1', objeto: 'acueducto', estado: 'activo' };
    const b = { estado: 'activo', objeto: 'acueducto', id: '1' };
    expect(payloadHash(a, volatile)).toBe(payloadHash(b, volatile));
  });

  it('ignores changes in volatile fields', () => {
    const base = { id: '1', objeto: 'acueducto', ultima_actualizacion: '2024-01-01', valor_pagado: '0' };
    const moved = { id: '1', objeto: 'acueducto', ultima_actualizacion: '2024-06-01', valor_pagado: '999' };
    expect(payloadHash(base, volatile)).toBe(payloadHash(moved, volatile));
  });

  it('changes when a substantive field changes', () => {
    const a = { id: '1', valor_del_contrato: '100' };
    const b = { id: '1', valor_del_contrato: '200' };
    expect(payloadHash(a, volatile)).not.toBe(payloadHash(b, volatile));
  });

  it('produces a 64-char hex sha-256 digest', () => {
    expect(payloadHash({ id: '1' }, volatile)).toMatch(/^[0-9a-f]{64}$/);
  });
});
