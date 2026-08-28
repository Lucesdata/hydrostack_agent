// app/diagnostico/page.tsx
/**
 * Diagnóstico de preparación para licitar — ruta PÚBLICA e indexable.
 *
 * Server Component delgado: resuelve si ya hay un diagnóstico que mostrar (por
 * cuenta, o por la cookie del anónimo) y delega las tres etapas al componente
 * cliente. No está en PROTECTED_PREFIXES de middleware.ts a propósito:
 * responder sin cuenta es el flujo principal.
 */

import { cookies } from "next/headers";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import {
  getDiagnosticoPorSessionToken,
  getDiagnosticoVigente,
  type DiagnosticoGuardado,
} from "@/src/lib/diagnostico/diagnostico-store";
import { DIAGNOSTICO_COOKIE, esSessionTokenValido } from "@/src/lib/diagnostico/session-token";
import { getPerfilDb } from "@/src/lib/oferente/perfil-store";
import { DiagnosticoApp } from "@/src/components/diagnostico/DiagnosticoApp";
import type { ResultadoDiagnostico } from "@/src/lib/diagnostico/types";

export const metadata = {
  title: "¿Tu empresa puede licitar? Diagnóstico — AquaLicita",
  description:
    "10 preguntas, 3 minutos. Descubre qué te falta para presentarte a un proceso público de agua y saneamiento en Colombia: tu nivel de preparación, tu escalón de contratación y el plan para cerrarlo.",
};

/**
 * Lee cookies y sesión, así que nunca se puede prerenderizar. Explícito para
 * que no dependa de que Next lo infiera.
 */
export const dynamic = "force-dynamic";

/** Solo lo que la UI consume: la fila trae además id, respuestas y fechas. */
function aResultado(d: DiagnosticoGuardado): ResultadoDiagnostico {
  return {
    version: d.version,
    puntajeTotal: d.puntajeTotal,
    banda: d.banda,
    puntajeAreas: d.puntajeAreas,
    escalon: d.escalon,
    estadoRup: d.estadoRup,
    bloqueantes: d.bloqueantes,
    bloqueoAbsoluto: d.bloqueoAbsoluto,
  };
}

export default async function DiagnosticoPage() {
  const user = await getSessionUser();

  // Una base caída no puede tumbar la portada: el cuestionario se responde
  // igual y el POST decidirá si se guarda. Mismo criterio que el
  // `getEnJuegoMes().catch(...)` de /mis-coincidencias.
  let vigente: DiagnosticoGuardado | null = null;
  let tienePerfil = false;
  try {
    if (user) {
      vigente = await getDiagnosticoVigente(user.id);
      tienePerfil = (await getPerfilDb(user.id)) !== null;
    } else {
      const token = (await cookies()).get(DIAGNOSTICO_COOKIE)?.value;
      if (esSessionTokenValido(token)) {
        vigente = await getDiagnosticoPorSessionToken(token);
      }
    }
  } catch {
    vigente = null;
  }

  return (
    <DiagnosticoApp
      resultadoInicial={vigente ? aResultado(vigente) : null}
      anonimo={!user}
      tienePerfil={tienePerfil}
    />
  );
}
