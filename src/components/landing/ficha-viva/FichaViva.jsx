import Link from "next/link";
import styles from "./ficha-viva.module.css";

/**
 * "La Ficha Viva": qué preguntas responde una ficha. La portada y el mapa
 * sirven para llegar a una ficha; esta sección dice qué se encuentra al llegar.
 *
 * Desde el 2026-09-28 (PR 3 del plan portada-esencial) es solo el titular, las
 * cuatro preguntas con su estado real y un botón. El esquema ilustrativo, el
 * árbol de decisiones, la leyenda de color y el aviso de «Seguir sus cambios»
 * se mudaron a /licitaciones/como-participar (`ComoRazonaFicha.jsx`), enlazada
 * desde aquí.
 *
 * Cada promesa lleva su estado real ("Disponible", "Depende del pliego"): si la
 * sección prometiera algo que la ficha no hace, quien abra una ficha y no lo
 * vea tendría razón en no creerse nada más.
 */

const PREGUNTAS = [
  {
    n: 1,
    q: "¿Puedo participar?",
    a: "Un semáforo de cinco compuertas — sector, cuantía, plazo, zona y habilitación — que ves sin cuenta. Con tus datos, cada compuerta pasa a decir cómo te queda a ti.",
    estado: "disponible",
  },
  {
    n: 2,
    q: "¿Qué me falta?",
    a: "Los requisitos habilitantes están en el pliego. Si el pliego de ese proceso aún no se ha procesado, la ficha dice «todavía no puedo determinarlo» y qué falta, en vez de adivinar.",
    estado: "pliego",
  },
  {
    n: 3,
    q: "¿Dónde consta?",
    a: "La ficha separa lo que viene de los datos abiertos del SECOP II de lo que solo está en el pliego, y enlaza el expediente original.",
    estado: "disponible",
  },
  {
    n: 4,
    q: "¿Qué hago ahora?",
    a: "Un siguiente paso concreto: ir al expediente del SECOP II, o dar tus datos con el diagnóstico para que el semáforo se lea contra ti.",
    estado: "disponible",
  },
];

const ESTADO = {
  disponible: "Disponible",
  pliego: "Depende del pliego",
};

function Pin({ n }) {
  return (
    <span className={styles.pin} aria-hidden="true">
      {n}
    </span>
  );
}

export default function FichaViva() {
  return (
    <section className={styles.seccion} id="ficha-viva" aria-labelledby="ficha-viva-titulo">
      <div className={styles.contenedor}>
        <p className={styles.eyebrow}>LA FICHA VIVA</p>
        <h2 id="ficha-viva-titulo">Cada proceso tiene una ficha. Ahí es donde decides.</h2>
        <ol className={`${styles.preguntas} ${styles.preguntasFila}`}>
          {PREGUNTAS.map((p) => (
            <li key={p.n}>
              <Pin n={p.n} />
              <div>
                <h3>{p.q}</h3>
                <p>{p.a}</p>
                <span className={styles.estado} data-estado={p.estado}>
                  {ESTADO[p.estado]}
                </span>
              </div>
            </li>
          ))}
        </ol>
        <div className={styles.ctas}>
          <Link className={styles.ctaPrimario} href="/licitaciones">
            Abrir fichas de procesos <span aria-hidden="true">→</span>
          </Link>
          <Link className={styles.enlaceRazona} href="/licitaciones/como-participar#como-razona">
            Cómo razona la ficha <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
