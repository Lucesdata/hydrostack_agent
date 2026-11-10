/**
 * CI-02b — evalúa el clasificador contra las hojas de los dos revisores.
 * Solo lee archivos locales; no toca la base.
 *
 * Uso:
 *   npx tsx scripts/tecnologia-evaluar-etiquetas.ts revisor1.csv revisor2.csv clave-clasificador.csv
 */
import { readFileSync } from "node:fs";
import {
  etiquetasDeCsv,
  evaluar,
  parseCsv,
  type ClaveClasificador,
} from "../src/lib/tecnologia/evaluacion";

const [f1, f2, fClave] = process.argv.slice(2);
if (!f1 || !f2 || !fClave) {
  console.error("Uso: tecnologia-evaluar-etiquetas.ts <revisor1.csv> <revisor2.csv> <clave.csv>");
  process.exit(1);
}

const clave: ClaveClasificador = {};
for (const [id, cand] of parseCsv(readFileSync(fClave, "utf8")).slice(1)) {
  clave[id] = (cand ?? "").split(";").filter(Boolean);
}

const r1 = etiquetasDeCsv(readFileSync(f1, "utf8"));
const r2 = etiquetasDeCsv(readFileSync(f2, "utf8"));
const sinEtiquetar = [...r1, ...r2].filter((e) => !e.actividad || !e.bienExplicito).length;
if (sinEtiquetar > 0) {
  console.warn(
    `Aviso: ${sinEtiquetar} filas sin «actividad» o «bien_explicito»; cuentan como discrepancia.`
  );
}

const inf = evaluar(r1, r2, clave);
const p = (x: number | null) => (x === null ? "n/d" : (100 * x).toFixed(1) + " %");
const k = (x: number | null) => (x === null ? "n/d" : x.toFixed(2));
console.log(`Contratos: ${inf.contratos} · con ambos revisores: ${inf.conAmbosRevisores}`);
console.log(
  `Acuerdo — actividad ${p(inf.acuerdo.actividad)} (kappa ${k(inf.kappa.actividad)}) · bien explícito ${p(inf.acuerdo.bienExplicito)} (kappa ${k(inf.kappa.bienExplicito)})`
);
console.log(`Por adjudicar (discrepan): ${inf.porAdjudicar.length}`);
const c = inf.consenso;
console.log(`Con consenso: ${c.contratos}`);
console.log(
  `Precisión en categoría raíz: ${p(c.precisionRaiz)} (${c.candidatosCorrectos}/${c.candidatos})`
);
console.log(`Recobrado en categoría raíz: ${p(c.recobradoRaiz)} (${c.encontradas}/${c.esperadas})`);
console.log(
  `Bien explícito con candidato: ${c.cobertura.conCandidato}/${c.cobertura.conBienExplicito}`
);
console.log("Falsos positivos:", c.falsosPositivos);
console.log("Omitidos:", c.omitidos);
console.log("A adjudicar:", inf.porAdjudicar.join(", "));
