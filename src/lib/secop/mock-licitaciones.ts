/**
 * MOCK — Datos y lógica de la UI de Colecciones + Búsqueda facetada
 * (app/licitaciones/descubrir). Ningún valor de este archivo viene de
 * SECOP/Neon; todo es inventado a mano para maquetar la interacción.
 *
 * Reemplazo futuro: cuando se conecte a datos reales, este archivo
 * desaparece y `MockLicitacion` se sustituye por el tipo real de
 * `src/lib/secop/types.ts` (o el resultado de la capa de clasificación
 * sectorial). Los atributos aquí son deliberadamente los mismos que se
 * necesitarán con datos reales: nada de perfil de usuario, solo atributos
 * objetivos del proceso/pliego.
 */

export const MOCK_DATA_NOTICE =
  "Datos de ejemplo — aún no conectado a SECOP II / Neon";

export interface MockLicitacion {
  id: string;
  objeto: string;
  entidad: string;
  departamento: string;
  municipio: string;
  valorEstimado: number;
  /** Etiquetas de sector/tipo de obra, atributos del pliego, no del usuario. */
  sectorTags: string[];
  abierto: boolean;
  /** Días restantes para el cierre; null si no aplica (cerrado o sin fecha). */
  diasParaCierre: number | null;
  competencia: "baja" | "media" | "alta";
  pliegoListoParaExtraer: boolean;
  url: string;
}

export const MOCK_LICITACIONES: MockLicitacion[] = [
  {
    id: "mock-001",
    objeto: "Construcción del sistema de alcantarillado sanitario zona rural",
    entidad: "Alcaldía de Buenaventura",
    departamento: "Valle del Cauca",
    municipio: "Buenaventura",
    valorEstimado: 4_820_000_000,
    sectorTags: ["Alcantarillado", "PSMV"],
    abierto: true,
    diasParaCierre: 3,
    competencia: "baja",
    pliegoListoParaExtraer: true,
    url: "https://www.secop.gov.co/mock/mock-001",
  },
  {
    id: "mock-002",
    objeto: "Optimización de la PTAP municipal y redes de conducción",
    entidad: "Empresas Públicas de Tuluá",
    departamento: "Valle del Cauca",
    municipio: "Tuluá",
    valorEstimado: 1_150_000_000,
    sectorTags: ["Acueducto", "PTAP"],
    abierto: true,
    diasParaCierre: 12,
    competencia: "media",
    pliegoListoParaExtraer: true,
    url: "https://www.secop.gov.co/mock/mock-002",
  },
  {
    id: "mock-003",
    objeto: "Interventoría técnica al PSMV del casco urbano",
    entidad: "Gobernación de Antioquia",
    departamento: "Antioquia",
    municipio: "Turbo",
    valorEstimado: 980_000_000,
    sectorTags: ["PSMV", "Interventoría"],
    abierto: true,
    diasParaCierre: 5,
    competencia: "baja",
    pliegoListoParaExtraer: false,
    url: "https://www.secop.gov.co/mock/mock-003",
  },
  {
    id: "mock-004",
    objeto: "Construcción de planta de tratamiento de aguas residuales (PTAR)",
    entidad: "Aguas de Cartagena S.A. E.S.P.",
    departamento: "Bolívar",
    municipio: "Cartagena",
    valorEstimado: 7_300_000_000,
    sectorTags: ["PTAR", "Saneamiento"],
    abierto: true,
    diasParaCierre: 21,
    competencia: "baja",
    pliegoListoParaExtraer: true,
    url: "https://www.secop.gov.co/mock/mock-004",
  },
  {
    id: "mock-005",
    objeto: "Reposición de redes de acueducto centro histórico",
    entidad: "Alcaldía de Popayán",
    departamento: "Cauca",
    municipio: "Popayán",
    valorEstimado: 620_000_000,
    sectorTags: ["Acueducto"],
    abierto: true,
    diasParaCierre: 2,
    competencia: "alta",
    pliegoListoParaExtraer: false,
    url: "https://www.secop.gov.co/mock/mock-005",
  },
  {
    id: "mock-006",
    objeto: "Diseño y construcción de colector principal de alcantarillado",
    entidad: "EPM",
    departamento: "Antioquia",
    municipio: "Bello",
    valorEstimado: 3_450_000_000,
    sectorTags: ["Alcantarillado"],
    abierto: true,
    diasParaCierre: 18,
    competencia: "media",
    pliegoListoParaExtraer: true,
    url: "https://www.secop.gov.co/mock/mock-006",
  },
  {
    id: "mock-007",
    objeto: "Actualización del Plan de Saneamiento y Manejo de Vertimientos",
    entidad: "Corporación Autónoma Regional del Valle del Cauca",
    departamento: "Valle del Cauca",
    municipio: "Palmira",
    valorEstimado: 540_000_000,
    sectorTags: ["PSMV"],
    abierto: true,
    diasParaCierre: 6,
    competencia: "baja",
    pliegoListoParaExtraer: true,
    url: "https://www.secop.gov.co/mock/mock-007",
  },
  {
    id: "mock-008",
    objeto: "Mantenimiento correctivo de PTAP y equipos de dosificación",
    entidad: "Alcaldía de Ibagué",
    departamento: "Tolima",
    municipio: "Ibagué",
    valorEstimado: 310_000_000,
    sectorTags: ["PTAP", "Mantenimiento"],
    abierto: true,
    diasParaCierre: 25,
    competencia: "alta",
    pliegoListoParaExtraer: false,
    url: "https://www.secop.gov.co/mock/mock-008",
  },
  {
    id: "mock-009",
    objeto: "Construcción de sistema de acueducto veredal",
    entidad: "Alcaldía de Pasto",
    departamento: "Nariño",
    municipio: "Pasto",
    valorEstimado: 890_000_000,
    sectorTags: ["Acueducto"],
    abierto: true,
    diasParaCierre: 4,
    competencia: "baja",
    pliegoListoParaExtraer: true,
    url: "https://www.secop.gov.co/mock/mock-009",
  },
  {
    id: "mock-010",
    objeto: "Estudios y diseños para ampliación de red de alcantarillado",
    entidad: "Alcaldía de Montería",
    departamento: "Córdoba",
    municipio: "Montería",
    valorEstimado: 275_000_000,
    sectorTags: ["Alcantarillado", "Estudios y diseños"],
    abierto: false,
    diasParaCierre: null,
    competencia: "media",
    pliegoListoParaExtraer: false,
    url: "https://www.secop.gov.co/mock/mock-010",
  },
  {
    id: "mock-011",
    objeto: "Construcción PTAR y emisario final vereda La Playa",
    entidad: "Empresas Públicas de Santa Marta",
    departamento: "Magdalena",
    municipio: "Santa Marta",
    valorEstimado: 5_600_000_000,
    sectorTags: ["PTAR", "Saneamiento"],
    abierto: true,
    diasParaCierre: 9,
    competencia: "baja",
    pliegoListoParaExtraer: true,
    url: "https://www.secop.gov.co/mock/mock-011",
  },
  {
    id: "mock-012",
    objeto: "Interventoría a obras de acueducto y alcantarillado rural",
    entidad: "Gobernación de Santander",
    departamento: "Santander",
    municipio: "Barrancabermeja",
    valorEstimado: 430_000_000,
    sectorTags: ["Interventoría", "Acueducto", "Alcantarillado"],
    abierto: true,
    diasParaCierre: 14,
    competencia: "alta",
    pliegoListoParaExtraer: false,
    url: "https://www.secop.gov.co/mock/mock-012",
  },
];

/** Umbral usado por la colección "Alto valor, poca competencia". */
const ALTO_VALOR_MIN = 500_000_000;

export type FilterPillType = "coleccion" | "sector" | "ubicacion" | "plazo" | "texto";

export interface FilterPill {
  /** Identificador estable para deduplicar y para el `key` de React. */
  id: string;
  type: FilterPillType;
  label: string;
  value: string;
}

export interface SmartCollection {
  id: string;
  titulo: string;
  descripcion: string;
  glyph: string;
  pills: FilterPill[];
}

export const SMART_COLLECTIONS: SmartCollection[] = [
  {
    id: "urgentes",
    titulo: "Urgentes esta semana",
    descripcion: "Procesos abiertos que cierran en menos de 7 días.",
    glyph: "⏱",
    pills: [{ id: "coleccion:urgentes", type: "coleccion", label: "Cierra < 7 días", value: "urgentes" }],
  },
  {
    id: "alto-valor-poca-competencia",
    titulo: "Alto valor, poca competencia",
    descripcion: "Valor estimado alto con historial de baja concurrencia de oferentes.",
    glyph: "💰",
    pills: [
      {
        id: "coleccion:alto-valor-poca-competencia",
        type: "coleccion",
        label: "Alto valor · poca competencia",
        value: "alto-valor-poca-competencia",
      },
    ],
  },
  {
    id: "listos-para-extraer",
    titulo: "Listos para extraer",
    descripcion: "El pliego ya está disponible para lectura y extracción automática.",
    glyph: "📄",
    pills: [
      { id: "coleccion:listos-para-extraer", type: "coleccion", label: "Pliego listo", value: "listos-para-extraer" },
    ],
  },
];

/** Departamentos reconocidos por el parser de búsqueda (mismos que el workbench real). */
const DEPARTAMENTOS_CONOCIDOS = [
  "Valle del Cauca", "Antioquia", "Cundinamarca", "Bogotá", "Atlántico",
  "Bolívar", "Santander", "Nariño", "Cauca", "Córdoba", "Magdalena", "Tolima",
];

/** Palabras clave de sector reconocidas por el parser. */
const SECTOR_KEYWORDS: Record<string, string> = {
  psmv: "PSMV",
  acueducto: "Acueducto",
  alcantarillado: "Alcantarillado",
  ptar: "PTAR",
  ptap: "PTAP",
  saneamiento: "Saneamiento",
  interventoría: "Interventoría",
  interventoria: "Interventoría",
};

function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Parser por palabras clave — NO es NLP real. Traduce texto libre a pills
 * de filtro objetivas (sector, ubicación, plazo) y deja el resto como texto
 * libre. Suficiente para maquetar la interacción "búsqueda → pills".
 */
export function parseSearchQuery(raw: string): FilterPill[] {
  const text = raw.trim();
  if (!text) return [];

  const pills: FilterPill[] = [];
  let remainder = text;

  for (const [kw, label] of Object.entries(SECTOR_KEYWORDS)) {
    const re = new RegExp(`\\b${escapeForRegex(kw)}\\b`, "i");
    if (re.test(remainder)) {
      pills.push({ id: `sector:${label}`, type: "sector", label, value: label });
      remainder = remainder.replace(new RegExp(escapeForRegex(kw), "ig"), "").trim();
    }
  }

  for (const dep of DEPARTAMENTOS_CONOCIDOS) {
    const re = new RegExp(`\\b${escapeForRegex(dep)}\\b`, "i");
    if (re.test(remainder)) {
      pills.push({ id: `ubicacion:${dep}`, type: "ubicacion", label: dep, value: dep });
      remainder = remainder.replace(new RegExp(escapeForRegex(dep), "ig"), "").trim();
    }
  }

  const plazoMatch = remainder.match(/(\d+)\s*d[ií]as?/i);
  if (plazoMatch) {
    const dias = plazoMatch[1];
    pills.push({ id: `plazo:${dias}`, type: "plazo", label: `< ${dias} días`, value: dias });
    remainder = remainder.replace(plazoMatch[0], "").trim();
  }

  remainder = remainder.replace(/\s{2,}/g, " ").trim();
  if (remainder) {
    pills.push({ id: `texto:${remainder.toLowerCase()}`, type: "texto", label: `"${remainder}"`, value: remainder });
  }

  return pills;
}

function matchesPill(item: MockLicitacion, pill: FilterPill): boolean {
  switch (pill.type) {
    case "coleccion":
      if (pill.value === "urgentes") {
        return item.abierto && item.diasParaCierre != null && item.diasParaCierre <= 7;
      }
      if (pill.value === "alto-valor-poca-competencia") {
        return item.valorEstimado >= ALTO_VALOR_MIN && item.competencia === "baja";
      }
      if (pill.value === "listos-para-extraer") {
        return item.pliegoListoParaExtraer;
      }
      return true;
    case "sector":
      return item.sectorTags.some((t) => t.toLowerCase() === pill.value.toLowerCase());
    case "ubicacion":
      return item.departamento.toLowerCase() === pill.value.toLowerCase();
    case "plazo": {
      const dias = Number(pill.value);
      return item.abierto && item.diasParaCierre != null && item.diasParaCierre <= dias;
    }
    case "texto": {
      const q = pill.value.toLowerCase();
      return (
        item.objeto.toLowerCase().includes(q) ||
        item.entidad.toLowerCase().includes(q) ||
        item.municipio.toLowerCase().includes(q)
      );
    }
    default:
      return true;
  }
}

/** Combina pills de colección + búsqueda con AND: todas deben cumplirse. */
export function filterMockLicitaciones(items: MockLicitacion[], pills: FilterPill[]): MockLicitacion[] {
  if (pills.length === 0) return items;
  return items.filter((item) => pills.every((pill) => matchesPill(item, pill)));
}
