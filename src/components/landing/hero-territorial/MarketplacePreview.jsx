import Image from "next/image";
import Link from "next/link";
import styles from "./hero-v3.module.css";

/**
 * Marketplace: ocupa el espacio que tuvieron los gemelos digitales en la franja
 * del hero (2026-11-12, pedido del usuario). Un texto con su botón a
 * `/marketplace` y las tres ilustraciones de las familias. Las fotos son
 * decorativas (`alt=""`) y se rotulan «Imagen ilustrativa»: no son obras de
 * AquaLicita. El peso es el de tres WebP de 640 px, ya optimizados.
 */
const FOTOS = [
  { src: "/assets/marketplace/oportunidades/oportunidad-ptap-640.webp", nombre: "Agua potable" },
  {
    src: "/assets/marketplace/oportunidades/oportunidad-ptar-640.webp",
    nombre: "Aguas residuales",
  },
  { src: "/assets/marketplace/oportunidades/oportunidad-redes-640.webp", nombre: "Redes" },
];

export default function MarketplacePreview() {
  return (
    <section className={styles.marketplace} aria-labelledby="aq-marketplace-titulo">
      <div className={styles.marketplaceTexto}>
        <p className={styles.eyebrow}>Marketplace</p>
        <h2 id="aq-marketplace-titulo">Explora el mercado en el mapa.</h2>
        <p>
          Busca por proceso, entidad o proyecto, elige un departamento en el mapa 3D y abre la Ficha
          Viva de cada oportunidad de agua y saneamiento.
        </p>
        <Link className={styles.ctaContorno} href="/marketplace">
          Abrir el marketplace <span aria-hidden="true">→</span>
        </Link>
      </div>
      <figure className={styles.fotos}>
        <ul>
          {FOTOS.map((f) => (
            <li key={f.src}>
              <Image
                src={f.src}
                alt=""
                width={640}
                height={400}
                sizes="(max-width: 899px) 30vw, 14vw"
              />
              <span>{f.nombre}</span>
            </li>
          ))}
        </ul>
        <figcaption className={styles.demo}>Imagen ilustrativa</figcaption>
      </figure>
    </section>
  );
}
