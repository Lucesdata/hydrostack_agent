/**
 * Route handler: /api/seguir — seguir un proceso a mano (fase 3 de la vitrina).
 *
 *   GET    ?ids=CO1.REQ.1,CO1.REQ.2   → { seguidos: Record<id, { siguiendo, manual }> }
 *   POST   { procesoId }              → { estado: "siguiendo" | "ya-lo-seguia" }
 *   DELETE { procesoId }              → { estado: "dejado" | "no-era-manual" | "no-lo-seguia" }
 *
 * Exige la capacidad `seguir` (cuenta gratuita), resuelta en `acceso/politica.ts`
 * a través de `autorizar()`. La cuenta sale de la sesión, nunca del cuerpo.
 * Las escrituras exigen `Content-Type: application/json`: un formulario de otro
 * sitio no puede mandar ese tipo sin una petición previa que el navegador
 * bloquea. Todo es `no-store`: depende de quién pregunta.
 */

import { NextRequest, NextResponse } from "next/server";
import { autorizar } from "@/src/lib/al/filtros/guard";
import { dejarDeSeguir, idValido, idsValidos, seguidos, seguir } from "@/src/lib/seguir/store";

export const runtime = "nodejs";

const SIN_CACHE = { "Cache-Control": "no-store" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: SIN_CACHE });
}

async function procesoDelCuerpo(req: NextRequest): Promise<string | NextResponse> {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json({ error: "Se espera JSON" }, 415);
  }
  let body: { procesoId?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }
  if (!idValido(body.procesoId)) return json({ error: "Falta el proceso o es inválido" }, 400);
  return body.procesoId;
}

export async function GET(req: NextRequest) {
  const auth = await autorizar("seguir");
  if (!auth) return json({ error: "No hay sesión activa" }, 401);

  const ids = idsValidos(req.nextUrl.searchParams.get("ids")?.split(",") ?? []);
  if (!ids) return json({ error: "Faltan los ids o son inválidos" }, 400);

  return json({ seguidos: await seguidos(auth.accountId, ids) });
}

export async function POST(req: NextRequest) {
  const auth = await autorizar("seguir");
  if (!auth) return json({ error: "No hay sesión activa" }, 401);

  const procesoId = await procesoDelCuerpo(req);
  if (typeof procesoId !== "string") return procesoId;

  const estado = await seguir(auth.accountId, auth.usuarioId, procesoId);
  if (estado === "no-existe") return json({ error: "Ese proceso no existe" }, 404);
  return json({ estado }, estado === "siguiendo" ? 201 : 200);
}

export async function DELETE(req: NextRequest) {
  const auth = await autorizar("seguir");
  if (!auth) return json({ error: "No hay sesión activa" }, 401);

  const procesoId = await procesoDelCuerpo(req);
  if (typeof procesoId !== "string") return procesoId;

  return json({ estado: await dejarDeSeguir(auth.accountId, procesoId) });
}
