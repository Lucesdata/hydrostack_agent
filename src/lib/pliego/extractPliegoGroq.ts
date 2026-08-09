/**
 * Adaptador IO alterno: PDF de pliego → extracción estructurada vía Groq (Llama 3.3 70B).
 *
 * Groq no lee PDFs nativamente (a diferencia de Claude), así que el texto se
 * extrae localmente con `pdftotext -layout` (poppler) antes de enviarlo al
 * modelo. Tampoco soporta constreñir la salida a un JSON Schema arbitrario
 * como el `output_config` de Anthropic — el schema se incluye como texto en
 * el prompt y `parsePliegoExtraction` hace de red de seguridad real.
 *
 * Ruta gratuita para probar el pipeline sin crédito de Anthropic. Claude Opus
 * (`extractPliego.ts`) sigue siendo la ruta de calidad para producto: lee el
 * PDF nativo (conserva tablas/layout mejor que texto plano) y sí constriñe
 * el JSON Schema en la API.
 */

import { PLIEGO_JSON_SCHEMA, parsePliegoExtraction, type PliegoExtraction } from "./schema";
import { buildExtractionPrompt } from "./prompt";
import { pdfToText } from "./rules/pdfToText";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_MAX_TOKENS = 32000;

export interface ExtractGroqOptions {
  maxTokens?: number;
}

export async function extractPliegoGroq(
  pdf: string | Buffer,
  opts: ExtractGroqOptions = {}
): Promise<PliegoExtraction> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY no definida. Configúrala en .env.local.");
  }

  const text = await pdfToText(pdf);

  const systemPrompt = [
    buildExtractionPrompt(),
    "",
    "# FORMATO DE SALIDA",
    "Responde ÚNICAMENTE con un JSON que cumpla exactamente este JSON Schema (sin texto antes ni",
    "después, sin markdown, sin ```):",
    JSON.stringify(PLIEGO_JSON_SCHEMA),
  ].join("\n");

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0,
      max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Texto del pliego (extraído del PDF con pdftotext):\n\n${text}` },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Groq API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  if (choice?.finish_reason === "length") {
    throw new Error("Salida truncada (max_tokens). El pliego es muy grande para una sola pasada.");
  }

  const content: string | undefined = choice?.message?.content;
  if (!content) throw new Error("Groq no devolvió contenido.");

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new Error("La salida de Groq no es JSON válido.");
  }
  return parsePliegoExtraction(raw);
}
