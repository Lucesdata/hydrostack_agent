"use client";

import { formatConteo, formatCopEscala } from "@/src/components/secop/format";

/**
 * "12,5 %". Por debajo de una décima dice "< 0,1 %": con 5 procesos de 35.000,
 * "0,0 %" se lee como que no hay ninguno.
 */
export function formatPorcentaje(pct) {
  if (pct == null) return "—";
  if (pct > 0 && pct < 0.05) return "< 0,1 %";
  return `${pct.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}

export function porcentajeNacional(n, totalAbiertos) {
  if (totalAbiertos == null || totalAbiertos <= 0 || n == null) return null;
  return (100 * n) / totalAbiertos;
}

export default function FichaDepartamento({ departamento, totalAbiertos, vistaPrevia = false }) {
  const porcentaje = porcentajeNacional(departamento?.n ?? null, totalAbiertos);

  return (
    <aside
      id="aq-ficha-territorial"
      className="aqFicha"
      aria-label="Resumen del territorio"
      // Pasar el ratón por el mapa cambia la ficha a cada departamento: anunciar
      // cada paso sería ruido. Solo se anuncia la elección.
      aria-live={vistaPrevia ? "off" : "polite"}
      data-vista-previa={vistaPrevia || undefined}
      aria-atomic="true"
    >
      <p className="aqFichaEyebrow">{vistaPrevia ? "Vista previa" : "Territorio seleccionado"}</p>
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
          <strong>{porcentaje == null ? "—" : formatPorcentaje(porcentaje)}</strong>
          <span>del total nacional</span>
        </p>
      </div>
      {departamento?.nuevos7d != null ? (
        <div className="aqFichaDatos aqFichaDatos--sec">
          <p>
            <strong>{formatConteo(departamento.nuevos7d)}</strong>
            <span>publicados en los últimos 7 días</span>
          </p>
          <p>
            <strong>
              {departamento.nConMonto > 0 ? formatCopEscala(departamento.montoAbierto) : "—"}
            </strong>
            {/* No todos publican presupuesto: se dice sobre cuántos se suma. */}
            <span>
              en juego · {formatConteo(departamento.nConMonto)} de {formatConteo(departamento.n)}{" "}
              con presupuesto
            </span>
          </p>
        </div>
      ) : null}
      {departamento?.nEntidades != null ? (
        <p className="aqFichaEntidades">
          <strong>{formatConteo(departamento.nEntidades)}</strong>{" "}
          {departamento.nEntidades === 1 ? "entidad contrata" : "entidades contratan"} estos
          procesos
        </p>
      ) : null}
      <p className="aqFichaNota">Según ubicación de la entidad contratante</p>
    </aside>
  );
}
