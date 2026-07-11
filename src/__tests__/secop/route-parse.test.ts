import { describe, it, expect } from 'vitest';
import { parseQuery } from '@/src/lib/secop/parse-query';

describe('parseQuery', () => {
  it('acepta apertura Abierto/Cerrado y rechaza otros valores', () => {
    expect(parseQuery(new URLSearchParams('apertura=Abierto')).apertura).toBe('Abierto');
    expect(parseQuery(new URLSearchParams('apertura=Cerrado')).apertura).toBe('Cerrado');
    expect(parseQuery(new URLSearchParams('apertura=hack')).apertura).toBeUndefined();
    expect(parseQuery(new URLSearchParams()).apertura).toBeUndefined();
  });

  it('acepta orden fecha/valor y rechaza otros valores', () => {
    expect(parseQuery(new URLSearchParams('orden=valor')).orden).toBe('valor');
    expect(parseQuery(new URLSearchParams('orden=fecha')).orden).toBe('fecha');
    expect(parseQuery(new URLSearchParams('orden=xxx')).orden).toBeUndefined();
  });

  it('mantiene el parseo existente (q, valorMin, soloAgua)', () => {
    const q = parseQuery(new URLSearchParams('q=ptar&valorMin=1000&soloAgua=false'));
    expect(q.q).toBe('ptar');
    expect(q.valorMin).toBe(1000);
    expect(q.soloAgua).toBe(false);
  });
});
