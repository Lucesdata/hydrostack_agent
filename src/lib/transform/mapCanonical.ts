/**
 * Mapeo campo-a-campo raw SODA → proyección canónica (0.2 §3).
 *
 * Lógica PURA: una fila cruda entra, una "proyección" sale. La proyección lleva
 * los campos de negocio ya tipados (money/date/bool) MÁS las entradas de
 * resolución (NIT de entidad/proveedor, texto de geografía, llave de enlace
 * proceso↔contrato). NO toca la BD: el escritor (0.3) hace los upserts de
 * entidad/proveedor, resuelve geografia_id vía alias (D12) y proceso_id vía
 * portafolio (D11/H1), y decide inicial-vs-actual en valores/fechas mutables.
 *
 * Políticas heredadas: centinelas → null (H3, cleanText), NIT sin DV (D5,
 * canonicalizeNit), proveedor basura → proveedor null + proveedorRaw texto (D3).
 */

import { cleanText, parseBool, parseDate, parseMoney } from './normalize';
import { canonicalizeNit, normalizeTipoDoc } from './nit';
import { normalizeGeoText, municipioFromLocalizacion } from './geo';

type SodaRow = Record<string, unknown>;

/** Entidad estatal compradora resuelta desde la fila. `null` si no hay NIT usable. */
export interface EntidadProjection {
  nitCanonico: string;
  nitDv: string | null;
  nombre: string | null;
  nivelGobierno: string | null;
  rama: string | null;
  sector: string | null;
}

/** Proveedor adjudicado. `null` si el documento es basura/centinela (D3). */
export interface ProveedorProjection {
  nitCanonico: string;
  nitDv: string | null;
  nitValidDv: boolean | null;
  tipoDocumento: string | null;
  razonSocial: string | null;
  esEstructuraPlural: boolean;
  rawAttrs: Record<string, unknown> | null;
}

/** Pistas de geografía normalizadas para resolver `geografia_id` vía alias (D12). */
export interface GeoHints {
  departamento: string | null;
  municipio: string | null;
}

export interface ProcesoProjection {
  secopProcesoId: string;
  portafolioId: string | null; // CO1.BDOS — llave de enlace con contrato (D11/H1)
  referencia: string | null;
  modalidad: string | null;
  tipoContrato: string | null;
  objeto: string | null;
  valorEstimado: number | null;
  fechaPublicacion: string | null;
  estadoActual: string | null;
  estadoCodigo: string | null;
  entidad: EntidadProjection | null;
  geo: GeoHints;
}

export interface ContratoProjection {
  secopContratoId: string;
  procesoDeCompra: string | null; // → proceso.portafolioId (H1); resolución diferida (D11)
  referencia: string | null;
  objeto: string | null;
  modalidad: string | null;
  tipoContrato: string | null;
  valorContrato: number | null; // → valor_inicial al insertar, valor_actual al actualizar
  fechaFirma: string | null;
  fechaInicio: string | null;
  fechaFin: string | null; // → fecha_fin_inicial al insertar, fecha_fin_actual al actualizar
  estadoActual: string | null;
  prorrogable: boolean | null;
  valorFacturado: number | null;
  valorPagado: number | null;
  valorPendientePago: number | null;
  entidad: EntidadProjection | null;
  proveedor: ProveedorProjection | null;
  proveedorRaw: string | null; // texto crudo cuando proveedor no canóniza (D3)
  geo: GeoHints;
}

/** Arma EntidadProjection desde un NIT crudo; `null` si no hay dígitos usables. */
function buildEntidad(
  rawNit: unknown,
  nombre: unknown,
  nivel: unknown,
  rama: unknown,
  sector: unknown,
): EntidadProjection | null {
  const { nitCanonico, nitDv } = canonicalizeNit(rawNit, 'NIT');
  if (nitCanonico === null) return null;
  return {
    nitCanonico,
    nitDv,
    nombre: cleanText(nombre),
    nivelGobierno: cleanText(nivel),
    rama: cleanText(rama),
    sector: cleanText(sector),
  };
}

/** Procesos (`p6dx-8zbt`) → proyección canónica (0.2 §3.1). */
export function mapProcesoRow(row: SodaRow): ProcesoProjection {
  return {
    secopProcesoId: String(cleanText(row['id_del_proceso']) ?? ''),
    portafolioId: cleanText(row['id_del_portafolio']),
    referencia: cleanText(row['referencia_del_proceso']),
    modalidad: cleanText(row['modalidad_de_contratacion']),
    tipoContrato: cleanText(row['tipo_de_contrato']),
    objeto: cleanText(row['nombre_del_procedimiento']) ?? cleanText(row['descripci_n_del_procedimiento']),
    valorEstimado: parseMoney(row['precio_base']),
    fechaPublicacion: parseDate(row['fecha_de_publicacion_del']),
    estadoActual: cleanText(row['estado_del_procedimiento']),
    estadoCodigo: cleanText(row['id_estado_del_procedimiento']),
    entidad: buildEntidad(row['nit_entidad'], row['entidad'], row['ordenentidad'], null, null),
    geo: {
      departamento: normalizeGeoText(row['departamento_entidad']),
      municipio: normalizeGeoText(row['ciudad_entidad']),
    },
  };
}

/** Contratos (`jbjy-vk9h`) → proyección canónica (0.2 §3.2). */
export function mapContratoRow(row: SodaRow): ContratoProjection {
  const doc = canonicalizeNit(row['documento_proveedor'], row['tipodocproveedor']);
  const razonSocial = cleanText(row['proveedor_adjudicado']);
  const proveedor: ProveedorProjection | null =
    doc.nitCanonico === null
      ? null
      : {
          nitCanonico: doc.nitCanonico,
          nitDv: doc.nitDv,
          nitValidDv: doc.nitValidDv,
          tipoDocumento: normalizeTipoDoc(row['tipodocproveedor']),
          razonSocial,
          esEstructuraPlural: parseBool(row['es_grupo']) ?? false,
          rawAttrs: null,
        };

  return {
    secopContratoId: String(cleanText(row['id_contrato']) ?? ''),
    procesoDeCompra: cleanText(row['proceso_de_compra']),
    referencia: cleanText(row['referencia_del_contrato']),
    objeto: cleanText(row['objeto_del_contrato']) ?? cleanText(row['descripcion_del_proceso']),
    modalidad: cleanText(row['modalidad_de_contratacion']),
    tipoContrato: cleanText(row['tipo_de_contrato']),
    valorContrato: parseMoney(row['valor_del_contrato']),
    fechaFirma: parseDate(row['fecha_de_firma']),
    fechaInicio: parseDate(row['fecha_de_inicio_del_contrato']),
    fechaFin: parseDate(row['fecha_de_fin_del_contrato']),
    estadoActual: cleanText(row['estado_contrato']),
    prorrogable: parseBool(row['el_contrato_puede_ser_prorrogado']),
    valorFacturado: parseMoney(row['valor_facturado']),
    valorPagado: parseMoney(row['valor_pagado']),
    valorPendientePago: parseMoney(row['valor_pendiente_de_pago']),
    entidad: buildEntidad(
      row['nit_entidad'],
      row['nombre_entidad'],
      row['orden'],
      row['rama'],
      row['sector'],
    ),
    // proveedor null pero hay razón social → guardamos el texto para no perder la pista (D3)
    proveedor,
    proveedorRaw: proveedor === null ? razonSocial : null,
    geo: {
      departamento: normalizeGeoText(row['departamento']),
      municipio: normalizeGeoText(row['ciudad']) ?? municipioFromLocalizacion(row['localizaci_n']),
    },
  };
}
