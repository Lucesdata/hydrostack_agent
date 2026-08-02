/**
 * Núcleo de "enviar ahora" (Fase 1.3) — sin IO de HTTP. Lo llaman por igual
 * `POST /api/alertas/enviar-ahora` y el server action del botón en
 * `/mis-coincidencias`, así no hay que hacer un fetch a la propia app (que
 * arrastraría la cookie de sesión) para lograr lo mismo dos veces.
 */

import { eq } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { usuario, envioLog } from "@/src/lib/db/schema/cuentas";
import { getPerfilDb } from "@/src/lib/oferente/perfil-store";
import { getMatchesForPerfil } from "@/src/lib/matching/get-matches-for-perfil";
import { renderDigest } from "@/src/lib/email/digest";
import { sendDigestEmail } from "@/src/lib/email/send";

export type EnvioEstado = "enviado" | "sin_coincidencias" | "error";

export interface EnvioResultado {
  estado: EnvioEstado;
  matches: number;
  error?: string;
}

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function registrarEnvio(
  usuarioId: string,
  estado: EnvioEstado,
  matches: number,
): Promise<void> {
  await db
    .insert(envioLog)
    .values({ usuarioId, fecha: hoyIso(), tipo: "on_demand", estado, matches })
    .onConflictDoUpdate({
      target: [envioLog.usuarioId, envioLog.fecha, envioLog.tipo],
      set: { estado, matches, enviadoEn: new Date() },
    });
}

export async function enviarDigestAhora(usuarioId: string): Promise<EnvioResultado> {
  const perfil = await getPerfilDb(usuarioId);
  if (!perfil) {
    return { estado: "error", matches: 0, error: "No tienes un perfil de oferente guardado." };
  }

  const [u] = await db.select().from(usuario).where(eq(usuario.id, usuarioId)).limit(1);
  if (!u) {
    return { estado: "error", matches: 0, error: "Cuenta no encontrada." };
  }

  const matches = await getMatchesForPerfil(perfil);

  if (matches.length === 0) {
    await registrarEnvio(usuarioId, "sin_coincidencias", 0);
    return { estado: "sin_coincidencias", matches: 0 };
  }

  try {
    const digest = renderDigest(matches, { id: u.id, email: u.email });
    await sendDigestEmail(u.email, digest);
    await registrarEnvio(usuarioId, "enviado", matches.length);
    return { estado: "enviado", matches: matches.length };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await registrarEnvio(usuarioId, "error", matches.length);
    return { estado: "error", matches: matches.length, error };
  }
}
