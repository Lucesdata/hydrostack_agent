"use client";

/**
 * "Descargar PDF" con la impresión del navegador (Guardar como PDF): sin
 * dependencias. La hoja de impresión del informe deja solo el contenido.
 */
export default function BotonImprimir() {
  return (
    <button type="button" className="inf-imprimir no-imprimir" onClick={() => window.print()}>
      Descargar PDF
    </button>
  );
}
