import Link from "next/link";
import BuscadorGuiado from "./BuscadorGuiado";
import styles from "./hero-v3.module.css";
import { serviciosDelHero } from "@/src/lib/landing/servicios-hero";

/**
 * La columna del mensaje (45 %): eyebrow, titular, frase, dos accesos y los
 * tres pasos. El buscador guiado se conserva: es el único buscador del sitio
 * (CLAUDE.md, «Un solo buscador») y su modal se abre con el botón principal.
 */
export default function HeroMessage({ comercialDisponible = false }) {
  const servicios = serviciosDelHero(comercialDisponible);
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
      <nav className={styles.serviciosHero} aria-label="Servicios de AquaLicita">
        <p className={styles.serviciosTitulo}>Descubre el ecosistema AquaLicita</p>
        <ul className={styles.serviciosLista}>
          {servicios.map((servicio) => (
            <li key={servicio.id} className={styles.servicioItem}>
              {servicio.href ? (
                <Link href={servicio.href} className={styles.servicioEnlace}>
                  <span className={styles.servicioNombre}>{servicio.titulo}</span>
                  <span className={styles.servicioDetalle}>
                    {servicio.detalle} <span aria-hidden="true">↗</span>
                  </span>
                </Link>
              ) : (
                <span className={styles.servicioInactivo}>
                  <span className={styles.servicioNombre}>{servicio.titulo}</span>
                  <span className={styles.servicioDetalle}>{servicio.detalle}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
