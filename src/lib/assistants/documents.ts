// src/lib/assistants/documents.ts

/**
 * Sube un documento (contrato o referencia) al bucket privado 'contracts' de
 * Supabase Storage, extrae su texto con el mismo extractor que ya usa
 * /api/pliego/extract (pdfToText.ts, poppler), y guarda la fila en
 * `documento`. El upload usa el cliente Supabase atado a la sesión del
 * usuario (createClient() de src/lib/supabase/server.ts) — las policies RLS
 * del bucket (ver Task 16, pasos manuales) filtran por auth.uid(), a
 * diferencia de las tablas de Neon donde esa comparación nunca aplicaría.
 */

import { randomUUID } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/src/lib/db/client';
import { documento } from '@/src/lib/db/schema/asistentes';
import { createClient } from '@/src/lib/supabase/server';
import { pdfToText } from '@/src/lib/pliego/rules/pdfToText';
import type { AssistantContextSlug } from './config';

const BUCKET = 'contracts';
/** Tope defensivo para no exceder la ventana de contexto del modelo con un PDF muy largo. */
const MAX_PROMPT_CHARS = 400_000;

export class DocumentUploadError extends Error {}

export interface UploadedDocument {
  id: string;
  textoExtraido: string;
}

export async function uploadDocument(params: {
  usuarioId: string;
  contexto: AssistantContextSlug;
  tipo: 'contrato' | 'referencia';
  file: Buffer;
  nombreArchivo: string;
}): Promise<UploadedDocument> {
  const { usuarioId, contexto, tipo, file, nombreArchivo } = params;

  let textoExtraido: string;
  try {
    textoExtraido = await pdfToText(file);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new DocumentUploadError(`No se pudo leer el texto del PDF: ${message}`);
  }

  const supabase = await createClient();
  const rutaStorage = `${usuarioId}/${contexto}/${randomUUID()}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(rutaStorage, file, { contentType: 'application/pdf' });
  if (uploadError) {
    throw new DocumentUploadError(`No se pudo guardar el archivo: ${uploadError.message}`);
  }

  let row: { id: string };
  try {
    [row] = await db
      .insert(documento)
      .values({ usuarioId, contexto, tipo, nombreArchivo, rutaStorage, textoExtraido })
      .returning({ id: documento.id });
  } catch (e) {
    await supabase.storage.from(BUCKET).remove([rutaStorage]).catch(() => {});
    const message = e instanceof Error ? e.message : String(e);
    throw new DocumentUploadError(`No se pudo guardar el documento: ${message}`);
  }

  return { id: row.id, textoExtraido };
}

interface DocumentForAssistant {
  nombreArchivo: string;
  textoExtraido: string;
}

function truncateForPrompt(doc: DocumentForAssistant): DocumentForAssistant {
  if (doc.textoExtraido.length <= MAX_PROMPT_CHARS) return doc;
  return { ...doc, textoExtraido: doc.textoExtraido.slice(0, MAX_PROMPT_CHARS) };
}

export async function getLatestDocument(
  usuarioId: string,
  contexto: AssistantContextSlug,
): Promise<DocumentForAssistant | null> {
  const rows = await db
    .select({ nombreArchivo: documento.nombreArchivo, textoExtraido: documento.textoExtraido })
    .from(documento)
    .where(and(eq(documento.usuarioId, usuarioId), eq(documento.contexto, contexto)))
    .orderBy(desc(documento.creadoEn))
    .limit(1);
  return rows[0] ? truncateForPrompt(rows[0]) : null;
}

export async function getDocumentById(
  usuarioId: string,
  documentId: string,
): Promise<DocumentForAssistant | null> {
  const rows = await db
    .select({ nombreArchivo: documento.nombreArchivo, textoExtraido: documento.textoExtraido })
    .from(documento)
    .where(and(eq(documento.usuarioId, usuarioId), eq(documento.id, documentId)))
    .limit(1);
  return rows[0] ? truncateForPrompt(rows[0]) : null;
}
