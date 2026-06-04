/**
 * Diccionarios semilla del clasificador sectorial (0.2.1 §5).
 *
 * Todo en texto normalizado: minúsculas, sin tildes (igual que normaliza el
 * clasificador antes de comparar). Son SEMILLA: se afinan midiendo falsos
 * positivos vía `sector_match_reason` (D19/D20). Cambiar esta lista debe subir
 * CLASIFICADOR_VERSION y disparar recomputo (D20).
 */

/**
 * Señal A — keywords de dominio en el objeto (0.2.1 §5). Bigramas/términos
 * específicos: "agua" suelto NO va (falsos positivos: agua embotellada). Se
 * exige contexto ("agua potable", "agua residual").
 */
export const KEYWORDS_DOMINIO = [
  'acueducto',
  'alcantarillado',
  'saneamiento basico',
  'agua potable',
  'aguas residuales',
  'agua residual',
  'ptar',
  'ptap',
  'planta de tratamiento',
  'pozo septico',
  'tanque septico',
  'potabilizacion',
  'cloracion',
  'vertimiento',
  'colector',
  'interceptor',
  'emisario',
  'captacion',
  'aduccion',
  'red de distribucion',
  'micromedicion',
  'macromedicion',
  'plan maestro de acueducto',
  'optimizacion del sistema de acueducto',
  'lodos',
] as const;

/**
 * Señal B — prefijos UNSPSC (solo dígitos, sin el prefijo "V1."). Fuerte: familia
 * de servicios de agua y alcantarillado. Contexto: obra/ingeniería/ambiental/
 * accesorios — suman débil, NO clasifican solos (0.2.1 §1, §5).
 */
export const UNSPSC_STRONG = ['83101'] as const;
export const UNSPSC_CONTEXT = ['72141', '81101', '77101', '31162'] as const;

/**
 * Señal C — patrones de nombre de entidad (fase 1, baja confianza hasta tener el
 * padrón SSPD/SUI). Regex sobre el nombre normalizado (0.2.1 §5).
 */
export const ENTIDAD_NAME_PATTERNS: readonly RegExp[] = [
  /\bacueducto\b/,
  /\baguas de\b/,
  /empresa.*servicios publicos/,
];

/**
 * Señal C (fuerte) — allowlist de NIT de ESP de agua. Vacío en fase 1; se siembra
 * con el padrón SSPD/SUI cuando se incorpore esa fuente (0.2.1 §5).
 */
export const ENTIDAD_NIT_ALLOWLIST: readonly string[] = [];

/** Señal D — términos de agua en el campo `sector`/`tipo_contrato` (desempate). */
export const CONTEXTO_TERMS = ['agua', 'acueducto', 'alcantarillado', 'saneamiento'] as const;
