/**
 * Orquestador del extractor híbrido: reglas primero, LLM (Gemini) solo para lo
 * que las reglas no puedan resolver con confianza estructural.
 *
 * El Documento Base SIEMPRE pasa una vez por Gemini — es la única fuente de
 * `proceso`/`entidad`/`fechas`/`cronograma`/`verificacion`/`lagunas_pendientes`,
 * campos que viven en tablas que `pdftotext` destroza (ver
 * rules/parseDocumentoBase.ts) y que el parser de reglas no intenta. Lo que
 * las reglas SÍ resuelven (`reglas_presupuesto`, `requisitos_habilitantes` del
 * Documento Base; `capitulos` del Formulario 1 si se provee) sobreescribe el
 * resultado del LLM para esos campos — nunca al revés, y el Formulario 1
 * nunca se le manda al modelo.
 *
 * Ver docs/superpowers/specs/2026-08-08-pliego-extractor-hibrido-design.md.
 */

import { readFile } from "node:fs/promises";
import { parseDocumentoBaseTexto } from "./rules/parseDocumentoBase";
import { parseFormulario1Xls } from "./rules/parseFormulario1";
import { pdfToText } from "./rules/pdfToText";
import { ParseoNoConfiable } from "./rules/errors";
import { extractPliegoGemini } from "./extractPliegoGemini";
import { parsePliegoExtraction, type PliegoExtraction } from "./schema";

type CampoHibrido = "reglas_presupuesto" | "requisitos_habilitantes" | "capitulos";
type CampoOrigen = "reglas" | "llm";

export interface HybridExtraction {
  extraction: PliegoExtraction;
  /** De dónde vino cada campo que el parser de reglas puede llegar a cubrir. */
  origen: Record<CampoHibrido, CampoOrigen>;
}

export interface ExtractPliegoHybridOptions {
  /** Formulario 1 (.xls/.xlsx) — opcional. Sin él, `capitulos` siempre viene del LLM. */
  formulario1?: string | Buffer;
  geminiApiKey?: string;
}

export async function extractPliegoHybrid(
  documentoBasePdf: string | Buffer,
  opts: ExtractPliegoHybridOptions = {}
): Promise<HybridExtraction> {
  const documentoBaseBuffer = Buffer.isBuffer(documentoBasePdf)
    ? documentoBasePdf
    : await readFile(documentoBasePdf);

  const base = await extractPliegoGemini(documentoBaseBuffer, { apiKey: opts.geminiApiKey });

  const origen: HybridExtraction["origen"] = {
    reglas_presupuesto: "llm",
    requisitos_habilitantes: "llm",
    capitulos: "llm",
  };

  let reglas_presupuesto = base.reglas_presupuesto;
  let requisitos_habilitantes = base.requisitos_habilitantes;
  try {
    const texto = await pdfToText(documentoBaseBuffer);
    const reglas = parseDocumentoBaseTexto(texto);
    reglas_presupuesto = reglas.reglas_presupuesto;
    requisitos_habilitantes = reglas.requisitos_habilitantes;
    origen.reglas_presupuesto = "reglas";
    origen.requisitos_habilitantes = "reglas";
  } catch (e) {
    if (!(e instanceof ParseoNoConfiable)) throw e;
    // Documento Base sin la estructura esperada (probablemente escaneado): se
    // queda con lo que ya trajo el LLM para estos dos campos.
  }

  let capitulos = base.capitulos;
  if (opts.formulario1) {
    try {
      const xlsBuffer = Buffer.isBuffer(opts.formulario1)
        ? opts.formulario1
        : await readFile(opts.formulario1);
      capitulos = await parseFormulario1Xls(xlsBuffer);
      origen.capitulos = "reglas";
    } catch (e) {
      if (!(e instanceof ParseoNoConfiable)) throw e;
      // Excel con columnas distintas a las esperadas: se queda con lo que trajo
      // el LLM para el Documento Base (probablemente vacío, ver docstring).
    }
  }

  const extraction = parsePliegoExtraction({
    ...base,
    reglas_presupuesto,
    requisitos_habilitantes,
    capitulos,
  });

  return { extraction, origen };
}
