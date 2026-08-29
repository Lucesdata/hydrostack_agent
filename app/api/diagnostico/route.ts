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
import { CUESTIONARIO_VIGENTE, getCuestionario } from "@/src/lib/diagnostico/registro";
import {
  getDiagnosticoPorSessionToken,
  getDiagnosticoVigente,
  guardarDiagnostico,
} from "@/src/lib/diagnostico/diagnostico-store";
import {
  escribirSessionToken,
  leerSessionToken,
  nuevoSessionToken,
} from "@/src/lib/diagnostico/session-token";

export const runtime = "nodejs";

/**
 * GET — el escalón del visitante, y nada más.
 *
 * Lo consume `/licitaciones/explorar`, que es una página estática con un
 * componente cliente: pedirlo por aquí evita volverla dinámica solo para
 * adornar unas tarjetas. Devuelve exclusivamente el escalón y la versión; el
 * resto del diagnóstico no tiene por qué viajar para esto.
 *
 * Nunca responde 401: sin diagnóstico devuelve nulls, porque es un adorno del
 * explorador y no una función que se pueda gatear.
 */
export async function GET(req: NextRequest) {
  const vacio = { escalon: null, version: null };
  try {
    const user = await getSessionUser();
    const diagnostico = user ? await getDiagnosticoVigente(user.id) : await porCookie(req);

    if (!diagnostico) return NextResponse.json(vacio);
    return NextResponse.json({
      escalon: diagnostico.escalon,
      version: diagnostico.version,
    });
  } catch {
    // La base caída no puede tumbar el explorador: se comporta como si no
    // hubiera diagnóstico.
    return NextResponse.json(vacio);
  }
}

async function porCookie(req: NextRequest) {
  const token = leerSessionToken(req);
  return token ? getDiagnosticoPorSessionToken(token) : null;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const cuerpo = body as { respuestas?: unknown; version?: unknown } | null;

  // La versión la manda el cliente, así que se valida contra el registro. Una
  // desconocida es un 400 y no un fallback silencioso al cuestionario vigente:
  // guardaríamos las respuestas de un cuestionario bajo la versión de otro, y
  // esa fila quedaría ilegible para siempre.
  let cuestionario = CUESTIONARIO_VIGENTE;
  if (cuerpo?.version !== undefined) {
    const pedido = typeof cuerpo.version === "string" ? getCuestionario(cuerpo.version) : null;
    if (!pedido) {
      return NextResponse.json({ error: "Versión de cuestionario desconocida" }, { status: 400 });
    }
    cuestionario = pedido;
  }

  const respuestas = parseRespuestas(cuerpo?.respuestas, cuestionario);
  if (!respuestas) {
    return NextResponse.json({ error: "Respuestas incompletas o fuera de rango" }, { status: 400 });
  }

  const resultado = calcularDiagnostico(respuestas, cuestionario);

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
