import Link from "next/link";
import BuscadorGuiado from "./BuscadorGuiado";
import styles from "./hero-v3.module.css";
import { serviciosDelHero } from "@/src/lib/landing/servicios-hero";

/**
 * La columna del mensaje: eyebrow, titular, frase, dos accesos y las soluciones.
 * El buscador guiado se conserva: es el único buscador del sitio (CLAUDE.md,
 * «Un solo buscador») y su modal se abre con el botón principal.
 *
 * El texto entra por líneas (2026-11-11): cada renglón del titular sube tras
 * una máscara, «saneamiento.» lleva un brillo de agua que lo recorre y su
 * trazo se dibuja. Todo es CSS sobre el mismo marcado: el `h1` dice lo mismo
 * con o sin animación, y con «reducir movimiento» aparece ya colocado.
 */

/** El trazo de cada solución destacada (decorativo: el nombre va en el texto). */
const ICONO_SERVICIO = {
  comercial: <path d="M4 19V9m5 10V5m5 14v-7m5 7V8M3 21h18" />,
  talento: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c.6-3.6 3.3-5.6 7-5.6s6.4 2 7 5.6" />
    </>
  ),
};

export default function HeroMessage({ comercialDisponible = false }) {
  const servicios = serviciosDelHero(comercialDisponible);
  const destacados = servicios.filter((s) => s.destacado);
  const resto = servicios.filter((s) => !s.destacado);
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
        <p className={styles.serviciosTitulo}>Soluciones AquaLicita</p>
        {/* Una sola lista (los cinco servicios); las dos destacadas van primero
            y como tarjetas, el resto como accesos en línea. */}
        <ul className={styles.serviciosLista}>
          {[...destacados, ...resto].map((servicio) => (
            <li
              key={servicio.id}
              className={`${styles.servicioItem} ${servicio.destacado ? styles.servicioDestacado : ""}`}
            >
              {servicio.href ? (
                <Link href={servicio.href} className={styles.servicioEnlace}>
                  {servicio.destacado ? (
                    <svg
                      className={styles.servicioIcono}
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      focusable="false"
                    >
                      {ICONO_SERVICIO[servicio.id]}
                    </svg>
                  ) : null}
                  <span className={styles.servicioTexto}>
                    <span className={styles.servicioNombre}>{servicio.titulo}</span>
                    <span className={styles.servicioDetalle}>
                      {servicio.detalle} <span aria-hidden="true">↗</span>
                    </span>
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
