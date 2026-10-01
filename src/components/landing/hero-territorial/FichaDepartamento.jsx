"use client";

import { formatConteo } from "@/src/components/secop/format";

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

/**
 * El resultado de elegir un departamento: su nombre, cuántos procesos abiertos
 * tiene y qué parte del total nacional son. Nada más (2026-09-27, plan
 * portada-esencial): los publicados en 7 días, el monto en juego y las
 * entidades siguen en /licitaciones/comparar; la nota de la sede va en la
 * cabecera del mapa, que es donde define lo que se ve.
 *
 * `onVolver`, si llega, pinta «← Colombia» en la cabecera: la vista país es la
 * inicial (2026-09-28, hero v2) y elegir un departamento no debe ser un viaje
 * sin vuelta.
 */
export default function FichaDepartamento({
  departamento,
  totalAbiertos,
  vistaPrevia = false,
  onVolver = undefined,
}) {
  // Sin departamento (ninguno tiene procesos o no hay datos) habla del país:
  // su total, que distingue un cero real (0) de un dato ausente (—).
  const esPais = !departamento;
  const n = esPais ? (totalAbiertos ?? null) : departamento.n;
  const porcentaje = porcentajeNacional(n, totalAbiertos);

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
      <div className="aqFichaCab">
        <h2>{departamento?.label ?? "Colombia"}</h2>
        {vistaPrevia ? (
          <span className="aqFichaPrevia">Vista previa</span>
        ) : onVolver ? (
          <button
            type="button"
            className="aqFichaVolver"
            onClick={onVolver}
            aria-label="Volver a la vista de Colombia"
          >
            <span aria-hidden="true">← </span>Colombia
          </button>
        ) : null}
      </div>
      <p className="aqFichaCifra">
        <strong>{formatConteo(n)}</strong> {n === 1 ? "proceso abierto" : "procesos abiertos"}
        {esPais ? null : (
          <>
            <span aria-hidden="true"> · </span>
            <span className="aqFichaPct">
              {porcentaje == null ? "—" : formatPorcentaje(porcentaje)} del total nacional
            </span>
          </>
        )}
      </p>
    </aside>
  );
}
