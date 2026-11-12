import Link from "next/link";
import styles from "./hero-v3.module.css";

export default function HeroMessage() {
  return (
    <div className={styles.mensaje}>
      <p className={styles.eyebrow}>
        Contratación pública <span aria-hidden="true">·</span> Agua y saneamiento{" "}
        <span aria-hidden="true">·</span> Colombia
      </p>
      <h1 id="aq-hero-title">
        <span>Oportunidades reales</span>{" "}
        <span>
          en agua y <em>saneamiento.</em>
        </span>
      </h1>
      <p className={styles.lead}>
        Encuentra procesos, analiza requisitos y decide con información confiable.
      </p>
      <div className={styles.acciones}>
        <Link className={styles.ctaPrimario} href="/marketplace">
          Marketplace de oportunidades <span aria-hidden="true">→</span>
        </Link>
        <Link className={styles.ctaSecundario} href="/licitaciones/como-participar">
          <svg
            viewBox="0 0 24 24"
            width="26"
            height="26"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="m10 8.5 6 3.5-6 3.5z" fill="currentColor" stroke="none" />
          </svg>
          Ver cómo funciona
        </Link>
      </div>
    </div>
  );
}
