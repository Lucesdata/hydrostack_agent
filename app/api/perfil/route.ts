/**
 * Route handler: GET/PUT /api/perfil
 *
 * Perfil de oferente (`OferenteProfile`) de la cuenta autenticada, persistido en
 * `oferente_perfil` (Fase 1.1). Requiere sesión — sin sesión, el perfil sigue
 * viviendo solo en `clientStore` (localStorage), como hoy. El cliente
 * (`SecopExplorer`) decide cuándo llamar esto: al montar (GET, para hidratar
 * cuentas ya migradas) y al completar el wizard (PUT).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/src/lib/auth/config';
import { db } from '@/src/lib/db/client';
import { oferentePerfil } from '@/src/lib/db/schema/cuentas';
import { getPerfilDb } from '@/src/lib/oferente/perfil-store';
import type { OferenteProfile } from '@/src/lib/oferente/types';

export const runtime = 'nodejs';

function isValidPerfil(p: unknown): p is OferenteProfile {
  if (!p || typeof p !== 'object') return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    Array.isArray(o.sectoresUnspsc) &&
    !!o.cobertura &&
    !!o.cuantiaObjetivo
  );
}

export async function GET() {
  const session = await auth();
  const usuarioId = session?.user?.id;
  if (!usuarioId) {
    return NextResponse.json({ error: 'No hay sesión activa' }, { status: 401 });
  }

  const perfil = await getPerfilDb(usuarioId);
  return NextResponse.json({ perfil });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const usuarioId = session?.user?.id;
  if (!usuarioId) {
    return NextResponse.json({ error: 'No hay sesión activa' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!isValidPerfil(body)) {
    return NextResponse.json({ error: 'Perfil inválido' }, { status: 400 });
  }

  const [row] = await db
    .insert(oferentePerfil)
    .values({ usuarioId, perfil: body })
    .onConflictDoUpdate({
      target: oferentePerfil.usuarioId,
      set: { perfil: body, actualizadoEn: new Date() },
    })
    .returning();

  return NextResponse.json({ perfil: row.perfil as OferenteProfile });
}
