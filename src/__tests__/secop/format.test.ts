import { describe, it, expect } from 'vitest';
import {
  sentenceCaseTitle,
  formatCopCompact,
  formatCopFull,
  formatShortDate,
  verdictScore,
} from '@/src/components/secop/format';
import type { Verdict, GateResult, GateStatus } from '@/src/lib/secop/verdict';

function gate(status: GateStatus, requiredLevel: 0 | 2 = 0): GateResult {
  return { status, reason: 'test', resolvedBy: 'metadata', requiredLevel };
}

function makeVerdict(
  s: [GateStatus, GateStatus, GateStatus, GateStatus, GateStatus],
): Verdict {
  return {
    overall: 'WARN',
    gates: {
      sectorial: gate(s[0]),
      cuantia: gate(s[1]),
      plazo: gate(s[2]),
      ubicacion: gate(s[3]),
      habilitacion: gate(s[4], 2),
    },
  } as Verdict;
}

describe('sentenceCaseTitle', () => {
  it('convierte títulos EN MAYÚSCULAS a sentence case', () => {
    expect(sentenceCaseTitle('CONSTRUCCION DEL ALCANTARILLADO PLUVIAL')).toBe(
      'Construccion del alcantarillado pluvial',
    );
  });

  it('preserva siglas conocidas del sector', () => {
    expect(sentenceCaseTitle('OPTIMIZACIÓN DE LA PTAP MUNICIPAL')).toBe(
      'Optimización de la PTAP municipal',
    );
  });

  it('preserva siglas también al inicio del título', () => {
    expect(sentenceCaseTitle('PTAP MUNICIPAL DE LA CUMBRE')).toBe(
      'PTAP municipal de la cumbre',
    );
  });

  it('no toca títulos que ya vienen en caso mixto', () => {
    expect(sentenceCaseTitle('Interventoría acueducto La Cumbre')).toBe(
      'Interventoría acueducto La Cumbre',
    );
  });
});

describe('formatCopCompact', () => {
  it('abrevia millones con separador es-CO', () => {
    expect(formatCopCompact(2_450_000_000)).toBe('$2.450 M');
  });
  it('muestra valores pequeños completos', () => {
    expect(formatCopCompact(850_000)).toContain('850.000');
  });
  it('null → guion', () => {
    expect(formatCopCompact(null)).toBe('—');
    expect(formatCopFull(null)).toBe('—');
  });
});

describe('formatShortDate', () => {
  it('formatea ISO a día + mes corto', () => {
    expect(formatShortDate('2026-07-02T00:00:00.000')).toBe('2 jul');
  });
  it('null o inválida → cadena vacía', () => {
    expect(formatShortDate(null)).toBe('');
    expect(formatShortDate('no-es-fecha')).toBe('');
  });
});

describe('verdictScore', () => {
  it('cuenta PASS y asigna tono success con 4+', () => {
    expect(verdictScore(makeVerdict(['PASS', 'PASS', 'PASS', 'PASS', 'UNKNOWN'])))
      .toEqual({ pass: 4, total: 5, tone: 'success' });
  });
  it('tono warn con 2-3 PASS', () => {
    expect(verdictScore(makeVerdict(['PASS', 'PASS', 'FAIL', 'FAIL', 'UNKNOWN'])).tone)
      .toBe('warn');
  });
  it('tono fail con 0-1 PASS (y no todo UNKNOWN)', () => {
    expect(verdictScore(makeVerdict(['FAIL', 'FAIL', 'PASS', 'FAIL', 'UNKNOWN'])).tone)
      .toBe('fail');
  });
  it('tono neutral cuando todo es UNKNOWN', () => {
    expect(
      verdictScore(makeVerdict(['UNKNOWN', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN'])).tone,
    ).toBe('neutral');
  });
});
