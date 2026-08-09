/**
 * Analizador de pliegos (Capa A) — CLI, ruta híbrida (reglas + fallback Gemini).
 *
 *   npm run analyze-pliego-hybrid <documento-base.pdf> [--formulario1 <xls>]
 *
 * Ver src/lib/pliego/extractPliegoHybrid.ts. Requiere GEMINI_API_KEY en
 * .env.local (el LLM siempre corre al menos una vez, para la metadata que
 * las reglas no cubren) y `pdftotext` (poppler) instalado.
 */

import "./_env";
import { extractPliegoHybrid } from "@/src/lib/pliego/extractPliegoHybrid";
import { validatePliego } from "@/src/lib/pliego/validate";

function parseArgs(argv: string[]): { documentoBase: string; formulario1?: string } {
  const documentoBase = argv[0];
  const flagIdx = argv.indexOf("--formulario1");
  const formulario1 = flagIdx !== -1 ? argv[flagIdx + 1] : undefined;
  return { documentoBase, formulario1 };
}

async function main(): Promise<void> {
  const { documentoBase, formulario1 } = parseArgs(process.argv.slice(2));
  if (!documentoBase) {
    process.stderr.write(
      "Uso: npm run analyze-pliego-hybrid <documento-base.pdf> [--formulario1 <xls>]\n"
    );
    process.exit(1);
  }
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY no definida. Configúrala en .env.local.");
  }

  const t0 = Date.now();
  const { extraction, origen } = await extractPliegoHybrid(documentoBase, { formulario1 });
  const validation = validatePliego(extraction);
  const ms = Date.now() - t0;

  process.stdout.write(
    JSON.stringify({ ...extraction, _validation: validation, _origen: origen }, null, 2) + "\n"
  );

  const estado = validation.ok
    ? "✓ consistente"
    : `✗ ${validation.inconsistencias.length} inconsistencia(s)`;
  const notas = validation.notas.length ? ` · ${validation.notas.length} nota(s)` : "";
  const origenResumen = Object.entries(origen)
    .map(([campo, o]) => `${campo}=${o}`)
    .join(" · ");
  process.stderr.write(`\n${estado}${notas} · ${ms}ms\n${origenResumen}\n`);
}

main().catch((e) => {
  process.stderr.write(`✖ ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
