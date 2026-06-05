#!/usr/bin/env node
/**
 * Descarga una muestra acotada de SECOP II (Procesos + Contratos) filtrada por
 * keywords del sector agua/saneamiento, y la persiste en samples/.
 *
 * Muestra el avance y resumen al final. Solo lectura, sin DB.
 *
 *   node scripts/exploration/fetch-samples.mjs [--cap N] [--page N]
 *
 * Variables de entorno opcionales:
 *   SOCRATA_APP_TOKEN  app token (sube el rate limit)
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchColumns, paginate } from "./socrata.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..", "..");
const SAMPLES_DIR = resolve(REPO_ROOT, "samples");

const DATASETS = {
  procesos: "p6dx-8zbt",
  contratos: "jbjy-vk9h",
};

/**
 * Keywords agua/saneamiento — normalizadas en mayúscula y sin tildes para
 * poder usar `upper(campo) like '%K%'` en SoQL (que no tiene soporte
 * portable a unaccent). Alineado con D19 / 0.2.1.
 */
const KEYWORDS_AGUA = [
  "ACUEDUCTO",
  "ALCANTARILLADO",
  "AGUA POTABLE",
  "AGUAS RESIDUALES",
  "SANEAMIENTO BASICO",
  "PTAP",
  "PTAR",
  "PLANTA DE TRATAMIENTO",
  "POZO SEPTICO",
  "TANQUE SEPTICO",
];

function buildWhere(fields) {
  const parts = [];
  for (const field of fields) {
    for (const kw of KEYWORDS_AGUA) {
      parts.push(`upper(${field}) like '%${kw}%'`);
    }
  }
  return `(${parts.join(" OR ")})`;
}

function parseArgs(argv) {
  const args = { cap: 500, page: 500 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--cap") args.cap = Number(argv[++i]);
    else if (a === "--page") args.page = Number(argv[++i]);
  }
  if (!Number.isFinite(args.cap) || args.cap <= 0) throw new Error("--cap inválido");
  if (!Number.isFinite(args.page) || args.page <= 0) throw new Error("--page inválido");
  return args;
}

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function persistJson(filePath, data) {
  await writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

async function fetchDataset(name, dataset, where, order, { cap, page }) {
  process.stderr.write(`\n[${name}] dataset=${dataset} cap=${cap} pageSize=${page}\n`);
  process.stderr.write(`[${name}] $where = ${where.slice(0, 120)}…\n`);
  process.stderr.write(`[${name}] $order = ${order}\n`);
  const t0 = Date.now();
  const rows = await paginate(
    dataset,
    { where, order, pageSize: page, cap },
    { maxRetries: 4 },
  );
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  process.stderr.write(`[${name}] ${rows.length} filas en ${elapsed}s\n`);

  process.stderr.write(`[${name}] descargando metadata de columnas…\n`);
  const columns = await fetchColumns(dataset);
  process.stderr.write(`[${name}] ${columns.length} columnas declaradas en metadata\n`);

  return { rows, columns };
}

async function main() {
  const args = parseArgs(process.argv);
  await ensureDir(SAMPLES_DIR);

  // PROCESOS: buscar agua en nombre y descripción del procedimiento.
  const procesosWhere = buildWhere(["nombre_del_procedimiento", "descripci_n_del_procedimiento"]);
  // Orden estable + reciente primero. Tiebreaker por ID para estabilidad de paginación.
  const procesosOrder = "fecha_de_publicacion_del DESC, id_del_proceso ASC";

  // CONTRATOS: buscar agua en el objeto del contrato.
  const contratosWhere = buildWhere(["objeto_del_contrato"]);
  const contratosOrder = "fecha_de_firma DESC, id_contrato ASC";

  const procesos = await fetchDataset(
    "procesos",
    DATASETS.procesos,
    procesosWhere,
    procesosOrder,
    args,
  );
  await persistJson(resolve(SAMPLES_DIR, "procesos.json"), procesos.rows);
  await persistJson(resolve(SAMPLES_DIR, "procesos.columns.json"), procesos.columns);

  const contratos = await fetchDataset(
    "contratos",
    DATASETS.contratos,
    contratosWhere,
    contratosOrder,
    args,
  );
  await persistJson(resolve(SAMPLES_DIR, "contratos.json"), contratos.rows);
  await persistJson(resolve(SAMPLES_DIR, "contratos.columns.json"), contratos.columns);

  process.stderr.write(`\n✔ Muestras guardadas en ${SAMPLES_DIR}\n`);
  process.stderr.write(`  procesos.json        ${procesos.rows.length} filas\n`);
  process.stderr.write(`  procesos.columns.json ${procesos.columns.length} columnas\n`);
  process.stderr.write(`  contratos.json       ${contratos.rows.length} filas\n`);
  process.stderr.write(`  contratos.columns.json ${contratos.columns.length} columnas\n`);
}

main().catch((err) => {
  process.stderr.write(`\n✖ ${err.message}\n`);
  process.exit(1);
});
