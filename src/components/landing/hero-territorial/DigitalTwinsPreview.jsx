import Image from "next/image";
import Link from "next/link";
import styles from "./hero-v3.module.css";

/**
 * Gemelos digitales: una ilustración de planta y dos lecturas de telemetría.
 * Las lecturas son **demostrativas** —la imagen es una ilustración, no una
 * planta que AquaLicita mida— y así lo dice la etiqueta visible sobre ellas;
 * no se presentan como datos reales. La imagen es decorativa (`alt=""`): todo
 * el texto es HTML. `object-fit: contain` para no cortar equipos.
 */
export default function DigitalTwinsPreview() {
  return (
    <section className={styles.gemelos} aria-labelledby="aq-gemelos-titulo">
      <div className={styles.gemelosTexto}>
        <p className={styles.eyebrow}>Gemelos digitales</p>
        <h2 id="aq-gemelos-titulo">Diseña, simula y optimiza proyectos.</h2>
        <p>
          Modelos digitales de plantas y sistemas de agua y saneamiento para evaluar alternativas,
          costos y desempeño antes de ejecutar.
        </p>
        <Link className={styles.ctaContorno} href="/gemelos-digitales">
          Explorar gemelos digitales <span aria-hidden="true">→</span>
        </Link>
      </div>
      <figure className={styles.planta}>
        <Image
          src="/portada/hero/planta-3d.webp"
          alt=""
          width={1200}
          height={675}
          sizes="(max-width: 899px) 90vw, 40vw"
          className={styles.plantaImg}
        />
        <figcaption className={styles.demo}>Ilustración con datos demostrativos</figcaption>
        <dl className={`${styles.lectura} ${styles.lecturaCaudal}`}>
          <dt>Caudal</dt>
          <dd>
            1,00 <span>L/s</span>
            <svg
              className={styles.spark}
              viewBox="0 0 60 24"
              width="60"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M2 20 14 13l9 4 12-9 9 5 12-8" />
            </svg>
          </dd>
        </dl>
        <dl className={`${styles.lectura} ${styles.lecturaEficiencia}`}>
          <dt>Eficiencia</dt>
          <dd>
            92 %
            <svg
              className={styles.anillo}
              viewBox="0 0 36 36"
              width="36"
              height="36"
              fill="none"
              strokeWidth="4"
              aria-hidden="true"
              focusable="false"
            >
              <circle cx="18" cy="18" r="14" stroke="rgba(140,190,225,.25)" />
              <circle
                cx="18"
                cy="18"
                r="14"
                stroke="currentColor"
                strokeLinecap="round"
                strokeDasharray="81 88"
                transform="rotate(-90 18 18)"
              />
            </svg>
          </dd>
        </dl>
      </figure>
    </section>
  );
}
