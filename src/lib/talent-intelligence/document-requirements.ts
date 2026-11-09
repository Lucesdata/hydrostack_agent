import { encontrarCitaEnTexto } from "./evidence-text";
import { extraerRequisitosPersonalDeTexto, type RequisitoPersonalV0 } from "./staff-requirements";

/**
 * Adaptador puro para páginas de texto YA extraídas de un documento.
 * No descarga PDFs ni certifica autenticidad u origen oficial.
 */
export interface PaginaDeDocumento {
  numero: number;
  texto: string;
}

export interface ResultadoDocumental {
  documentoId: string;
  pagina: number;
  requisito: RequisitoPersonalV0;
  citaEnTexto: {
    inicio: number;
    fin: number;
  };
  documentoOriginalVerificado: false;
}

export function extraerPersonalPorPaginas(
  documentoId: string,
  paginas: readonly PaginaDeDocumento[]
): ResultadoDocumental[] {
  if (!documentoId.trim()) throw new Error("Falta identificador del documento");
  const salida: ResultadoDocumental[] = [];
  const paginasVistas = new Set<number>();

  for (const pagina of paginas) {
    if (!Number.isInteger(pagina.numero) || pagina.numero < 1) {
      throw new Error("Número de página inválido");
    }
    if (paginasVistas.has(pagina.numero)) {
      throw new Error("Número de página duplicado");
    }
    paginasVistas.add(pagina.numero);

    const requisitos = extraerRequisitosPersonalDeTexto(pagina.texto);
    for (const requisito of requisitos) {
      const cita = encontrarCitaEnTexto(pagina.texto, requisito.evidencia.fragmento);
      if (!cita) continue;
      salida.push({
        documentoId,
        pagina: pagina.numero,
        requisito,
        citaEnTexto: { inicio: cita.inicio, fin: cita.fin },
        documentoOriginalVerificado: false,
      });
    }
  }
  return salida;
}
