import Link from "next/link";
import styles from "./tu-perfil.module.css";

/**
 * Tercera sección de la portada: «¿Puedes participar?». Cierra el recorrido
 * hero (explorar) → Ficha Viva (entender) → cuenta gratuita (decidir y seguir).
 *
 * Solo promete lo que existe y es gratis (`NIVEL_MINIMO` en acceso/politica.ts):
 * semáforo con el perfil, análisis de pliego (5 por cuenta en 24 h), guardar
 * procesos y alertas diarias. Sin cifras ni testimonios: la portada no calcula
 * nada aquí. El diagnóstico se hace sin cuenta; lo demás la pide.
 */

const BENEFICIOS = [
  {
    clave: "semaforo",
    titulo: "Semáforo con tu perfil",
    texto:
      "Cada proceso se compara con tu experiencia, tu capacidad y tu zona, compuerta por compuerta.",
    icono: (
      <>
        <rect x="8" y="2" width="8" height="20" rx="4" />
        <circle cx="12" cy="7" r="1.4" />
        <circle cx="12" cy="12" r="1.4" />
        <circle cx="12" cy="17" r="1.4" />
      </>
    ),
  },
  {
    clave: "pliego",
    titulo: "Análisis del pliego",
    texto: "Sube el pliego y la ficha muestra requisitos, presupuesto y causales, con su origen.",
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
    icono: <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />,
  },
  {
    clave: "alertas",
    titulo: "Alertas diarias",
    texto: "Recibe en tu correo los procesos nuevos que encajan con tu perfil.",
    icono: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </>
    ),
  },
];

export default function TuPerfil() {
  return (
    <section className={styles.seccion} id="tu-perfil" aria-labelledby="tu-perfil-titulo">
      <div className={styles.contenedor}>
        <div className={styles.mensaje}>
          <h2 id="tu-perfil-titulo">¿Puedes participar? Compruébalo antes de leer el pliego.</h2>
          <p className={styles.frase}>
            Cuéntanos qué has contratado y con qué cuentas. AquaLicita lo cruza con cada proceso y
            te dice qué cumples y qué te falta. La cuenta es gratuita.
          </p>
          <div className={styles.acciones}>
            <Link className={styles.principal} href="/registro">
              Crear cuenta gratis
            </Link>
            <Link className={styles.secundaria} href="/diagnostico">
              Hacer el diagnóstico, sin cuenta <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        <ul className={styles.beneficios}>
          {BENEFICIOS.map((b) => (
            <li key={b.clave}>
              <svg
                className={styles.icono}
                viewBox="0 0 24 24"
                width="26"
                height="26"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {b.icono}
              </svg>
              <div>
                <h3>{b.titulo}</h3>
                <p>{b.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
