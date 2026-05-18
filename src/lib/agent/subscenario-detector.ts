/**
 * Subscenario Detector — Auto-detects owner situation from user message
 * Identifies: installation | active_failure | preventive | abandoned
 */

export type Subscenario = "installation" | "active_failure" | "preventive" | "abandoned" | null;

interface DetectionResult {
  subscenario: Subscenario;
  confidence: number; // 0-100
  detectedKeywords: string[];
}

// Keywords for each subscenario (ES + EN combined)
const SUBSCENARIO_KEYWORDS = {
  installation: {
    keywords: [
      // Spanish
      "construir", "obra nueva", "obra", "terreno", "nuevo sistema", "permiso", "proyecto",
      "desde cero", "planificar", "cuánta gente", "cuántos habitantes", "cuántos viven",
      "proyectar", "diseñar", "nueva propiedad", "nueva casa", "nueva instalación",
      "instalar sistema", "pozo", "crear", "diseño",
      // English
      "build", "new construction", "new property", "new home", "new system", "design",
      "plan", "permit", "from scratch", "how many people", "new installation", "new site",
      "virgin land", "raw land", "greenfield",
    ],
    weight: 1.0,
  },
  active_failure: {
    keywords: [
      // Spanish
      "olor", "hedor", "apesta", "fétido", "agua", "charco", "retorno", "rebosa",
      "anegado", "urgente", "ahora", "inmediato", "problema", "no funciona", "retroceso",
      "sube agua", "afloramiento", "desborda", "humedades", "encharcamiento", "molestia",
      "mal olor", "repugnante", "fallo", "avería", "desastre", "emergencia", "crítico",
      // English
      "smell", "stink", "odor", "odour", "foul", "water", "pooling", "backup", "overflows",
      "overflow", "urgent", "now", "immediate", "problem", "not working", "failure", "rises",
      "effluent", "wet spots", "soggy", "emergency", "flooding", "sewage", "waste water backup",
      "septic failure",
    ],
    weight: 1.0,
  },
  preventive: {
    keywords: [
      // Spanish
      "revisión", "inspección", "mantenimiento", "chequeo", "cuándo vaciar", "cada cuánto",
      "nunca revisado", "5 años", "10 años", "hace tiempo", "no sé cuándo", "funciona bien",
      "sin problemas", "parece estar bien", "periódico", "preventivo", "servicio", "limpieza",
      "bomba", "rutina", "regular", "cuidado", "revisada", "última vez",
      // English
      "inspection", "review", "maintenance", "check", "when to pump", "how often", "never checked",
      "5 years", "10 years", "long ago", "don't know when", "works fine", "no problems",
      "seems okay", "periodic", "preventive", "service", "cleaning", "pump", "routine",
      "regular", "care", "inspected", "last time",
    ],
    weight: 1.0,
  },
  abandoned: {
    keywords: [
      // Spanish
      "abandonada", "vacía", "desocupada", "nadie vive", "cerrada", "sin usar", "años",
      "hace X tiempo", "quiero usar", "voy a habitar", "reabrir", "mudarse", "8 años",
      "10 años", "mucho tiempo", "cerrado", "inactivo", "deshabitada", "largo tiempo",
      "rehabilitar", "ocupar", "re-ocupar", "reapertura", "vuelvo", "regreso",
      // English
      "abandoned", "empty", "vacant", "no one lives", "unoccupied", "closed", "unused",
      "years", "long ago", "want to use", "will occupy", "reopen", "move in", "8 years",
      "10 years", "long time", "inactive", "uninhabited", "closed for", "sit empty",
      "rehabilitate", "occupy", "re-occupy", "reopening", "coming back",
    ],
    weight: 1.0,
  },
};

/**
 * Detect subscenario from user message
 * Returns highest-confidence subscenario or null if ambiguous
 */
export function detectSubscenario(userMessage: string): DetectionResult {
  if (!userMessage || typeof userMessage !== "string") {
    return { subscenario: null, confidence: 0, detectedKeywords: [] };
  }

  const text = userMessage.toLowerCase().trim();
  const scores: Record<Subscenario, { count: number; keywords: string[] }> = {
    installation: { count: 0, keywords: [] },
    active_failure: { count: 0, keywords: [] },
    preventive: { count: 0, keywords: [] },
    abandoned: { count: 0, keywords: [] },
  };

  // Count keyword matches
  for (const [scenario, data] of Object.entries(SUBSCENARIO_KEYWORDS)) {
    const scenarioKey = scenario as Subscenario;
    if (!scenarioKey) continue;

    for (const keyword of data.keywords) {
      // Word boundary match to avoid partial matches (e.g., "agua" matching "igualla")
      const regex = new RegExp(`\\b${keyword}\\b`, "gi");
      const matches = text.match(regex);
      if (matches) {
        scores[scenarioKey].count += matches.length;
        if (!scores[scenarioKey].keywords.includes(keyword)) {
          scores[scenarioKey].keywords.push(keyword);
        }
      }
    }
  }

  // Calculate confidence scores
  const confidences: Array<[Subscenario, number, string[]]> = [
    ["installation", scores.installation.count, scores.installation.keywords],
    ["active_failure", scores.active_failure.count, scores.active_failure.keywords],
    ["preventive", scores.preventive.count, scores.preventive.keywords],
    ["abandoned", scores.abandoned.count, scores.abandoned.keywords],
  ];

  // Sort by count (descending)
  confidences.sort((a, b) => b[1] - a[1]);

  const [topScenario, topCount, topKeywords] = confidences[0];

  // No keywords found
  if (topCount === 0) {
    return { subscenario: null, confidence: 0, detectedKeywords: [] };
  }

  // Calculate confidence as a percentage (max 100)
  // If active_failure detected, boost confidence (it's critical)
  let confidence = Math.min(100, (topCount / Math.max(1, text.split(/\s+/).length)) * 100);
  if (topScenario === "active_failure") {
    confidence = Math.min(100, confidence * 1.3); // 30% boost for urgent cases
  }

  // If only 1-2 keywords and message is long, lower confidence
  if (topKeywords.length <= 2 && text.split(/\s+/).length > 50) {
    confidence *= 0.7;
  }

  // High confidence threshold: >50 or clear winner
  const secondCount = confidences[1][1];
  const isWinner = topCount > secondCount * 1.5 || confidence > 60;

  return {
    subscenario: isWinner ? topScenario : null,
    confidence: Math.round(confidence),
    detectedKeywords: topKeywords.slice(0, 3), // Top 3 keywords that triggered detection
  };
}

/**
 * Utility: Get detection result + log for debugging
 */
export function detectAndLog(userMessage: string): DetectionResult {
  const result = detectSubscenario(userMessage);
  if (result.subscenario) {
    console.log(`[Subscenario Detection] ${result.subscenario} (${result.confidence}%) — keywords: ${result.detectedKeywords.join(", ")}`);
  }
  return result;
}
