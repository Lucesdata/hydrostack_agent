"use client";

import { formatConteo } from "@/src/components/secop/format";

export function porcentajeNacional(n, totalAbiertos) {
  if (totalAbiertos == null || totalAbiertos <= 0 || n == null) return null;
  return (100 * n) / totalAbiertos;
}

export default function FichaDepartamento({ departamento, totalAbiertos }) {
  const porcentaje = porcentajeNacional(departamento?.n ?? null, totalAbiertos);

  return (
    <aside
      id="aq-ficha-territorial"
      className="aqFicha"
      aria-label="Resumen del territorio"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="aqFichaEyebrow">Territorio seleccionado</p>
      <h2>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"
            fill="currentColor"
          />
        </svg>
        {departamento?.label ?? "Colombia"}
      </h2>
      <div className="aqFichaDatos">
        <p className="aqFichaNumero">
          <strong>{formatConteo(departamento?.n ?? null)}</strong>
          <span>procesos abiertos</span>
        </p>
        <p className="aqFichaPorcentaje">
          <strong>
            {porcentaje == null
              ? "—"
              : `${porcentaje.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`}
          </strong>
          <span>del total nacional</span>
        </p>
      </div>
      <p className="aqFichaNota">Según ubicación de la entidad contratante</p>
    </aside>
  );
}
