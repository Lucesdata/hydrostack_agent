import Link from "next/link";
import styles from "./soluciones-banda.module.css";
import { serviciosDelHero } from "@/src/lib/landing/servicios-hero";

/**
 * Una fila discreta bajo el hero con las demás soluciones de AquaLicita
 * (2026-11-11, propuesta A). Antes eran cinco tarjetas dentro del mensaje del
 * hero, al mismo peso que el botón principal. Aquí son enlaces de texto: un
 * nombre y una flecha, sin subtítulo ni caja. Mismos destinos y mismas reglas
 * que antes (`serviciosDelHero`).
 */
export default function SolucionesBanda({ comercialDisponible = false }) {
  const servicios = serviciosDelHero(comercialDisponible);
  return (
    <nav className={styles.banda} aria-label="Soluciones AquaLicita">
      <p className={styles.titulo}>Soluciones AquaLicita</p>
      <ul className={styles.lista}>
        {servicios.map((s) => (
          <li key={s.id}>
            <Link href={s.href} className={styles.enlace}>
              {s.titulo} <span aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
