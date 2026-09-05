/**
 * Recarga del historial sancionatorio (SDD Fase 3).
 *
 *   npm run al:sanciones
 *
 * Semanal. Son 2.262 filas: se recargan enteras, no incrementalmente.
 */

import "./_env";
import { recargarSanciones } from "@/src/lib/al/sanciones/ingesta";

async function main() {
  const r = await recargarSanciones();
  console.log(`✔ SECOP I:  ${r.secopI} registros`);
  console.log(`✔ SECOP II: ${r.secopII} registros`);
  console.log(`  cruces resueltos → proveedor: ${r.proveedoresResueltos} · proceso: ${r.procesosResueltos}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("✖", e instanceof Error ? e.message : e);
  process.exit(1);
});
