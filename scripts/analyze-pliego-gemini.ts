/**
 * Analizador de pliegos (Capa A) — CLI, ruta Gemini (gratis, sin tarjeta).
 *
 *   npm run analyze-pliego-gemini <ruta.pdf>
 *
 * Ver src/lib/pliego/extractPliegoGemini.ts. Requiere GEMINI_API_KEY en
 * .env.local (console gratis en https://aistudio.google.com/apikey).
 */

import "./_env";
import { extractPliegoGemini } from "@/src/lib/pliego/extractPliegoGemini";
import { validatePliego } from "@/src/lib/pliego/validate";

async function main(): Promise<void> {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    process.stderr.write("Uso: npm run analyze-pliego-gemini <ruta.pdf>\n");
    process.exit(1);
  }
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY no definida. Configúrala en .env.local.");
  }

  const t0 = Date.now();
  const extraction = await extractPliegoGemini(pdfPath);
  const validation = validatePliego(extraction);
  const ms = Date.now() - t0;

  process.stdout.write(JSON.stringify({ ...extraction, _validation: validation }, null, 2) + "\n");

  const estado = validation.ok
    ? "✓ consistente"
    : `✗ ${validation.inconsistencias.length} inconsistencia(s)`;
  const notas = validation.notas.length ? ` · ${validation.notas.length} nota(s)` : "";
  process.stderr.write(`\n${estado}${notas} · ${ms}ms\n`);
}

main().catch((e) => {
  process.stderr.write(`✖ ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
