import styles from "./hero-v3.module.css";

/**
 * El fondo del hero: plano, azul noche, sin imagen (2026-11-11, propuesta A).
 * La foto de montañas competía con el texto y con el mapa; un degradado casi
 * imperceptible basta para dar profundidad. Decorativo y sin texto. Sigue siendo
 * un hueco de servidor (`fondo`).
 */
export default function HeroBackground() {
  return <div className={styles.fondo} aria-hidden="true" />;
}
