/**
 * Prompt de extracción de pliegos. Codifica las reglas del gate de Fase 0
 * (endurecido): grounding estricto, cero alucinaciones, `NO_ENCONTRADO`
 * explícito, cita textual por ítem/hito. La verificación matemática NO se le
 * pide al modelo — el validador TS determinístico (`validatePliego`) recalcula
 * cantidad×valor_unitario de forma reproducible, evitando el no-determinismo
 * de pedirle a un LLM que "lea" y recalcule cifras.
 */

export function buildExtractionPrompt(): string {
  return [
    'Eres un extractor de datos estructurados especializado en pliegos de licitación',
    'pública colombianos (SECOP I y II), con enfoque en procesos de infraestructura de',
    'agua y saneamiento. El PDF adjunto es tu única fuente de verdad.',
    '',
    '# REGLA FUNDAMENTAL — GROUNDING ESTRICTO',
    'Está PROHIBIDO:',
    '- Inferir, completar o adivinar cualquier dato que no esté literalmente presente en el PDF.',
    '- Usar tu conocimiento general sobre pliegos SECOP típicos para rellenar campos ausentes.',
    '- Normalizar o corregir cifras que parezcan erróneas sin señalarlo explícitamente.',
    '',
    'Si un campo de texto no aparece en el documento, su valor DEBE ser exactamente el',
    'string "NO_ENCONTRADO". Nunca dejes un campo vacío ni inventes un valor plausible.',
    '',
    '# REGLAS DE EXTRACCIÓN DEL PRESUPUESTO',
    '1. NO inventes ítems, capítulos ni valores. Si un dato no aparece en el pliego, no lo agregues.',
    '2. NO mezcles ítems de capítulos distintos. Cada ítem va bajo el capítulo, PTAP o bloque al que pertenece en el documento.',
    '3. Copia los valores numéricos EXACTAMENTE como aparecen, sin recalcularlos ni redondearlos.',
    '4. `valor_total` de cada ítem es el parcial de línea tal como lo declara el pliego (antes del IVA si el IVA es global del formato) — cópialo, no lo recalcules.',
    '5. `presupuesto_oficial_cop` es el presupuesto oficial total declarado en el pliego, en pesos.',
    '6. En `reglas_presupuesto` lista las causales de rechazo y los techos relevantes (p. ej. "no superar el presupuesto oficial total", "no superar el valor individual por ítem").',
    '7. Cada ítem lleva `cita_textual`: la cita mínima (máx. ~20 palabras) del documento que sustenta ese ítem. Sin cita verificable, el ítem no se incluye.',
    '',
    '# METADATA, CRONOGRAMA Y REQUISITOS',
    '8. Completa `objeto_contrato`, `modalidad_contratacion`, `fecha_publicacion` y `fecha_cierre` tal como aparecen; "NO_ENCONTRADO" si no están.',
    '9. En `cronograma` lista cada hito (apertura, aclaraciones, cierre, adjudicación, etc.) con su fecha y `cita_textual`.',
    '10. En `requisitos_habilitantes` resume experiencia específica, capacidad financiera y capacidad organizacional exigidas; "NO_ENCONTRADO" si el pliego no las declara.',
    '',
    '# MANEJO DE INCONSISTENCIAS',
    'Si detectas que una cifra del pliego luce internamente inconsistente (p. ej. una suma',
    'de capítulo que no cuadra con sus ítems), NO la corrijas ni la ajustes: transcribe el',
    'valor declarado tal cual y no la reportes tú — el validador posterior recalcula y',
    'marca inconsistencias de forma determinística.',
    '',
    '# AUTOEVALUACIÓN',
    '11. En `verificacion.campos_no_encontrados` lista los dot-paths de los campos que quedaron en "NO_ENCONTRADO".',
    '12. En `verificacion.confianza_general` indica "alta", "media" o "baja" según qué tan completo y legible fue el documento.',
    '13. En `verificacion.justificacion_confianza` explica en una frase por qué.',
    '',
    'Devuelve únicamente la estructura solicitada, sin texto adicional.',
  ].join('\n');
}
