#!/usr/bin/env node
/**
 * Paso 1 / A1 — Derivación EMPÍRICA del set UNSPSC del sector agua-saneamiento.
 *
 * No hardcodea códigos: siembra con keywords (red amplia, accent-safe) sobre
 * `nombre_del_procedimiento` + `descripci_n_del_procedimiento` del dataset de
 * PROCESOS (p6dx-8zbt) y deja que el dato diga qué UNSPSC aparecen y con qué
 * frecuencia real. El resultado ES la lista autoritativa que alimenta DOS cosas
 * (ADR-0001, Opción C):
 *   1. la RED DE INGESTA (qué se aterriza a raw_record), y
 *   2. los diccionarios del clasificador sectorial (precisión dentro de la red).
 *
 * Método (todo server-side en Socrata, agregación barata):
 *   SELECT codigo_principal_de_categoria, count(1) AS n
 *   WHERE  <OR de keywords sobre nombre+descripción>
 *   GROUP BY codigo_principal_de_categoria
 *   ORDER BY n DESC  LIMIT 300
 *
 * Notas de fidelidad:
 *   · `upper()` de SoQL NO quita tildes → las keywords evitan vocales acentuadas
 *     (CAPTACI, POTABILIZ, ADUCCI…) para no perder recall por "Ó/Í".
 *   · El UNSPSC llega como "V1.83101500" (prefijo de versión) y existe el
 *     centinela "UNSPECIFIED" (sin código → solo lo pesca el texto).
 *
 * Salidas (generadas, no transcritas a mano):
 *   · docs/fase-0/0.2.1-unspsc-derivado.md    (lista autoritativa + cobertura)
 *   · docs/fase-0/0.2.1-unspsc-derivado.json  (sidecar máquina-legible)
 *
 * Uso:
 *   node scripts/exploration/derive-unspsc.mjs
 *   SOCRATA_APP_TOKEN=xxx node scripts/exploration/derive-unspsc.mjs   (sube rate limit)
 */

import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchPage } from "./socrata.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..", "..");
const OUT_MD = resolve(REPO_ROOT, "docs/fase-0/0.2.1-unspsc-derivado.md");
const OUT_JSON = resolve(REPO_ROOT, "docs/fase-0/0.2.1-unspsc-derivado.json");

const DATASET = "p6dx-8zbt"; // SECOP II · Procesos de Contratación
const FIELD_NOMBRE = "nombre_del_procedimiento";
const FIELD_DESC = "descripci_n_del_procedimiento";
const FIELD_UNSPSC = "codigo_principal_de_categoria";
const TOP_N = 300;
const HEAVY = { timeoutMs: 150_000, maxRetries: 6 };

/**
 * Semilla de keywords de derivación — INTENCIONALMENTE AMPLIA (recall), todas
 * accent-safe (sin vocales acentuadas, ver nota de cabecera). No es el filtro
 * de precisión: es la red que descubre qué UNSPSC viven en el sector.
 */
const KEYWORDS = [
  "ACUEDUCTO",
  "ALCANTARILLADO",
  "SANEAMIENTO",
  "AGUA POTABLE",
  "AGUAS RESIDUALES",
  "AGUA RESIDUAL",
  "PTAR",
  "PTAP",
  "PLANTA DE TRATAMIENTO",
  "POTABILIZ", // potabilización
  "CAPTACI", // captación
  "ADUCCI", // aducción
  "POZO SEPTIC", // pozo séptico
  "TANQUE SEPTIC", // tanque séptico
  "VERTIMIENTO",
  "COLECTOR",
  "INTERCEPTOR",
  "EMISARIO",
  "MICROMEDIC", // micromedición
  "MACROMEDIC", // macromedición
  "PSMV", // plan de saneamiento y manejo de vertimientos
  "PLAN MAESTRO DE ACUEDUCTO",
];

/** Prefijos del clasificador actual (dictionaries.ts) — para medir cobertura. */
const SEED_STRONG = ["83101"];
const SEED_CONTEXT = ["72141", "81101", "77101", "31162"];

/** Etiquetas de segmento UNSPSC (2 dígitos) — semilla A1-bis del plan. */
const SEGMENT_LABELS = {
  "83": "Servicios públicos: agua y alcantarillado",
  "72": "Construcción / obra civil pesada",
  "95": "Estructuras no edificatorias (PTAR, tanques, redes)",
  "81": "Servicios de ingeniería / consultoría",
  "77": "Servicios medioambientales / saneamiento",
  "76": "Limpieza / tratamiento de residuos / alcantarillado",
  "47": "Equipos de tratamiento de agua y residuales (fam. 4710)",
  "40": "Bombas, tubería, accesorios de fluidos",
  "41": "Instrumentos de medición y análisis de agua",
  "70": "Recursos hídricos / agricultura / riego",
  "12": "Químicos (cloro, coagulantes de potabilización)",
  "39": "Equipo eléctrico (bombas, iluminación)",
  "30": "Materiales y componentes estructurales",
  "31": "Componentes de manufactura (juntas, sellos…)",
  "80": "Servicios de gestión / administración / PERSONAL",
  "78": "Transporte / logística",
  "73": "Servicios industriales de producción",
  "50": "Alimentos y bebidas (agua embotellada — FP clásico)",
  "84": "Servicios financieros y de seguros",
  "85": "Servicios de salud",
  "86": "Servicios de educación",
  "93": "Servicios políticos y de asuntos cívicos",
};

/**
 * Segmentos genuinamente del sector agua-saneamiento (infra, tratamiento,
 * suministro, ingeniería). El resto es "no-core": entra por contaminación de
 * keyword (p. ej. "personal para el acueducto") y se marca para escrutinio en
 * A3. NO es un veredicto de precisión — A1 solo señala dónde mirar; A3 etiqueta.
 */
const CORE_SEGMENTS = new Set([
  "83", "72", "81", "77", "76", "47", "40", "41", "70", "95", "31", "30", "12", "39",
]);

/** Escapa comillas simples para SoQL. */
function soqlEscape(s) {
  return s.replace(/'/g, "''");
}

/** $where = OR de (upper(nombre) like '%KW%' OR upper(desc) like '%KW%'). */
function buildAguaWhere() {
  return KEYWORDS.map((kw) => {
    const k = soqlEscape(kw.toUpperCase());
    return `(upper(${FIELD_NOMBRE}) like '%${k}%' OR upper(${FIELD_DESC}) like '%${k}%')`;
  }).join(" OR ");
}

/** Normaliza el código crudo "V1.83101500" → "83101500" (8 dígitos). null si no hay. */
function digitsOf(raw) {
  if (raw == null) return null;
  const d = String(raw).replace(/^v\d+\./i, "").replace(/\D/g, "");
  return d || null;
}

/** Clasifica un código observado contra la semilla del clasificador. */
function seedTag(digits) {
  if (digits == null) return "sin-codigo";
  if (SEED_STRONG.some((p) => digits.startsWith(p))) return "strong";
  if (SEED_CONTEXT.some((p) => digits.startsWith(p))) return "context";
  return "nuevo";
}

function segmentOf(digits) {
  return digits == null ? null : digits.slice(0, 2);
}

function familiaOf(digits) {
  const seg = segmentOf(digits);
  if (seg == null) return "(sin código UNSPSC)";
  return SEGMENT_LABELS[seg] ?? `Segmento ${seg}`;
}

function pct(part, whole) {
  return whole > 0 ? (100 * part) / whole : 0;
}

async function main() {
  const where = buildAguaWhere();

  process.stderr.write("[A1] total nacional de procesos…\n");
  const [{ n: totalNacionalRaw }] = await fetchPage(
    DATASET,
    { $select: "count(1) AS n" },
    HEAVY,
  );
  const totalNacional = Number(totalNacionalRaw);

  process.stderr.write("[A1] total de la red de keywords (recall bruto)…\n");
  const [{ n: totalRedRaw }] = await fetchPage(
    DATASET,
    { $select: "count(1) AS n", $where: where },
    HEAVY,
  );
  const totalRed = Number(totalRedRaw);

  process.stderr.write(`[A1] derivando top-${TOP_N} UNSPSC por frecuencia…\n`);
  const grouped = await fetchPage(
    DATASET,
    {
      $select: `${FIELD_UNSPSC} AS codigo, count(1) AS n`,
      $where: where,
      $group: FIELD_UNSPSC,
      $order: "n DESC",
      $limit: TOP_N,
    },
    HEAVY,
  );

  // Enriquecer cada fila observada.
  let acc = 0;
  const rows = grouped.map((r, i) => {
    const raw = r.codigo ?? null;
    const digits = digitsOf(raw);
    const n = Number(r.n);
    acc += n;
    return {
      rank: i + 1,
      raw: raw ?? "(null)",
      digits,
      n,
      pctRed: pct(n, totalRed),
      pctAcum: pct(acc, totalRed),
      segmento: segmentOf(digits),
      familia: familiaOf(digits),
      tag: seedTag(digits),
    };
  });

  const cubiertoTopN = acc; // filas cubiertas por el top-N (vs cola larga)
  const segmentos = aggregateBy(rows, (x) => x.segmento ?? "—");
  const sinCodigo = rows.filter((x) => x.digits == null).reduce((s, x) => s + x.n, 0);

  // Hallazgos: core (agua genuino) vs no-core (contaminación de keyword → A3).
  const coreN = rows.filter((x) => x.segmento && CORE_SEGMENTS.has(x.segmento)).reduce((s, x) => s + x.n, 0);
  const nonCoreN = cubiertoTopN - coreN - sinCodigo;
  const nonCoreSegs = segmentos.filter((s) => s.segmento !== "—" && !CORE_SEGMENTS.has(s.segmento));
  const dom = nonCoreSegs[0] ?? null; // segmentos ya viene ordenado por n desc
  const domTopCode = dom
    ? rows.filter((x) => x.segmento === dom.segmento).sort((a, b) => b.n - a.n)[0]
    : null;
  const hallazgos = {
    coreN,
    coreShare: pct(coreN, cubiertoTopN),
    nonCoreN,
    nonCoreShare: pct(nonCoreN, cubiertoTopN),
    sinCodigoShare: pct(sinCodigo, cubiertoTopN),
    dominanteNoCore: dom
      ? {
          segmento: dom.segmento,
          familia: dom.familia,
          n: dom.n,
          share: pct(dom.n, cubiertoTopN),
          topCodigo: domTopCode?.raw ?? null,
          topCodigoN: domTopCode?.n ?? null,
          topCodigoShare: domTopCode ? pct(domTopCode.n, cubiertoTopN) : null,
        }
      : null,
  };

  // Cobertura de la semilla del clasificador.
  const seedSeen = {
    strong: SEED_STRONG.filter((p) => rows.some((x) => x.digits?.startsWith(p))),
    context: SEED_CONTEXT.filter((p) => rows.some((x) => x.digits?.startsWith(p))),
  };
  const seedMissing = {
    strong: SEED_STRONG.filter((p) => !rows.some((x) => x.digits?.startsWith(p))),
    context: SEED_CONTEXT.filter((p) => !rows.some((x) => x.digits?.startsWith(p))),
  };

  const meta = {
    generatedAt: new Date().toISOString(),
    dataset: DATASET,
    fields: { nombre: FIELD_NOMBRE, descripcion: FIELD_DESC, unspsc: FIELD_UNSPSC },
    keywords: KEYWORDS,
    totals: {
      nacional: totalNacional,
      red: totalRed,
      pctRedSobreNacional: pct(totalRed, totalNacional),
      codigosDistintosTopN: rows.length,
      filasCubiertasTopN: cubiertoTopN,
      pctCoberturaTopN: pct(cubiertoTopN, totalRed),
      sinCodigoUnspsc: sinCodigo,
    },
    seed: { seen: seedSeen, missing: seedMissing },
    hallazgos,
    segmentos,
    rows,
  };

  await writeFile(OUT_JSON, JSON.stringify(meta, null, 2) + "\n", "utf8");
  await writeFile(OUT_MD, renderMarkdown(meta), "utf8");

  // Resumen humano.
  process.stderr.write(
    `\n[A1] LISTO\n` +
      `  nacional        : ${fmt(totalNacional)}\n` +
      `  red (keywords)  : ${fmt(totalRed)}  (${pct(totalRed, totalNacional).toFixed(2)}% del nacional)\n` +
      `  UNSPSC distintos: ${rows.length} (top-${TOP_N})\n` +
      `  cobertura top-N : ${pct(cubiertoTopN, totalRed).toFixed(1)}% de la red\n` +
      `  sin código      : ${fmt(sinCodigo)} filas (solo las pesca el texto)\n` +
      `  CORE (agua)     : ${hallazgos.coreShare.toFixed(1)}%  |  NO-CORE: ${hallazgos.nonCoreShare.toFixed(1)}%\n` +
      `  ⚠ dominante no-core: segmento ${dom?.segmento} (${dom?.familia}) = ${hallazgos.dominanteNoCore?.share.toFixed(1)}%  [${domTopCode?.raw} = ${hallazgos.dominanteNoCore?.topCodigoShare?.toFixed(1)}%]\n` +
      `  semilla strong vista : ${seedSeen.strong.join(", ") || "—"}  | falta: ${seedMissing.strong.join(", ") || "—"}\n` +
      `  semilla context vista: ${seedSeen.context.join(", ") || "—"} | falta: ${seedMissing.context.join(", ") || "—"}\n` +
      `  → ${OUT_MD}\n`,
  );
}

function aggregateBy(rows, keyFn) {
  const map = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    const cur = map.get(k) ?? { segmento: k, familia: familiaOf(r.digits), n: 0, codigos: 0 };
    cur.n += r.n;
    cur.codigos += 1;
    map.set(k, cur);
  }
  return [...map.values()].sort((a, b) => b.n - a.n);
}

function fmt(n) {
  return new Intl.NumberFormat("es-CO").format(n);
}

function renderMarkdown(m) {
  const t = m.totals;
  const seedLine = (arr) => (arr.length ? "`" + arr.join("`, `") + "`" : "—");

  const topRows = m.rows
    .map(
      (r) =>
        `| ${r.rank} | \`${r.raw}\` | ${r.digits ?? "—"} | ${fmt(r.n)} | ${r.pctRed.toFixed(2)}% | ${r.pctAcum.toFixed(1)}% | ${r.familia} | ${r.tag} |`,
    )
    .join("\n");

  const segRows = m.segmentos
    .map((s) => {
      const tipo = s.segmento === "—" ? "—" : CORE_SEGMENTS.has(s.segmento) ? "core" : "no-core";
      return `| ${s.segmento} | ${s.familia} | ${tipo} | ${s.codigos} | ${fmt(s.n)} | ${pct(s.n, t.red).toFixed(1)}% |`;
    })
    .join("\n");

  const h = m.hallazgos;
  const dom = h.dominanteNoCore;

  return `# A1 — UNSPSC derivado empíricamente (sector agua-saneamiento)

> **Generado** por \`scripts/exploration/derive-unspsc.mjs\` el ${m.generatedAt}.
> NO editar a mano: re-correr el script para regenerar. Sidecar JSON:
> \`0.2.1-unspsc-derivado.json\`.
>
> Esta es la **lista autoritativa** de UNSPSC del sector (ADR-0001, Opción C).
> Alimenta (1) la red de ingesta y (2) los diccionarios del clasificador.

## Método

Dataset \`${m.dataset}\` (SECOP II · Procesos). Se cuenta la frecuencia de
\`${m.fields.unspsc}\` sobre los procesos cuyo \`${m.fields.nombre}\` o
\`${m.fields.descripcion}\` matchean la red de keywords (abajo), agrupando
server-side y ordenando por frecuencia. \`upper()\` de SoQL no quita tildes, por
eso las keywords evitan vocales acentuadas.

**Keywords de derivación (red amplia, recall):**
${m.keywords.map((k) => "`" + k + "`").join(" · ")}

## Magnitudes

| Métrica | Valor |
|---|---|
| Procesos nacionales totales | **${fmt(t.nacional)}** |
| Procesos en la red de keywords | **${fmt(t.red)}** |
| Proporción sectorial sobre nacional | **${t.pctRedSobreNacional.toFixed(2)} %** |
| UNSPSC distintos (top-${TOP_N}) | ${t.codigosDistintosTopN} |
| Cobertura del top-${TOP_N} sobre la red | ${t.pctCoberturaTopN.toFixed(1)} % |
| Filas sin código UNSPSC (\`UNSPECIFIED\`/null) | ${fmt(t.sinCodigoUnspsc)} |

> El **${t.pctRedSobreNacional.toFixed(2)} %** confirma el ratio ~100:1 del ADR-0001:
> filtrar en ingesta es correcto. Las filas **sin código** solo las pesca el
> texto → la red de ingesta NO puede ser solo-UNSPSC; keywords son obligatorias.

## Hallazgos automáticos (precisión: dónde mirar en A3)

A1 no decide precisión (eso es A3 con etiquetado manual); solo señala anomalías.
Reparto de la red analizada (top-${TOP_N}, = ${t.pctCoberturaTopN.toFixed(1)}% de la red):

| Bucket | Procesos | Share | Lectura |
|---|---|---|---|
| **core** (agua genuino: infra, tratamiento, ingeniería, suministro) | ${fmt(h.coreN)} | **${h.coreShare.toFixed(1)} %** | candidatos reales del sector |
| **no-core** (otros segmentos, entran por texto) | ${fmt(h.nonCoreN)} | **${h.nonCoreShare.toFixed(1)} %** | sospechosos de falso positivo → A3 |
| **sin código** (\`UNSPECIFIED\`) | ${fmt(t.sinCodigoUnspsc)} | ${h.sinCodigoShare.toFixed(1)} % | solo el texto los clasifica |

> 🚨 **Anomalía dominante:** el segmento **${dom?.segmento}** (${dom?.familia}) es el
> **${dom?.share.toFixed(1)} %** de la red — su código top \`${dom?.topCodigo}\` solo pesa
> **${dom?.topCodigoShare?.toFixed(1)} %**. Es contaminación de keyword (p. ej.
> "contratación de **personal** para la empresa de **acueducto**"): el texto matchea
> pero el objeto NO es infraestructura ni un pliego con presupuesto. **Implicación de
> diseño:** el segmento ${dom?.segmento} debe ser **señal de exclusión** del clasificador
> y NO debería inflar la red de ingesta. Prioridad #1 para el etiquetado de A3.

## Cobertura de la semilla del clasificador actual (dictionaries.ts)

| Señal | Prefijos | Vistos en datos | No vistos (¿podar?) |
|---|---|---|---|
| strong  | \`${SEED_STRONG.join("`, `")}\` | ${seedLine(m.seed.seen.strong)} | ${seedLine(m.seed.missing.strong)} |
| context | \`${SEED_CONTEXT.join("`, `")}\` | ${seedLine(m.seed.seen.context)} | ${seedLine(m.seed.missing.context)} |

## Agregado por segmento UNSPSC (2 dígitos)

| Segmento | Familia | tipo | # códigos | Procesos | % de la red |
|---|---|---|---|---|---|
${segRows}

## Top-${TOP_N} UNSPSC por frecuencia

\`tag\`: **strong**/**context** = ya en el clasificador · **nuevo** = candidato a
sumar · **sin-codigo** = \`UNSPECIFIED\`.

| # | Código crudo | Dígitos | Procesos | % red | % acum | Familia | tag |
|---|---|---|---|---|---|---|---|
${topRows}

## Cómo se consume esto

1. **Red de ingesta** (Fase B / ADR-0001): segmentos dominantes + keywords →
   \`$where\` sectorial del keyset/sweep. Debe ser superconjunto del clasificador.
2. **Clasificador** (dictionaries.ts): promover a \`strong\`/\`context\` los
   prefijos con volumen real y precisión; subir \`CLASIFICADOR_VERSION\`.
3. **A3** (validación precision/recall): muestrear ~50 de la red, etiquetar a
   mano, medir falsos positivos/negativos y recalibrar umbrales.
`;
}

main().catch((err) => {
  process.stderr.write(`[A1] ERROR: ${err?.stack ?? err}\n`);
  process.exit(1);
});
