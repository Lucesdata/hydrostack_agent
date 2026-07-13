import { describe, expect, it } from 'vitest';
import { isTransientConnectionError, withTransientRetry } from '@/src/lib/db/transient';

/** Sleep inyectable que no espera de verdad y registra los delays pedidos. */
function fakeSleep(): { sleep: (ms: number) => Promise<void>; delays: number[] } {
  const delays: number[] = [];
  return {
    delays,
    sleep: (ms: number) => {
      delays.push(ms);
      return Promise.resolve();
    },
  };
}

describe('isTransientConnectionError', () => {
  it('detecta el corte de conexión del driver Neon por mensaje', () => {
    expect(isTransientConnectionError(new Error('Connection terminated unexpectedly'))).toBe(true);
  });

  it('detecta códigos de red y de shutdown de Postgres', () => {
    const econnreset = Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' });
    const adminShutdown = Object.assign(new Error('terminating connection'), { code: '57P01' });
    expect(isTransientConnectionError(econnreset)).toBe(true);
    expect(isTransientConnectionError(adminShutdown)).toBe(true);
  });

  it('recorre la cadena de causas (DrizzleQueryError envuelve el error del driver)', () => {
    const wrapped = new Error('Failed query: insert into "entidad" ...', {
      cause: new Error('Connection terminated unexpectedly'),
    });
    expect(isTransientConnectionError(wrapped)).toBe(true);
  });

  it('NO marca errores SQL reales como transitorios', () => {
    const uniqueViolation = Object.assign(new Error('duplicate key value'), { code: '23505' });
    const stmtTimeout = Object.assign(new Error('canceling statement due to statement timeout'), {
      code: '57014',
    });
    expect(isTransientConnectionError(uniqueViolation)).toBe(false);
    expect(isTransientConnectionError(stmtTimeout)).toBe(false);
    expect(isTransientConnectionError(new Error('column "x" does not exist'))).toBe(false);
  });
});

describe('withTransientRetry', () => {
  it('reintenta tras cortes transitorios y devuelve el resultado', async () => {
    const { sleep, delays } = fakeSleep();
    let attempts = 0;
    const result = await withTransientRetry(
      async () => {
        attempts++;
        if (attempts < 3) throw new Error('Connection terminated unexpectedly');
        return 'ok';
      },
      { sleep },
    );
    expect(result).toBe('ok');
    expect(attempts).toBe(3);
    expect(delays.length).toBe(2);
    expect(delays[1]).toBeGreaterThan(delays[0]); // backoff creciente
  });

  it('relanza de inmediato errores no transitorios, sin reintentar', async () => {
    const { sleep } = fakeSleep();
    let attempts = 0;
    await expect(
      withTransientRetry(
        async () => {
          attempts++;
          throw Object.assign(new Error('duplicate key value'), { code: '23505' });
        },
        { sleep },
      ),
    ).rejects.toThrow('duplicate key');
    expect(attempts).toBe(1);
  });

  it('se rinde tras agotar los reintentos y relanza el último error', async () => {
    const { sleep } = fakeSleep();
    let attempts = 0;
    await expect(
      withTransientRetry(
        async () => {
          attempts++;
          throw new Error('Connection terminated unexpectedly');
        },
        { retries: 2, sleep },
      ),
    ).rejects.toThrow('Connection terminated');
    expect(attempts).toBe(3); // intento inicial + 2 reintentos
  });
});
