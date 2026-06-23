/**
 * Prompt de extracción de presupuesto. Codifica las reglas del test binario de
 * Fase 0: sin líneas inventadas, sin mezclar capítulos, matemáticas consistentes.
 */

export function buildExtractionPrompt(): string {
  return [
    'Eres un analista experto en pliegos de contratación pública de Colombia (SECOP II).',
    'Extrae del PDF adjunto la estructura del presupuesto oficial con precisión absoluta.',
    '',
    'Reglas estrictas (NO negociables):',
    '1. NO inventes ítems, capítulos ni valores. Si un dato no aparece en el pliego, no lo agregues.',
    '2. NO mezcles ítems de capítulos distintos. Cada ítem va bajo el capítulo, PTAP o bloque al que pertenece en el documento.',
    '3. Copia los valores numéricos EXACTAMENTE como aparecen, sin recalcularlos ni redondearlos.',
    '4. `valor_total` de cada ítem es `cantidad × valor_unitario` (el parcial de la línea, antes del IVA si el IVA es global del formato).',
    '5. `presupuesto_oficial_cop` es el presupuesto oficial total declarado en el pliego, en pesos.',
    '6. En `reglas_presupuesto` lista las causales de rechazo y los techos relevantes (p. ej. "no superar el presupuesto oficial total", "no superar el valor individual por ítem").',
    '',
    'Devuelve únicamente la estructura solicitada, sin texto adicional.',
  ].join('\n');
}
