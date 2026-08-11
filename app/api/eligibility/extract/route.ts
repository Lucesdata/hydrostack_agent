/**
 * Route handler: POST /api/eligibility/extract
 *
 * Estructura los requisitos_habilitantes de una extracción de pliego YA
 * hecha (por /api/pliego/extract — único extractor, CLAUDE.md §2) y los
 * cachea por proceso en `requisitos_proceso`. No abre PDFs ni llama a
 * Gemini con documentos: recibe la extracción como body.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/db/client";
import { requisitosProceso } from "@/src/lib/db/schema/eligibility";
import { extractStructuredRequirements } from "@/src/lib/eligibility/extract-requirements";
import type { PliegoExtraction } from "@/src/lib/pliego/schema";

export const runtime = "nodejs";

interface Body {
  procesoId?: string;
  extraction?: PliegoExtraction;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.procesoId || typeof body.procesoId !== "string") {
    return NextResponse.json({ error: "Falta procesoId" }, { status: 400 });
  }
  if (!body.extraction?.requisitos_habilitantes) {
    return NextResponse.json({ error: "Falta extraction.requisitos_habilitantes" }, { status: 400 });
  }

  try {
    const requisitos = await extractStructuredRequirements(body.extraction.requisitos_habilitantes);
    await db
      .insert(requisitosProceso)
      .values({ procesoId: body.procesoId, requisitos })
      .onConflictDoUpdate({
        target: requisitosProceso.procesoId,
        set: { requisitos, extraidoEn: new Date() },
      });
    return NextResponse.json({ requisitos });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Estructuración falló: ${message}` }, { status: 502 });
  }
}
