import {
  PREGUNTAS_FRECUENTES,
  faqJsonLd,
  jsonLdSeguro,
} from "@/src/lib/landing/preguntas-frecuentes";
import styles from "./preguntas-frecuentes.module.css";

/**
 * Preguntas frecuentes de la portada, con su JSON-LD `FAQPage`.
 *
 * Componente de servidor y `<details>` nativo: se abre y se cierra sin una sola
 * línea de JavaScript, así que no suma al presupuesto de la portada. Llega a
 * `PortadaCliente` por una prop, igual que el mapa.
 */
export default function PreguntasFrecuentes() {
  return (
    <section className={styles.seccion} aria-labelledby="aq-faq-titulo">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSeguro(faqJsonLd()) }}
      />
      <div className={styles.contenido}>
        <p className={styles.eyebrow}>
          <span aria-hidden="true" />
          Preguntas frecuentes
        </p>
        <h2 id="aq-faq-titulo">Lo que conviene saber antes de abrir una ficha</h2>
        <div className={styles.lista}>
          {PREGUNTAS_FRECUENTES.map((p) => (
            <details key={p.pregunta} className={styles.item}>
              <summary>{p.pregunta}</summary>
              <p>{p.respuesta}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
