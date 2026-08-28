// app/api/documents/upload/route.ts

/**
 * POST /api/documents/upload — sube un PDF (contrato o referencia, según el
 * `context`) para uno de los asistentes. Mismo gate tipo MIME + magic bytes
 * + tope de tamaño que /api/pliego/extract, antes de gastar tiempo en
 * extracción y subida a Storage.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { uploadDocument, DocumentUploadError } from "@/src/lib/assistants/documents";
import { getAssistantContext } from "@/src/lib/assistants/config";
import { isPdfBuffer, MAX_BYTES_PDF as MAX_BYTES } from "@/src/lib/pliego/validate";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Body inválido: se espera multipart/form-data." },
      { status: 400 }
    );
  }

  const contextSlug = formData.get("context");
  const context = typeof contextSlug === "string" ? getAssistantContext(contextSlug) : null;
  if (!context) {
    return NextResponse.json({ error: "Falta `context` o es inválido." }, { status: 400 });
  }
  if (!context.documento) {
    return NextResponse.json(
      { error: `El contexto ${contextSlug} no acepta documentos.` },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Falta el archivo `file`." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "El archivo está vacío." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `El archivo supera el máximo de ${MAX_BYTES / (1024 * 1024)}MB.` },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!isPdfBuffer(buffer)) {
    return NextResponse.json(
      { error: "El archivo no es un PDF válido (no empieza con %PDF-)." },
      { status: 400 }
    );
  }

  const nombreArchivo = file instanceof File ? file.name : "documento.pdf";

  try {
    const { id, textoExtraido } = await uploadDocument({
      usuarioId: user.id,
      contexto: context.slug,
      tipo: context.documento.tipo,
      file: buffer,
      nombreArchivo,
    });
    return NextResponse.json({ documentId: id, preview: textoExtraido.slice(0, 500) });
  } catch (e) {
    const message =
      e instanceof DocumentUploadError ? e.message : "No se pudo procesar el documento.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
