/**
 * Analizador de pliegos (Capa A) — CLI, ruta Groq (gratis) en vez de Claude.
 *
 *   npm run analyze-pliego-groq <ruta.pdf>
 *
 * Mismo validador de consistencia que la ruta de Claude; ver
 * src/lib/pliego/extractPliegoGroq.ts para las diferencias (texto plano vía
 * pdftotext en vez de PDF nativo, sin JSON Schema constreñido por la API).
 *
 * Requiere GROQ_API_KEY en .env.local y `pdftotext` (poppler) instalado.
 */

import "./_env";
import { extractPliegoGroq } from "@/src/lib/pliego/extractPliegoGroq";
import { validatePliego } from "@/src/lib/pliego/validate";

async function main(): Promise<void> {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    process.stderr.write("Uso: npm run analyze-pliego-groq <ruta.pdf>\n");
    process.exit(1);
  }
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY no definida. Configúrala en .env.local.");
  }

  const t0 = Date.now();
  const extraction = await extractPliegoGroq(pdfPath);
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
