/**
 * La distribución real de procesos abiertos por departamento. Es la medición
 * que cerró los cortes del color del mapa (`src/lib/mapa/escala.ts`): 5.155 en
 * Antioquia, 1 en Vichada, mediana en 643 — y el empate de 708 entre Tolima y
 * Quindío, que es lo que descartó los cuantiles.
 *
 *   npx tsx scripts/exploration/medir-departamentos.ts
 */
import "../_env";
import { agregadosPortada } from "@/src/lib/secop/agregados";

async function main() {
  const a = await agregadosPortada();
  console.log("total abiertos:", a.totalAbiertos, "| deptos con datos:", a.departamentos.length);
  const suma = a.departamentos.reduce((n, f) => n + f.n, 0);
  console.log("localizados:", suma, "| unlocated:", a.totalAbiertos - suma);
  for (const f of a.departamentos) console.log(f.clave, String(f.n).padStart(6), f.slug);
  process.exit(0);
}
main();
