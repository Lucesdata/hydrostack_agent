// src/lib/secop/pliego-upload.ts

/**
 * Lógica pura de la subida manual de pliego (puente captcha→upload):
 * valida el PDF (y el Formulario 1 si llega), extrae con el extractor
 * híbrido y persiste el resultado en pliego_proceso (upsert por procesoId —
 * el pliego de un proceso es el mismo documento público para cualquier
 * usuario que lo suba). Los wrappers `"use server"` viven en pliego-actions.ts.
 *
 * Después estructura los requisitos habilitantes y los cachea en
 * `requisitos_proceso`, que es lo que alimenta la compuerta de habilitación del
 * semáforo (POST /api/secop/verdict). Antes ese paso era manual: un botón de
 * /pliego llamaba a /api/eligibility/extract, y casi nadie lo pulsaba. Si falla,
 * el pliego ya está guardado y la subida sigue siendo un éxito: la compuerta
 * vuelve a su UNKNOWN de siempre.
 */

import { isPdfBuffer, MAX_BYTES_PDF, MAX_BYTES_XLS } from "@/src/lib/pliego/validate";
import { extractPliegoHybrid, type HybridExtraction } from "@/src/lib/pliego/extractPliegoHybrid";
import { validatePliego } from "@/src/lib/pliego/validate";
import { db } from "@/src/lib/db/client";
import { pliegoProceso } from "@/src/lib/db/schema/pliego";
import { requisitosProceso } from "@/src/lib/db/schema/eligibility";
import { extractStructuredRequirements } from "@/src/lib/eligibility/extract-requirements";
import { NO_ENCONTRADO, type RequisitosHabilitantes } from "@/src/lib/pliego/schema";
import { recordUserSignal } from "@/src/lib/signals/record-signal";

export interface UploadPliegoParams {
  procesoId: string;
  subidoPorUsuarioId: string;
  nombreArchivo: string;
  buffer: Buffer;
  /** Formulario 1 de presupuesto (.xls/.xlsx). Sin él, los capítulos salen del modelo. */
  formulario1?: Buffer;
}

export type UploadPliegoResult =
  { ok: true; gateMatematicoPasado: boolean } | { ok: false; error: string };

export async function uploadPliego(params: UploadPliegoParams): Promise<UploadPliegoResult> {
  if (!isPdfBuffer(params.buffer)) {
    return { ok: false, error: "El archivo no es un PDF válido (no empieza con %PDF-)." };
  }
  if (params.buffer.byteLength > MAX_BYTES_PDF) {
    return {
      ok: false,
      error: `El archivo supera el máximo de ${MAX_BYTES_PDF / (1024 * 1024)}MB.`,
    };
  }

  if (params.formulario1 && params.formulario1.byteLength > MAX_BYTES_XLS) {
    return {
      ok: false,
      error: `El Formulario 1 supera el máximo de ${MAX_BYTES_XLS / (1024 * 1024)}MB.`,
    };
  }

  let result: HybridExtraction;
  try {
    result = await extractPliegoHybrid(params.buffer, { formulario1: params.formulario1 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Extracción falló: ${message}` };
  }
  const { extraction, origen } = result;

  const validation = validatePliego(extraction);

  await db
    .insert(pliegoProceso)
    .values({
      procesoId: params.procesoId,
      subidoPorUsuarioId: params.subidoPorUsuarioId,
      nombreArchivo: params.nombreArchivo,
      extraction,
      validation,
      origen,
      gateMatematicoPasado: validation.ok,
    })
    .onConflictDoUpdate({
      target: pliegoProceso.procesoId,
      set: {
        subidoPorUsuarioId: params.subidoPorUsuarioId,
        nombreArchivo: params.nombreArchivo,
        extraction,
        validation,
        origen,
        gateMatematicoPasado: validation.ok,
        updatedAt: new Date(),
      },
    });

  await cachearRequisitos(params.procesoId, extraction.requisitos_habilitantes);
  await recordUserSignal(params.subidoPorUsuarioId, "estructurador");

  return { ok: true, gateMatematicoPasado: validation.ok };
}

/**
 * Estructura los requisitos habilitantes y los deja en `requisitos_proceso`.
 * Si el pliego no declara ninguno, no se llama al modelo: no hay nada que
 * estructurar. Un fallo se registra y no se propaga (ver el comentario del
 * archivo).
 */
async function cachearRequisitos(procesoId: string, req: RequisitosHabilitantes): Promise<void> {
  const declarados = [
    req.experiencia_especifica,
    req.capacidad_financiera,
    req.capacidad_organizacional,
  ].some((v) => v !== NO_ENCONTRADO);
  if (!declarados) return;

  try {
    const requisitos = await extractStructuredRequirements(req);
    await db
      .insert(requisitosProceso)
      .values({ procesoId, requisitos })
      .onConflictDoUpdate({
        target: requisitosProceso.procesoId,
        set: { requisitos, extraidoEn: new Date() },
      });
  } catch (e) {
    console.warn(
      `[pliego-upload] requisitos sin estructurar para ${procesoId}: ${
        e instanceof Error ? e.message : String(e)
      }`
    );
  }
}
