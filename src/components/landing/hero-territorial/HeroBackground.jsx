"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./hero-v3.module.css";

/**
 * El fondo del hero: un paisaje de montaña nocturno, decorativo (`alt=""`, sin
 * texto ni cifras). Va bajo todo el contenido y un degradado lo funde con el
 * azul noche de la portada para que el texto conserve su contraste. Si la
 * imagen no carga, queda el color sólido del hero: nada se rompe.
 */
export default function HeroBackground() {
  const [fallo, setFallo] = useState(false);
  return (
    <div className={styles.fondo} aria-hidden="true">
      {fallo ? null : (
        <Image
          src="/portada/hero/fondo-montanas.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className={styles.fondoImg}
          onError={() => setFallo(true)}
        />
      )}
      <div className={styles.fondoVelo} />
    </div>
  );
}
