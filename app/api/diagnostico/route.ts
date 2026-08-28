/**
 * POST /api/diagnostico — calcula, persiste y devuelve el resultado.
 *
 * Ruta PÚBLICA: responder el diagnóstico sin cuenta es el flujo principal, no
 * un caso degradado. Por eso NO está en `PROTECTED_PREFIXES` de middleware.ts,
 * y por eso siempre responde JSON: un redirect de middleware convertiría este
 * `fetch()` en un 200 con el HTML de /login, que es exactamente el problema
 * documentado en el docstring de middleware.ts a raíz de /api/mercado/waitlist.
 *
 * Sin sesión, la fila se guarda con un `session_token` que viaja en cookie
 * httpOnly y que el registro reclama después (ver diagnostico-store.ts). Con
 * sesión, la fila nace ya reclamada y no se emite cookie.
 *
 * El cálculo es puro y determinístico: ninguna llamada a un modelo aquí.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { recordUserSignal } from "@/src/lib/signals/record-signal";
import { calcularDiagnostico, parseRespuestas } from "@/src/lib/diagnostico/calcular";
import { guardarDiagnostico } from "@/src/lib/diagnostico/diagnostico-store";
import {
  escribirSessionToken,
  leerSessionToken,
  nuevoSessionToken,
} from "@/src/lib/diagnostico/session-token";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const respuestas = parseRespuestas((body as { respuestas?: unknown } | null)?.respuestas);
  if (!respuestas) {
    return NextResponse.json({ error: "Respuestas incompletas o fuera de rango" }, { status: 400 });
  }

  const resultado = calcularDiagnostico(respuestas);

  const user = await getSessionUser();
  const usuarioId = user?.id ?? null;
  // Con cuenta no hace falta cookie: la fila ya tiene dueño.
  const sessionToken = usuarioId ? null : (leerSessionToken(req) ?? nuevoSessionToken());

  const guardado = await guardarDiagnostico({
    usuarioId,
    sessionToken,
    respuestas,
    resultado,
  });

  if (usuarioId) {
    // Captura pasiva de intención, no fatal (record-signal.ts se traga el error).
    await recordUserSignal(usuarioId, "oferente");
  }

  // Modo concierge (mismo criterio que PUT /api/perfil): si la base no está
  // disponible devolvemos igual el resultado ya calculado — perderlo sería
  // peor que no guardarlo — pero lo decimos con el status.
  const res = NextResponse.json(
    {
      ok: guardado.ok,
      guardado: guardado.ok,
      diagnosticoId: guardado.ok ? guardado.id : null,
      resultado,
    },
    { status: guardado.ok ? 200 : 503 }
  );

  if (sessionToken) escribirSessionToken(res, sessionToken);
  return res;
}
