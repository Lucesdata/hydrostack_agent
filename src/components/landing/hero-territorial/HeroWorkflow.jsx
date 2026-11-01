import styles from "./hero-v3.module.css";

/**
 * Los tres pasos del producto: descubrir, evaluar, seguir. Es una lista
 * ordenada de texto con iconos decorativos; no promete nada que la ficha no
 * haga hoy (los cambios y fechas clave salen de la ficha y de las alertas).
 */
const PASOS = [
  {
    titulo: "Descubre",
    detalle: "por territorio",
    icono: (
      <>
        <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
        <circle cx="12" cy="10" r="2.3" />
      </>
    ),
  },
  {
    titulo: "Evalúa",
    detalle: "requisitos",
    icono: (
      <>
        <path d="M12 3 3 8l9 5 9-5-9-5z" />
        <path d="m3 13 9 5 9-5M3 17.5l9 5 9-5" />
      </>
    ),
  },
  {
    titulo: "Sigue",
    detalle: "cambios y fechas clave",
    icono: (
      <>
        <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
        <path d="M10 20.5a2 2 0 0 0 4 0" />
      </>
    ),
  },
];

export default function HeroWorkflow() {
  return (
    <ol className={styles.pasos} aria-label="Cómo se usa AquaLicita">
      {PASOS.map((p) => (
        <li key={p.titulo}>
          <svg
            viewBox="0 0 24 24"
            width="30"
            height="30"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            {p.icono}
          </svg>
          <span>
            <strong>{p.titulo}</strong> {p.detalle}
          </span>
        </li>
      ))}
    </ol>
  );
}
