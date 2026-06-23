/**
 * Adaptador IO: PDF de pliego → extracción estructurada vía Claude.
 *
 * El PDF se envía como `document` content block (Claude lo lee nativamente, sin
 * parser). La salida se constriñe con `output_config.format` (JSON Schema) y se
 * re-valida con `parsePliegoExtraction`. Modelo Opus 4.8 + thinking adaptativo +
 * effort alto: el test binario exige precisión.
 *
 * Requiere `ANTHROPIC_API_KEY`. Es la única pieza con IO de red; el núcleo
 * (schema, validate, prompt) es puro y testeable sin red.
 */

import { readFile } from 'node:fs/promises';
import Anthropic from '@anthropic-ai/sdk';
import { PLIEGO_JSON_SCHEMA, parsePliegoExtraction, type PliegoExtraction } from './schema';
import { buildExtractionPrompt } from './prompt';

const MODEL = 'claude-opus-4-8';
const DEFAULT_MAX_TOKENS = 16000;

export interface ExtractOptions {
  /** Cliente inyectable (tests / reuso). Por defecto construye uno nuevo. */
  client?: Anthropic;
  maxTokens?: number;
}

export async function extractPliego(
  pdfPath: string,
  opts: ExtractOptions = {},
): Promise<PliegoExtraction> {
  const client = opts.client ?? new Anthropic();
  const pdfBase64 = (await readFile(pdfPath)).toString('base64');

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
    thinking: { type: 'adaptive' },
    output_config: {
      effort: 'high',
      format: { type: 'json_schema', schema: PLIEGO_JSON_SCHEMA },
    },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
          },
          { type: 'text', text: buildExtractionPrompt() },
        ],
      },
    ],
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('Extracción rechazada por el modelo (stop_reason: refusal).');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('Extracción truncada (max_tokens). Sube maxTokens o reduce el pliego.');
  }

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('El modelo no devolvió contenido de texto con el JSON.');
  }

  let raw: unknown;
  try {
    raw = JSON.parse(textBlock.text);
  } catch {
    throw new Error('La salida del modelo no es JSON válido.');
  }
  return parsePliegoExtraction(raw);
}
