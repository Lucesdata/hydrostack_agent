"use client";

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
 * El encabezado del territorio confirmado, encima de la tarjeta del proceso
 * (spec 2026-10-02-hero-mapa-ficha §6 y §7). Solo el nombre: el conteo y el %
 * nacional salieron del bloque principal; el conteo sigue en la lista, en la
 * línea de vista previa del mapa y en los nombres accesibles, y el % en
 * /licitaciones/comparar, que usa los dos helpers de arriba.
 *
 * Nunca cambia al pasar el puntero: el nombre identifica el departamento del
 * proceso de la tarjeta. La vista previa va en el panel del mapa. «← Colombia»
 * salió con la vista país (2026-10-02): la portada llega a un departamento.
 */
export default function FichaDepartamento({ titulo }) {
  return (
    <div id="aq-ficha-territorial" className="aqFicha">
      <h2>{titulo}</h2>
    </div>
  );
}
