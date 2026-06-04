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
    sector: 'Servicios Públicos',
    tipodocproveedor: 'NIT',
    documento_proveedor: '900123456-7',
    proveedor_adjudicado: 'Constructora XYZ',
    es_grupo: 'No',
    valor_del_contrato: '300000000',
    fecha_de_firma: '2024-06-10T00:00:00.000',
    el_contrato_puede_ser_prorrogado: 'Si',
    valor_pagado: '50000000',
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

  it('falls back to localizacion for municipio when ciudad is absent', () => {
    const { ciudad, ...noCiudad } = row;
    const c = mapContratoRow({ ...noCiudad, localizaci_n: 'Colombia, Cundinamarca, Soacha' });
    expect(c.geo.municipio).toBe('soacha');
  });
});
