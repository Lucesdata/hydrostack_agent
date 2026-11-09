/**
 * Spike CI-02 — cuánta señal tecnológica hay en el texto corto de SECOP.
 *
 * Solo lectura y sin base de datos: corre el clasificador de `src/lib/tecnologia`
 * sobre un archivo JSON (arreglo de objetos) y reporta cobertura. Su objetivo es
 * dar el número del go/no-go del producto B (decisión D5): ¿alcanza el `objeto`
 * de un contrato para inferir necesidades de suministro?
 *
 * Uso:
 *   npx tsx scripts/tecnologia-spike.ts samples/contratos.json objeto_del_contrato [campo_id]
 */
import { readFileSync } from "node:fs";
import { clasificarTecnologia } from "../src/lib/tecnologia/clasificador";
import { NODO_POR_CODIGO } from "../src/lib/tecnologia/taxonomia-v1";

const [ruta, campo, campoId] = process.argv.slice(2);
if (!ruta || !campo) {
  console.error("Uso: tecnologia-spike.ts <archivo.json> <campo_texto> [campo_id]");
  process.exit(1);
}

const filas = JSON.parse(readFileSync(ruta, "utf8")) as Record<string, unknown>[];
let conTexto = 0;
let conCandidato = 0;
let conBien = 0;
let conNegado = 0;
const porNodo = new Map<string, number>();
const ejemplos: string[] = [];

for (const fila of filas) {
  const texto = typeof fila[campo] === "string" ? (fila[campo] as string) : "";
  if (!texto.trim()) continue;
  conTexto++;
  const r = clasificarTecnologia(texto);
  if (r.descartados.length > 0) conNegado++;
  if (r.candidatos.length === 0) continue;
  conCandidato++;
  let hayBien = false;
  for (const c of r.candidatos) {
    porNodo.set(c.codigo, (porNodo.get(c.codigo) ?? 0) + 1);
    if (NODO_POR_CODIGO[c.codigo].naturaleza !== "servicio") hayBien = true;
  }
  if (hayBien) conBien++;
  if (ejemplos.length < 12) {
    const id = campoId ? String(fila[campoId] ?? "") : "";
    ejemplos.push(
      `${id} [${r.candidatos.map((c) => `${c.codigo}:"${c.cita}"`).join(", ")}] ${texto.slice(0, 110)}`
    );
  }
}

const pct = (n: number) => (conTexto ? ((100 * n) / conTexto).toFixed(1) : "0") + " %";
console.log(`Archivo: ${ruta} · campo: ${campo}`);
console.log(`Filas con texto: ${conTexto}`);
console.log(`Con algún candidato: ${conCandidato} (${pct(conCandidato)})`);
console.log(`Con candidato de bien o mixto (no solo servicio): ${conBien} (${pct(conBien)})`);
console.log(`Con coincidencias negadas: ${conNegado}`);
console.log(
  "Por nodo:",
  [...porNodo.entries()].sort((a, b) => b[1] - a[1])
);
console.log("Ejemplos:\n" + ejemplos.join("\n"));
