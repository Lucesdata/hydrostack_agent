/**
 * Route handler: POST /api/pliego/extract
 *
 * Cableado real de la extracción de pliegos (Hydro_Agent Capa 3) al producto.
 * Recibe el Documento Base (multipart/form-data, campo `file`) y, opcional,
 * el Formulario 1 de presupuesto (campo `formulario1`, .xls/.xlsx) — ejecuta
 * el extractor híbrido: reglas primero, Gemini solo para lo que las reglas no
 * resuelven con confianza estructural (ver extractPliegoHybrid.ts).
 *
 * Usa Gemini y no Claude: no requiere crédito pagado de Anthropic para
 * funcionar. Si más adelante se quiere la ruta de mayor calidad (Opus,
 * `extractPliego.ts`), es un swap de una línea.
 *
 * No hay URL de SECOP que probar aquí (el archivo lo trae el usuario, no lo
 * trae la ingesta), así que el gate de `document-access.ts` no aplica tal
 * cual — ese módulo resuelve PUBLIC/RESTRICTED/NOT_PUBLISHED/UNKNOWN sobre
 * una URL en vivo. El gate equivalente para un upload manual es más simple:
 * tipo MIME + magic bytes `%PDF-` + tope de tamaño, antes de gastar una
 * llamada al modelo.
 */

import { NextRequest, NextResponse } from "next/server";
import { extractPliegoHybrid } from "@/src/lib/pliego/extractPliegoHybrid";
import { validatePliego } from "@/src/lib/pliego/validate";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { recordUserSignal } from "@/src/lib/signals/record-signal";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES_PDF = 20 * 1024 * 1024; // 20MB — margen cómodo bajo el límite de request de la API de Gemini tras base64.
const MAX_BYTES_XLS = 10 * 1024 * 1024;
const PDF_MAGIC = "%PDF-";

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY no configurada en el servidor." },
      { status: 500 }
    );
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

  const file = formData.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json(
      { error: "Falta el archivo `file` (Documento Base, PDF)." },
      { status: 400 }
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "El archivo está vacío." }, { status: 400 });
  }
  if (file.size > MAX_BYTES_PDF) {
    return NextResponse.json(
      { error: `El archivo supera el máximo de ${MAX_BYTES_PDF / (1024 * 1024)}MB.` },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const looksLikePdf = buffer.subarray(0, PDF_MAGIC.length).toString("ascii") === PDF_MAGIC;
  if (!looksLikePdf) {
    return NextResponse.json(
      { error: "El archivo no es un PDF válido (no empieza con %PDF-)." },
      { status: 400 }
    );
  }

  let formulario1Buffer: Buffer | undefined;
  const formulario1 = formData.get("formulario1");
  if (formulario1 instanceof Blob && formulario1.size > 0) {
    if (formulario1.size > MAX_BYTES_XLS) {
      return NextResponse.json(
        { error: `El Formulario 1 supera el máximo de ${MAX_BYTES_XLS / (1024 * 1024)}MB.` },
        { status: 413 }
      );
    }
    formulario1Buffer = Buffer.from(await formulario1.arrayBuffer());
  }

  try {
    const { extraction, origen } = await extractPliegoHybrid(buffer, {
      formulario1: formulario1Buffer,
    });
    const validation = validatePliego(extraction);
    const user = await getSessionUser();
    if (user) {
      await recordUserSignal(user.id, "estructurador");
    }
    return NextResponse.json({ extraction, validation, origen });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Extracción falló: ${message}` }, { status: 502 });
  }
}
