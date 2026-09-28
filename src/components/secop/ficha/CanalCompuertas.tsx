import {
  PALABRA_ESTADO,
  type CompuertaVista,
  type EstadoCompuerta,
} from "@/src/lib/secop/semaforo";

/**
 * Las cinco compuertas dibujadas como compuertas de un canal.
 *
 * El producto ya las llamaba compuertas; aquí se ven. La FORMA dice el estado
 * además de la palabra y el color (criterio 3 del spec
 * `2026-09-28-ficha-bloque-decision.md`): quitando el color, se siguen
 * distinguiendo.
 *
 *   cumple     → arriba, el agua pasa
 *   revisar    → a media altura
 *   no cumple  → abajo, corta el agua
 *   sin datos  → contorno punteado
 *   exige      → contorno neutro (lectura del proceso, sin perfil: no hay agua)
 *
 * El agua corre de izquierda a derecha y se detiene en la primera que no
 * cumple; detrás de una sin datos corre más tenue. El SVG es decorativo
 * (`aria-hidden`): la etiqueta y la palabra van en texto.
 *
 * Presentacional puro, sin estado: recibe las compuertas ya resueltas.
 */

/** Posición y alto de la hoja de la compuerta, en el viewBox 60×72. */
const HOJA: Record<EstadoCompuerta, { y: number; alto: number }> = {
  PASS: { y: 8, alto: 16 },
  WARN: { y: 26, alto: 26 },
  FAIL: { y: 8, alto: 64 },
  UNKNOWN: { y: 26, alto: 26 },
  DATO: { y: 26, alto: 26 },
};

const CLASE: Record<EstadoCompuerta, string> = {
  PASS: "pass",
  WARN: "warn",
  FAIL: "fail",
  UNKNOWN: "unknown",
  DATO: "dato",
};

/** `tope`: el agua llega hasta la compuerta que no cumple y ahí se detiene. */
type Agua = "fluye" | "tenue" | "tope" | "seco";

/** El agua de cada tramo: se corta en la primera FAIL y no hay sin perfil. */
export function aguaDelCanal(compuertas: CompuertaVista[], relativo: boolean): Agua[] {
  let cortada = !relativo;
  return compuertas.map((c) => {
    const agua: Agua = cortada
      ? "seco"
      : c.estado === "FAIL"
        ? "tope"
        : c.estado === "UNKNOWN"
          ? "tenue"
          : "fluye";
    if (c.estado === "FAIL") cortada = true;
    return agua;
  });
}

export default function CanalCompuertas({
  compuertas,
  relativo,
}: {
  compuertas: CompuertaVista[];
  relativo: boolean;
}) {
  const agua = aguaDelCanal(compuertas, relativo);

  return (
    <ul className="fd-canal">
      {compuertas.map((c, i) => {
        const hoja = HOJA[c.estado];
        const clase = CLASE[c.estado];
        return (
          <li key={c.clave} className="fd-compuerta" data-estado={clase}>
            <div className="fd-tramo">
              <span className={`fd-agua fd-agua--${agua[i]}`} aria-hidden="true" />
              <svg className="fd-svg" viewBox="0 0 60 72" aria-hidden="true" focusable="false">
                <rect className="fd-poste" x="4" y="4" width="5" height="68" rx="1" />
                <rect className="fd-poste" x="51" y="4" width="5" height="68" rx="1" />
                <rect className="fd-poste" x="3" y="2" width="54" height="4" rx="1" />
                <rect
                  className={`fd-hoja fd-hoja--${clase}`}
                  x="10"
                  y={hoja.y}
                  width="40"
                  height={hoja.alto}
                  rx="2"
                />
              </svg>
            </div>
            <span className="fd-etiqueta">{c.etiqueta}</span>
            {c.estado === "DATO" ? (
              <span className="fd-valor">{c.valorCorto}</span>
            ) : (
              <span className={`fd-palabra fd-palabra--${clase}`}>{PALABRA_ESTADO[c.estado]}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
