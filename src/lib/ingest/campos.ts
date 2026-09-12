/**
 * Qué campos pide la ingesta a Socrata (`$select`).
 *
 * Hasta 2026-09-12 no se mandaba `$select` y aterrizaban los 61 campos del
 * dataset para usar ~25. La lista se DERIVA de los mapas de campos, nunca se
 * escribe a mano: un campo nuevo en `FIELDS_*` entra solo, y el test de
 * cobertura falla si alguien lo añade a un consumidor sin añadirlo al mapa.
 *
 * `EXTRA_*` recoge lo que el transform consume directamente por nombre sin
 * pasar por `FIELDS_*` — son reales y su ausencia rompe el transform en
 * silencio (geografía o entidad quedarían nulas).
 */

import { FIELDS_PROCESOS, FIELDS_CONTRATOS } from "@/src/lib/secop/config";
import { SOURCE_PROCESOS, SOURCE_CONTRATOS, type IngestSourceKey } from "./sources";

/** Consumidos por mapProcesoRow sin estar en FIELDS_PROCESOS. */
const EXTRA_PROCESOS = [
  "id_del_portafolio", // → proceso.portafolio_id, llave de enlace con contrato (D11/H1)
  "id_estado_del_procedimiento", // → proceso.estado_codigo
  "ordenentidad", // → entidad.nivel_gobierno
] as const;

/** Consumidos por mapContratoRow sin estar en FIELDS_CONTRATOS. */
const EXTRA_CONTRATOS = [
  "proceso_de_compra", // → resolución proceso↔contrato por portafolio (D11/H1)
  "localizaci_n", // → geografía PRIMARIA en contratos (D25)
  "es_grupo", // → proveedor.es_estructura_plural
  "orden", // → entidad.nivel_gobierno
  "rama", // → entidad.raw_attrs.rama
  "sector", // → entidad.sector_administrativo
  "tipodocproveedor", // → canonicalizeNit + proveedor.tipo_documento
  "nombre_representante_legal", // → proveedor.raw_attrs.representante_legal
  "descripcion_del_proceso", // → fallback de contrato.objeto
  "modalidad_de_contratacion", // → contrato.modalidad
  "tipo_de_contrato", // → contrato.tipoContrato
  "el_contrato_puede_ser_prorrogado", // → contrato.prorrogable
  "fecha_de_inicio_del_contrato", // → contrato.fechaInicio
  "fecha_de_fin_del_contrato", // → contrato.fechaFin
  "valor_facturado", // → contrato.valorFacturado
  "valor_pagado", // → contrato.valorPagado
  "valor_pendiente_de_pago", // → contrato.valorPendientePago
] as const;

export function camposDe(source: IngestSourceKey): string[] {
  const [mapa, extra, src] =
    source === "secop_ii_procesos"
      ? [FIELDS_PROCESOS, EXTRA_PROCESOS, SOURCE_PROCESOS]
      : [FIELDS_CONTRATOS, EXTRA_CONTRATOS, SOURCE_CONTRATOS];

  return [
    ...new Set<string>([
      ...Object.values(mapa as Record<string, string>),
      ...extra,
      src.watermarkField,
    ]),
  ].sort();
}

export function selectDe(source: IngestSourceKey): string {
  return camposDe(source).join(",");
}
