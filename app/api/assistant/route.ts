// app/api/assistant/route.ts

/**
 * POST /api/assistant — motor de chat único, parametrizado por `context`
 * (ver src/lib/assistants/config.ts). Recibe {context, messages, documentId?},
 * resuelve el documento ancla (el explícito o el más reciente del usuario en
 * ese contexto), lo inyecta en el system prompt cuando existe, y transmite la
 * respuesta de Claude en streaming. Persiste solo los mensajes nuevos de este
 * turno (los que el cliente aún no tenía guardados) al terminar el stream.
 */

import { NextResponse } from 'next/server';
import {
  streamText,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  type UIMessage,
} from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { getSessionUser } from '@/src/lib/supabase/get-session-user';
import { recordUserSignal } from '@/src/lib/signals/record-signal';
import { getAssistantContext } from '@/src/lib/assistants/config';
import { getOrCreateConversation, loadMessages, saveMessages } from '@/src/lib/assistants/conversations';
import { getDocumentById, getLatestDocument } from '@/src/lib/assistants/documents';

export const runtime = 'nodejs';
export const maxDuration = 120;

interface AssistantRequestBody {
  context?: string;
  messages?: UIMessage[];
  documentId?: string;
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada en el servidor.' }, { status: 500 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  let body: AssistantRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido: se espera JSON.' }, { status: 400 });
  }

  const context = body.context ? getAssistantContext(body.context) : null;
  if (!context) {
    return NextResponse.json({ error: `Contexto desconocido: ${body.context}` }, { status: 400 });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: 'Falta `messages`.' }, { status: 400 });
  }
  const clientMessages = body.messages;

  let conversationId: string;
  let alreadySavedIds: Set<string>;
  let systemPrompt: string;
  let modelMessages: Awaited<ReturnType<typeof convertToModelMessages>>;
  try {
    conversationId = await getOrCreateConversation(user.id, context.slug);
    const alreadySaved = await loadMessages(conversationId);
    alreadySavedIds = new Set(alreadySaved.map((m) => m.id));

    const document = body.documentId
      ? await getDocumentById(user.id, context.slug, body.documentId)
      : await getLatestDocument(user.id, context.slug);

    systemPrompt = document
      ? `${context.systemPrompt}\n\n--- Texto del documento subido por el usuario (${document.nombreArchivo}) ---\n${document.textoExtraido}`
      : context.systemPrompt;

    modelMessages = await convertToModelMessages(clientMessages);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `No se pudo preparar la conversación: ${message}` }, { status: 502 });
  }

  await recordUserSignal(user.id, context.senal);

  const result = streamText({
    model: anthropic('claude-sonnet-4-5'),
    system: systemPrompt,
    messages: modelMessages,
  });

  result.consumeStream();

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: clientMessages,
      onEnd: async ({ messages: finalMessages }) => {
        const newMessages = finalMessages.filter((m) => !alreadySavedIds.has(m.id));
        await saveMessages(conversationId, newMessages);
      },
    }),
  });
}
