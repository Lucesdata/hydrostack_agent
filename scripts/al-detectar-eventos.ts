/**
 * Detector de eventos de proceso (SDD Fase 5), ejecutable a mano.
 *
 *   npm run al:eventos
 *   npm run al:eventos -- --ventana=7
 *
 * En producción corre como etapa de `/api/cron/tick`; este script existe para
 * verlo trabajar y para la primera siembra de la línea base.
 */

import "./_env";
import { correrDeteccionEventos } from "@/src/lib/al/eventos/correr";

async function main() {
  const a = process.argv.slice(2).find((x) => x.startsWith("--ventana="));
  const ventanaDias = a ? Number(a.split("=")[1]) : undefined;

  const r = await correrDeteccionEventos({ ventanaDias });
  console.log(`evaluados: ${r.evaluados}`);
  console.log(`  apertura:      ${r.apertura}`);
  console.log(`  adenda:        ${r.adenda}`);
  console.log(`  adjudicacion:  ${r.adjudicacion}`);
  console.log(`  línea base sembrada en silencio: ${r.lineaBaseSembrada}`);
  console.log(`  seguimiento liberado (terminales): ${r.seguimientoLiberado}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("✖", e instanceof Error ? e.message : e);
  process.exit(1);
});
