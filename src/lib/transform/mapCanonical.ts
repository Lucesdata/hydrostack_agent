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
import { normalizeGeoText } from './geo';

type SodaRow = Record<string, unknown>;

/**
 * Entidad estatal compradora resuelta desde la fila. `null` si no hay NIT usable.
 * D23: `sectorAdministrativo` es el sector PGN crudo (Industria, defensa, etc.),
 * NO el sector agua/saneamiento. `rama` se guarda en `rawAttrs.rama`.
 */
export interface EntidadProjection {
  nitCanonico: string;
  nitDv: string | null;
  nombre: string | null;
  nivelGobierno: string | null;
  sectorAdministrativo: string | null;
  rawAttrs: Record<string, unknown> | null;
}

/**
 * Proveedor adjudicado. `null` si el documento es basura/centinela (D3).
 * D22: `nitValidDv` se eliminó del modelo persistente (no hay DV declarado
 * contra el cual validar). El DV calculado (DIAN) viaja en `nitDv`.
 */
export interface ProveedorProjection {
  nitCanonico: string;
  nitDv: string | null;
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
  const ramaClean = cleanText(rama);
  return {
    nitCanonico,
    nitDv,
    nombre: cleanText(nombre),
    nivelGobierno: cleanText(nivel),
    sectorAdministrativo: cleanText(sector), // D23: sector PGN, no agua/saneamiento
    rawAttrs: ramaClean !== null ? { rama: ramaClean } : null, // D23: rama vive aquí
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
  const representante = cleanText(row['nombre_representante_legal']);
  const proveedor: ProveedorProjection | null =
    doc.nitCanonico === null
      ? null
      : {
          nitCanonico: doc.nitCanonico,
          nitDv: doc.nitDv,
          tipoDocumento: normalizeTipoDoc(row['tipodocproveedor']),
          razonSocial,
          esEstructuraPlural: parseBool(row['es_grupo']) ?? false,
          rawAttrs: representante !== null ? { representante_legal: representante } : null,
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
    // D25: `localizaci_n` PRIMARIA ("Colombia, <dep>, <mun>" viene 0% nula);
    // `departamento`/`ciudad` son fallback (72-74% centinela en contratos).
    geo: geoFromContrato(row),
  };
}

/**
 * Resuelve geografía de contrato según D25: localización primaria, depto/ciudad
 * como respaldo cuando localizaci_n trae "No Definido" o no parsea.
 *
 * Formato esperado: "Colombia, <dep>, <mun>". El parser ya normaliza centinelas
 * via cleanText, así que un segmento "no definido" sale como null y cae al
 * fallback. Si tampoco hay fallback, queda null (lo recoge 0.6).
 */
function geoFromContrato(row: SodaRow): GeoHints {
  const parsed = parseLocalizacion(row['localizaci_n']);
  return {
    departamento: parsed.departamento ?? normalizeGeoText(row['departamento']),
    municipio: parsed.municipio ?? normalizeGeoText(row['ciudad']),
  };
}

function parseLocalizacion(value: unknown): GeoHints {
  const s = cleanText(value);
  if (s === null) return { departamento: null, municipio: null };
  // "Colombia, <dep>, <mun>" — el primer segmento es el país, lo descartamos.
  const segments = s
    .split(',')
    .map((p) => normalizeGeoText(p))
    .filter((p) => p !== 'colombia');
  // Tomamos los dos últimos como (dep, mun). Si solo hay uno, va a municipio
  // (es la pista más específica observada en muestra).
  if (segments.length >= 2) {
    return {
      departamento: segments[segments.length - 2],
      municipio: segments[segments.length - 1],
    };
  }
  if (segments.length === 1) {
    return { departamento: null, municipio: segments[0] };
  }
  return { departamento: null, municipio: null };
}
