import Link from "next/link";
import { COLOR_TIPO, FAMILIAS } from "@/src/lib/classify/tipo-color";
import { TIPO_PROYECTO } from "@/src/lib/classify/tipo-proyecto";
import { CLAVES_COMPUERTA, ETIQUETA_COMPUERTA } from "@/src/lib/secop/semaforo";
import styles from "./ficha-viva.module.css";

/**
 * "La Ficha Viva": la sección que explica, con un dibujo, qué es una ficha y
 * qué preguntas responde. La portada y el mapa sirven para llegar a una ficha;
 * esta sección dice qué se encuentra al llegar.
 *
 * Dos reglas:
 * 1. **El esquema es un dibujo, no un proceso.** No lleva ni un nombre ni una
 *    cifra: las líneas de texto son barras grises y los estados de las
 *    compuertas son un ejemplo rotulado como tal.
 * 2. **Cada promesa lleva su estado real** ("Disponible", "Depende del pliego",
 *    "En construcción"). Si la sección dijera que la ficha sigue los cambios
 *    del proceso, quien abra una ficha y no los vea tendría razón en no creerse
 *    nada más.
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
  construccion: "En construcción",
};

/** Estados del ejemplo del esquema. Rotulados como ejemplo en el propio dibujo. */
const EJEMPLO_COMPUERTAS = {
  sectorial: "cumple",
  cuantia: "cumple",
  plazo: "revisar",
  ubicacion: "cumple",
  habilitacion: "sin dato",
};

function Pin({ n }) {
  return (
    <span className={styles.pin} aria-hidden="true">
      {n}
    </span>
  );
}

function Esquema() {
  const tipo = COLOR_TIPO.acueducto;
  return (
    // tema-claro: el esquema imita la ficha, que es clara, igual que la tarjeta
    // blanca del hero; el resto de la sección va en el tema oscuro de la portada.
    <figure
      className={`${styles.esquema} tema-claro`}
      aria-label="Esquema ilustrativo de una ficha"
    >
      <div className={styles.esqCabecera}>
        <span className={styles.chipTipo} style={{ "--tipo": tipo.claro }}>
          <span className={styles.chipPunto} aria-hidden="true" />
          {TIPO_PROYECTO.acueducto.label} · {tipo.familiaLabel}
        </span>
        <span className={styles.chipEstado}>Recibe ofertas</span>
      </div>
      <span className={`${styles.barra} ${styles.barraCorta}`} aria-hidden="true" />
      <span className={`${styles.barra} ${styles.barraTitulo}`} aria-hidden="true" />
      <span className={`${styles.barra} ${styles.barraTitulo2}`} aria-hidden="true" />

      <div className={styles.esqBloque}>
        <Pin n={1} />
        <p className={styles.esqTitulo}>Cómo te queda a ti</p>
        <ul className={styles.compuertas}>
          {CLAVES_COMPUERTA.map((c) => (
            <li key={c} data-estado={EJEMPLO_COMPUERTAS[c]}>
              <span aria-hidden="true" />
              {ETIQUETA_COMPUERTA[c]}
              <em>{EJEMPLO_COMPUERTAS[c]}</em>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.esqBloque}>
        <Pin n={2} />
        <p className={styles.esqTitulo}>Qué exige el pliego</p>
        <p className={styles.noPuedo}>
          <strong>Todavía no puedo determinarlo.</strong> Falta el pliego procesado.
        </p>
      </div>

      <div className={styles.esqBloque}>
        <Pin n={3} />
        <p className={styles.esqTitulo}>Fuente de cada dato</p>
        <p className={styles.fuentes}>
          <span>Datos abiertos SECOP II</span>
          <span>Pliego</span>
          <span>Expediente ↗</span>
        </p>
      </div>

      <div className={`${styles.esqBloque} ${styles.esqAcciones}`}>
        <Pin n={4} />
        <span className={styles.btnFalso}>Completar mis datos</span>
        <span className={`${styles.btnFalso} ${styles.btnFalsoSec}`}>Ver en SECOP II</span>
      </div>

      <figcaption>Esquema ilustrativo. No es un proceso real ni lleva cifras.</figcaption>
    </figure>
  );
}

/** El camino del "sí": va al final del paso para que en móvil se lea después de la salida. */
function Sigue() {
  return (
    <span className={styles.sigue}>
      Sí <span aria-hidden="true">↓</span>
    </span>
  );
}

function Arbol() {
  return (
    <div className={styles.arbol}>
      <h3>Cómo razona la ficha</h3>
      <ol className={styles.pasos}>
        <li className={styles.paso}>
          <span className={styles.nodo}>Abres la ficha</span>
          <Sigue />
        </li>
        <li className={styles.paso}>
          <span className={`${styles.nodo} ${styles.pregunta}`}>¿Recibe ofertas?</span>
          <span className={styles.salida}>
            <b>No</b> → ves el resultado o buscas procesos similares
          </span>
          <Sigue />
        </li>
        <li className={styles.paso}>
          <span className={`${styles.nodo} ${styles.pregunta}`}>
            ¿Hay requisitos del pliego y datos tuyos?
          </span>
          <span className={`${styles.salida} ${styles.salidaFalta}`}>
            <b>Faltan</b> → «todavía no puedo determinarlo»: qué falta y cómo obtenerlo
          </span>
          <Sigue />
        </li>
        <li className={styles.paso}>
          <span className={`${styles.nodo} ${styles.pregunta}`}>¿Cumples lo comprobado?</span>
          <span className={styles.finales}>
            <span data-final="si">
              <b>Sí</b> → preparar la participación
            </span>
            <span data-final="subsanable">
              <b>Subsanable</b> → cómo resolverlo
            </span>
            <span data-final="no">
              <b>No</b> → el motivo y alternativas
            </span>
          </span>
        </li>
      </ol>
      <p className={styles.arbolNota}>
        Cuando no tiene con qué responder, lo dice. Nunca rellena un hueco con una suposición.
      </p>
    </div>
  );
}

export default function FichaViva() {
  return (
    <section className={styles.seccion} id="ficha-viva" aria-labelledby="ficha-viva-titulo">
      <div className={styles.contenedor}>
        <p className={styles.eyebrow}>LA FICHA VIVA</p>
        <h2 id="ficha-viva-titulo">Cada proceso tiene una ficha. Ahí es donde decides.</h2>
        <p className={styles.lead}>
          El mapa y la lista te llevan a la ficha. La ficha lee el proceso del SECOP II, te dice qué
          se sabe y qué todavía no, y de dónde sale cada dato. Pensada para leerse en el móvil,
          entre obra y obra.
        </p>

        <div className={styles.grid}>
          <Esquema />

          <div>
            <ol className={styles.preguntas}>
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
            <p className={styles.cambios}>
              <strong>Seguir sus cambios</strong> — adendas, cambios de estado y adjudicación dentro
              de la propia ficha.{" "}
              <span className={styles.estado} data-estado="construccion">
                {ESTADO.construccion}
              </span>{" "}
              Hoy la ficha muestra el estado actual del proceso, tal como lo publica el SECOP II.
            </p>
          </div>
        </div>

        <Arbol />

        <div className={styles.pie}>
          <div className={styles.leyenda}>
            <p>El color dice el tipo de obra, siempre con su nombre. El estado va aparte.</p>
            <ul>
              {FAMILIAS.map((f) => (
                <li key={f.familia} data-familia={f.familia} style={{ "--tipo": f.oscuro }}>
                  <span aria-hidden="true" />
                  {f.label}
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.ctas}>
            <Link className={styles.ctaPrimario} href="/licitaciones">
              Abrir fichas de procesos <span aria-hidden="true">→</span>
            </Link>
            <Link className={styles.ctaSecundario} href="/diagnostico">
              Dar mis datos: diagnóstico sin cuenta
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
