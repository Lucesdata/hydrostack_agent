// src/lib/assistants/config.ts

/**
 * Registro de contextos del motor de chat único (Prompt 03 — Fase 1). Cada
 * entrada define su propio conocimiento (system prompt), qué documento
 * acepta como ancla y qué señal registra. Un tercer contexto ('mercado')
 * llegará en una fase futura — agregarlo es una entrada nueva aquí, sin
 * tocar el motor (AssistantChat, /api/assistant).
 */

import type { UserSignal } from '@/src/lib/signals/record-signal';

export type AssistantContextSlug = 'ejecucion' | 'operacion';

export interface AssistantDocumentConfig {
  tipo: 'contrato' | 'referencia';
  label: string;
  accept: string;
  maxBytes: number;
  /** Si está definido, se envía como primer turno automático tras subir el documento. */
  mensajePosSubida?: string;
}

export interface AssistantContext {
  slug: AssistantContextSlug;
  titulo: string;
  descripcion: string;
  systemPrompt: string;
  mensajeBienvenida: string;
  documento?: AssistantDocumentConfig;
  senal: UserSignal;
}

const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

export const ASSISTANT_CONTEXTS: Record<AssistantContextSlug, AssistantContext> = {
  ejecucion: {
    slug: 'ejecucion',
    titulo: 'Ejecución de contrato',
    descripcion: 'Sube tu contrato y te acompañamos en la ejecución: actas, pólizas, informes, liquidación.',
    systemPrompt:
      'Eres un experto en ejecución de contratos públicos de agua y saneamiento en Colombia ' +
      '(Ley 80 de 1993, Ley 1150 de 2007, garantías, interventoría, actas de inicio y de ' +
      'liquidación). Responde siempre con base en el texto del contrato subido por el usuario ' +
      'cuando se incluya en este prompt. Si no hay contrato incluido, invita al usuario a ' +
      'subirlo y responde de forma general sobre ejecución contractual.',
    mensajeBienvenida:
      'Sube el contrato adjudicado (PDF) y te doy un resumen con partes, objeto, valor, plazo ' +
      'y las obligaciones más críticas. Después pregúntame lo que necesites: actas, pólizas, informes, liquidación.',
    documento: {
      tipo: 'contrato',
      label: 'contrato adjudicado',
      accept: 'application/pdf',
      maxBytes: MAX_DOCUMENT_BYTES,
      mensajePosSubida:
        'Resume el contrato que acabo de subir: partes, objeto, valor, plazo y las 5 ' +
        'obligaciones o fechas más críticas detectadas.',
    },
    senal: 'ejecutor',
  },
  operacion: {
    slug: 'operacion',
    titulo: 'Operación de acueducto o ESP',
    descripcion: 'Resuelve dudas de normativa (RAS, Res. 0330, CRA, SUI) con respuestas citadas.',
    systemPrompt:
      'Eres un experto en normativa colombiana de agua y saneamiento (RAS, Resolución 0330 de ' +
      '2017, regulación CRA, reportes SUI, PSMV, IRCA). Toda afirmación normativa debe citar el ' +
      'artículo o resolución específica. Si no tienes certeza de la fuente exacta, dilo ' +
      'explícitamente en vez de adivinar y recomienda consultar la fuente oficial. Nunca ' +
      'inventes números de artículo o de resolución. Si el usuario sube un documento de ' +
      'referencia, básate en su texto cuando esté incluido en este prompt.',
    mensajeBienvenida:
      'Pregunta sobre RAS, Resolución 0330, CRA o SUI — o sube un documento de referencia para ' +
      'que lo tenga en cuenta.',
    documento: {
      tipo: 'referencia',
      label: 'documento de referencia',
      accept: 'application/pdf',
      maxBytes: MAX_DOCUMENT_BYTES,
    },
    senal: 'operador',
  },
};

export function getAssistantContext(slug: string): AssistantContext | null {
  return slug in ASSISTANT_CONTEXTS ? ASSISTANT_CONTEXTS[slug as AssistantContextSlug] : null;
}
