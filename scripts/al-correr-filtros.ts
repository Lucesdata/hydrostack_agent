/**
 * Corrida del motor de filtros (SDD Fase 4).
 *
 *   npm run al:filtros                 # solo procesos abiertos
 *   npm run al:filtros -- --todos      # cualquier estado
 *
 * Es lo que invocará la etapa correspondiente del despachador `tick` (V-F-5:
 * plan Hobby, 2 crons y ambos ocupados). Vive como script para poder ejecutarlo
 * a mano y ver el reparto entre coincidencias y descartes.
 */

import "./_env";
import { correrFiltrosActivos } from "@/src/lib/al/matching/correr-filtros";
import { podarDescartes, DIAS_RETENCION } from "@/src/lib/al/matching/registrar-descartes";

async function main() {
  const todos = process.argv.includes("--todos");
  const r = await correrFiltrosActivos(todos ? { estado: null, limit: 5000 } : {});

  console.log(`Filtros activos: ${r.filtros}`);
  for (const f of r.porFiltro) {
    console.log(
      `  "${f.nombre}" → candidatos ${f.candidatos} · coincidencias ${f.coincidencias} · descartes ${f.descartes}`
    );
  }
  console.log(`Total: ${r.coincidencias} coincidencias, ${r.descartes} descartes`);

  const podados = await podarDescartes();
  if (podados > 0) console.log(`Poda de retención (${DIAS_RETENCION} días): ${podados} filas`);

  process.exit(0);
}

main().catch((e) => {
  console.error("✖", e instanceof Error ? e.message : e);
  process.exit(1);
});
