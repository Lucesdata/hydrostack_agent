import { describe, it, expect } from 'vitest';
import {
  buildSectorWhere,
  matchesSectorNet,
  SECTOR_NET_PROCESOS,
  SECTOR_NET_CONTRATOS,
} from '@/src/lib/secop/ingest-net';
import { FIELDS_PROCESOS } from '@/src/lib/secop/config';

const F = FIELDS_PROCESOS;

/** Fila de procesos mínima con los campos que mira la red. */
function proceso(nombre: string, descripcion: string, unspsc: string | null) {
  return {
    [F.nombre]: nombre,
    [F.descripcion]: descripcion,
    [F.unspsc]: unspsc,
  } as Record<string, unknown>;
}

describe('matchesSectorNet (procesos) — casos reales de A3', () => {
  it('estrato C: keyword presente sin código UNSPSC → entra (recall por texto)', () => {
    // "UNSPECIFIED" midió 100% relevante y solo lo pesca el texto.
    const row = proceso('CONSTRUCCIÓN TANQUE DE ALMACENAMIENTO DE AGUA POTABLE ACUEDUCTO', '', 'UNSPECIFIED');
    expect(matchesSectorNet(row, SECTOR_NET_PROCESOS)).toBe(true);
  });

  it('estrato B: seg-80 (staffing) que matchea keyword → se EXCLUYE', () => {
    // "apoyo a la gestión ... del servicio de ACUEDUCTO", código 80xx → ruido.
    const row = proceso('PRESTACION DE SERVICIOS PROFESIONALES APOYO ACUEDUCTO', '', 'V1.80111600');
    expect(matchesSectorNet(row, SECTOR_NET_PROCESOS)).toBe(false);
  });

  it('brazo UNSPSC: código water-exclusivo 83101 sin keyword en el texto → entra', () => {
    const row = proceso('CONVENIO INTERADMINISTRATIVO No. 010', 'OBJETO GENERICO', 'V1.83101500');
    expect(matchesSectorNet(row, SECTOR_NET_PROCESOS)).toBe(true);
  });

  it('no-agua: sin keyword y código no water-exclusivo → fuera', () => {
    const row = proceso('SUMINISTRO DE PAPELERÍA Y ÚTILES DE OFICINA', '', 'V1.44121700');
    expect(matchesSectorNet(row, SECTOR_NET_PROCESOS)).toBe(false);
  });

  it('keyword acentuada vía fragmento accent-safe: POTABILIZ matchea POTABILIZACIÓN', () => {
    const row = proceso('OPTIMIZACIÓN DEL SISTEMA DE POTABILIZACIÓN', '', 'V1.81101500');
    expect(matchesSectorNet(row, SECTOR_NET_PROCESOS)).toBe(true);
  });

  it('core con keyword pero código 80 → la exclusión gana (precede al texto)', () => {
    // A3 #18-like: operario coded 80 con objeto de PTAR → fuera por exclusión.
    const row = proceso('SERVICIOS DE APOYO OPERARIO PLANTA DE TRATAMIENTO', '', 'V1.80111600');
    expect(matchesSectorNet(row, SECTOR_NET_PROCESOS)).toBe(false);
  });
});

describe('buildSectorWhere — SoQL bien formado', () => {
  it('procesos: incluye keyword, brazo UNSPSC y exclusión de seg-80', () => {
    const where = buildSectorWhere(SECTOR_NET_PROCESOS);
    expect(where).toContain(`upper(${F.nombre}) like '%ACUEDUCTO%'`);
    expect(where).toContain(`upper(${F.descripcion}) like '%ACUEDUCTO%'`);
    expect(where).toContain(`${F.unspsc} like 'V1.83101%'`);
    expect(where).toContain(`AND NOT (${F.unspsc} like 'V1.80%')`);
  });

  it('contratos: usa el objeto del contrato y su campo UNSPSC', () => {
    const where = buildSectorWhere(SECTOR_NET_CONTRATOS);
    expect(where).toContain('upper(objeto_del_contrato)');
    expect(where).toContain("codigo_de_categoria_principal like 'V1.80%'");
  });
});
