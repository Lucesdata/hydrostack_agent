/**
 * Route handler: PUT/DELETE /api/al/filtros/[id] — SDD §4.2, Fase 1.
 *
 * El `id` NO basta para autorizar: el store exige además que el filtro sea de
 * `account_id`. Un filtro ajeno responde 404, igual que uno inexistente —
 * distinguirlos filtraría la existencia de filtros de otras cuentas.
 */

import { NextRequest, NextResponse } from "next/server";
import { autorizar } from "@/src/lib/al/filtros/guard";
import { actualizarFiltro, borrarFiltro } from "@/src/lib/al/filtros/store";
import { validarFiltro } from "@/src/lib/al/filtros/tipos";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await autorizar("filtros");
  if (!auth) return NextResponse.json({ error: "No hay sesión activa" }, { status: 401 });

  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Id inválido" }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const v = validarFiltro(body);
  if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });

  const filtro = await actualizarFiltro(auth.accountId, id, v.valor);
  if (!filtro) return NextResponse.json({ error: "Filtro no encontrado" }, { status: 404 });
  return NextResponse.json({ filtro });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await autorizar("filtros");
  if (!auth) return NextResponse.json({ error: "No hay sesión activa" }, { status: 401 });

  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Id inválido" }, { status: 400 });

  const borrado = await borrarFiltro(auth.accountId, id);
  if (!borrado) return NextResponse.json({ error: "Filtro no encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
