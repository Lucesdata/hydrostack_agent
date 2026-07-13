import { describe, expect, it } from 'vitest';
import { chunk, dedupLastWins } from '@/src/lib/db/batch';

describe('chunk', () => {
  it('parte un array en trozos del tamaño pedido, con resto en el último', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('array vacío → sin trozos', () => {
    expect(chunk([], 100)).toEqual([]);
  });

  it('tamaño mayor que el array → un solo trozo', () => {
    expect(chunk([1, 2], 10)).toEqual([[1, 2]]);
  });
});

describe('dedupLastWins', () => {
  it('con claves repetidas gana la última aparición (mismo criterio que upserts secuenciales)', () => {
    const rows = [
      { k: 'a', v: 1 },
      { k: 'b', v: 2 },
      { k: 'a', v: 3 },
    ];
    expect(dedupLastWins(rows, (r) => r.k)).toEqual([
      { k: 'a', v: 3 },
      { k: 'b', v: 2 },
    ]);
  });

  it('sin repetidos deja el array igual', () => {
    const rows = [{ k: 'a' }, { k: 'b' }];
    expect(dedupLastWins(rows, (r) => r.k)).toEqual(rows);
  });
});
