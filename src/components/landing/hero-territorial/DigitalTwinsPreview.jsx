import Image from "next/image";
import Link from "next/link";
import styles from "./hero-v3.module.css";

/**
 * Gemelos digitales: una ilustración de planta con su texto. La imagen es
 * decorativa (`alt=""`) y se rotula como ilustración demostrativa: no es una
 * planta que AquaLicita mida. Sin lecturas de telemetría (2026-11-01, pedido del
 * usuario). `object-fit: contain` para no cortar equipos.
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
        <span className={styles.plantaBase} aria-hidden="true" />
        <Image
          src="/portada/hero/planta-3d.webp"
          alt=""
          width={1200}
          height={675}
          sizes="(max-width: 899px) 90vw, 40vw"
          className={styles.plantaImg}
        />
        <figcaption className={styles.demo}>Ilustración demostrativa</figcaption>
      </figure>
    </section>
  );
}
