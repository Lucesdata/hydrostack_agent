// src/lib/secop/pliego-actions.ts
"use server";

/**
 * Wrapper `"use server"` de uploadPliego() — parsea el FormData del
 * formulario de la tarjeta, resuelve la sesión, y redirige con el
 * resultado en query params (mismo patrón que handleEnviarAhora en
 * app/mis-coincidencias/page.tsx). No tiene test directo — mismo criterio
 * que saveMinimoPerfilAction en src/lib/oferente/actions.ts.
 */

import { redirect } from "next/navigation";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { uploadPliego } from "./pliego-upload";

export async function uploadPliegoAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user?.id) {
    redirect("/login?next=/mis-coincidencias");
  }

  const procesoId = formData.get("procesoId");
  if (typeof procesoId !== "string" || !procesoId) {
    redirect("/mis-coincidencias?pliego=error&pliegoDetalle=falta_proceso");
  }

  const file = formData.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    redirect("/mis-coincidencias?pliego=error&pliegoDetalle=falta_archivo");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const resultado = await uploadPliego({
    procesoId,
    subidoPorUsuarioId: user.id,
    nombreArchivo: file.name || "pliego.pdf",
    buffer,
  });

  if (resultado.ok === false) {
    redirect(`/mis-coincidencias?pliego=error&pliegoDetalle=${encodeURIComponent(resultado.error)}`);
  }

  redirect("/mis-coincidencias?pliego=ok");
}
