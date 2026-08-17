// src/lib/oferente/actions.ts
"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { savePerfilMinimoDb } from "./perfil-store";

export async function saveMinimoPerfilAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user?.id) {
    redirect("/login?next=/mis-coincidencias");
  }

  const sectoresUnspsc = formData.getAll("sector").map(String);
  const departamentos = formData.getAll("departamento").map(String);

  if (sectoresUnspsc.length === 0 && departamentos.length === 0) {
    redirect("/mis-coincidencias?perfilError=vacio");
  }

  const resultado = await savePerfilMinimoDb(user.id, {
    id: user.id,
    sectoresUnspsc,
    cobertura: { departamentos, municipios: [] },
  });

  if (!resultado.ok) {
    redirect("/mis-coincidencias?perfilError=db_unavailable");
  }

  redirect("/mis-coincidencias");
}
