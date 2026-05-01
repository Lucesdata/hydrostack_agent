import { CATALOG, CatalogQuestion, ConditionKey } from "./catalog";

export interface FormState {
  users?: number;
  dotacion?: number;
  retCoef?: number;
  temp?: number;
  depth?: number;
  freeboard?: number;
  cleanYears?: number;
  dboIn?: number;
  ssIn?: number;
  soilType?: string;
  soilPermeability?: "high" | "medium" | "low" | "none" | "unknown";
  normKey?: "ras" | "esp" | "eu" | "epa";
  calculated?: boolean;
}

export function evaluateConditions(conditions: ConditionKey[], formState: FormState): boolean {
  return conditions.some((cond) => matchesCondition(cond, formState));
}

function matchesCondition(cond: ConditionKey, state: FormState): boolean {
  switch (cond) {
    case "form_empty":
      return !state.users && !state.dotacion && !state.normKey;
    case "form_partial":
      return (state.users || state.dotacion || state.normKey) && !state.calculated;
    case "form_calculated":
      return state.calculated === true;
    case "norm_ras":
      return state.normKey === "ras";
    case "norm_esp":
      return state.normKey === "esp";
    case "norm_eu":
      return state.normKey === "eu";
    case "norm_epa":
      return state.normKey === "epa";
    case "soil_low_perm":
      return state.soilPermeability === "low";
    case "soil_not_apt":
      return state.soilPermeability === "none";
    case "soil_manual":
      return state.soilType === "manual";
    case "temp_cold":
      return state.temp !== undefined && state.temp < 10;
    case "always":
      return true;
    default:
      return false;
  }
}

export function filterCatalog(
  formState: FormState,
  route?: string,
  maxResults?: number
): CatalogQuestion[] {
  let filtered = CATALOG.filter((q) => {
    if (route && q.route !== route) return false;
    return evaluateConditions(q.conditions, formState);
  });

  if (filtered.length === 0 && formState.calculated) {
    filtered = CATALOG.filter((q) => {
      if (route && q.route !== route) return false;
      return q.conditions.includes("always");
    });
  }

  const limit = maxResults || 3;
  return filtered.slice(0, limit);
}

export function suggestNextQuestions(
  formState: FormState,
  conversationHistory?: string[]
): CatalogQuestion[] {
  let priorityRoute: string | undefined;

  if (!formState.calculated) {
    priorityRoute = "dimensionado";
  } else if (formState.soilPermeability === "low" || formState.soilPermeability === "none") {
    priorityRoute = "suelo";
  } else if (!formState.normKey) {
    priorityRoute = "normativa";
  }

  let suggestions = filterCatalog(formState, priorityRoute, 2);

  if (suggestions.length === 0 && formState.calculated) {
    suggestions = filterCatalog(formState, "mantenimiento", 2);
  }

  if (suggestions.length === 0) {
    suggestions = CATALOG.filter((q) => q.conditions.includes("always")).slice(0, 2);
  }

  return suggestions;
}
