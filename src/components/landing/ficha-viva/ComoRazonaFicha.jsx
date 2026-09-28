import { COLOR_TIPO, FAMILIAS } from "@/src/lib/classify/tipo-color";
import { TIPO_PROYECTO } from "@/src/lib/classify/tipo-proyecto";
import { CLAVES_COMPUERTA, ETIQUETA_COMPUERTA } from "@/src/lib/secop/semaforo";
import styles from "./ficha-viva.module.css";

/**
 * «Cómo razona la ficha»: el esquema ilustrativo de una ficha, el árbol de
 * decisiones, el aviso de lo que aún no hace (seguir los cambios) y la leyenda
 * del color por tipo de obra.
 *
 * Vivía en la Ficha Viva de la portada. Salió de ahí el 2026-09-28 (PR 3 del
 * plan portada-esencial) porque pesaba en la primera visita, y se mudó a
 * /licitaciones/como-participar, donde explica cómo la ficha acompaña cada paso
 * para ofertar. Las mismas dos reglas de siempre:
 *
 * 1. **El esquema es un dibujo, no un proceso.** Ni un nombre ni una cifra: las
 *    líneas de texto son barras grises y los estados de las compuertas son un
 *    ejemplo rotulado como tal.
 * 2. **Cada promesa lleva su estado real.** Lo que no existe se marca como
 *    «En construcción».
 */

const EN_CONSTRUCCION = "En construcción";

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

export default function ComoRazonaFicha() {
  return (
    <div className={styles.razona}>
      <Esquema />
      <p className={styles.cambios}>
        <strong>Seguir sus cambios</strong> — adendas, cambios de estado y adjudicación dentro de la
        propia ficha.{" "}
        <span className={styles.estado} data-estado="construccion">
          {EN_CONSTRUCCION}
        </span>{" "}
        Hoy la ficha muestra el estado actual del proceso, tal como lo publica el SECOP II.
      </p>
      <Arbol />
      <div className={styles.leyenda}>
        <p>El color dice el tipo de obra, siempre con su nombre. El estado va aparte.</p>
        <ul>
          {FAMILIAS.map((f) => (
            // Página clara: el color de cada familia para fondo claro.
            <li key={f.familia} data-familia={f.familia} style={{ "--tipo": f.claro }}>
              <span aria-hidden="true" />
              {f.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
