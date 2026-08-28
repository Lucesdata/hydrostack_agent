// app/api/mercado/waitlist/route.ts

/**
 * POST /api/mercado/waitlist — guarda el interés del usuario en el futuro
 * contexto 'mercado' (tarjeta 3 de Fig. 06 en la home, "Vendo o fabrico
 * soluciones"). Upsert idempotente: un clic repetido no duplica la fila
 * (lista_espera_mercado_usuario_uq).
 */

import { NextResponse } from "next/server";
import { db } from "@/src/lib/db/client";
import { listaEsperaMercado } from "@/src/lib/db/schema/asistentes";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { recordUserSignal } from "@/src/lib/signals/record-signal";

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  await db
    .insert(listaEsperaMercado)
    .values({ usuarioId: user.id })
    .onConflictDoNothing({ target: listaEsperaMercado.usuarioId });

  await recordUserSignal(user.id, "proveedor");

  return NextResponse.json({ ok: true });
}
