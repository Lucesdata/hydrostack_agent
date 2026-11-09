/**
 * Evaluación del clasificador tecnológico contra el etiquetado de dos
 * revisores (CI-02b). Puro: no lee archivos ni base de datos.
 *
 * Mide lo que el PRD §14 pide y que el spike CI-02 no pudo afirmar: precisión de
 * clasificación en categoría raíz (umbral inicial ≥ 80 %, hipótesis de trabajo)
 * y acuerdo entre revisores (kappa de Cohen). Solo se evalúa contra filas
 * donde los dos revisores coinciden; las discrepancias se devuelven para
 * adjudicarlas, no se resuelven aquí.
 */

export const ACTIVIDADES = [
  "SUBSIDIO_O_AJENO",
  "OBRA_REDES",
  "OYM",
  "ESTUDIO_DISENO_INTERVENTORIA",
  "LABORATORIO_ANALISIS",
  "SUMINISTRO_BIEN",
  "OTRO",
] as const;
export type Actividad = (typeof ACTIVIDADES)[number];

export interface EtiquetaRevisor {
  id: string;
  actividad: string;
  bienExplicito: string; // SI | NO
  /** Códigos de taxonomía separados por «;». Vacío si no hay bien explícito. */
  categorias: string;
}

/** Candidatos del clasificador por contrato (códigos, pueden ser hijos). */
export type ClaveClasificador = Record<string, readonly string[]>;

/** Parser CSV RFC 4180 mínimo: comillas dobles, comas y saltos de línea dentro de campos. */
export function parseCsv(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let entreComillas = false;
  const t = texto.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (entreComillas) {
      if (ch === '"' && t[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (ch === '"') {
        entreComillas = false;
      } else {
        campo += ch;
      }
    } else if (ch === '"') {
      entreComillas = true;
    } else if (ch === ",") {
      fila.push(campo);
      campo = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else {
      campo += ch;
    }
  }
  if (campo !== "" || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }
  return filas.filter((f) => f.some((c) => c.trim() !== ""));
}

export function aCsv(filas: readonly (readonly string[])[]): string {
  const esc = (c: string) => (/[",\n\r]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c);
  return filas.map((f) => f.map(esc).join(",")).join("\n") + "\n";
}

/** Convierte un CSV con cabecera a etiquetas; falla si faltan columnas. */
export function etiquetasDeCsv(texto: string): EtiquetaRevisor[] {
  const [cab, ...filas] = parseCsv(texto);
  if (!cab) throw new Error("CSV vacío");
  const idx = (n: string) => {
    const i = cab.map((c) => c.trim().toLowerCase()).indexOf(n);
    if (i === -1) throw new Error(`Falta la columna «${n}»`);
    return i;
  };
  const [iId, iAct, iBien, iCat] = ["id", "actividad", "bien_explicito", "categorias"].map(idx);
  return filas.map((f) => ({
    id: (f[iId] ?? "").trim(),
    actividad: (f[iAct] ?? "").trim().toUpperCase(),
    bienExplicito: (f[iBien] ?? "").trim().toUpperCase(),
    categorias: (f[iCat] ?? "").trim().toUpperCase(),
  }));
}

/** Kappa de Cohen para dos listas de etiquetas del mismo largo. */
export function kappaCohen(a: readonly string[], b: readonly string[]): number | null {
  if (a.length !== b.length) throw new Error("Las listas deben tener el mismo largo");
  const n = a.length;
  if (n === 0) return null;
  const acuerdo = a.filter((x, i) => x === b[i]).length / n;
  const etiquetas = new Set([...a, ...b]);
  let esperado = 0;
  for (const e of etiquetas) {
    const pa = a.filter((x) => x === e).length / n;
    const pb = b.filter((x) => x === e).length / n;
    esperado += pa * pb;
  }
  if (esperado === 1) return acuerdo === 1 ? 1 : null;
  return (acuerdo - esperado) / (1 - esperado);
}

const raiz = (codigo: string) => codigo.split(".")[0];
const conjuntoRaices = (categorias: string): Set<string> =>
  new Set(
    categorias
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .map(raiz)
  );

export interface InformeEvaluacion {
  contratos: number;
  conAmbosRevisores: number;
  acuerdo: { actividad: number; bienExplicito: number };
  kappa: { actividad: number | null; bienExplicito: number | null };
  /** Contratos donde los revisores discrepan en algún campo: hay que adjudicarlos. */
  porAdjudicar: string[];
  /** Solo sobre contratos con consenso en todos los campos. */
  consenso: {
    contratos: number;
    candidatos: number;
    candidatosCorrectos: number;
    precisionRaiz: number | null;
    esperadas: number;
    encontradas: number;
    recobradoRaiz: number | null;
    falsosPositivos: { id: string; categoria: string }[];
    omitidos: { id: string; categoria: string }[];
    /** Contratos con bien explícito (consenso) y con al menos un candidato del clasificador. */
    cobertura: { conBienExplicito: number; conCandidato: number };
  };
}

export function evaluar(
  r1: readonly EtiquetaRevisor[],
  r2: readonly EtiquetaRevisor[],
  clave: ClaveClasificador
): InformeEvaluacion {
  const m2 = new Map(r2.map((e) => [e.id, e]));
  const pares = r1.flatMap((a) => {
    const b = m2.get(a.id);
    return b ? [[a, b] as const] : [];
  });

  const act1 = pares.map(([a]) => a.actividad);
  const act2 = pares.map(([, b]) => b.actividad);
  const bien1 = pares.map(([a]) => a.bienExplicito);
  const bien2 = pares.map(([, b]) => b.bienExplicito);
  const pct = (x: readonly string[], y: readonly string[]) =>
    x.length === 0 ? 0 : x.filter((v, i) => v === y[i]).length / x.length;

  const porAdjudicar: string[] = [];
  const consensuados: (readonly [EtiquetaRevisor, EtiquetaRevisor])[] = [];
  for (const par of pares) {
    const [a, b] = par;
    const igual =
      a.actividad === b.actividad &&
      a.bienExplicito === b.bienExplicito &&
      [...conjuntoRaices(a.categorias)].sort().join(";") ===
        [...conjuntoRaices(b.categorias)].sort().join(";");
    if (igual) consensuados.push(par);
    else porAdjudicar.push(a.id);
  }

  let candidatos = 0;
  let correctos = 0;
  let esperadas = 0;
  let encontradas = 0;
  let conBien = 0;
  let conCand = 0;
  const falsosPositivos: { id: string; categoria: string }[] = [];
  const omitidos: { id: string; categoria: string }[] = [];

  for (const [a] of consensuados) {
    const verdad = conjuntoRaices(a.categorias);
    const predicho = new Set((clave[a.id] ?? []).map(raiz));
    if (a.bienExplicito === "SI") {
      conBien++;
      if (predicho.size > 0) conCand++;
    }
    for (const p of predicho) {
      candidatos++;
      if (verdad.has(p)) correctos++;
      else falsosPositivos.push({ id: a.id, categoria: p });
    }
    for (const v of verdad) {
      esperadas++;
      if (predicho.has(v)) encontradas++;
      else omitidos.push({ id: a.id, categoria: v });
    }
  }

  return {
    contratos: r1.length,
    conAmbosRevisores: pares.length,
    acuerdo: { actividad: pct(act1, act2), bienExplicito: pct(bien1, bien2) },
    kappa: { actividad: kappaCohen(act1, act2), bienExplicito: kappaCohen(bien1, bien2) },
    porAdjudicar: porAdjudicar.sort(),
    consenso: {
      contratos: consensuados.length,
      candidatos,
      candidatosCorrectos: correctos,
      precisionRaiz: candidatos === 0 ? null : correctos / candidatos,
      esperadas,
      encontradas,
      recobradoRaiz: esperadas === 0 ? null : encontradas / esperadas,
      falsosPositivos,
      omitidos,
      cobertura: { conBienExplicito: conBien, conCandidato: conCand },
    },
  };
}
