// src/lib/secop/pliego-upload.ts

/**
 * Lógica pura de la subida manual de pliego (puente captcha→upload):
 * valida el PDF, extrae con el mismo extractor híbrido que
 * /api/pliego/extract, y persiste el resultado en pliego_proceso (upsert
 * por procesoId — el pliego de un proceso es el mismo documento público
 * para cualquier usuario que lo suba). El wrapper `"use server"` que llama
 * a esto vive en pliego-actions.ts.
 */

import { isPdfBuffer, MAX_BYTES_PDF } from "@/src/lib/pliego/validate";
import { extractPliegoHybrid, type HybridExtraction } from "@/src/lib/pliego/extractPliegoHybrid";
import { validatePliego } from "@/src/lib/pliego/validate";
import { db } from "@/src/lib/db/client";
import { pliegoProceso } from "@/src/lib/db/schema/pliego";
import { recordUserSignal } from "@/src/lib/signals/record-signal";

export interface UploadPliegoParams {
  procesoId: string;
  subidoPorUsuarioId: string;
  nombreArchivo: string;
  buffer: Buffer;
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

  let result: HybridExtraction;
  try {
    result = await extractPliegoHybrid(params.buffer, {});
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

  await recordUserSignal(params.subidoPorUsuarioId, "estructurador");

  return { ok: true, gateMatematicoPasado: validation.ok };
}
