/**
 * ──────────────────────────────────────────────────────────────────────────
 *  SECOP · Configuración central  (HydroStack › Licitaciones)
 * ──────────────────────────────────────────────────────────────────────────
 *
 *  ⚠️  ESTE ES EL ÚNICO ARCHIVO QUE DEBES VERIFICAR/AJUSTAR.
 *
 *  Los nombres de columna de Socrata se truncan y codifican raro (ñ → _n_,
 *  í → _, etc.). NO los memorices: vuélcalos en vivo y compáralos con esto.
 *
 *  Verificación del esquema real (1 fila de ejemplo con TODOS los campos):
 *
 *    curl "https://www.datos.gov.co/resource/p6dx-8zbt.json?\$limit=1" | jq 'keys'
 *
 *  Si algún FIELDS.* no coincide con la salida del curl, corrígelo aquí y
 *  todo lo demás (client, route, agent tool, UI) sigue funcionando sin tocar.
 *
 *  Esquema verificado en vivo el 2026-06-03 (Fase 0).
 * ──────────────────────────────────────────────────────────────────────────
 */

/** Dominio del portal Socrata de Colombia. */
export const SOCRATA_DOMAIN = "https://www.datos.gov.co";

/** Datasets SECOP II. */
export const DATASETS = {
  /** Procesos de contratación (licitaciones): convocados, en evaluación, adjudicados… */
  procesos: "p6dx-8zbt",
  /** Contratos electrónicos ya formalizados / en ejecución. */
  contratos: "jbjy-vk9h",
} as const;

export type DatasetKey = keyof typeof DATASETS;

/**
 * Nombres canónicos de cada dataset en el catálogo Socrata. El id 4x4 puede
 * rotar por vigencia fiscal (PLAN §4), pero el nombre es estable, así que el
 * `datasetResolver` lo usa para resolver el id vigente en runtime. Los IDs de
 * `DATASETS` quedan como fallback de emergencia. Verificados en vivo contra el
 * catálogo el 2026-06-23.
 */
export const DATASET_NAMES: Record<DatasetKey, string> = {
  procesos: "SECOP II - Procesos de Contratación",
  contratos: "SECOP II - Contratos Electrónicos",
};

/** Dominio (sin protocolo) para la Discovery API del catálogo Socrata. */
export const SOCRATA_CATALOG_DOMAIN = "datos.gov.co";

/**
 * Mapeo de campos del dataset PROCESOS (p6dx-8zbt).
 * Verificado contra el esquema real (Fase 0).
 */
export const FIELDS_PROCESOS = {
  id: "id_del_proceso",
  referencia: "referencia_del_proceso",
  nombre: "nombre_del_procedimiento",
  descripcion: "descripci_n_del_procedimiento",
  entidad: "entidad",
  nitEntidad: "nit_entidad",
  departamento: "departamento_entidad",
  ciudad: "ciudad_entidad",
  estado: "estado_del_procedimiento",
  fase: "fase",
  modalidad: "modalidad_de_contratacion",
  tipoContrato: "tipo_de_contrato",
  fechaPublicacion: "fecha_de_publicacion_del",
  precioBase: "precio_base",
  adjudicado: "adjudicado",
  valorAdjudicacion: "valor_total_adjudicacion",
  adjudicatario: "nombre_del_adjudicador",
  unspsc: "codigo_principal_de_categoria",
  url: "urlproceso", // objeto { url: "..." }
  estadoApertura: "estado_de_apertura_del_proceso", // Abierto | Cerrado — señal Nivel-0 de Plazo (no hay fecha de cierre en este dataset)
} as const;

/**
 * Mapeo de campos del dataset CONTRATOS (jbjy-vk9h).
 * Verificado contra el esquema real (Fase 0).
 */
export const FIELDS_CONTRATOS = {
  id: "id_contrato",
  referencia: "referencia_del_contrato",
  objeto: "objeto_del_contrato",
  entidad: "nombre_entidad",
  nitEntidad: "nit_entidad",
  departamento: "departamento",
  ciudad: "ciudad",
  estado: "estado_contrato",
  proveedor: "proveedor_adjudicado",
  nitProveedor: "documento_proveedor",
  fechaFirma: "fecha_de_firma",
  valor: "valor_del_contrato",
  unspsc: "codigo_de_categoria_principal",
  url: "urlproceso",
} as const;

/**
 * ── Filtro de SECTOR AGUA ──────────────────────────────────────────────────
 *
 * Estrategia robusta para el MVP: full-text search por palabras clave en
 * nombre + descripción. Es más fiable que perseguir códigos UNSPSC exactos.
 * Los UNSPSC quedan como refinamiento opcional (ver UNSPSC_AGUA abajo).
 */
export const KEYWORDS_AGUA = [
  "acueducto",
  "alcantarillado",
  "agua potable",
  "saneamiento básico",
  "saneamiento basico",
  "PTAP",
  "PTAR",
  "planta de tratamiento",
  "aguas residuales",
  "abastecimiento de agua",
  "redes de distribución",
  "PSMV",
  "plan maestro de acueducto",
] as const;

/**
 * UNSPSC relacionados con agua y saneamiento (refinamiento opcional).
 * Se usan con un $where tipo: codigo LIKE '8310%' OR codigo LIKE '7710%' ...
 */
export const UNSPSC_AGUA = [
  "8310", // Servicios públicos (acueducto/alcantarillado)
  "7710", // Gestión ambiental
  "7712", // Recursos hídricos
  "7211", // Construcción de obra civil pesada (redes)
  "4015", // Tubería y accesorios
  "4017", // Distribución de fluidos
  "8110", // Servicios profesionales de ingeniería
] as const;

/** Estados típicos del procedimiento (para poblar el filtro de la UI). */
export const ESTADOS_PROCESO = [
  "Convocado",
  "Presentación de oferta",
  "En evaluación y selección",
  "Adjudicado",
  "Celebrado",
  "Desierto",
  "Cancelado",
] as const;

/** Límites de paginación. SODA admite hasta 50.000 por página. */
export const PAGE_SIZE_DEFAULT = 25;
export const PAGE_SIZE_MAX = 100;

/**
 * Ventanas de caché (Next fetch) para las consultas a Socrata, en segundos.
 * El conteo total es más caro (no tiene $limit útil) y menos sensible a
 * quedar unos minutos desactualizado que la página de resultados.
 */
export const REVALIDATE_SEARCH = 1800;
export const REVALIDATE_COUNT = 3600;
