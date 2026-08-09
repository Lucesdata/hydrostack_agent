/**
 * Parser de reglas para el "Documento Base o Pliegos Tipo" (CCE-EICP-GI-09),
 * el PDF nativo (con capa de texto) que casi todo proceso de obra pública con
 * Documentos Tipo publica. Ataca solo las secciones que son prosa numerada
 * bien estructurada — verificado contra el PDF real usado en esta sesión
 * (LP-2026-6, PTAP Municipio de Pasto):
 *
 *   · 1.15 CAUSALES DE RECHAZO → lista con letras A., B., C.… → reglas_presupuesto[].
 *   · 3.5/3.6/3.8 EXPERIENCIA / CAPACIDAD FINANCIERA / CAPACIDAD ORGANIZACIONAL
 *     → texto crudo de cada sección (sin resumir) → requisitos_habilitantes.
 *
 * Deliberadamente NO intenta: proceso, entidad, modalidad, fechas, presupuesto
 * oficial. Esos viven en tablas que `pdftotext -layout` destroza (columnas
 * intercaladas línea por línea) — confirmado en esta sesión sobre el mismo
 * documento. Forzar regex ahí sería adivinar, no parsear con confianza; se
 * dejan siempre al extractor LLM.
 *
 * Requiere el texto ya extraído (mismo `pdftotext -layout` que usa
 * extractPliegoGroq.ts) — este módulo no toca el PDF directamente.
 */

import { ParseoNoConfiable } from "./errors";
import type { RequisitosHabilitantes } from "../schema";

export interface DocumentoBaseExtraccion {
  reglas_presupuesto: string[];
  requisitos_habilitantes: RequisitosHabilitantes;
}

/** Encabezado/pie de página que CCE repite en cada una de las páginas del template. */
const BOILERPLATE = [
  /^\s*Código\s+CCE-EICP-GI-09.*$/,
  /^\s*Versión\s+No\.?\s*\d+\s*$/,
  /^\s*DOCUMENTO BASE O PLIEGOS TIPO\s*$/,
  /^\s*LICITACIÓN DE OBRA PÚBLICA.*$/,
  /^\s*Página\s+\d+\s+de\s+\d+\s*$/,
  /^\s*\d{1,4}\s*$/, // número de página suelto en su propia línea (footer del template CCE)
];

/** Entrada de tabla de contenido: numeral + título + puntos de relleno + página. */
const TOC_LINEA = /\.{4,}\s*\d+\s*$/;

function limpiarTexto(texto: string): string {
  return texto
    .split("\n")
    .filter((linea) => !TOC_LINEA.test(linea) && !BOILERPLATE.some((re) => re.test(linea)))
    .join("\n");
}

/** Recorta el texto entre el heading de inicio (incluido) y el de fin (excluido). */
function extraerBloque(textoLimpio: string, inicioRe: RegExp, finRe: RegExp): string {
  const inicioMatch = inicioRe.exec(textoLimpio);
  if (!inicioMatch) {
    throw new ParseoNoConfiable(`No se encontró el heading de inicio: ${inicioRe}`);
  }
  const desdeInicio = textoLimpio.slice(inicioMatch.index + inicioMatch[0].length);
  const finMatch = finRe.exec(desdeInicio);
  return finMatch ? desdeInicio.slice(0, finMatch.index) : desdeInicio;
}

/** Colapsa saltos de línea de word-wrap en un solo párrafo legible. */
function aParrafo(bloque: string): string {
  return bloque
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "A. texto…\nB. texto…" → ["texto…", "texto…"], exigiendo secuencia A,B,C… para evitar falsos positivos. */
function parseListaLetras(bloque: string): string[] {
  const items: string[] = [];
  let actual = "";
  let siguienteLetra = "A".charCodeAt(0);

  for (const lineaRaw of bloque.split("\n")) {
    const m = /^\s{0,6}([A-Z])\.\s+(.*)$/.exec(lineaRaw);
    if (m && m[1].charCodeAt(0) === siguienteLetra) {
      if (actual.trim()) items.push(aParrafo(actual));
      actual = m[2];
      siguienteLetra += 1;
    } else if (siguienteLetra > "A".charCodeAt(0)) {
      actual += "\n" + lineaRaw;
    }
  }
  if (actual.trim()) items.push(aParrafo(actual));
  return items;
}

export function parseDocumentoBaseTexto(textoCrudo: string): DocumentoBaseExtraccion {
  const texto = limpiarTexto(textoCrudo);

  const bloqueRechazo = extraerBloque(
    texto,
    /^\s*1\.15\.\s+CAUSALES DE RECHAZO\s*$/m,
    /^\s*1\.16\./m
  );
  const reglas_presupuesto = parseListaLetras(bloqueRechazo);
  if (reglas_presupuesto.length === 0) {
    throw new ParseoNoConfiable("CAUSALES DE RECHAZO no tiene ítems con formato A./B./C.…");
  }

  // Solo la introducción de 3.5 — el heading tiene hasta 7 subsecciones anidadas
  // (matrices de experiencia, tablas de contratos…) que harían este campo
  // inmanejable como "resumen" si se capturara todo hasta 3.6.
  const experiencia_especifica = aParrafo(
    extraerBloque(
      texto,
      /^\s*3\.5\.\s+EXPERIENCIA\s*$/m,
      /^\s*(3\.5\.1\.|3\.6\.\s+CAPACIDAD FINANCIERA)/m
    )
  );
  const capacidad_financiera = aParrafo(
    extraerBloque(
      texto,
      /^\s*3\.6\.\s+CAPACIDAD FINANCIERA\s*$/m,
      /^\s*3\.8\.\s+CAPACIDAD ORGANIZACIONAL/m
    )
  );
  const capacidad_organizacional = aParrafo(
    extraerBloque(texto, /^\s*3\.8\.\s+CAPACIDAD ORGANIZACIONAL\s*$/m, /^\s*3\.9\.\s+ACREDITACIÓN/m)
  );

  return {
    reglas_presupuesto,
    requisitos_habilitantes: {
      experiencia_especifica,
      capacidad_financiera,
      capacidad_organizacional,
    },
  };
}
