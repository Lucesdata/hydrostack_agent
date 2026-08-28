/**
 * Medidor de preparación.
 *
 * El prototipo de referencia usaba un tanque que se llena — vernáculo del
 * sector y buena idea, así que se conserva la metáfora. Lo que NO se porta es
 * su ejecución visual (paleta propia, oleaje animado): aquí es una pieza del
 * lenguaje de AquaLicita, con las mismas esquinas de bracket de AuthCard, azul
 * sobre crema y el número en mono.
 *
 * Se llena con el puntaje ACUMULADO, no con el porcentaje de lo respondido: en
 * la pregunta 5 con todo perfecto marca 40 %. Es deliberado — el tanque se
 * llena — y es la semántica del prototipo (ver 02-cuestionario §3.1).
 *
 * La línea de umbral marca 58, el corte real de la banda "casi"; el prototipo
 * la dibujaba en 60 % como aproximación.
 */

const UMBRAL_MINIMO = 58;

interface Props {
  /** 0..100. */
  porcentaje: number;
  /** Escala lateral. Solo cabe en la portada. */
  conTicks?: boolean;
  /** Si es false, el número no se anuncia (portada: aún no hay nada que leer). */
  anunciar?: boolean;
}

export function MedidorTanque({ porcentaje, conTicks = false, anunciar = false }: Props) {
  const valor = Math.max(0, Math.min(100, Math.round(porcentaje)));

  return (
    <div className="clr-diag-medidor">
      {/* El envoltorio acota la escala lateral a la altura del vaso: si los
          ticks se posicionan contra el bloque entero, el 0 queda a la altura
          de la lectura y no del fondo del vaso. */}
      <div className="clr-diag-vaso-wrap">
      <div
        className="clr-diag-vaso"
        role="img"
        aria-label={`Nivel de preparación: ${valor} de 100`}
      >
        <span className="clr-diag-esq clr-diag-esq--tl" />
        <span className="clr-diag-esq clr-diag-esq--tr" />
        <span className="clr-diag-esq clr-diag-esq--bl" />
        <span className="clr-diag-esq clr-diag-esq--br" />
        <div className="clr-diag-relleno" style={{ height: `${valor}%` }} />
        <div className="clr-diag-umbral" style={{ bottom: `${UMBRAL_MINIMO}%` }}>
          <span>nivel mínimo</span>
        </div>
      </div>
      {conTicks && (
        <div className="clr-diag-ticks" aria-hidden="true">
          <span>100</span>
          <span>75</span>
          <span>50</span>
          <span>25</span>
          <span>0</span>
        </div>
      )}
      </div>
      <div className="clr-diag-lectura" aria-live={anunciar ? "polite" : "off"}>
        <b>{valor}%</b>
        <span>nivel de preparación</span>
      </div>
    </div>
  );
}
