import { describe, expect, it } from 'vitest';
import { summarizeIngestError } from '@/src/lib/ingest/errorSummary';

describe('summarizeIngestError', () => {
  it('prioriza el código y detail del error Postgres original sobre el mensaje del wrapper de Drizzle', () => {
    const pgError = Object.assign(new Error('unsupported Unicode escape sequence'), {
      code: '22P05',
      detail: 'the sequence starting with byte 0x00 is not valid',
    });
    const drizzleError = Object.assign(
      new Error('Failed query: insert into "raw_record" ... params: secop_ii_procesos,CO1.REQ...'),
      { cause: pgError },
    );

    const summary = summarizeIngestError(drizzleError);

    expect(summary).toBe(
      '[22P05] unsupported Unicode escape sequence — detail: the sequence starting with byte 0x00 is not valid',
    );
  });

  it('incluye el hint cuando está presente', () => {
    const pgError = Object.assign(new Error('duplicate key value'), {
      code: '23505',
      hint: 'revisa el índice único',
    });

    expect(summarizeIngestError(pgError)).toBe('[23505] duplicate key value — hint: revisa el índice único');
  });

  it('cae al mensaje plano cuando no hay code/cause', () => {
    expect(summarizeIngestError(new Error('boom'))).toBe('boom');
  });

  it('soporta errores no-Error (string lanzado)', () => {
    expect(summarizeIngestError('algo raro')).toBe('algo raro');
  });

  it('trunca mensajes largos preservando el código al inicio', () => {
    const longDetail = 'x'.repeat(600);
    const pgError = Object.assign(new Error('fallo'), { code: '22P05', detail: longDetail });

    const summary = summarizeIngestError(pgError, 100);

    expect(summary.length).toBe(100);
    expect(summary.startsWith('[22P05] fallo')).toBe(true);
    expect(summary.endsWith('…')).toBe(true);
  });
});
