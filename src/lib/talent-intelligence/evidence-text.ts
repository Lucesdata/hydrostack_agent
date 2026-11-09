/**
 * Comprueba una cita en texto extraído; NO certifica el PDF original.
 */
export interface CoincidenciaCita {
  fragmento: string;
  inicio: number;
  fin: number;
  verificadaEnTexto: true;
  documentoOriginalVerificado: false;
}

function escapeRegExp(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function encontrarCitaEnTexto(
  textoDocumento: string,
  cita: string,
): CoincidenciaCita | null {
  const palabras = cita.trim().split(/\s+/).filter(Boolean);
  if (palabras.length < 3 || textoDocumento.trim().length === 0) return null;

  const patron = palabras.map(escapeRegExp).join("\\s+");
  const m = new RegExp(patron, "iu").exec(textoDocumento);
  if (!m) return null;

  return {
    fragmento: m[0],
    inicio: m.index,
    fin: m.index + m[0].length,
    verificadaEnTexto: true,
    documentoOriginalVerificado: false,
  };
}
