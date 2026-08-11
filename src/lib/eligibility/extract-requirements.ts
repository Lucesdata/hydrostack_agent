/**
 * Segundo paso, texto-a-texto: convierte `requisitos_habilitantes` (texto
 * libre, ya extraído por extractPliegoHybrid) en JSON cuantificado. Nunca
 * recibe el PDF — el único extractor de documentos sigue siendo
 * extractPliegoHybrid.ts (CLAUDE.md §2). Mismo modelo (Gemini) y mismo
 * criterio de grounding: si el texto no da un número claro, verificar_manual.
 */

import { GoogleGenerativeAI, type Schema } from '@google/generative-ai';
import type { RequisitosHabilitantes } from '@/src/lib/pliego/schema';
import { REQUISITOS_JSON_SCHEMA, parseRequisitosEstructurados, type RequisitosHabilitantesEstructurados } from './schema';

const MODEL = 'gemini-flash-lite-latest';

export interface ExtractRequirementsOptions {
  apiKey?: string;
}

/** Gemini no acepta `additionalProperties` — lo despoja recursivamente del JSON Schema. */
function stripAdditionalProperties(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripAdditionalProperties);
  if (node !== null && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === 'additionalProperties') continue;
      out[k] = stripAdditionalProperties(v);
    }
    return out;
  }
  return node;
}

const GEMINI_SCHEMA = stripAdditionalProperties(REQUISITOS_JSON_SCHEMA) as Schema;

function buildPrompt(req: RequisitosHabilitantes): string {
  return `Convierte estos requisitos habilitantes (texto libre de un pliego colombiano) en el JSON cuantificado pedido.

Reglas estrictas:
- Si un valor numérico no aparece explícito o es ambiguo, pon verificar_manual=true y deja el campo numérico en null (experiencia) — NUNCA inventes un número.
- cita_textual es la frase exacta (máx. ~20 palabras) del texto de origen que sustenta el valor.
- Los códigos UNSPSC van sin el prefijo "V1.", solo dígitos.
- Si no se exige ningún indicador financiero, indicadores_financieros es un array vacío.

Experiencia específica: "${req.experiencia_especifica}"
Capacidad financiera: "${req.capacidad_financiera}"
Capacidad organizacional: "${req.capacidad_organizacional}"`;
}

export async function extractStructuredRequirements(
  requisitos: RequisitosHabilitantes,
  opts: ExtractRequirementsOptions = {},
): Promise<RequisitosHabilitantesEstructurados> {
  const apiKey = opts.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no definida. Configúrala en .env.local.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: GEMINI_SCHEMA,
      temperature: 0,
    },
  });

  const result = await model.generateContent([{ text: buildPrompt(requisitos) }]);
  const response = result.response;
  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason === 'MAX_TOKENS') {
    throw new Error('Estructuración truncada (maxOutputTokens).');
  }

  const text = response.text();
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('La salida de Gemini no es JSON válido.');
  }
  return parseRequisitosEstructurados(raw);
}
