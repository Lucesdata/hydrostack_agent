/**
 * Parser de reglas para el "Formulario 1 — Formulario de Presupuesto Oficial"
 * (CCE-EICP-FM-47), el Excel estándar donde vive la matriz de ítems cuando la
 * entidad lo publica en ese formato (en vez de PDF, nativo o escaneado).
 *
 * ADVERTENCIA: no se validó todavía contra un archivo real — en esta sesión
 * solo se vio su nombre listado en SECOP (LP-2026-6, PTAP Municipio de
 * Pasto), no se descargó. La detección de columnas es por firma de encabezado
 * (busca palabras clave, no posiciones fijas) para tolerar variación de
 * layout entre entidades, y el diseño exige que si no encuentra la firma
 * esperada lance `ParseoNoConfiable` — el llamador cae a LLM automáticamente,
 * así que un archivo real con estructura distinta a la asumida aquí no rompe
 * nada, simplemente no activa el camino de reglas hasta que se ajuste esta
 * detección contra un ejemplo real.
 *
 * Sin marcador confirmado de capítulo/sección en el formato estándar: se
 * agrupan los ítems bajo un capítulo nuevo cada vez que aparece una fila de
 * texto sin cantidades (heurística común de plantillas con secciones en
 * fila propia) — si nunca ocurre, todo cae en un único capítulo.
 */

import ExcelJS from "exceljs";
import { ParseoNoConfiable } from "./errors";
import { NO_ENCONTRADO, type PliegoCapitulo, type PliegoItem } from "../schema";

type CampoColumna =
  "codigo" | "descripcion" | "unidad" | "cantidad" | "valor_unitario" | "valor_total";

const COLUMNAS_ESPERADAS: Record<CampoColumna, string[]> = {
  codigo: ["item", "ítem", "codigo", "código", "ref"],
  descripcion: ["descripcion", "descripción", "actividad", "concepto"],
  unidad: ["unidad", "und", "un"],
  cantidad: ["cantidad", "cant"],
  valor_unitario: ["valor unitario", "vr unitario", "v. unitario", "precio unitario"],
  valor_total: ["valor total", "vr total", "v. total", "subtotal"],
};

interface MapaColumnas {
  codigo?: number;
  descripcion: number;
  unidad?: number;
  cantidad: number;
  valor_unitario: number;
  valor_total: number;
}

function normalizar(s: unknown): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function detectarEncabezados(fila: ExcelJS.Row): MapaColumnas | null {
  const mapa: Partial<Record<CampoColumna, number>> = {};
  fila.eachCell((cell, colNumber) => {
    const texto = normalizar(cell.text);
    if (!texto) return;
    for (const [campo, alias] of Object.entries(COLUMNAS_ESPERADAS) as [CampoColumna, string[]][]) {
      if (mapa[campo] === undefined && alias.some((a) => texto.includes(a))) {
        mapa[campo] = colNumber;
      }
    }
  });
  if (mapa.descripcion && mapa.cantidad && mapa.valor_unitario && mapa.valor_total) {
    return mapa as MapaColumnas;
  }
  return null;
}

function aNumero(valor: ExcelJS.CellValue): number | null {
  if (typeof valor === "number") return valor;
  if (typeof valor === "string") {
    const limpio = valor
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^0-9.\-]/g, "");
    if (!limpio) return null;
    const n = parseFloat(limpio);
    return Number.isNaN(n) ? null : n;
  }
  if (valor && typeof valor === "object" && "result" in valor) {
    return aNumero((valor as { result: ExcelJS.CellValue }).result);
  }
  return null;
}

const MAX_FILAS_BUSQUEDA_ENCABEZADO = 30;

export async function parseFormulario1Xls(buffer: Buffer): Promise<PliegoCapitulo[]> {
  const workbook = new ExcelJS.Workbook();
  try {
    // exceljs trae una @types/node anidada (vía su dependencia fast-csv) distinta a
    // la del proyecto, así que su .d.ts espera un `Buffer` nominalmente distinto al
    // `Buffer<ArrayBufferLike>` de aquí — mismo objeto en runtime, solo choque de tipos.
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  } catch {
    throw new ParseoNoConfiable("El archivo no es un .xlsx/.xls legible.");
  }

  const hoja = workbook.worksheets[0];
  if (!hoja) throw new ParseoNoConfiable("El archivo Excel no tiene hojas.");

  let columnas: MapaColumnas | null = null;
  let filaEncabezado = -1;
  for (let i = 1; i <= Math.min(MAX_FILAS_BUSQUEDA_ENCABEZADO, hoja.rowCount); i++) {
    const detectado = detectarEncabezados(hoja.getRow(i));
    if (detectado) {
      columnas = detectado;
      filaEncabezado = i;
      break;
    }
  }
  if (!columnas) {
    throw new ParseoNoConfiable(
      `No se encontró fila de encabezados (descripción/cantidad/valor unitario/valor total) en las primeras ${MAX_FILAS_BUSQUEDA_ENCABEZADO} filas.`
    );
  }

  const capitulos: PliegoCapitulo[] = [];
  let capituloActual: PliegoCapitulo = { nombre: hoja.name || "Presupuesto", items: [] };

  for (let i = filaEncabezado + 1; i <= hoja.rowCount; i++) {
    const fila = hoja.getRow(i);
    const descripcionCell = fila.getCell(columnas.descripcion).text?.trim() ?? "";
    const cantidad = aNumero(fila.getCell(columnas.cantidad).value);
    const valor_unitario = aNumero(fila.getCell(columnas.valor_unitario).value);
    const valor_total = aNumero(fila.getCell(columnas.valor_total).value);

    const esFilaDeItem =
      descripcionCell && cantidad !== null && valor_unitario !== null && valor_total !== null;

    if (esFilaDeItem) {
      const item: PliegoItem = {
        codigo: columnas.codigo
          ? fila.getCell(columnas.codigo).text?.trim() || NO_ENCONTRADO
          : NO_ENCONTRADO,
        descripcion: descripcionCell,
        unidad: columnas.unidad
          ? fila.getCell(columnas.unidad).text?.trim() || NO_ENCONTRADO
          : NO_ENCONTRADO,
        cantidad,
        valor_unitario,
        valor_total,
        cita_textual: `Fila ${i} de la hoja "${hoja.name}" del Formulario 1.`,
      };
      capituloActual.items.push(item);
      continue;
    }

    if (cantidad !== null || valor_unitario !== null || valor_total !== null) {
      // tiene números pero no calza como ítem completo (subtotal, fila parcial): se ignora
      continue;
    }

    // sin números en ninguna columna clave: primera celda con texto en la fila = posible
    // título de sección/capítulo (suele venir en una celda combinada, no necesariamente
    // alineada con la columna de descripción).
    let textoDivisor = "";
    fila.eachCell((cell) => {
      if (!textoDivisor) {
        const t = cell.text?.trim();
        if (t) textoDivisor = t;
      }
    });
    if (textoDivisor) {
      if (capituloActual.items.length > 0) capitulos.push(capituloActual);
      capituloActual = { nombre: textoDivisor, items: [] };
    }
    // fila completamente vacía: se ignora
  }
  if (capituloActual.items.length > 0) capitulos.push(capituloActual);

  if (capitulos.length === 0) {
    throw new ParseoNoConfiable("Se encontraron encabezados pero ningún ítem válido debajo.");
  }

  return capitulos;
}
