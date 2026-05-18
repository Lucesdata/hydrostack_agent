/**
 * Owner state utilities — manage persistence between sessions
 */

export function getEmptyOwnerState() {
  return {
    phase: null,
    subscenario: null,
    explanationOffered: false,
    country: null,
    occupants: null,
    systemAge: null,
    lastUpdated: new Date().toISOString(),
  };
}

export function getOwnerState() {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("hydrostack_ownerstate");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function saveOwnerState(state) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      "hydrostack_ownerstate",
      JSON.stringify({
        ...state,
        lastUpdated: new Date().toISOString(),
      })
    );
  } catch {
    // ignore localStorage errors
  }
}

/**
 * Update owner state based on agent response patterns
 * Detects phase changes and other state updates from the content
 */
export function updateOwnerStateFromResponse(currentState, agentContent) {
  if (!currentState || !agentContent || typeof agentContent !== "string") {
    return currentState;
  }

  const updated = { ...currentState };
  const content = agentContent.toLowerCase();

  // Detect phase changes from agent response keywords
  if (
    content.includes("cómo funcionan") ||
    content.includes("how") && content.includes("work") ||
    content.includes("explor") && content.includes("system")
  ) {
    if (!updated.explanationOffered) {
      updated.phase = "explanation";
      updated.explanationOffered = true;
    }
  }

  if (
    content.includes("próximos pasos") ||
    content.includes("next step") ||
    content.includes("orientación")
  ) {
    updated.phase = "orientation";
  }

  if (
    content.includes("detalle") ||
    content.includes("detalles") ||
    content.includes("deep") && content.includes("dive") ||
    content.includes("específico")
  ) {
    updated.phase = "detail";
  }

  // Detect country from mentions
  const countryMap = {
    colombia: "colombia",
    "bogotá": "colombia",
    bogota: "colombia",
    españa: "spain",
    spanish: "spain",
    madrid: "spain",
    barcelona: "spain",
    usa: "usa",
    "united states": "usa",
    texas: "usa",
    california: "usa",
    florida: "usa",
  };

  for (const [keyword, country] of Object.entries(countryMap)) {
    if (content.includes(keyword)) {
      updated.country = country;
      break;
    }
  }

  // Detect number of occupants
  const occupantMatch = content.match(
    /(\d+)\s*(?:personas?|personas?|people|habitantes?|occupants?)/i
  );
  if (occupantMatch) {
    updated.occupants = parseInt(occupantMatch[1], 10);
  }

  return updated;
}
