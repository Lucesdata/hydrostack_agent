// src/lib/secop/pliego-actions.ts
"use server";

/**
 * Wrappers `"use server"` de uploadPliego(): parsean el FormData, resuelven
 * la sesión y redirigen con el resultado. Hay dos puertas al mismo extractor:
 *
 *  · la tarjeta de /mis-coincidencias (`uploadPliegoAction`), que devuelve el
 *    resultado en query params, como handleEnviarAhora en esa página;
 *  · la §4 de la ficha (`subirPliegoDesdeFichaAction`), que lo devuelve en el
 *    hash: la ficha es estática (ISR) y no lee `searchParams`, así que el aviso
 *    lo pinta un componente de cliente que lee `location.hash`.
 *
 * Las dos revalidan la ficha del proceso: sin eso, el pliego recién subido no
 * se vería en ella hasta 12 horas después.
 *
 * Exigen sesión, como antes exigía /pliego vía PROTECTED_PREFIXES. La política
 * declara `pliego_extraer` como `pro`, pero hoy toda cuenta es `gratis`
 * (CLAUDE.md §4): aplicar esa frontera aquí apagaría la subida para todos.
 *
 * No tienen test directo — mismo criterio que saveMinimoPerfilAction en
 * src/lib/oferente/actions.ts; la lógica vive en pliego-upload.ts.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { proceso } from "@/src/lib/db/schema";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { uploadPliego } from "./pliego-upload";
import { idDesdeSlug, slugDeProceso } from "./slug";

/** Revalida la ficha de un proceso a partir de su id de SECOP. */
async function revalidarFicha(secopProcesoId: string): Promise<void> {
  const [fila] = await db
    .select({ objeto: proceso.objeto })
    .from(proceso)
    .where(and(eq(proceso.secopProcesoId, secopProcesoId), isNull(proceso.deletedAt)))
    .limit(1);
  if (fila) revalidatePath(`/licitaciones/${slugDeProceso(fila.objeto, secopProcesoId)}`);
}

/** El Formulario 1 es opcional: un campo vacío equivale a no mandarlo. */
async function formulario1De(formData: FormData): Promise<Buffer | undefined> {
  const f = formData.get("formulario1");
  return f instanceof Blob && f.size > 0 ? Buffer.from(await f.arrayBuffer()) : undefined;
}

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
    redirect(
      `/mis-coincidencias?pliego=error&pliegoDetalle=${encodeURIComponent(resultado.error)}`
    );
  }

  await revalidarFicha(procesoId);
  redirect("/mis-coincidencias?pliego=ok");
}

/**
 * Subida desde la §4 de la ficha. El slug viaja en el formulario solo para
 * volver a la ficha; el proceso se identifica por el id que el propio slug
 * contiene, así que un formulario manipulado no puede escribir el pliego de un
 * proceso en la ficha de otro.
 */
export async function subirPliegoDesdeFichaAction(formData: FormData): Promise<void> {
  const slug = formData.get("slug");
  const procesoId = typeof slug === "string" ? idDesdeSlug(slug) : null;
  if (typeof slug !== "string" || !procesoId) redirect("/licitaciones");

  const ficha = `/licitaciones/${slug}`;
  const volver = (estado: string) => redirect(`${ficha}#pliego=${encodeURIComponent(estado)}`);

  const user = await getSessionUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent(`${ficha}#pliego`)}`);

  const file = formData.get("file");
  if (!(file instanceof Blob) || file.size === 0) volver("error:Falta el PDF del pliego.");

  const resultado = await uploadPliego({
    procesoId,
    subidoPorUsuarioId: user.id,
    nombreArchivo: (file as File).name || "pliego.pdf",
    buffer: Buffer.from(await (file as Blob).arrayBuffer()),
    formulario1: await formulario1De(formData),
  });

  if (resultado.ok === false) volver(`error:${resultado.error}`);

  revalidatePath(ficha);
  volver("ok");
}
