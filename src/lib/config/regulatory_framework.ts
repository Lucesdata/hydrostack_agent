/**
 * Colombian regulatory framework for individual on-site wastewater treatment (SITARD).
 *
 * Normative hierarchy (highest to lowest):
 *   Constitución Política de Colombia
 *   → Decreto 1076/2015 (mod. Decreto 050/2018) — permiso ambiental de vertimientos
 *   → Resolución 0330/2017 MinVivienda — norma principal de diseño (Art. 134–145)
 *   → Resolución 0631/2015 MADS — criterios de calidad del efluente
 *   → POT local (e.g. Decreto 555/2021 Bogotá) — clasificación del suelo
 *   → RAS 2000 Título E — referencia técnica complementaria (no norma vigente)
 *
 * Each design criterion is linked to its source article to enable traceability
 * in technical reports and permit applications.
 */

// ─── Normative sources ────────────────────────────────────────────────────────

export const COLOMBIA_NORMS = {
  primary: {
    code: 'RES_0330_2017',
    label: 'Resolución 0330 de 2017',
    shortLabel: 'Res. 0330/2017',
    issuer: 'Ministerio de Vivienda, Ciudad y Territorio (MinVivienda)',
    scope:
      'Reglamento Técnico vigente del Sector de Agua Potable y Saneamiento Básico (RAS). ' +
      'Artículos 134–145: dimensionamiento y construcción de sistemas individuales de ' +
      'tratamiento de aguas residuales domésticas (SITARD).',
    roleInHierarchy: 'NORMA PRINCIPAL VIGENTE',
  },
  effluent: {
    code: 'RES_0631_2015',
    label: 'Resolución 0631 de 2015',
    shortLabel: 'Res. 0631/2015',
    issuer: 'Ministerio de Ambiente y Desarrollo Sostenible (MADS)',
    scope:
      'Establece los parámetros y valores límite máximos permisibles en los vertimientos ' +
      'puntuales a cuerpos de aguas superficiales y a sistemas de alcantarillado. ' +
      'Criterio de eficiencia y cumplimiento de vertimientos del efluente tratado.',
    roleInHierarchy: 'CRITERIO DE CALIDAD DEL EFLUENTE',
  },
  environmental_permit: {
    code: 'DEC_1076_2015',
    label: 'Decreto 1076 de 2015 (mod. por Decreto 050 de 2018)',
    shortLabel: 'Dec. 1076/2015',
    issuer: 'Ministerio de Ambiente y Desarrollo Sostenible (MADS)',
    scope:
      'Decreto Único Reglamentario del Sector Ambiente. ' +
      'Marco del permiso ambiental de vertimientos de aguas residuales. ' +
      'Libro 2, Parte 2, Título 3, Capítulo 3.',
    roleInHierarchy: 'MARCO DEL PERMISO AMBIENTAL',
  },
  technical_reference: {
    code: 'RAS_2000',
    label: 'RAS 2000 — Título E',
    shortLabel: 'RAS 2000 Tít. E',
    issuer: 'Ministerio de Desarrollo Económico',
    scope:
      'Reglamento Técnico del Sector de Agua Potable anterior. ' +
      'Conserva valor como referencia técnica de cálculo. ' +
      'NO es la norma principal vigente; ha sido sustituido por la Res. 0330/2017.',
    roleInHierarchy: 'REFERENCIA TÉCNICA COMPLEMENTARIA',
  },
} as const;

// ─── POT local (Bogotá) ───────────────────────────────────────────────────────

export const BOGOTA_POT = {
  code: 'DEC_555_2021',
  label: 'POT Bogotá — Decreto 555 de 2021',
  shortLabel: 'POT Bogotá D.C.',
  note:
    'El sistema séptico individual (SITARD) solo aplica en suelo rural o suburbano. ' +
    'En suelo urbano existe obligación legal de conectarse al sistema de alcantarillado ' +
    'de la Empresa de Acueducto y Alcantarillado de Bogotá (EAAB). ' +
    'Verifique la clasificación del suelo en el POT vigente (Decreto 555/2021) ' +
    'antes de diseñar y tramitar permisos.',
};

// ─── Environmental authorities ────────────────────────────────────────────────

export const COLOMBIA_AUTHORITIES = {
  bogota_urbano:
    'Secretaría Distrital de Ambiente (SDA) — competente en Bogotá D.C. zona urbana',
  bogota_rural:
    'Corporación Autónoma Regional de Cundinamarca (CAR) — competente en zona rural del Distrito',
  cundinamarca:
    'Corporación Autónoma Regional de Cundinamarca (CAR Cundinamarca)',
  nacional:
    'Corporación Autónoma Regional (CAR) competente según la jurisdicción del municipio',
};

// ─── Design criteria with article traceability ────────────────────────────────

/**
 * Each entry maps a design parameter to its source norm and specific article.
 * Used to populate the "Fuente normativa" column in technical report tables.
 */
export const DESIGN_CRITERIA = {
  dotacion_vivienda: {
    value: 200, unit: 'L/hab·día',
    norm: 'Res. 0330/2017', article: 'Art. 134 — Dotaciones para SITARD vivienda',
  },
  trh_minimo: {
    value: 1.5, unit: 'días',
    norm: 'Res. 0330/2017', article: 'Art. 138 — TRH mínimo tanque séptico',
  },
  volumen_minimo: {
    value: 1500, unit: 'L',
    norm: 'Res. 0330/2017', article: 'Art. 138 — Volumen mínimo tanque séptico',
  },
  lodos_acumulacion: {
    value: 50, unit: 'L/hab·año',
    norm: 'Res. 0330/2017', article: 'Art. 139 — Producción de lodos por habitante',
  },
  limpieza_intervalo: {
    value: 3, unit: 'años',
    norm: 'Res. 0330/2017', article: 'Art. 139 — Intervalo de limpieza',
  },
  profundidad_minima: {
    value: 1.2, unit: 'm',
    norm: 'Res. 0330/2017', article: 'Art. 140 — Profundidad mínima útil',
  },
  relacion_lw: {
    value: '2:1 – 4:1', unit: '–',
    norm: 'Res. 0330/2017', article: 'Art. 140 — Relación L/W del tanque',
  },
  ancho_zanja: {
    value: 0.6, unit: 'm',
    norm: 'Res. 0330/2017', article: 'Art. 143 — Dimensiones de zanjas filtrantes',
  },
  longitud_max_zanja: {
    value: 30, unit: 'm',
    norm: 'Res. 0330/2017', article: 'Art. 143 — Longitud máxima de zanja',
  },
  separacion_zanjas: {
    value: 1.5, unit: 'm',
    norm: 'Res. 0330/2017', article: 'Art. 143 — Separación mínima entre zanjas',
  },
  nivel_freatico: {
    value: 1.0, unit: 'm',
    norm: 'Res. 0330/2017', article: 'Art. 144 — Distancia mínima al nivel freático',
  },
  factor_seguridad_campo: {
    value: 1.2, unit: '–',
    norm: 'Res. 0330/2017', article: 'Art. 143 — Factor de seguridad campo',
  },
} as const;

// ─── Next steps for permit application ────────────────────────────────────────

export const COLOMBIA_NEXT_STEPS = [
  {
    title: 'Estudio de percolación in situ',
    body:
      'Contratar profesional certificado (IGAC o laboratorio de suelos autorizado) para ' +
      'realizar la prueba de percolación in situ. El resultado determina la tasa de absorción ' +
      'real del suelo (Ka) y puede modificar el área del campo de infiltración calculada aquí.',
  },
  {
    title: 'Diseño definitivo firmado por ingeniero matriculado',
    body:
      'Contratar ingeniero sanitario o civil matriculado ante el Consejo Profesional Nacional ' +
      'de Ingeniería (COPNIA) para elaborar y firmar los planos constructivos y la memoria ' +
      'técnica definitiva, incluyendo especificaciones de materiales.',
  },
  {
    title: 'Solicitud de permiso de vertimientos ante autoridad ambiental',
    body:
      'Presentar la solicitud de permiso de vertimientos ante la autoridad ambiental competente. ' +
      'En Bogotá zona urbana: Secretaría Distrital de Ambiente (SDA). ' +
      'En zona rural del Distrito o Cundinamarca: CAR Cundinamarca. ' +
      'Base legal: Decreto 1076/2015 (modificado por Decreto 050/2018). ' +
      'NOTA: el PSMV (Plan de Saneamiento y Manejo de Vertimientos) es un instrumento del ' +
      'municipio como prestador del servicio público de saneamiento, no una gestión del ' +
      'usuario individual.',
  },
  {
    title: 'Licencia de construcción',
    body:
      'Tramitar la licencia de construcción ante la Curaduría Urbana de Bogotá o la Oficina ' +
      'de Planeación Municipal, adjuntando el diseño firmado y el permiso ambiental de vertimientos.',
  },
  {
    title: 'Construcción con contratista especializado',
    body:
      'Ejecutar con empresa o maestro de obra con experiencia comprobable en instalación de ' +
      'SITARD. Materiales mínimos recomendados: tanque en concreto reforzado o fibra de vidrio, ' +
      'tuberías PVC Ø100 mm, grava limpia 20–50 mm para zanjas, geotextil de separación.',
  },
  {
    title: 'Plan de operación y mantenimiento',
    body:
      'Programar inspección y extracción de lodos cada 2–3 años (Res. 0330/2017, Art. 139). ' +
      'Evitar la descarga de grasas, productos químicos o antibacterianos que afecten la ' +
      'digestión anaerobia del tanque.',
  },
] as const;

// ─── Colombia references list (for PDF references section) ────────────────────

export const COLOMBIA_REFERENCIAS_NORMATIVAS: string[] = [
  'Resolución 0330 de 2017 (MinVivienda) — Reglamento Técnico RAS vigente, ' +
    'Artículos 134–145: Sistemas Individuales de Tratamiento de Aguas Residuales (SITARD).',
  'Resolución 0631 de 2015 (MADS) — Parámetros y valores límite permisibles en ' +
    'vertimientos a cuerpos de agua. Criterio de eficiencia del efluente tratado.',
  'Decreto 1076 de 2015, modificado por Decreto 050 de 2018 (MADS) — Decreto Único ' +
    'Reglamentario del Sector Ambiente. Marco del permiso ambiental de vertimientos.',
  'RAS 2000 — Título E (MinDesarrollo) — Referencia técnica complementaria de cálculo. ' +
    'No es la norma principal vigente; sustituido por Res. 0330/2017.',
  'POT Bogotá — Decreto 555 de 2021 — Clasificación del suelo: el SITARD aplica solo en ' +
    'suelo rural o suburbano. Suelo urbano: conexión obligatoria a alcantarillado EAAB.',
];
