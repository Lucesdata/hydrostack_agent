/**
 * Señal de fallback del extractor híbrido: el parser de reglas no encontró la
 * estructura que esperaba (encabezado/columna/heading ausente, o el archivo no
 * tiene capa de texto/hoja legible) — nunca se lanza por un resultado del
 * validador aritmético, esos son errores reales del pliego, no de parseo.
 */
export class ParseoNoConfiable extends Error {
  constructor(motivo: string) {
    super(motivo);
    this.name = "ParseoNoConfiable";
  }
}
