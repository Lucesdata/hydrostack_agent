"use client";

import { useState } from "react";

/**
 * El número del proceso con un botón para copiarlo: el experto lo pega en el
 * buscador del SECOP II, donde vive su oferta. Isla mínima para que la
 * cabecera siga siendo de servidor.
 */
export default function CopiarNumero({ numero }: { numero: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(numero);
      setCopiado(true);
    } catch (err) {
      console.warn("ficha: el navegador no dejó copiar el número", err);
    }
  }

  return (
    <span className="fd-id">
      <span className="fd-id-num">{numero}</span>
      <button type="button" className="fd-copiar" onClick={copiar} aria-live="polite">
        {copiado ? "Copiado" : "Copiar número"}
      </button>
    </span>
  );
}
