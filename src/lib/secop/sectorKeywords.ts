/**
 * Taxonomía de 5 sub-sectores agua/saneamiento para las métricas
 * interactivas del landing. NO existía antes de este trabajo — auditado
 * contra `SectorialGate`/`KEYWORDS_AGUA` (ver docs/superpowers/specs/
 * 2026-07-18-landing-metrics-interactive-design.md §1). Un proceso puede
 * matchear más de un bucket — no son mutuamente excluyentes.
 *
 * "ETAP" (Estación de Tratamiento de Agua Potable) es el label que pidió
 * producto, pero como keyword de búsqueda es ruido puro: "ETAP" matchea la
 * palabra "etapa/etapas" en miles de contratos no relacionados (verificado
 * contra Socrata real: 74.018 falsos positivos, todos "etapa(s)"). Colombia
 * usa PTAP (Planta de Tratamiento de Agua Potable) para este concepto — se
 * siembra con esa keyword real; el label de UI sigue diciendo "ETAP".
 */
export const SECTOR_KEYWORDS = {
  acueducto: [
    'acueducto', 'agua potable', 'abastecimiento de agua', 'potabilizacion',
    'captación', 'aducción', 'red de distribución de agua', 'micromedición',
    'macromedición',
  ],
  alcantarillado: [
    'alcantarillado', 'aguas residuales', 'agua residual', 'colector',
    'interceptor', 'emisario', 'red de alcantarillado', 'vertimiento',
  ],
  ptar: ['PTAR', 'planta de tratamiento de aguas residuales'],
  psmv: ['PSMV', 'plan de saneamiento y manejo de vertimientos'],
  etap: [
    'PTAP', 'planta de tratamiento de agua potable',
    'estación de tratamiento de agua potable',
  ],
} as const;

export type SectorKey = keyof typeof SECTOR_KEYWORDS;

export const SECTOR_KEYS = Object.keys(SECTOR_KEYWORDS) as SectorKey[];

export const SECTOR_LABELS: Record<SectorKey, string> = {
  acueducto: 'Acueducto',
  alcantarillado: 'Alcantarillado',
  ptar: 'PTAR',
  psmv: 'PSMV',
  etap: 'ETAP',
};

function soqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Cláusula $where SoQL para un sector: OR de todas sus keywords contra todos
 * los `fields` dados (mismo patrón que `buildAguaWhere` en client.ts).
 */
export function buildSectorWhere(sector: SectorKey, fields: readonly string[]): string {
  const clauses = SECTOR_KEYWORDS[sector].map((kw) => {
    const k = soqlEscape(kw.toUpperCase());
    const perField = fields.map((f) => `upper(${f}) like '%${k}%'`).join(' OR ');
    return `(${perField})`;
  });
  return `(${clauses.join(' OR ')})`;
}
