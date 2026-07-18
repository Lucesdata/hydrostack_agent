import { describe, it, expect } from 'vitest';
import { SECTOR_KEYS, SECTOR_LABELS, buildSectorWhere } from '@/src/lib/secop/sectorKeywords';

describe('SECTOR_KEYS / SECTOR_LABELS', () => {
  it('expone los 5 sectores esperados', () => {
    expect([...SECTOR_KEYS].sort()).toEqual(
      ['acueducto', 'alcantarillado', 'etap', 'psmv', 'ptar'].sort(),
    );
  });

  it('el label de "etap" es ETAP aunque la keyword real sea PTAP', () => {
    expect(SECTOR_LABELS.etap).toBe('ETAP');
  });
});

describe('buildSectorWhere', () => {
  it('construye un OR de todas las keywords contra todos los campos', () => {
    const w = buildSectorWhere('psmv', ['nombre_del_procedimiento', 'descripci_n_del_procedimiento']);
    expect(w).toContain("upper(nombre_del_procedimiento) like '%PSMV%'");
    expect(w).toContain("upper(descripci_n_del_procedimiento) like '%PSMV%'");
    expect(w).toContain('PLAN DE SANEAMIENTO Y MANEJO DE VERTIMIENTOS');
  });

  it('el bucket "etap" busca PTAP (keyword real), no la palabra literal "etap"', () => {
    const w = buildSectorWhere('etap', ['objeto_del_contrato']);
    expect(w).toContain('PTAP');
    expect(w).not.toMatch(/'%ETAP%'/);
  });
});
