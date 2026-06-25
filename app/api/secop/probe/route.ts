/**
 * Route handler:  POST /api/secop/probe
 *
 * C1 — dispara el probe de acceso documental ON-DEMAND (cuando el usuario abre /
 * selecciona / se suscribe a un proceso). NUNCA en batch nacional: un proceso por
 * llamada, por volumen y cortesía con SECOP.
 *
 * C3 — persiste el resultado (con method='probe' + timestamp) en la fila del
 * proceso, si se provee `secopProcesoId` y la fila existe. La persistencia es
 * best-effort: si la migración 0002 aún no se aplicó a la base, el probe igual
 * responde (no se rompe la UX).
 *
 * Body JSON: { url: string, secopProcesoId?: string }
 * Respuesta: { state, reason, method, canExtract, message }
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/src/lib/db/client';
import { proceso } from '@/src/lib/db/schema';
import { probeDocument, canExtract, accessMessage } from '@/src/lib/secop/document-access';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: { url?: unknown; secopProcesoId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const url = typeof body.url === 'string' ? body.url : null;
  const secopProcesoId = typeof body.secopProcesoId === 'string' ? body.secopProcesoId : null;
  if (!url) {
    return NextResponse.json({ error: 'Falta `url` del proceso' }, { status: 400 });
  }

  const result = await probeDocument(url);

  // C3: persistir best-effort (no romper la respuesta si la columna aún no existe).
  let persisted = false;
  if (secopProcesoId) {
    try {
      await db
        .update(proceso)
        .set({
          documentAccess: result.state,
          documentAccessReason: result.reason,
          documentAccessMethod: result.method,
          documentAccessEvaluatedAt: sql`now()`,
        })
        .where(eq(proceso.secopProcesoId, secopProcesoId));
      persisted = true;
    } catch {
      persisted = false;
    }
  }

  return NextResponse.json({
    state: result.state,
    reason: result.reason,
    method: result.method,
    canExtract: canExtract(result.state),
    message: accessMessage(result.state),
    persisted,
  });
}
