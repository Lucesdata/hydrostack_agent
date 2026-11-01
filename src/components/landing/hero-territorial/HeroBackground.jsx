import Image from "next/image";
import styles from "./hero-v3.module.css";

/**
 * El fondo del hero: un paisaje de montaña nocturno, decorativo (`alt=""`, sin
 * texto ni cifras). Va bajo todo el contenido y un degradado lo funde con el
 * azul noche de la portada para que el texto conserve su contraste. Si la
 * imagen no carga, queda el degradado de `.fondo` (un `alt` vacío no pinta
 * nada): nada se rompe. Es un componente de servidor a propósito: llega al hero
 * como hueco (`fondo`) para que `next/image` no viaje en el JS del navegador.
 */
export default function HeroBackground() {
  return (
    <div className={styles.fondo} aria-hidden="true">
      <Image
        src="/portada/hero/fondo-montanas.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className={styles.fondoImg}
      />
      <div className={styles.fondoVelo} />
    </div>
  );
}
