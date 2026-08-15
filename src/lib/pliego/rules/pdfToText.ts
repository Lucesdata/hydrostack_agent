/**
 * PDF (path o Buffer) → texto plano vía `pdftotext -layout` (poppler).
 * Usado por extractPliegoHybrid.ts para el parser de reglas. `-layout`
 * conserva mejor la posición de columnas que el modo por defecto, aunque
 * tablas anchas igual quedan mezcladas línea por línea (ver
 * parseDocumentoBase.ts para el detalle de qué texto sí es confiable).
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

export async function pdfToText(pdf: string | Buffer): Promise<string> {
  if (typeof pdf === "string") return runPdftotext(pdf);

  const dir = await mkdtemp(join(tmpdir(), "pliego-"));
  const tmpPath = join(dir, "input.pdf");
  try {
    await writeFile(tmpPath, pdf);
    return await runPdftotext(tmpPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function runPdftotext(path: string): Promise<string> {
  const { stdout } = await execFileAsync("pdftotext", ["-layout", path, "-"], {
    maxBuffer: 1024 * 1024 * 50,
  });
  if (!stdout.trim()) {
    throw new Error("pdftotext no extrajo texto — ¿el PDF es un escaneo sin OCR?");
  }
  return stdout;
}
