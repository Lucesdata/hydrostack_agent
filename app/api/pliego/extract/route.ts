/**
 * Route handler: POST /api/pliego/extract
 *
 * Primer cableado real de la extracción de pliegos (Hydro_Agent Capa 3) al
 * producto: hasta ahora `extractPliego()` solo se invocaba desde el CLI
 * (scripts/analyze-pliego.ts). Este endpoint recibe un PDF subido a mano
 * (multipart/form-data, campo `file`) y ejecuta el mismo camino: extracción
 * vía Claude + validador de consistencia determinístico.
 *
 * No hay URL de SECOP que probar aquí (el archivo lo trae el usuario, no lo
 * trae la ingesta), así que el gate de `document-access.ts` no aplica tal
 * cual — ese módulo resuelve PUBLIC/RESTRICTED/NOT_PUBLISHED/UNKNOWN sobre
 * una URL en vivo. El gate equivalente para un upload manual es más simple:
 * tipo MIME + magic bytes `%PDF-` + tope de tamaño, antes de gastar una
 * llamada a Opus con thinking adaptativo.
 */

import { NextRequest, NextResponse } from "next/server";
import { extractPliego } from "@/src/lib/pliego/extractPliego";
import { validatePliego } from "@/src/lib/pliego/validate";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES = 20 * 1024 * 1024; // 20MB — margen cómodo bajo el límite de request de la API de Anthropic tras base64.
const PDF_MAGIC = "%PDF-";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY no configurada en el servidor." },
      { status: 500 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Body inválido: se espera multipart/form-data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Falta el archivo `file` (PDF)." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "El archivo está vacío." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `El archivo supera el máximo de ${MAX_BYTES / (1024 * 1024)}MB.` },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const looksLikePdf =
    buffer.subarray(0, PDF_MAGIC.length).toString("ascii") === PDF_MAGIC;
  if (!looksLikePdf) {
    return NextResponse.json(
      { error: "El archivo no es un PDF válido (no empieza con %PDF-)." },
      { status: 400 },
    );
  }

  try {
    const extraction = await extractPliego(buffer);
    const validation = validatePliego(extraction);
    return NextResponse.json({ extraction, validation });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Extracción falló: ${message}` }, { status: 502 });
  }
}
