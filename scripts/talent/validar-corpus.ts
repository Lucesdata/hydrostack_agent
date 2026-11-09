/**
 * Ensayo local/manual del corpus FINDETER. No descarga PDFs ni publica datos.
 *
 * Uso:
 * npx tsx scripts/talent/validar-corpus.ts rutas-locales.json
 *
 * rutas-locales.json: {"PAF-ATF-O-004-2019":"/ruta/archivo.pdf", ...}
 *
 * Solo emite contadores y motivos de revisión: ni citas completas ni CV.
 */
import { readFile } from "node:fs/promises";
import { CORPUS_TALENT_V0 } from "../../src/lib/talent-intelligence/validation-corpus";
import { extraerRequisitosPersonalPdfParaRevision } from "../../src/lib/talent-intelligence/pdf-requirements";

async function main(): Promise<void> {
  const archivoRutas = process.argv[2];
  if (!archivoRutas) {
    throw new Error("Especifique un archivo JSON con rutas locales a PDFs");
  }
  const rutas: unknown = JSON.parse(await readFile(archivoRutas, "utf8"));
  if (!rutas || typeof rutas !== "object" || Array.isArray(rutas)) {
    throw new Error("El archivo de rutas debe ser un objeto JSON");
  }

  const rutasPorId = rutas as Record<string, unknown>;
  const salida: Array<{
    expediente: string;
    estado: string;
    requisitosDetectados?: number;
    marcadosComoTabla?: number;
    conMultiplesProfesiones?: number;
    error?: string;
  }> = [];

  for (const caso of CORPUS_TALENT_V0) {
    const ruta = rutasPorId[caso.id];
    if (typeof ruta !== "string" || !ruta.trim()) {
      salida.push({ expediente: caso.id, estado: "sin_pdf_local" });
      continue;
    }

    try {
      const pdf = await readFile(ruta);
      if (pdf.length > 50_000_000 || pdf.subarray(0, 4).toString() !== "%PDF") {
        throw new Error("Archivo PDF inválido o demasiado grande");
      }
      const requisitos = await extraerRequisitosPersonalPdfParaRevision(caso.id, pdf);
      salida.push({
        expediente: caso.id,
        estado: "requiere_revision_humana",
        requisitosDetectados: requisitos.length,
        marcadosComoTabla: requisitos.filter((r) => r.motivosRevision.includes("tabla_probable"))
          .length,
        conMultiplesProfesiones: requisitos.filter((r) =>
          r.motivosRevision.includes("cargos_multiples")
        ).length,
      });
    } catch (error) {
      salida.push({
        expediente: caso.id,
        estado: "error_extraccion",
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }
  // No imprimir identificadores personales ni fragmentos del documento.
  process.stdout.write(JSON.stringify(salida, null, 2) + "\n");
}

main().catch((error: unknown) => {
  process.stderr.write(
    error instanceof Error ? error.message + "\n" : "Falló la validación del corpus\n"
  );
  process.exitCode = 1;
});
