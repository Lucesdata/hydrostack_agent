/**
 * Route handler:  POST /api/secop/verdict
 *
 * Segundo momento ("¿puedo participar?"), separado de la lista (GET
 * /api/secop, que ya no adjunta veredicto — ver Fase 2 del spec). El cliente
 * llama aquí solo al abrir el detalle de un proceso (con perfil guardado) o
 * al completar el wizard de perfil de oferente.
 *
 * Body: { proceso: SecopProceso, perfil: OferenteProfile }
 * El veredicto es recomputable y nunca se persiste (invariante de verdict.ts).
 */

import { NextRequest, NextResponse } from "next/server";
import { buildVerdict, toVerdictInput } from "@/src/lib/secop/verdict";
import type { SecopProceso } from "@/src/lib/secop/types";
import type { OferenteProfile } from "@/src/lib/oferente/types";

export const runtime = "nodejs";

interface VerdictRequestBody {
  proceso?: SecopProceso;
  perfil?: OferenteProfile;
}

function isValidProceso(p: unknown): p is SecopProceso {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.referencia === "string";
}

function isValidPerfil(p: unknown): p is OferenteProfile {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    Array.isArray(o.sectoresUnspsc) &&
    !!o.cobertura &&
    !!o.cuantiaObjetivo
  );
}

export async function POST(req: NextRequest) {
  let body: VerdictRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!isValidProceso(body.proceso)) {
    return NextResponse.json({ error: "Falta el proceso o es inválido" }, { status: 400 });
  }
  if (!isValidPerfil(body.perfil)) {
    return NextResponse.json({ error: "Falta el perfil de oferente o es inválido" }, { status: 400 });
  }

  const verdict = buildVerdict(body.perfil, toVerdictInput(body.proceso));
  return NextResponse.json({ verdict });
}
