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
import { getCuestionario } from "@/src/lib/diagnostico/registro";
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

export default async function DiagnosticoPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const user = await getSessionUser();
  // `?v=` elige la variante. Una versión que no existe cae al cuestionario
  // vigente en vez de romper la página: es un parámetro que cualquiera puede
  // escribir a mano.
  const pedida = (await searchParams).v;
  const version = pedida && getCuestionario(pedida) ? pedida : undefined;

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

  // Un diagnóstico guardado entra directo al resultado, PERO solo si es del
  // cuestionario que se está pidiendo. Sin esto, quien ya respondió uno y hace
  // clic en "haz el otro diagnóstico" aterriza en su resultado viejo y nunca
  // llega a la variante — visto al probarlo.
  const mostrarGuardado =
    vigente !== null && (version === undefined || vigente.version === version);

  return (
    <DiagnosticoApp
      resultadoInicial={mostrarGuardado ? aResultado(vigente!) : null}
      anonimo={!user}
      tienePerfil={tienePerfil}
      version={version}
    />
  );
}
