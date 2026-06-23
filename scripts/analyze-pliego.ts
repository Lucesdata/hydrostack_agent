/**
 * Analizador de pliegos (Capa A) — CLI.
 *
 *   npm run analyze-pliego <ruta.pdf>
 *
 * Lee un PDF de pliego, extrae la estructura del presupuesto vía Claude, corre
 * el validador de consistencia e imprime el JSON resultante (con `_validation`).
 *
 * Requiere ANTHROPIC_API_KEY en .env.local. El PDF lo descarga el usuario
 * manualmente de SECOP II (los anexos solo salen del SPA autenticado).
 */

import './_env';
import { extractPliego, validatePliego } from '@/src/lib/pliego';

async function main(): Promise<void> {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    process.stderr.write('Uso: npm run analyze-pliego <ruta.pdf>\n');
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY no definida. Configúrala en .env.local.');
  }

  const t0 = Date.now();
  const extraction = await extractPliego(pdfPath);
  const validation = validatePliego(extraction);
  const ms = Date.now() - t0;

  process.stdout.write(JSON.stringify({ ...extraction, _validation: validation }, null, 2) + '\n');

  const estado = validation.ok
    ? '✓ consistente'
    : `✗ ${validation.inconsistencias.length} inconsistencia(s)`;
  const notas = validation.notas.length ? ` · ${validation.notas.length} nota(s)` : '';
  process.stderr.write(`\n${estado}${notas} · ${ms}ms\n`);
}

main().catch((e) => {
  process.stderr.write(`✖ ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
