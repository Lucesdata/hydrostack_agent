# Extractor de pliegos híbrido (reglas + fallback LLM)

**Fecha**: 2026-08-08
**Estado**: Aprobado, pendiente de plan de implementación.

## Contexto

Hoy la extracción de pliegos (`extractPliego` / `extractPliegoGroq` / `extractPliegoGemini`) siempre pasa por un LLM. Se validó en esta sesión, contra un proceso real de SECOP II (LP-2026-6, PTAP Municipio de Pasto), que la extracción funciona de punta a punta vía Gemini: 80 ítems en 10 capítulos, 6 inconsistencias aritméticas reales detectadas por `validatePliego`.

La pregunta que originó este diseño: ¿cuánto de esto se puede resolver con código puro, sin LLM? Se exploró conversacionalmente y se llegó a tres decisiones:

1. El parser de reglas solo actúa sobre fuentes con datos estructurados extraíbles sin OCR (PDF con capa de texto nativa, o Excel). Si la fuente es un PDF escaneado, se cae directo a LLM — no se intenta OCR (riesgo de dígitos mal leídos en una tabla de presupuesto es inaceptable).
2. Se detectó en vivo que el proceso de prueba publica el presupuesto en dos formatos: un PDF escaneado (`PRESUPUESTO PTAP 2026.pdf`, sin texto extraíble) y un Excel nativo del formato estándar CCE (`Formulario 1- Formulario de Presupuesto Oficial CCE-EICP-FM-47.xls`, no descargado aún). El diseño apunta a **ambas fuentes**, cada una para lo que puede dar con confianza:
   - Excel (Formulario 1) → tabla de ítems de presupuesto (`capitulos[]`).
   - PDF nativo del "Documento Base o Pliegos Tipo" → campos narrativos/estructurados (`reglas_presupuesto`, `requisitos_habilitantes`, metadata básica).
3. El fallback a LLM se dispara solo por señales **estructurales** (archivo ausente, columnas del Excel no coinciden con el formato esperado, PDF sin capa de texto) — nunca por inconsistencias aritméticas, que son errores reales del pliego y deben reportarse igual que hoy, no confundirse con fallas de parseo.

## Arquitectura

```
extractPliegoHybrid(documentoBasePdf, formulario1Xls?)
  ├─ parseFormulario1Xls(excelBuffer)   → capitulos[]                         (reglas)
  ├─ parseDocumentoBaseTexto(pdfText)   → reglas_presupuesto[], requisitos_habilitantes,
  │                                        proceso, entidad, modalidad, fechas (reglas)
  └─ para cada pieza que falló o no está disponible:
       llama al extractor LLM existente (Gemini por defecto) SOLO por esa pieza,
       nunca reprocesa con LLM lo que las reglas ya resolvieron
  → PliegoExtraction fusionado + metadata de origen (reglas vs LLM) por campo
```

Ambos parsers de reglas producen el mismo tipo `PliegoExtraction` / subconjuntos de él que ya define `src/lib/pliego/schema.ts` — el validador (`validatePliego`), la API (`app/api/pliego/extract`), la UI (`app/pliego/page.tsx`) y los tres CLIs existentes no cambian.

## Componentes

### `src/lib/pliego/rules/parseFormulario1.ts`
Lee el `.xls` con la librería `xlsx` (SheetJS) — **dependencia nueva, no existe hoy en el repo**. Busca la fila de encabezados del formato CCE-EICP-FM-47 y mapea columnas → `PliegoItem[]`. Si no encuentra las columnas esperadas (nombres de header no calzan, o falta la hoja), lanza `ParseoNoConfiable`.

**Gap conocido**: no se cuenta con un `.xls` real de Formulario 1 para calibrar el mapeo de columnas — solo se vio su nombre listado en SECOP para el proceso de Pasto, no se descargó. Antes de escribir el parser final hace falta un archivo real de referencia (igual que `src/lib/secop/config.ts` se calibró contra el dataset real de Socrata en su momento).

### `src/lib/pliego/rules/parseDocumentoBase.ts`
Recibe el texto ya extraído (mismo `pdftotext -layout` que ya usa `extractPliegoGroq.ts`). Busca secciones por encabezados conocidos del template CCE ("CAUSALES DE RECHAZO", "3.5 EXPERIENCIA", etc.) con regex ancladas a esos títulos. Si el PDF no tiene texto (escaneado) o no encuentra los anclajes esperados, lanza `ParseoNoConfiable`.

### `src/lib/pliego/extractPliegoHybrid.ts`
Orquesta ambos parsers de reglas, captura `ParseoNoConfiable` por pieza, y llama al extractor LLM existente (Gemini, ya validado en esta sesión) únicamente para lo que falte. Devuelve `PliegoExtraction` fusionado más un objeto de metadata (`{ campo: 'reglas' | 'llm' }`) para poder medir cuánto se está evitando de LLM en la práctica.

### `scripts/analyze-pliego-hybrid.ts`
CLI nuevo, mismo patrón que `analyze-pliego.ts` / `-groq.ts` / `-gemini.ts`:
```
npm run analyze-pliego-hybrid <documento-base.pdf> [--formulario1 <xls>]
```

## Manejo de errores

`ParseoNoConfiable` es la única señal de fallback, y es puramente estructural (columnas/encabezados/capa-de-texto ausentes) — nunca disparada por el resultado del validador aritmético. Si ambas fuentes de reglas fallan, el resultado converge exactamente al comportamiento actual de `extractPliegoGemini` — cero regresión funcional frente a lo que ya está en producción.

## Testing

Unitarios con fixtures sintéticos para ambos parsers de reglas (mismo patrón que `src/__tests__/pliego/validate.test.ts`), sin red, corren en CI. Casos a cubrir: Excel con formato esperado, Excel con columnas distintas (debe lanzar `ParseoNoConfiable`), texto de Documento Base con y sin las secciones ancladas, PDF sin capa de texto.

Prueba de integración manual pendiente contra el `.xls` real de Formulario 1 una vez se descargue (ver Gap conocido arriba).

## Fuera de alcance (explícito)

- OCR para PDFs escaneados — riesgo de error numérico inaceptable para este dominio.
- Fallback disparado por umbral de inconsistencias aritméticas — se descartó explícitamente para no confundir "pliego con errores reales" con "parser roto".
- Soporte para formatos de presupuesto no-CCE (pliegos de entidades que no adoptaron Documentos Tipo) — el parser de reglas solo apunta al formato estándar; todo lo demás cae a LLM tal como hoy.
