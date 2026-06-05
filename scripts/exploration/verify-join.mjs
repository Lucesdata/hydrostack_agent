/**
 * Verificación dirigida del cruce proceso↔contrato (H1):
 * toma N portafolios BDOS de los contratos de la muestra y los busca
 * directamente en el dataset de procesos vía id_del_portafolio.
 */
import { readFile } from "node:fs/promises";
import { fetchPage } from "./socrata.mjs";

const N = 10;
const contratos = JSON.parse(await readFile("samples/contratos.json", "utf8"));
const bdosList = [...new Set(contratos.map((c) => c.proceso_de_compra).filter(Boolean))];

// Muestra aleatoria
const picked = [];
while (picked.length < N && bdosList.length > 0) {
  const i = Math.floor(Math.random() * bdosList.length);
  picked.push(bdosList.splice(i, 1)[0]);
}

const inList = picked.map((b) => `'${b}'`).join(",");
const where = `id_del_portafolio IN (${inList})`;
console.log(`Probando ${picked.length} BDOS contra procesos…`);

const procesos = await fetchPage("p6dx-8zbt", {
  $where: where,
  $select: "id_del_portafolio,id_del_proceso,nombre_del_procedimiento",
  $order: "id_del_portafolio ASC",
  $limit: 100,
  $offset: 0,
});

console.log(`\nProcesos encontrados: ${procesos.length}`);
for (const p of procesos.slice(0, 10)) {
  const name = String(p.nombre_del_procedimiento || "").slice(0, 60);
  console.log(`  ${p.id_del_portafolio} → ${p.id_del_proceso} | ${name}`);
}

const matched = new Set(procesos.map((p) => p.id_del_portafolio));
const unmatched = picked.filter((b) => !matched.has(b));
console.log(`\nMatch: ${picked.length - unmatched.length}/${picked.length}`);
console.log(`BDOS sin match en procesos:`, unmatched.slice(0, 5));
