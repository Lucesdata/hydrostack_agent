import { describe, it, expect } from 'vitest';
import { mapProcesoRow, mapContratoRow } from '@/src/lib/transform/mapCanonical';

describe('mapProcesoRow', () => {
  const row = {
    id_del_proceso: 'CO1.REQ.42',
    id_del_portafolio: 'CO1.BDOS.99',
    referencia_del_proceso: 'LP-001-2024',
    nit_entidad: '899999063',
    entidad: 'Acueducto de Bogotá',
    ordenentidad: 'Territorial',
    modalidad_de_contratacion: 'Licitación Pública',
    tipo_de_contrato: 'Obra',
    nombre_del_procedimiento: 'Construcción de acueducto',
    precio_base: '500000000',
    fecha_de_publicacion_del: '2024-06-01T00:00:00.000',
    estado_del_procedimiento: 'Adjudicado',
    id_estado_del_procedimiento: '70',
    departamento_entidad: 'Distrito Capital de Bogotá',
    ciudad_entidad: 'Bogotá',
  };

  it('maps native id, link key and business fields', () => {
    const p = mapProcesoRow(row);
    expect(p.secopProcesoId).toBe('CO1.REQ.42');
    expect(p.portafolioId).toBe('CO1.BDOS.99');
    expect(p.objeto).toBe('Construcción de acueducto');
    expect(p.valorEstimado).toBe(500000000);
    expect(p.fechaPublicacion).toBe('2024-06-01');
    expect(p.estadoCodigo).toBe('70');
  });

  it('resolves entidad NIT and normalizes geo text', () => {
    const p = mapProcesoRow(row);
    expect(p.entidad?.nitCanonico).toBe('899999063');
    expect(p.entidad?.nivelGobierno).toBe('Territorial');
    expect(p.geo.departamento).toBe('distrito capital de bogota');
    expect(p.geo.municipio).toBe('bogota');
  });

  it('drops entidad when the NIT is a sentinel', () => {
    expect(mapProcesoRow({ id_del_proceso: 'x', nit_entidad: 'No Definido' }).entidad).toBeNull();
  });
});

describe('mapContratoRow', () => {
  const row = {
    id_contrato: 'CO1.PCCNTR.7',
    proceso_de_compra: 'CO1.BDOS.99',
    estado_contrato: 'En ejecución',
    objeto_del_contrato: 'Mantenimiento de redes',
    tipo_de_contrato: 'Obra',
    nit_entidad: '899999063',
    nombre_entidad: 'Acueducto de Bogotá',
    orden: 'Territorial',
    rama: 'Ejecutivo',
    sector: 'Industria',
    tipodocproveedor: 'NIT',
    documento_proveedor: '900123456-7',
    proveedor_adjudicado: 'Constructora XYZ',
    es_grupo: 'No',
    valor_del_contrato: '300000000',
    fecha_de_firma: '2024-06-10T00:00:00.000',
    el_contrato_puede_ser_prorrogado: 'Si',
    valor_pagado: '50000000',
    localizaci_n: 'Colombia, Cundinamarca, Soacha',
    departamento: 'Distrito Capital de Bogotá',
    ciudad: 'Bogotá',
  };

  it('maps native id, link key, money, dates and bools', () => {
    const c = mapContratoRow(row);
    expect(c.secopContratoId).toBe('CO1.PCCNTR.7');
    expect(c.procesoDeCompra).toBe('CO1.BDOS.99');
    expect(c.valorContrato).toBe(300000000);
    expect(c.fechaFirma).toBe('2024-06-10');
    expect(c.prorrogable).toBe(true);
    expect(c.valorPagado).toBe(50000000);
  });

  it('canonicalizes the provider and clears proveedorRaw', () => {
    const c = mapContratoRow(row);
    expect(c.proveedor?.nitCanonico).toBe('900123456');
    expect(c.proveedor?.tipoDocumento).toBe('NIT');
    expect(c.proveedor?.razonSocial).toBe('Constructora XYZ');
    expect(c.proveedor?.esEstructuraPlural).toBe(false);
    expect(c.proveedorRaw).toBeNull();
  });

  it('keeps proveedorRaw when the document is garbage (D3)', () => {
    const c = mapContratoRow({ ...row, documento_proveedor: 'No Definido' });
    expect(c.proveedor).toBeNull();
    expect(c.proveedorRaw).toBe('Constructora XYZ');
  });

  it('D25: takes geography from localizacion as primary, not from depto/ciudad', () => {
    // localizaci_n gana sobre departamento/ciudad cuando ambos están presentes
    const c = mapContratoRow(row);
    expect(c.geo.departamento).toBe('cundinamarca');
    expect(c.geo.municipio).toBe('soacha');
  });

  it('D25: falls back to depto/ciudad when localizacion has "No Definido"', () => {
    const c = mapContratoRow({ ...row, localizaci_n: 'Colombia, No Definido, No Definido' });
    expect(c.geo.departamento).toBe('distrito capital de bogota');
    expect(c.geo.municipio).toBe('bogota');
  });

  it('D25: falls back when localizacion is missing entirely', () => {
    const { localizaci_n, ...noLoc } = row;
    const c = mapContratoRow(noLoc);
    expect(c.geo.departamento).toBe('distrito capital de bogota');
    expect(c.geo.municipio).toBe('bogota');
  });

  it('D23: entidad stores sector_administrativo (PGN, not water) and rama in raw_attrs', () => {
    const c = mapContratoRow(row);
    expect(c.entidad?.sectorAdministrativo).toBe('Industria');
    expect(c.entidad?.rawAttrs).toEqual({ rama: 'Ejecutivo' });
  });

  it('D22: proveedor has no nitValidDv, but nitDv (DIAN-calculated) is present', () => {
    const c = mapContratoRow(row);
    expect(c.proveedor?.nitDv).toBe('7'); // 900123456 DIAN DV
    expect((c.proveedor as unknown as Record<string, unknown> | null)?.nitValidDv).toBeUndefined();
  });
});
