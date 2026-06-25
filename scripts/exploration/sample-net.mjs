#!/usr/bin/env node
/**
 * Paso 2 / A3 — Muestra para validación precision/recall de la red sectorial.
 *
 * No mide solo "azar uniforme": muestrea ESTRATIFICADO para responder la
 * pregunta de diseño que abrió A1 (ver 0.2.1-unspsc-derivado.md):
 *   ¿el segmento 80 (admin/personal), que es ~47% de la red, es realmente
 *   ruido (falso positivo) y por tanto debe EXCLUIRSE de la red de ingesta?
 *
 * Estratos (todos dentro de la red de keywords del sector):
 *   A · core      → UNSPSC de familias de agua genuinas (83/72/81/77/47…)
 *   B · seg-80    → UNSPSC 80xx (gestión/personal) — el sospechoso
 *   C · sin-cod.  → UNSPECIFIED (solo lo pesca el texto)
 *
 * Ordena por `:id` del sistema (barato/estable; ordenar por fecha no indexada
 * sobre un scan filtrado grande dispara SODA 500). Muestreo por estrato, no
 * aleatorio estricto — para la pregunta del seg-80 importa la representatividad.
 *
 * Salida:
 *   · docs/fase-0/0.2.1-validacion-muestra.json  (datos completos, auditable)
 *   · resumen legible a stdout para etiquetar
 *
 * El etiquetado (relevante = obra/servicio/suministro de agua real, vs FP) lo
 * hace una persona leyendo el `objeto`. Este script SOLO trae la muestra.
 *
 * Uso:  node scripts/exploration/sample-net.mjs
 */

import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchPage } from "./socrata.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..", "..");
const OUT_JSON = resolve(REPO_ROOT, "docs/fase-0/0.2.1-validacion-muestra.json");

const DATASET = "p6dx-8zbt";
const FIELD_NOMBRE = "nombre_del_procedimiento";
const FIELD_DESC = "descripci_n_del_procedimiento";
const FIELD_UNSPSC = "codigo_principal_de_categoria";
const FIELD_ENTIDAD = "entidad";
const FIELD_DEPTO = "departamento_entidad";
const FIELD_MODALIDAD = "modalidad_de_contratacion";
const FIELD_FECHA = "fecha_de_publicacion_del";
const FIELD_VALOR = "precio_base";
const FIELD_ID = "id_del_proceso";
const HEAVY = { timeoutMs: 120_000, maxRetries: 6 };

// Misma red de keywords que A1 (debe coincidir con derive-unspsc.mjs).
const KEYWORDS = [
  "ACUEDUCTO", "ALCANTARILLADO", "SANEAMIENTO", "AGUA POTABLE", "AGUAS RESIDUALES",
  "AGUA RESIDUAL", "PTAR", "PTAP", "PLANTA DE TRATAMIENTO", "POTABILIZ", "CAPTACI",
  "ADUCCI", "POZO SEPTIC", "TANQUE SEPTIC", "VERTIMIENTO", "COLECTOR", "INTERCEPTOR",
  "EMISARIO", "MICROMEDIC", "MACROMEDIC", "PSMV", "PLAN MAESTRO DE ACUEDUCTO",
];

function soqlEscape(s) {
  return s.replace(/'/g, "''");
}

function aguaWhere() {
  return KEYWORDS.map((kw) => {
    const k = soqlEscape(kw.toUpperCase());
    return `(upper(${FIELD_NOMBRE}) like '%${k}%' OR upper(${FIELD_DESC}) like '%${k}%')`;
  }).join(" OR ");
}

const SELECT = [
  FIELD_ID, FIELD_NOMBRE, FIELD_DESC, FIELD_UNSPSC, FIELD_ENTIDAD,
  FIELD_DEPTO, FIELD_MODALIDAD, FIELD_FECHA, FIELD_VALOR,
].join(", ");

/**
 * Una página de un estrato: red AND (filtro de estrato). Ordena por `:id` del
 * sistema (indexado, barato y estable): ordenar por una fecha no indexada sobre
 * un scan filtrado grande dispara SODA 500 en Socrata. No es muestreo aleatorio
 * estricto, pero para validar la red/seg-80 importa la representatividad por
 * estrato, no la recencia.
 */
async function stratum(extraWhere, limit) {
  const where = `(${aguaWhere()})${extraWhere ? ` AND (${extraWhere})` : ""}`;
  const rows = await fetchPage(
    DATASET,
    { $select: SELECT, $where: where, $order: ":id", $limit: limit },
    HEAVY,
  );
  return rows;
}

function trunc(s, n) {
  if (!s) return "";
  const t = String(s).replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

function digitsOf(raw) {
  if (raw == null) return null;
  const d = String(raw).replace(/^v\d+\./i, "").replace(/\D/g, "");
  return d || null;
}

async function main() {
  process.stderr.write("[A3] estrato A (core: 83/72/81/77/47)…\n");
  const coreWhere = [
    `${FIELD_UNSPSC} like 'V1.83%'`,
    `${FIELD_UNSPSC} like 'V1.72%'`,
    `${FIELD_UNSPSC} like 'V1.81%'`,
    `${FIELD_UNSPSC} like 'V1.77%'`,
    `${FIELD_UNSPSC} like 'V1.47%'`,
  ].join(" OR ");
  const A = await stratum(coreWhere, 20);

  process.stderr.write("[A3] estrato B (seg-80: gestión/personal)…\n");
  const B = await stratum(`${FIELD_UNSPSC} like 'V1.80%'`, 20);

  process.stderr.write("[A3] estrato C (sin código: UNSPECIFIED)…\n");
  const C = await stratum(`${FIELD_UNSPSC} = 'UNSPECIFIED'`, 10);

  const label = (rows, estrato) =>
    rows.map((r) => ({
      estrato,
      id: r[FIELD_ID] ?? null,
      unspsc: r[FIELD_UNSPSC] ?? null,
      unspscDigits: digitsOf(r[FIELD_UNSPSC]),
      nombre: r[FIELD_NOMBRE] ?? null,
      descripcion: r[FIELD_DESC] ?? null,
      entidad: r[FIELD_ENTIDAD] ?? null,
      departamento: r[FIELD_DEPTO] ?? null,
      modalidad: r[FIELD_MODALIDAD] ?? null,
      fecha: r[FIELD_FECHA] ?? null,
      valor: r[FIELD_VALOR] ?? null,
    }));

  const muestra = [...label(A, "A-core"), ...label(B, "B-seg80"), ...label(C, "C-sincod")];

  await writeFile(
    OUT_JSON,
    JSON.stringify({ generatedAt: new Date().toISOString(), keywords: KEYWORDS, muestra }, null, 2) + "\n",
    "utf8",
  );

  // Volcado legible para etiquetar.
  const out = [];
  for (const estrato of ["A-core", "B-seg80", "C-sincod"]) {
    out.push(`\n========== ESTRATO ${estrato} ==========`);
    muestra
      .filter((m) => m.estrato === estrato)
      .forEach((m, i) => {
        out.push(
          `[${estrato} #${i + 1}] ${m.unspsc} · ${m.departamento ?? "?"} · ${trunc(m.entidad, 45)}` +
            `\n   OBJ: ${trunc(m.nombre, 150)}` +
            (m.descripcion && m.descripcion !== m.nombre ? `\n   DSC: ${trunc(m.descripcion, 150)}` : ""),
        );
      });
  }
  out.push(`\n[A3] total muestra: ${muestra.length}  →  ${OUT_JSON}`);
  process.stdout.write(out.join("\n") + "\n");
}

main().catch((err) => {
  process.stderr.write(`[A3] ERROR: ${err?.stack ?? err}\n`);
  process.exit(1);
});
