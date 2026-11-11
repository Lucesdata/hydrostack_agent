import styles from "./hero-v3.module.css";

/**
 * El fondo del hero (2026-11-11): una «carta hidrográfica nocturna» dibujada
 * con código, sin fotografía. Cuatro capas, todas decorativas (`aria-hidden`,
 * sin texto ni cifras):
 *
 * 1. **Luz**: tres manchas difusas que derivan despacio (solo `transform`).
 * 2. **Relieve**: curvas de nivel de un terreno inventado
 *    (`public/portada/hero/curvas-nivel.svg`, generado por
 *    `scripts/portada/curvas-nivel.mjs`), que se desplaza muy lento.
 * 3. **Trama**: una retícula de puntos, fija.
 * 4. **Cauces**: cuatro líneas de corriente con un pulso de luz que las
 *    recorre. Solo en pantallas anchas.
 *
 * No representa ningún territorio ni dato. Con «reducir movimiento» queda
 * quieto (regla general del hero) y sigue viéndose completo. Es de servidor y
 * llega como hueco (`fondo`): su marcado no viaja en el JS del navegador. Ya no
 * hay imagen: el fondo no compite por el LCP.
 */

/** Los cauces: bajan de la cordillera (arriba a la derecha) hacia el mar. */
const CAUCES = [
  "M1700 120C1400 180 1320 330 1180 420S900 560 760 700 420 880-100 940",
  "M1250-40C1230 150 1090 260 1010 400S860 640 620 720 200 760-100 700",
  "M1700 620C1500 600 1420 720 1280 760S1000 820 880 1040",
  "M520-40C560 120 420 240 380 380S200 560-100 520",
];

export default function HeroBackground() {
  return (
    <div className={styles.fondo} aria-hidden="true">
      <div className={styles.fondoLuz}>
        <i />
        <i />
        <i />
      </div>
      <div className={styles.fondoCurvas} />
      <div className={styles.fondoTrama} />
      <svg
        className={styles.fondoCauces}
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        focusable="false"
      >
        {CAUCES.map((d, i) => (
          <g key={d} data-cauce={i}>
            <path d={d} className={styles.cauce} />
            <path d={d} pathLength="1" className={styles.caucePulso} />
          </g>
        ))}
      </svg>
      <div className={styles.fondoVelo} />
    </div>
  );
}
