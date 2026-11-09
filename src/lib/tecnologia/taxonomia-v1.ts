/**
 * Taxonomía tecnológica v1 — segunda clasificación, independiente de
 * `tipo_proyecto` (que conserva sus cinco valores y no se toca).
 *
 * Responde "¿qué bien, equipo o servicio menciona este texto?", no "¿de qué
 * subsistema es el proceso?". Spec: docs/superpowers/specs/
 * 2026-11-09-commercial-intelligence-datos.md §3.
 *
 * ── Reglas ──────────────────────────────────────────────────────────────────
 * · v1 está CONGELADA: un cambio de contenido crea `v2`, no se edita esta (hay
 *   filas que apuntarán a ella), igual que el cuestionario del diagnóstico.
 * · Sin términos genéricos de una sola palabra ("bomba", "valvula", "sistema"):
 *   producen falsos positivos. Cada término nombra la pieza con claridad.
 * · Los términos van sin tildes y en minúsculas; el clasificador normaliza el texto.
 * · `tipos`: un nodo puede pertenecer a varios tipos de proyecto.
 * · `naturaleza` separa bienes de servicios: la compuerta de matching la usa
 *   para no ofrecer un equipo a quien solo presta servicios.
 *
 * ESTADO: borrador técnico pendiente de revisión por un consultor sectorial
 * antes de congelarse (plan CI-01). Los términos salen del vocabulario del
 * sector, no de una medición sobre filas reales: eso lo hace el spike CI-02.
 */

import type { TipoProyecto } from "@/src/lib/classify/tipo-proyecto";

export const TAXONOMIA_VERSION = "1.1.0-borrador";

export type Naturaleza = "bien" | "servicio" | "mixto";

export interface NodoTecnologia {
  /** Código estable, jerárquico: raíz `BOM`, hijo `BOM.SUM`. */
  codigo: string;
  /** Código del padre; `null` en las 18 raíces. */
  padre: string | null;
  nombre_es: string;
  nombre_en: string;
  naturaleza: Naturaleza;
  /** Tipos de proyecto donde la tecnología suele aparecer. */
  tipos: readonly TipoProyecto[];
  /** Términos de búsqueda sin tildes, en minúsculas. */
  es: readonly string[];
  en: readonly string[];
  /**
   * Frases que, si aparecen justo después del término y en la misma cláusula,
   * lo anulan por contexto (p. ej. «sistema de filtración DE AIRE» no es
   * filtración de agua). Sin tildes y en minúsculas.
   */
  contextoExcluyente?: readonly string[];
}

const TODOS: readonly TipoProyecto[] = ["acueducto", "alcantarillado", "ptap", "ptar", "otros"];

export const NODOS_TECNOLOGIA: readonly NodoTecnologia[] = [
  // ── 1. Bombeo y equipos hidráulicos ────────────────────────────────────────
  {
    codigo: "BOM",
    padre: null,
    nombre_es: "Bombeo y equipos hidráulicos",
    nombre_en: "Pumping and hydraulic equipment",
    naturaleza: "bien",
    tipos: ["acueducto", "alcantarillado", "ptap", "ptar"],
    es: [
      "estacion de bombeo",
      "equipo de bombeo",
      "equipos de bombeo",
      "sistema de bombeo",
      "electrobomba",
      "electrobombas",
      "motobomba",
      "moto bomba",
    ],
    en: ["pumping station", "pumping system", "pumping equipment", "motor pump"],
  },
  {
    codigo: "BOM.SUM",
    padre: "BOM",
    nombre_es: "Bombas sumergibles",
    nombre_en: "Submersible pumps",
    naturaleza: "bien",
    tipos: ["alcantarillado", "ptar", "acueducto"],
    es: [
      "bomba sumergible",
      "bombas sumergibles",
      "motobomba sumergible",
      "motobombas sumergibles",
    ],
    en: ["submersible pump", "submersible pumps"],
  },
  {
    codigo: "BOM.CEN",
    padre: "BOM",
    nombre_es: "Bombas centrífugas",
    nombre_en: "Centrifugal pumps",
    naturaleza: "bien",
    tipos: ["acueducto", "ptap", "ptar"],
    es: ["bomba centrifuga", "bombas centrifugas"],
    en: ["centrifugal pump", "centrifugal pumps"],
  },
  {
    codigo: "BOM.DOS",
    padre: "BOM",
    nombre_es: "Bombas dosificadoras",
    nombre_en: "Dosing pumps",
    naturaleza: "bien",
    tipos: ["ptap", "ptar"],
    es: ["bomba dosificadora", "bombas dosificadoras"],
    en: ["dosing pump", "metering pump", "dosing pumps"],
  },
  // ── 2. Válvulas y accesorios ───────────────────────────────────────────────
  {
    codigo: "VAL",
    padre: null,
    nombre_es: "Válvulas y accesorios",
    nombre_en: "Valves and fittings",
    naturaleza: "bien",
    tipos: ["acueducto", "alcantarillado", "ptap", "ptar"],
    es: [
      "valvula de compuerta",
      "valvulas de compuerta",
      "valvula de mariposa",
      "valvulas de mariposa",
      "valvula reguladora",
      "valvula de control",
      "valvula de aire",
      "hidrante",
      "hidrantes",
      "ventosa",
      "ventosas",
      "valvula de cheque",
      "valvula check",
    ],
    en: [
      "gate valve",
      "butterfly valve",
      "check valve",
      "air valve",
      "fire hydrant",
      "control valve",
      "pressure reducing valve",
    ],
  },
  // ── 3. Tuberías y redes ────────────────────────────────────────────────────
  {
    codigo: "TUB",
    padre: null,
    nombre_es: "Tuberías y redes",
    nombre_en: "Pipes and networks",
    naturaleza: "bien",
    tipos: ["acueducto", "alcantarillado"],
    es: [
      "tuberia en pvc",
      "tuberia de pvc",
      "tuberia pead",
      "tuberia de polietileno",
      "tuberia en acero",
      "tuberia de concreto",
      "tuberia en hierro ductil",
      "hierro ductil",
      "tuberia gres",
      "tuberia corrugada",
      "suministro de tuberia",
      "suministro e instalacion de tuberia",
    ],
    en: [
      "pvc pipe",
      "hdpe pipe",
      "ductile iron pipe",
      "steel pipe",
      "concrete pipe",
      "pipeline supply",
    ],
  },
  // ── 4. Filtración ──────────────────────────────────────────────────────────
  {
    codigo: "FIL",
    padre: null,
    nombre_es: "Filtración",
    nombre_en: "Filtration",
    naturaleza: "bien",
    tipos: ["ptap", "ptar"],
    es: [
      "filtro de arena",
      "filtros de arena",
      "filtro de carbon activado",
      "filtro de cartucho",
      "filtros rapidos",
      "sistema de filtracion",
      "lecho filtrante",
      "filtro prensa",
    ],
    contextoExcluyente: ["de aire", "of air", "aire acondicionado", "hvac"],
    en: [
      "sand filter",
      "activated carbon filter",
      "cartridge filter",
      "rapid filter",
      "filtration system",
      "filter press",
    ],
  },
  // ── 5. Membranas y separación ──────────────────────────────────────────────
  {
    codigo: "MEM",
    padre: null,
    nombre_es: "Membranas y separación",
    nombre_en: "Membranes and separation",
    naturaleza: "bien",
    tipos: ["ptap", "ptar"],
    es: [
      "osmosis inversa",
      "ultrafiltracion",
      "nanofiltracion",
      "microfiltracion",
      "membranas de ultrafiltracion",
      "biorreactor de membrana",
      "mbr",
    ],
    en: [
      "reverse osmosis",
      "ultrafiltration",
      "nanofiltration",
      "microfiltration",
      "membrane bioreactor",
    ],
  },
  // ── 6. Tratamiento químico ─────────────────────────────────────────────────
  {
    codigo: "QUI",
    padre: null,
    nombre_es: "Tratamiento químico",
    nombre_en: "Chemical treatment",
    naturaleza: "mixto",
    tipos: ["ptap", "ptar"],
    es: [
      "sulfato de aluminio",
      "policloruro de aluminio",
      "hipoclorito de sodio",
      "hipoclorito de calcio",
      "cloro gaseoso",
      "coagulante",
      "coagulantes",
      "floculante",
      "floculantes",
      "dioxido de cloro",
      "sistema de cloracion",
      "equipo de cloracion",
      "desinfeccion con cloro",
      "desinfeccion uv",
      "radiacion ultravioleta",
      "insumos quimicos",
      "reactivos quimicos",
    ],
    en: [
      "aluminium sulfate",
      "aluminum sulfate",
      "sodium hypochlorite",
      "chlorine dosing",
      "coagulant",
      "flocculant",
      "uv disinfection",
      "chlorine dioxide",
      "chemical inputs",
      "treatment chemicals",
    ],
  },
  // ── 7. Tratamiento biológico ───────────────────────────────────────────────
  {
    codigo: "BIO",
    padre: null,
    nombre_es: "Tratamiento biológico",
    nombre_en: "Biological treatment",
    naturaleza: "mixto",
    tipos: ["ptar"],
    es: [
      "lodos activados",
      "reactor uasb",
      "filtro percolador",
      "humedal artificial",
      "humedal construido",
      "laguna aireada",
      "biodigestor",
      "sistema anaerobio",
      "reactor biologico",
      "tanque septico",
      "pozo septico",
      "sistemas individuales de tratamiento",
    ],
    en: [
      "activated sludge",
      "uasb reactor",
      "trickling filter",
      "constructed wetland",
      "aerated lagoon",
      "digester",
      "anaerobic reactor",
      "septic tank",
      "individual treatment systems",
    ],
  },
  // ── 8. Instrumentación ─────────────────────────────────────────────────────
  {
    codigo: "INS",
    padre: null,
    nombre_es: "Instrumentación",
    nombre_en: "Instrumentation",
    naturaleza: "bien",
    tipos: TODOS,
    es: [
      "medidor electromagnetico",
      "caudalimetro",
      "caudalimetros",
      "macromedidor",
      "macromedidores",
      "micromedidor",
      "micromedidores",
      "medidor de nivel",
      "sensor de nivel",
      "sensor de presion",
      "transmisor de presion",
      "turbidimetro",
      "analizador de cloro",
      "medidor de ph",
      "equipos de medicion",
      "equipo de medicion",
      "medicion de caudal",
      "medicion de caudales",
      "analizador de calidad de agua",
      "medidores de agua",
      "medidores de caudal",
    ],
    en: [
      "flow meter",
      "flowmeter",
      "electromagnetic flow meter",
      "level sensor",
      "pressure transmitter",
      "turbidimeter",
      "chlorine analyzer",
      "ph meter",
      "water quality analyzer",
      "water meter",
      "water meters",
      "measuring equipment",
      "flow measurement",
    ],
  },
  // ── 9. Automatización industrial ───────────────────────────────────────────
  {
    codigo: "AUT",
    padre: null,
    nombre_es: "Automatización industrial",
    nombre_en: "Industrial automation",
    naturaleza: "mixto",
    tipos: ["acueducto", "alcantarillado", "ptap", "ptar"],
    es: [
      "automatizacion de la planta",
      "automatizacion del sistema",
      "automatizacion industrial",
      "variador de frecuencia",
      "variadores de frecuencia",
      "arrancador suave",
      "tablero de control",
    ],
    en: [
      "plant automation",
      "industrial automation",
      "variable frequency drive",
      "soft starter",
      "control panel",
    ],
  },
  // ── 10. PLC y SCADA ────────────────────────────────────────────────────────
  {
    codigo: "SCA",
    padre: null,
    nombre_es: "PLC y SCADA",
    nombre_en: "PLC and SCADA",
    naturaleza: "mixto",
    tipos: ["acueducto", "alcantarillado", "ptap", "ptar"],
    es: [
      "scada",
      "plc",
      "controlador logico programable",
      "sistema de supervision y control",
      "sistema de control y supervision",
    ],
    en: ["programmable logic controller", "supervisory control"],
  },
  // ── 11. Telemetría e IoT ───────────────────────────────────────────────────
  {
    codigo: "TEL",
    padre: null,
    nombre_es: "Telemetría e IoT",
    nombre_en: "Telemetry and IoT",
    naturaleza: "mixto",
    tipos: ["acueducto", "alcantarillado", "ptap", "ptar"],
    es: [
      "telemetria",
      "telemedicion",
      "medicion inteligente",
      "medidores inteligentes",
      "internet de las cosas",
      "radioenlace",
      "sistema de monitoreo remoto",
    ],
    en: [
      "telemetry",
      "smart metering",
      "smart meters",
      "internet of things",
      "iot",
      "remote monitoring",
    ],
  },
  // ── 12. Equipos electromecánicos ───────────────────────────────────────────
  {
    codigo: "ELM",
    padre: null,
    nombre_es: "Equipos electromecánicos",
    nombre_en: "Electromechanical equipment",
    naturaleza: "bien",
    tipos: ["acueducto", "alcantarillado", "ptap", "ptar"],
    es: [
      "planta electrica",
      "grupo electrogeno",
      "transformador de potencia",
      "subestacion electrica",
      "motor electrico",
      "motores electricos",
      "aireador",
      "aireadores",
      "agitador",
      "agitadores",
      "compresor de aire",
      "sopladores",
      "puente grua",
      "tablero electrico",
    ],
    en: [
      "generator set",
      "diesel generator",
      "power transformer",
      "electrical substation",
      "electric motor",
      "aerator",
      "mixer",
      "air blower",
      "blowers",
      "overhead crane",
    ],
  },
  // ── 13. Ingeniería y diseño ────────────────────────────────────────────────
  {
    codigo: "ING",
    padre: null,
    nombre_es: "Ingeniería y diseño",
    nombre_en: "Engineering and design",
    naturaleza: "servicio",
    tipos: TODOS,
    es: [
      "estudios y disenos",
      "estudios y diseno",
      "diseno detallado",
      "disenos de detalle",
      "ingenieria de detalle",
      "ingenieria basica",
      "modelacion hidraulica",
      "diseno hidraulico",
      "diseno de la planta",
    ],
    en: [
      "engineering design",
      "detailed design",
      "basic engineering",
      "hydraulic modeling",
      "hydraulic design",
      "feasibility studies",
    ],
  },
  // ── 14. Construcción y montaje ─────────────────────────────────────────────
  {
    codigo: "CON",
    padre: null,
    nombre_es: "Construcción y montaje",
    nombre_en: "Construction and assembly",
    naturaleza: "servicio",
    tipos: TODOS,
    es: [
      "obras civiles",
      "obra civil",
      "montaje electromecanico",
      "montaje de equipos",
      "instalacion de tuberia",
      "construccion de redes",
      "construccion de la planta",
      "excavacion de zanjas",
    ],
    en: [
      "civil works",
      "electromechanical assembly",
      "equipment installation",
      "pipe laying",
      "plant construction",
    ],
  },
  // ── 15. Operación y mantenimiento ──────────────────────────────────────────
  {
    codigo: "OYM",
    padre: null,
    nombre_es: "Operación y mantenimiento",
    nombre_en: "Operation and maintenance",
    naturaleza: "servicio",
    tipos: TODOS,
    es: [
      "operacion y mantenimiento",
      "mantenimiento preventivo",
      "mantenimiento correctivo",
      "mantenimiento de equipos",
      "operacion de la planta",
      "mantenimiento de la planta",
      "mantenimiento de bombas",
      "repuestos",
    ],
    en: [
      "operation and maintenance",
      "o&m",
      "preventive maintenance",
      "corrective maintenance",
      "spare parts",
    ],
  },
  // ── 16. Consultoría especializada ──────────────────────────────────────────
  {
    codigo: "CNS",
    padre: null,
    nombre_es: "Consultoría especializada",
    nombre_en: "Specialized consulting",
    naturaleza: "servicio",
    tipos: TODOS,
    es: [
      "interventoria tecnica",
      "consultoria especializada",
      "auditoria tecnica",
      "asesoria tecnica",
      "diagnostico tecnico",
      "plan maestro",
      "estudio de factibilidad",
    ],
    en: [
      "technical supervision",
      "specialized consulting",
      "technical audit",
      "technical advisory",
      "master plan",
    ],
  },
  // ── 17. Software industrial y gemelos digitales ────────────────────────────
  {
    codigo: "SWI",
    padre: null,
    nombre_es: "Software industrial y gemelos digitales",
    nombre_en: "Industrial software and digital twins",
    naturaleza: "mixto",
    tipos: ["acueducto", "alcantarillado", "ptap", "ptar"],
    es: [
      "gemelo digital",
      "gemelos digitales",
      "sistema de informacion geografica",
      "software de modelacion",
      "software de gestion de activos",
      "modelo hidraulico digital",
    ],
    en: [
      "digital twin",
      "digital twins",
      "geographic information system",
      "asset management software",
      "modeling software",
    ],
  },
  // ── 18. Servicios logísticos y de importación ──────────────────────────────
  {
    codigo: "LOG",
    padre: null,
    nombre_es: "Servicios logísticos y de importación",
    nombre_en: "Logistics and import services",
    naturaleza: "servicio",
    tipos: TODOS,
    es: [
      "importacion de equipos",
      "nacionalizacion",
      "transporte de equipos",
      "agenciamiento aduanero",
    ],
    en: ["equipment import", "customs clearance", "freight forwarding", "equipment transport"],
  },
];

/** Índice por código; falla en carga si hay un duplicado (cubierto por tests). */
export const NODO_POR_CODIGO: Readonly<Record<string, NodoTecnologia>> = Object.fromEntries(
  NODOS_TECNOLOGIA.map((n) => [n.codigo, n])
);

/**
 * Negadores: si aparecen antes del término y en la misma cláusula, el término
 * NO es evidencia (p. ej. «no incluye el suministro de bombas sumergibles»).
 * Texto sin tildes y en minúsculas. Ventana en `VENTANA_NEGACION`.
 */
export const NEGADORES: readonly string[] = [
  "no incluye",
  "no incluyen",
  "no incluido",
  "no incluidos",
  "no se incluye",
  "no incluira",
  "excluye",
  "excluyen",
  "excluyendo",
  "excluido",
  "no requiere",
  "no se requiere",
  "no se requieren",
  "no contempla",
  "sin",
  "excepto",
  "salvo",
  "without",
  "excluding",
  "except",
  "not including",
  "does not include",
];

/** Caracteres desde el negador hasta el término dentro de la misma cláusula. */
export const VENTANA_NEGACION = 90;
