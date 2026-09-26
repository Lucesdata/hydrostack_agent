"use client";

import Link from "next/link";
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
      <h2>{departamento?.label ?? "Colombia"}</h2>
      <p className="aqFichaNumero">
        <strong>{formatConteo(departamento?.n ?? null)}</strong>
        <span>procesos abiertos</span>
      </p>
      <p className="aqFichaPorcentaje">
        {porcentaje == null
          ? "—"
          : `${porcentaje.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} % del total nacional`}
      </p>
      <p className="aqFichaNota">Según ubicación de la entidad contratante</p>
      {departamento && departamento.n > 0 ? (
        <Link
          className="aqFichaCta"
          href={`/licitaciones/departamento/${departamento.slug}`}
          aria-label={`Ver procesos de ${departamento.label}`}
        >
          Ver procesos de {departamento.label} <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </aside>
  );
}
