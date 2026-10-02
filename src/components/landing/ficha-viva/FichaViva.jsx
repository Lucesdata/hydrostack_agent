import Link from "next/link";
import { enlacesDeFicha } from "@/src/components/landing/proceso-resumen";
import styles from "./ficha-viva.module.css";

/**
 * La franja de la ficha, bajo el hero: «Del territorio a los detalles que
 * necesitas.» y un panel claro con cuatro accesos a secciones reales de la
 * ficha del proceso que muestra la tarjeta del hero (spec
 * 2026-10-02-hero-mapa-ficha §8).
 *
 * No es una captura ni un segundo proceso: describe qué se revisa en la ficha
 * y, con un destacado válido, enlaza esas secciones de **ese** proceso. Sin él
 * (cargando, vacío, error o sin datos) los cuatro títulos se quedan, pero sin
 * enlace: nunca un `href` al proceso anterior ni un `#` decorativo.
 *
 * Sustituye a las cuatro preguntas que había desde el 2026-09-28. El esquema y
 * el árbol siguen en /licitaciones/como-participar (`ComoRazonaFicha.jsx`).
 */

const ACCESOS = [
  {
    clave: "resumen",
    titulo: "Qué se contrata",
    enlace: "Consultar detalle",
    sinDestino: "Objeto del proceso",
    icono: (
      <>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5M9 13h6M9 17h6" />
      </>
    ),
  },
  {
    clave: "dinero",
    titulo: "Presupuesto",
    enlace: "Ver fuente",
    sinDestino: "Valor y fuentes disponibles",
    icono: (
      <>
        <ellipse cx="12" cy="6" rx="7" ry="3" />
        <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
        <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
      </>
    ),
  },
  {
    clave: "plazos",
    titulo: "Plazos",
    enlace: "Consultar fechas",
    sinDestino: "Fechas publicadas",
    icono: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </>
    ),
  },
  {
    clave: "pliego",
    titulo: "Qué falta verificar",
    enlace: "Revisar pliego",
    sinDestino: "Requisitos según el pliego",
    icono: (
      <>
        <circle cx="5" cy="6" r="1.5" />
        <circle cx="5" cy="12" r="1.5" />
        <circle cx="5" cy="18" r="1.5" />
        <path d="M10 6h10M10 12h10M10 18h10" />
      </>
    ),
  },
];

/**
 * @param {{ destacado?: { href: string, objeto: string } | null }} props — el
 * proceso de la tarjeta del hero, ya validado (`destacadoDeApi`), o `null`.
 */
export default function FichaViva({ destacado = null }) {
  const enlaces = enlacesDeFicha(destacado?.href);

  return (
    <section className={styles.seccion} id="ficha-viva" aria-labelledby="ficha-viva-titulo">
      <div className={styles.contenedor}>
        <h2 id="ficha-viva-titulo">Del territorio a los detalles que necesitas.</h2>
        <div className={`tema-claro ${styles.panel}`}>
          <div className={styles.panelCab}>
            <h3>Ficha del proceso</h3>
            <span className={styles.chip}>QUÉ ENCONTRARÁS</span>
          </div>
          <ul className={styles.accesos}>
            {ACCESOS.map((a) => (
              <li key={a.clave}>
                <svg
                  className={styles.icono}
                  viewBox="0 0 24 24"
                  width="28"
                  height="28"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {a.icono}
                </svg>
                <div>
                  <h4>{a.titulo}</h4>
                  {enlaces ? (
                    <Link
                      className={styles.acceso}
                      href={enlaces[a.clave]}
                      aria-label={`${a.enlace} de ${destacado.objeto}`}
                    >
                      {a.enlace} <span aria-hidden="true">→</span>
                    </Link>
                  ) : (
                    <p className={styles.sinDestino}>{a.sinDestino}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {enlaces ? null : (
            <p className={styles.panelEstado}>
              Los accesos se habilitan cuando hay un proceso disponible.
            </p>
          )}
        </div>
        <p className={styles.ayuda}>
          La disponibilidad de presupuesto, fechas y requisitos depende de las fuentes de cada
          proceso.{" "}
          <Link className={styles.enlaceRazona} href="/licitaciones/como-participar#como-razona">
            Cómo razona la ficha <span aria-hidden="true">→</span>
          </Link>
        </p>
      </div>
    </section>
  );
}
