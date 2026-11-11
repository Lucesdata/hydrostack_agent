import Link from "next/link";
import BuscadorGuiado from "./BuscadorGuiado";
import styles from "./hero-v3.module.css";

/**
 * La columna del mensaje (45 %): eyebrow, titular, frase y dos accesos (uno
 * principal y uno en texto). Los accesos a los demás servicios salieron el
 * 2026-11-11 a `SolucionesBanda`. El buscador guiado se conserva: es el único buscador del sitio
 * (CLAUDE.md, «Un solo buscador») y su modal se abre con el botón principal.
 */
export default function HeroMessage() {
  return (
    <div className={styles.mensaje}>
      <p className={styles.eyebrow}>
        Agua y saneamiento <span aria-hidden="true">·</span> Colombia
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
        {/* El botón principal abre la búsqueda guiada, que envía a la vitrina:
            el único buscador del sitio. */}
        <BuscadorGuiado activadorClase={styles.ctaPrimario} etiqueta="Explorar oportunidades" />
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
