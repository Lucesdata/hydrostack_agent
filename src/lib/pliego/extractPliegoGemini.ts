/**
 * Adaptador IO alterno: PDF de pliego → extracción estructurada vía Gemini.
 *
 * Igual que `extractPliego.ts` (Claude): el PDF se manda nativo, sin
 * preprocesamiento local, y la salida se constriñe con un JSON Schema en la
 * propia API. Gemini no soporta `additionalProperties` en su schema (subset
 * de OpenAPI), así que se limpia recursivamente antes de pasarlo.
 *
 * Ruta gratuita (sin tarjeta) para probar el pipeline cuando no hay crédito
 * de Anthropic ni cupo de Groq — la cuota gratis de Gemini es mucho más
 * amplia que la de Groq para un documento de este tamaño.
 */

import { readFile } from "node:fs/promises";
import { GoogleGenerativeAI, type Schema } from "@google/generative-ai";
import { PLIEGO_JSON_SCHEMA, parsePliegoExtraction, type PliegoExtraction } from "./schema";
import { buildExtractionPrompt } from "./prompt";

const MODEL = "gemini-flash-lite-latest";

/** Gemini no acepta `additionalProperties` — lo despoja recursivamente del JSON Schema. */
function stripAdditionalProperties(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripAdditionalProperties);
  if (node !== null && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === "additionalProperties") continue;
      out[k] = stripAdditionalProperties(v);
    }
    return out;
  }
  return node;
}

const GEMINI_SCHEMA = stripAdditionalProperties(PLIEGO_JSON_SCHEMA) as Schema;

export interface ExtractGeminiOptions {
  apiKey?: string;
  maxOutputTokens?: number;
}

export async function extractPliegoGemini(
  pdf: string | Buffer,
  opts: ExtractGeminiOptions = {}
): Promise<PliegoExtraction> {
  const apiKey = opts.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no definida. Configúrala en .env.local.");
  }

  const pdfBuffer = Buffer.isBuffer(pdf) ? pdf : await readFile(pdf);
  const pdfBase64 = pdfBuffer.toString("base64");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: GEMINI_SCHEMA,
      maxOutputTokens: opts.maxOutputTokens ?? 16000,
      temperature: 0,
    },
  });

  const result = await model.generateContent([
    { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
    { text: buildExtractionPrompt() },
  ]);

  const response = result.response;
  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason === "MAX_TOKENS") {
    throw new Error("Extracción truncada (maxOutputTokens). Sube el límite o reduce el pliego.");
  }

  const text = response.text();
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("La salida de Gemini no es JSON válido.");
  }
  return parsePliegoExtraction(raw);
}
