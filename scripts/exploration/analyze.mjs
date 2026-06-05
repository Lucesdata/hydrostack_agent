#!/usr/bin/env node
/**
 * Analiza las muestras de samples/ y produce estadísticas de calidad de la fuente:
 *   - tasa de nulos por columna (incluye columnas que Socrata omitió por venir nulas)
 *   - tipo aparente (cómo llega: string/number/etc) vs tipo declarado en metadata
 *   - centinelas conocidos ("No Definido", etc.)
 *   - validación cuantitativa de:
 *       · llave de unión proceso ↔ contrato (D11)
 *       · formato de NIT del proveedor y DV (D5)
 *       · geografía texto vs DIVIPOLA (D12, H2)
 *       · campos que alimentan eventos (valor, fecha fin, estado)
 *
 * Salida:
 *   - samples/_stats.json          (estadísticas crudas para incluir en docs)
 *   - resumen humano a stderr
 *
 *   node scripts/exploration/analyze.mjs
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..", "..");
const SAMPLES_DIR = resolve(REPO_ROOT, "samples");

const CENTINELAS = new Set(
  [
    "no definido",
    "no definida",
    "no aplica",
    "por definir",
    "sin descripcion",
    "sin descripción",
    "no adjudicado",
    "no especificado",
    "n/a",
    "na",
    "ninguno",
    "ninguna",
    "-",
    "0",
  ].map((s) => s.toLowerCase()),
);

function isCentinela(v) {
  if (v === null || v === undefined) return false;
  if (typeof v !== "string") return false;
  const t = v.trim().toLowerCase();
  return CENTINELAS.has(t);
}

function isAbsent(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === "string" && v.trim() === "") return true;
  return false;
}

/** Tipo aparente del valor tal cual llega de Socrata. */
function apparentType(v) {
  if (v === null || v === undefined) return "null";
  if (Array.isArray(v)) return "array";
  if (typeof v === "object") return "object";
  if (typeof v === "boolean") return "boolean";
  if (typeof v === "number") return "number";
  if (typeof v === "string") {
    if (/^-?\d+(\.\d+)?$/.test(v)) return "string<number>";
    if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(v)) return "string<date>";
    return "string";
  }
  return typeof v;
}

function firstNonNullSample(rows, key) {
  for (const row of rows) {
    const v = row[key];
    if (!isAbsent(v) && !isCentinela(v)) return v;
  }
  return null;
}

function unique(values) {
  return Array.from(new Set(values));
}

function pct(n, d) {
  if (d === 0) return 0;
  return Math.round((n / d) * 1000) / 10;
}

// ── Análisis por columna ─────────────────────────────────────────────────────
function analyzeColumns(rows, columns) {
  const total = rows.length;
  const byName = {};
  const declared = new Map(columns.map((c) => [c.fieldName, c]));

  // Universo = unión de columnas declaradas + columnas vistas en alguna fila
  const seenKeys = new Set();
  for (const row of rows) for (const k of Object.keys(row)) seenKeys.add(k);
  const universe = unique([...declared.keys(), ...seenKeys]);

  for (const name of universe) {
    let absent = 0;
    let centinela = 0;
    const types = new Map();
    let sample = null;
    for (const row of rows) {
      const v = row[name];
      if (isAbsent(v)) {
        absent++;
        continue;
      }
      if (isCentinela(v)) {
        centinela++;
      }
      const t = apparentType(v);
      types.set(t, (types.get(t) || 0) + 1);
      if (sample === null && !isCentinela(v)) sample = v;
    }
    const declaredMeta = declared.get(name);
    byName[name] = {
      declared_type: declaredMeta?.dataTypeName ?? null,
      name_in_metadata: declaredMeta?.name ?? null,
      not_in_metadata: !declaredMeta,
      not_in_any_row: !seenKeys.has(name),
      null_count: absent,
      null_rate_pct: pct(absent, total),
      sentinel_count: centinela,
      sentinel_rate_pct: pct(centinela, total),
      apparent_types: Object.fromEntries(types),
      sample_value: sample,
    };
  }
  return { total, columns: byName };
}

// ── Validación supuestos críticos ────────────────────────────────────────────

/** % de NITs con dígito de verificación coherente (algoritmo DIAN mod-11). */
function nitDvCheck(nitRaw) {
  if (typeof nitRaw !== "string") return { valid: false, reason: "not-string" };
  // Acepta formatos: "900.123.456-7", "900123456-7", "900123456", "900-123-456"
  const cleaned = nitRaw.replace(/[\.\s]/g, "");
  const m = cleaned.match(/^(\d{1,15})(?:-(\d))?$/);
  if (!m) return { valid: false, reason: "bad-format", raw: nitRaw };
  const base = m[1];
  const givenDv = m[2];
  // Pesos DIAN (de derecha a izquierda)
  const weights = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  let sum = 0;
  for (let i = 0; i < base.length; i++) {
    const d = Number(base[base.length - 1 - i]);
    sum += d * weights[i];
  }
  const mod = sum % 11;
  const computedDv = mod < 2 ? mod : 11 - mod;
  if (givenDv === undefined) {
    // No vino DV → no podemos validar, pero no es inválido per se
    return { valid: null, reason: "no-dv-included", base, computedDv };
  }
  return { valid: Number(givenDv) === computedDv, base, givenDv: Number(givenDv), computedDv };
}

function analyzeNit(rows, field, total) {
  let present = 0;
  let centinela = 0;
  let nonNumeric = 0;
  let withDv = 0;
  let dvOk = 0;
  let dvBad = 0;
  let lenBuckets = new Map();
  const samples = [];
  for (const row of rows) {
    const v = row[field];
    if (isAbsent(v)) continue;
    if (isCentinela(v)) {
      centinela++;
      continue;
    }
    present++;
    const s = String(v).trim();
    if (samples.length < 5) samples.push(s);
    if (!/^[\d.\s-]+$/.test(s)) {
      nonNumeric++;
      continue;
    }
    const r = nitDvCheck(s);
    if (r.valid === null) {
      // sin DV
    } else {
      withDv++;
      if (r.valid) dvOk++;
      else dvBad++;
    }
    const cleaned = s.replace(/[\.\s-]/g, "");
    const len = cleaned.length;
    lenBuckets.set(len, (lenBuckets.get(len) || 0) + 1);
  }
  return {
    field,
    total_rows: total,
    present,
    present_pct: pct(present, total),
    centinela,
    centinela_pct: pct(centinela, total),
    non_numeric: nonNumeric,
    with_dv: withDv,
    dv_ok: dvOk,
    dv_bad: dvBad,
    dv_ok_pct_of_with_dv: pct(dvOk, withDv),
    length_distribution: Object.fromEntries(lenBuckets),
    samples,
  };
}

function analyzeJoinKey(procesos, contratos) {
  // H1: contratos.proceso_de_compra ↔ procesos.id_del_portafolio  (CO1.BDOS.xxxx)
  const portafolios = new Set();
  let procesosConPortafolio = 0;
  for (const p of procesos) {
    const v = p.id_del_portafolio;
    if (!isAbsent(v) && !isCentinela(v)) {
      portafolios.add(String(v));
      procesosConPortafolio++;
    }
  }
  const procesosIds = new Set();
  for (const p of procesos) {
    const v = p.id_del_proceso;
    if (!isAbsent(v)) procesosIds.add(String(v));
  }

  let contratosConPdC = 0;
  let cruceContraPortafolio = 0;
  let cruceContraIdProceso = 0;
  const pdcSamples = [];
  for (const c of contratos) {
    const pdc = c.proceso_de_compra;
    if (isAbsent(pdc)) continue;
    contratosConPdC++;
    if (pdcSamples.length < 5) pdcSamples.push(String(pdc));
    if (portafolios.has(String(pdc))) cruceContraPortafolio++;
    if (procesosIds.has(String(pdc))) cruceContraIdProceso++;
  }
  return {
    procesos_total: procesos.length,
    procesos_con_portafolio: procesosConPortafolio,
    procesos_con_portafolio_pct: pct(procesosConPortafolio, procesos.length),
    contratos_total: contratos.length,
    contratos_con_proceso_de_compra: contratosConPdC,
    contratos_con_pdc_pct: pct(contratosConPdC, contratos.length),
    contratos_que_cruzan_via_portafolio: cruceContraPortafolio,
    cruce_via_portafolio_pct: pct(cruceContraPortafolio, contratosConPdC),
    contratos_que_cruzan_via_id_proceso: cruceContraIdProceso,
    cruce_via_id_proceso_pct: pct(cruceContraIdProceso, contratosConPdC),
    samples_proceso_de_compra: pdcSamples,
    nota: "Las muestras son independientes (cap 500 c/u, filtros distintos por dataset), así que la intersección es informativa pero no es la tasa real de match end-to-end del backfill completo.",
  };
}

function analyzeGeo(rows, fields, total) {
  const out = {};
  for (const f of fields) {
    const values = rows.map((r) => r[f]).filter((v) => !isAbsent(v));
    const distinct = unique(values.map((v) => String(v).trim()));
    const top = countTopN(values, 10);
    out[f] = {
      present: values.length,
      present_pct: pct(values.length, total),
      distinct_values: distinct.length,
      top10: top,
    };
  }
  return out;
}

function countTopN(values, n) {
  const counts = new Map();
  for (const v of values) {
    const k = String(v).trim();
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ value: k, count: v }));
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function loadJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function main() {
  const [procesos, procesosCols, contratos, contratosCols] = await Promise.all([
    loadJson(resolve(SAMPLES_DIR, "procesos.json")),
    loadJson(resolve(SAMPLES_DIR, "procesos.columns.json")),
    loadJson(resolve(SAMPLES_DIR, "contratos.json")),
    loadJson(resolve(SAMPLES_DIR, "contratos.columns.json")),
  ]);

  const procesosAnalysis = analyzeColumns(procesos, procesosCols);
  const contratosAnalysis = analyzeColumns(contratos, contratosCols);

  const join = analyzeJoinKey(procesos, contratos);

  const nitProveedorContratos = analyzeNit(contratos, "documento_proveedor", contratos.length);
  const nitEntidadProcesos = analyzeNit(procesos, "nit_entidad", procesos.length);
  const nitEntidadContratos = analyzeNit(contratos, "nit_entidad", contratos.length);

  const geoProcesos = analyzeGeo(
    procesos,
    ["departamento_entidad", "ciudad_entidad"],
    procesos.length,
  );
  const geoContratos = analyzeGeo(
    contratos,
    ["departamento", "ciudad", "localizaci_n"],
    contratos.length,
  );

  // Campos que alimentan eventos (0.1 §2)
  const eventFields = {
    contratos: {
      valor_del_contrato: contratosAnalysis.columns["valor_del_contrato"] ?? null,
      fecha_de_fin_del_contrato: contratosAnalysis.columns["fecha_de_fin_del_contrato"] ?? null,
      estado_contrato: contratosAnalysis.columns["estado_contrato"] ?? null,
      dias_adicionados: contratosAnalysis.columns["dias_adicionados"] ?? null,
    },
  };

  const stats = {
    generated_at: new Date().toISOString(),
    procesos: procesosAnalysis,
    contratos: contratosAnalysis,
    join_key: join,
    nit: {
      proveedor_en_contratos: nitProveedorContratos,
      entidad_en_procesos: nitEntidadProcesos,
      entidad_en_contratos: nitEntidadContratos,
    },
    geo: { procesos: geoProcesos, contratos: geoContratos },
    event_fields: eventFields,
  };

  await writeFile(resolve(SAMPLES_DIR, "_stats.json"), JSON.stringify(stats, null, 2) + "\n", "utf8");

  // ── Resumen humano a stderr ──────────────────────────────────────────────
  const E = process.stderr.write.bind(process.stderr);
  E(`\n══ ANÁLISIS DE MUESTRAS ══════════════════════════════════════\n`);
  E(`Procesos: ${procesosAnalysis.total} filas, ${Object.keys(procesosAnalysis.columns).length} columnas (universo metadata+visto)\n`);
  E(`Contratos: ${contratosAnalysis.total} filas, ${Object.keys(contratosAnalysis.columns).length} columnas\n`);

  E(`\n── Llave de unión (H1, D11) ────────────────────────────────\n`);
  E(`  procesos con id_del_portafolio: ${join.procesos_con_portafolio}/${join.procesos_total} (${join.procesos_con_portafolio_pct}%)\n`);
  E(`  contratos con proceso_de_compra: ${join.contratos_con_proceso_de_compra}/${join.contratos_total} (${join.contratos_con_pdc_pct}%)\n`);
  E(`  contratos cuyo proceso_de_compra cruza CONTRA id_del_portafolio: ${join.contratos_que_cruzan_via_portafolio} (${join.cruce_via_portafolio_pct}% de los que tienen pdc)\n`);
  E(`  contratos cuyo proceso_de_compra cruza CONTRA id_del_proceso (control negativo): ${join.contratos_que_cruzan_via_id_proceso} (${join.cruce_via_id_proceso_pct}%)\n`);

  E(`\n── NIT proveedor en contratos (documento_proveedor) ─────────\n`);
  E(`  presentes: ${nitProveedorContratos.present}/${nitProveedorContratos.total_rows} (${nitProveedorContratos.present_pct}%)\n`);
  E(`  centinelas: ${nitProveedorContratos.centinela} (${nitProveedorContratos.centinela_pct}%)\n`);
  E(`  con DV explícito: ${nitProveedorContratos.with_dv}\n`);
  E(`  DV correcto (de los con DV): ${nitProveedorContratos.dv_ok}/${nitProveedorContratos.with_dv} (${nitProveedorContratos.dv_ok_pct_of_with_dv}%)\n`);
  E(`  longitudes: ${JSON.stringify(nitProveedorContratos.length_distribution)}\n`);
  E(`  no numérico: ${nitProveedorContratos.non_numeric}\n`);

  E(`\n── NIT entidad en procesos (nit_entidad) ───────────────────\n`);
  E(`  presentes: ${nitEntidadProcesos.present}/${nitEntidadProcesos.total_rows} (${nitEntidadProcesos.present_pct}%)\n`);
  E(`  DV correcto (de los con DV): ${nitEntidadProcesos.dv_ok}/${nitEntidadProcesos.with_dv} (${nitEntidadProcesos.dv_ok_pct_of_with_dv}%)\n`);
  E(`  longitudes: ${JSON.stringify(nitEntidadProcesos.length_distribution)}\n`);

  E(`\n── Geografía ───────────────────────────────────────────────\n`);
  for (const [f, s] of Object.entries(geoProcesos)) {
    E(`  procesos.${f}: ${s.distinct_values} distintos (de ${s.present})\n`);
  }
  for (const [f, s] of Object.entries(geoContratos)) {
    E(`  contratos.${f}: ${s.distinct_values} distintos (de ${s.present})\n`);
  }

  E(`\n── Campos de eventos en contratos ──────────────────────────\n`);
  for (const [f, s] of Object.entries(eventFields.contratos)) {
    if (!s) {
      E(`  ${f}: NO PRESENTE en la muestra\n`);
    } else {
      E(`  ${f}: ${s.null_rate_pct}% nulos, tipo declarado=${s.declared_type}, tipos vistos=${Object.keys(s.apparent_types).join("|")}\n`);
    }
  }

  E(`\n✔ Detalle completo en samples/_stats.json\n`);
}

main().catch((err) => {
  process.stderr.write(`\n✖ ${err.message}\n`);
  process.exit(1);
});
