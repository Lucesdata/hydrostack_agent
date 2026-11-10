import { pdfToText } from "../pliego/rules/pdfToText";
import { prepararRevisionPersonal, type RequisitoEnRevision } from "./talent-review";
import {
  extraerPersonalPorPaginas,
  type PaginaDeDocumento,
  type ResultadoDocumental,
} from "./document-requirements";

/**
 * Divide la salida de Poppler `pdftotext -layout` usando saltos reales de página.
 * Si faltan, falla de forma cerrada: no se debe atribuir página 1 por suposición.
 * NO valida que el PDF sea oficial, ni corrige tablas desordenadas.
 */
export function dividirTextoPdfEnPaginas(texto: string): PaginaDeDocumento[] {
  if (!texto.includes("\f")) {
    throw new Error("Texto PDF sin delimitadores de página; origen no verificable");
  }
  if (texto.length > 20_000_000) {
    throw new Error("Texto PDF excede el límite admitido");
  }

  const fragmentos = texto.split("\f");
  // pdftotext termina normalmente con un delimitador `\f`, sin página adicional.
  if (fragmentos[fragmentos.length - 1] === "") fragmentos.pop();
  if (fragmentos.length === 0 || fragmentos.length > 1000 || fragmentos.every((p) => !p.trim())) {
    throw new Error("Número de páginas PDF fuera de rango");
  }

  // Las páginas vacías intermedias cuentan para mantener la numeración original.
  return fragmentos.map((textoPagina, indice) => ({
    numero: indice + 1,
    texto: textoPagina,
  }));
}

/**
 * Conexión optativa, separada del extractor híbrido: reutiliza su pdfToText.
 * Solo devuelve candidatos con evidencia localizada dentro del texto extraído.
 * Nunca persiste, publica, asigna vacantes ni afirma procedencia oficial.
 */
export async function extraerRequisitosPersonalPdf(
  documentoId: string,
  pdf: string | Buffer
): Promise<ResultadoDocumental[]> {
  if (!documentoId.trim()) throw new Error("Falta identificador del documento");
  const texto = await pdfToText(pdf);
  return extraerPersonalPorPaginas(documentoId, dividirTextoPdfEnPaginas(texto));
}

/**
 * Punto de entrada seguro para una futura interfaz de revisión.
 * Reutiliza el texto una sola vez y NO genera datos publicables.
 */
export async function extraerRequisitosPersonalPdfParaRevision(
  documentoId: string,
  pdf: string | Buffer
): Promise<RequisitoEnRevision[]> {
  if (!documentoId.trim()) throw new Error("Falta identificador del documento");
  const texto = await pdfToText(pdf);
  const paginas = dividirTextoPdfEnPaginas(texto);
  const resultados = extraerPersonalPorPaginas(documentoId, paginas);
  return prepararRevisionPersonal(resultados, paginas);
}
