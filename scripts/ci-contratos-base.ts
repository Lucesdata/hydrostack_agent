/**
 * CI-07 — línea base y cambios de contrato, ejecutable a mano.
 *
 *   npm run contratos:base-cambios -- --dry-run     # cuenta, no escribe
 *   npm run contratos:base-cambios                  # siembra y detecta
 *   npm run contratos:base-cambios -- --lote=500 --max-mb=40
 *
 * Requiere las migraciones 0027/0028 aplicadas en la base de DATABASE_URL: NO
 * las apliques en la base viva sin autorización. No está conectado al cron.
 * La primera corrida siembra ~40.000 filas (por lotes y vigilando el tamaño).
 */
import "./_env";
import { correrBaseCambiosContratos } from "@/src/lib/contratos/base-cambios";

function numero(nombre: string): number | undefined {
  const a = process.argv.slice(2).find((x) => x.startsWith(`--${nombre}=`));
  return a ? Number(a.split("=")[1]) : undefined;
}

async function main() {
  const dryRun = process.argv.slice(2).includes("--dry-run");
  const r = await correrBaseCambiosContratos({
    dryRun,
    lote: numero("lote"),
    maxCrecimientoMb: numero("max-mb"),
  });
  console.log(`${dryRun ? "[dry-run] " : ""}evaluados: ${r.evaluados}`);
  console.log(`  línea base sembrada:    ${r.sembrados}`);
  console.log(`  contratos con cambios:  ${r.contratosConCambios}`);
  console.log(`  cambios detectados:     ${r.cambiosDetectados}`);
  console.log(`  filas podadas:          ${r.podados}`);
  for (const e of r.etapas)
    console.log(`  etapa ${e.nombre.padEnd(10)} ${e.ms} ms · ${e.filas} filas`);
  if (r.abortado) {
    console.error(`✖ Detenido: ${r.abortado}. Revisa el tamaño de la base antes de reanudar.`);
    process.exit(2);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("✖", e instanceof Error ? e.message : e);
  process.exit(1);
});
