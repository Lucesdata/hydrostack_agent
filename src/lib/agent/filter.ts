import { CATALOG, CatalogQuestion, ConditionKey } from "./catalog"

export interface FormState {
  users?: number
  dotacion?: number
  retCoef?: number
  temp?: number
  depth?: number
  freeboard?: number
  cleanYears?: number
  dboIn?: number
  ssIn?: number
  soilType?: string
  soilPermeability?: "high" | "medium" | "low" | "none" | "unknown"
  normKey?: "epa" | "uk" | "asnzs" | "cte" | "ras"
  calculated?: boolean
  // Flow phases for homeowners
  phase?: "initial" | "explanation" | "orientation" | "detail"
  // Detected subscenario for orientation
  subscenario?: "installation" | "active_failure" | "preventive" | "abandoned"
  // Whether explanation was offered
  explanationOffered?: boolean
}

export function evaluateConditions(
  conditions: ConditionKey[],
  formState: FormState
): boolean {
  return conditions.some(cond => matchesCondition(cond, formState))
}

function matchesCondition(cond: ConditionKey, state: FormState): boolean {
  switch (cond) {
    case "form_empty":
      return !state.users && !state.dotacion && !state.normKey
    case "form_partial":
      return (state.users || state.dotacion || state.normKey) && !state.calculated
    case "form_calculated":
      return state.calculated === true
    case "norm_epa":
      return state.normKey === "epa"
    case "norm_uk":
      return state.normKey === "uk"
    case "norm_asnzs":
      return state.normKey === "asnzs"
    case "norm_cte":
      return state.normKey === "cte"
    case "soil_low_perm":
      return state.soilPermeability === "low"
    case "soil_not_apt":
      return state.soilPermeability === "none"
    case "soil_manual":
      return state.soilType === "manual"
    case "temp_cold":
      return state.temp !== undefined && state.temp < 10
    case "always":
      return true
    default:
      return false
  }
}

export function filterCatalog(
  formState: FormState,
  route?: string,
  maxResults?: number
): CatalogQuestion[] {
  let filtered = CATALOG.filter(q => {
    if (route && q.route !== route) return false
    return evaluateConditions(q.conditions, formState)
  })

  if (filtered.length === 0 && formState.calculated) {
    filtered = CATALOG.filter(q => {
      if (route && q.route !== route) return false
      return q.conditions.includes("always")
    })
  }

  const limit = maxResults || 3
  return filtered.slice(0, limit)
}

export function suggestNextQuestions(
  formState: FormState,
  conversationHistory?: string[]
): CatalogQuestion[] {
  let priorityRoute: string | undefined

  if (!formState.calculated) {
    priorityRoute = "sizing"
  } else if (formState.soilPermeability === "low" || formState.soilPermeability === "none") {
    priorityRoute = "soil"
  } else if (!formState.normKey) {
    priorityRoute = "standards"
  }

  let suggestions = filterCatalog(formState, priorityRoute, 2)

  if (suggestions.length === 0 && formState.calculated) {
    suggestions = filterCatalog(formState, "maintenance", 2)
  }

  if (suggestions.length === 0) {
    suggestions = CATALOG.filter(q => q.conditions.includes("always")).slice(0, 2)
  }

  return suggestions
}
