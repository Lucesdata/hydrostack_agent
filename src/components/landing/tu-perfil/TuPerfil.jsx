import Link from "next/link";
import { ETIQUETA_COMPUERTA, PALABRA_ESTADO } from "@/src/lib/secop/semaforo";
import styles from "./tu-perfil.module.css";

/**
 * Tercera sección de la portada: «¿Puedes participar?». Cierra el recorrido
 * hero (explorar) → Ficha Viva (entender) → decidir y seguir, con cuenta o sin
 * ella.
 *
 * Diseño aprobado por el usuario (2026-10-22): fondo y miniaturas generados
 * (`public/portada/*.webp`, decorativos, sin texto, `alt=""`), un ejemplo del
 * semáforo y tres tarjetas. Lo que se aparta del mockup, a propósito:
 *  - El ejemplo usa las cinco compuertas reales con sus palabras reales
 *    (`ETIQUETA_COMPUERTA`, `PALABRA_ESTADO`) y va rotulado «Ejemplo
 *    ilustrativo», **sin cifras**: el mockup contaba «4 requisitos» y el
 *    semáforo tiene cinco compuertas, no siete requisitos.
 *  - Solo promete lo que existe y es gratis (`NIVEL_MINIMO` en
 *    acceso/politica.ts): sin «criterios» en el pliego (el extractor no los saca).
 *  - 2026-10-24: el diagnóstico se presenta como preparación general (no verifica
 *    un proceso concreto), el semáforo enlaza al cruce real (`/mis-coincidencias`)
 *    y las alertas figuran «en validación» sin enlace: la entrega no está
 *    demostrada (spec 2026-10-24-consolidacion-lanzamiento).
 *  - «Tus datos solo los ves tú» en vez de «siempre privados»: la política de
 *    tratamiento está pendiente (PENDIENTES §18).
 * Cada tarjeta es un enlace por su título (`::after` cubre la tarjeta, como la
 * minificha del hero), no un bloque entero dentro de un `<a>`.
 */

/** El ejemplo: tres compuertas cumplen, una pide revisar y una no cumple. */
const EJEMPLO = [
  { clave: "sectorial", estado: "PASS" },
  { clave: "cuantia", estado: "PASS" },
  { clave: "plazo", estado: "PASS" },
  { clave: "ubicacion", estado: "WARN" },
  { clave: "habilitacion", estado: "FAIL" },
];

const ICONO_ESTADO = {
  PASS: <path d="m7 12.5 3.2 3.2L17 8.8" />,
  WARN: <path d="M8 12h8" />,
  FAIL: <path d="m8.5 8.5 7 7m0-7-7 7" />,
};

const TARJETAS = [
  {
    clave: "pliego",
    titulo: "Análisis del pliego",
    texto: "Extrae y resume requisitos, presupuesto, cronograma y causales.",
    imagen: "/portada/pliego.webp",
    icono: (
      <>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5M9 13h6M9 17h6" />
      </>
    ),
  },
  {
    clave: "guardar",
    titulo: "Guarda lo que te interesa",
    texto: "Reúne los procesos que sigues en un solo lugar y vuelve a ellos cuando quieras.",
    imagen: "/portada/guardados.webp",
    icono: <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />,
  },
  {
    clave: "alertas",
    titulo: "Alertas por correo — en validación",
    texto: "Aún no enviamos avisos por correo: comprobamos la entrega antes de activarlos.",
    enValidacion: true,
    imagen: "/portada/alertas.webp",
    icono: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </>
    ),
  },
];

const CONFIANZA = [
  {
    clave: "registro",
    texto: "Sin registro para empezar",
    icono: (
      <>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5M9 13h6M9 17h6" />
      </>
    ),
  },
  {
    clave: "datos",
    texto: "Tus datos solo los ves tú",
    icono: (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </>
    ),
  },
  {
    clave: "minutos",
    texto: "Resultados en minutos",
    icono: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  },
];

function Icono({ children, tam = 24, className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={tam}
      height={tam}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const Flecha = () => (
  <svg
    className={styles.flecha}
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12h14m-5-6 6 6-6 6" />
  </svg>
);

export default function TuPerfil() {
  return (
    <section className={styles.seccion} id="tu-perfil" aria-labelledby="tu-perfil-titulo">
      {/* Decorativo: sin texto ni datos. Bajo el pliegue, así que carga diferida. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.fondo}
        src="/portada/fondo-elegibilidad.webp"
        alt=""
        width="1672"
        height="941"
        loading="lazy"
        decoding="async"
      />

      <div className={styles.contenedor}>
        <div className={styles.mensaje}>
          <p className={styles.eyebrow}>Tu preparación general</p>
          <h2 id="tu-perfil-titulo">
            <span className={styles.pregunta}>¿Estás preparado</span>{" "}
            <span className={styles.degradado}>para participar?</span>
          </h2>
          <p className={styles.frase}>
            Evalúa tu preparación general y descubre qué aspectos debes fortalecer antes de revisar
            un proceso.
          </p>
          <div className={styles.acciones}>
            <Link className={styles.principal} href="/diagnostico">
              Hacer el diagnóstico, sin cuenta <span aria-hidden="true">→</span>
            </Link>
            <Link className={styles.secundaria} href="/registro">
              Crear cuenta gratis <span aria-hidden="true">→</span>
            </Link>
          </div>
          <ul className={styles.confianza}>
            {CONFIANZA.map((c) => (
              <li key={c.clave}>
                <Icono tam={28}>{c.icono}</Icono>
                <span>{c.texto}</span>
              </li>
            ))}
          </ul>
        </div>

        <article className={`${styles.tarjeta} ${styles.semaforo}`}>
          <div className={styles.semaforoCab}>
            <Icono tam={30} className={styles.icono}>
              <rect x="8" y="2" width="8" height="20" rx="4" />
              <circle cx="12" cy="7" r="1.4" />
              <circle cx="12" cy="12" r="1.4" />
              <circle cx="12" cy="17" r="1.4" />
            </Icono>
            <div>
              <h3>
                <Link className={styles.cubre} href="/mis-coincidencias">
                  Compara procesos con tu perfil
                </Link>
              </h3>
              <p>
                Revisa el encaje según la información disponible del proceso y los datos que
                declares en tu perfil. Requiere cuenta y perfil.
              </p>
            </div>
            <Flecha />
          </div>
          <div className={styles.ejemplo}>
            <p className={styles.ejemploRotulo}>Ejemplo ilustrativo</p>
            <ul>
              {EJEMPLO.map((e) => (
                <li key={e.clave} data-estado={e.estado}>
                  <Icono tam={26} className={styles.estadoIcono}>
                    <circle cx="12" cy="12" r="9.5" />
                    {ICONO_ESTADO[e.estado]}
                  </Icono>
                  <span className={styles.compuerta}>{ETIQUETA_COMPUERTA[e.clave]}</span>
                  <span className={styles.estado}>{PALABRA_ESTADO[e.estado]}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className={styles.nota}>
            <Icono tam={20} className={styles.icono}>
              <circle cx="12" cy="12" r="9.5" />
              <path d="M12 11v5M12 8h.01" />
            </Icono>
            Resultado preliminar basado en la información del proceso y tu perfil. Donde falte
            información verás «sin datos». Revisa siempre el pliego vigente.
          </p>
        </article>

        <div className={styles.columna}>
          {TARJETAS.map((t) => (
            <article key={t.clave} className={`${styles.tarjeta} ${styles.lateral}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.miniatura}
                src={t.imagen}
                alt=""
                width="640"
                height="480"
                loading="lazy"
                decoding="async"
              />
              <Icono tam={26} className={styles.icono}>
                {t.icono}
              </Icono>
              <div className={styles.lateralTexto}>
                <h3>
                  {t.enValidacion ? (
                    t.titulo
                  ) : (
                    <Link className={styles.cubre} href="/registro">
                      {t.titulo}
                    </Link>
                  )}
                </h3>
                <p>{t.texto}</p>
              </div>
              {!t.enValidacion && <Flecha />}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
