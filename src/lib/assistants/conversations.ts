// src/lib/assistants/conversations.ts

/**
 * Persistencia del historial por (usuario, contexto). Una conversación por
 * par — el motor es único, cada contexto mantiene su propio hilo (ver
 * conversacion_usuario_contexto_uq en asistentes.ts). `mensaje.contenido`
 * guarda el UIMessage completo serializado a JSON (parts incluidas), no solo
 * el texto — se necesita para reconstruir la UI al recargar la página.
 */

import type { UIMessage } from 'ai';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/src/lib/db/client';
import { conversacion, mensaje } from '@/src/lib/db/schema/asistentes';
import type { AssistantContextSlug } from './config';

export async function getOrCreateConversation(
  usuarioId: string,
  contexto: AssistantContextSlug,
): Promise<string> {
  const existing = await db
    .select({ id: conversacion.id })
    .from(conversacion)
    .where(and(eq(conversacion.usuarioId, usuarioId), eq(conversacion.contexto, contexto)))
    .limit(1);
  if (existing[0]) return existing[0].id;

  const created = await db
    .insert(conversacion)
    .values({ usuarioId, contexto })
    .onConflictDoNothing({ target: [conversacion.usuarioId, conversacion.contexto] })
    .returning({ id: conversacion.id });
  if (created[0]) return created[0].id;

  // Carrera: otra request creó la fila entre el select y el insert.
  const row = await db
    .select({ id: conversacion.id })
    .from(conversacion)
    .where(and(eq(conversacion.usuarioId, usuarioId), eq(conversacion.contexto, contexto)))
    .limit(1);
  return row[0].id;
}

export async function loadMessages(conversacionId: string): Promise<UIMessage[]> {
  const rows = await db
    .select({ contenido: mensaje.contenido })
    .from(mensaje)
    .where(eq(mensaje.conversacionId, conversacionId))
    .orderBy(asc(mensaje.creadoEn));
  return rows.map((r) => JSON.parse(r.contenido) as UIMessage);
}

export async function saveMessages(conversacionId: string, messages: UIMessage[]): Promise<void> {
  if (messages.length === 0) return;
  await db.insert(mensaje).values(
    messages.map((m) => ({
      conversacionId,
      rol: m.role,
      contenido: JSON.stringify(m),
    })),
  );
}
