"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatConteo } from "@/src/components/secop/format";
import { TIPOS_PROYECTO, TIPO_PROYECTO } from "@/src/lib/classify/tipo-proyecto";
import ListaTerritorios from "./ListaTerritorios";
import FichaDepartamento from "./FichaDepartamento";
import TarjetaProceso from "./ResumenDepartamento";
import BuscadorFichas from "./BuscadorFichas";
import { dptoDesdeObjetivo, indicesDeModo, useMarcasEnMapa, usePinturaEnMapa } from "./sincronia";
import { ESCALONES_MONTO, escalonDe, escalonMontoDe } from "@/src/lib/mapa/escala";
import styles from "./hero-territorial.module.css";

const CARGANDO = { status: "loading", destacado: null, reintentar: () => {} };

/**
 * El departamento al que llega la portada: el primero con procesos en el orden
 * del servidor (hoy, de más a menos). Sin datos o sin ninguno con procesos, no
 * hay elección y no se pide nada (spec 2026-10-02-hero-mapa-ficha §7.1).
 */
export function claveInicial(departamentos = [], totalAbiertos = null) {
  if (totalAbiertos == null) return null;
  return departamentos.find((d) => d.n > 0)?.clave ?? null;
}

const procesos = (n) => `${formatConteo(n)} ${n === 1 ? "proceso abierto" : "procesos abiertos"}`;

/**
 * El hero de la portada: «Explora el mapa. Entiende cada proceso.» (spec
 * 2026-10-02-hero-mapa-ficha, sobre la referencia aprobada).
 *
 * Dos columnas casi iguales. A la izquierda el titular, una frase, el buscador
 * y, bajo un filete, el departamento confirmado con la tarjeta de su proceso
 * destacado y «Ver ficha». A la derecha el mapa, con las opciones y la lista
 * plegadas. Debajo de 900 px: mensaje, mapa y resultado.
 *
 * Controlado desde `PortadaCliente`: la clave confirmada y el estado del
 * destacado viven allí porque la franja de abajo enlaza el mismo proceso, y
 * dos componentes no deben pedir el mismo resumen cada uno por su lado.
 *
 * Se llega a un departamento (ya no a la vista país, hero v2) y se cambia con
 * la lista. El clic del mapa sigue navegando a la faceta (decisión D). Pasar el
 * puntero solo resalta y escribe una línea en el panel del mapa: el nombre y la
 * tarjeta de la izquierda no cambian, ni se atenúan.
 */
export default function HeroTerritorial({
  mapa = null,
  departamentos = [],
  totalAbiertos = null,
  clave: claveProp,
  onElegir = () => {},
  resumen = CARGANDO,
}) {
  const datosDisponibles = totalAbiertos != null;
  const clave = claveProp === undefined ? claveInicial(departamentos, totalAbiertos) : claveProp;
  const seleccionado = useMemo(
    () => (clave ? (departamentos.find((d) => d.clave === clave) ?? null) : null),
    [departamentos, clave]
  );
  // Lo que el puntero o el foco señalan en el mapa o en la lista: solo la línea
  // de vista previa del mapa y el resaltado. Nunca pide nada a la API.
  const [resaltado, setResaltado] = useState(null);
  const previa = useMemo(
    () => (resaltado ? (departamentos.find((d) => d.clave === resaltado) ?? null) : null),
    [departamentos, resaltado]
  );
  const mapaRef = useRef(null);
  useMarcasEnMapa(mapaRef, resaltado, seleccionado?.clave ?? null);
  // Cómo se colorea el mapa: por procesos (lo que pinta el servidor), por monto
  // en juego o por los procesos de un solo tipo de proyecto. Solo se ofrece si
  // las filas traen el detalle: sin él no hay nada que pintar.
  const hayDetalle = departamentos.some((d) => d.montoAbierto != null && d.tipos);
  const [modo, setModo] = useState("procesos");
  const [tipoFiltro, setTipoFiltro] = useState(null);
  const modoEfectivo = hayDetalle ? modo : "procesos";
  const indices = useMemo(
    () =>
      indicesDeModo({
        modo: modoEfectivo,
        tipo: tipoFiltro,
        departamentos,
        escalonDe,
        escalonMontoDe,
      }),
    [modoEfectivo, tipoFiltro, departamentos]
  );
  usePinturaEnMapa(mapaRef, modoEfectivo, indices);
  const elegirMetrica = (valor) => {
    setModo(valor);
    setTipoFiltro(null);
  };
  const elegirTipo = (tipo) => {
    // Un tipo pinta procesos de ese tipo: el monto no está desglosado por tipo.
    setTipoFiltro(tipo || null);
    setModo(tipo ? "tipo" : "procesos");
  };
  const alSenalarMapa = (e) => setResaltado(dptoDesdeObjetivo(e.target));
  const alSoltarMapa = () => setResaltado(null);
  const hayLista = datosDisponibles && departamentos.length > 0;

  return (
    <section className={styles.hero} aria-labelledby="aq-hero-title">
      <div className={styles.grid}>
        <div className={styles.colIzq}>
          <div className={styles.copy}>
            <h1 id="aq-hero-title">
              <span>Explora el mapa.</span> <span>Entiende cada proceso.</span>
            </h1>
            <p className={styles.lead}>
              Encuentra procesos de agua y saneamiento y revisa sus condiciones en una ficha.
            </p>
            <BuscadorFichas />
          </div>

          <div className={styles.resultado}>
            {seleccionado ? (
              <>
                <FichaDepartamento titulo={seleccionado.label} />
                <TarjetaProceso estado={resumen} />
                {/* Se anuncia una vez, al llegar el proceso; el puntero no. */}
                <p className="sr-only" role="status">
                  {resumen.status === "live" ? `Proceso disponible de ${seleccionado.label}` : ""}
                </p>
                <Link
                  className={styles.enlaceTodos}
                  href={`/licitaciones/departamento/${seleccionado.slug}`}
                >
                  Ver todos los procesos de {seleccionado.label} <span aria-hidden="true">→</span>
                </Link>
              </>
            ) : (
              <>
                {totalAbiertos === 0 ? <FichaDepartamento titulo="Colombia" /> : null}
                <p className={styles.notaResultado}>
                  {!datosDisponibles
                    ? "No hay datos territoriales disponibles en este momento."
                    : totalAbiertos === 0
                      ? "No hay procesos abiertos disponibles."
                      : "No hay procesos con ubicación resuelta para mostrar aquí."}
                </p>
                <Link className={styles.enlaceTodos} href="/licitaciones">
                  Explorar todos los procesos <span aria-hidden="true">→</span>
                </Link>
              </>
            )}
          </div>
        </div>

        <div className={styles.mapPanel} aria-label="Procesos abiertos por departamento">
          <div className={styles.mapaCab}>
            <div className={styles.mapaTitulo}>
              <p className={styles.mapaH}>Explora por departamento</p>
              <p>Ubicación de la entidad contratante, no de la obra.</p>
            </div>
            <div className={styles.mapaCabDer}>
              {hayDetalle && datosDisponibles ? (
                <details className={styles.opciones}>
                  <summary>Opciones del mapa</summary>
                  <div className={styles.opcionesPanel}>
                    <label>
                      Colorear por
                      <select
                        value={modoEfectivo === "monto" ? "monto" : "procesos"}
                        onChange={(e) => elegirMetrica(e.target.value)}
                      >
                        <option value="procesos">Procesos abiertos</option>
                        <option value="monto">Monto en juego</option>
                      </select>
                    </label>
                    <label>
                      Tipo de proyecto
                      <select value={tipoFiltro ?? ""} onChange={(e) => elegirTipo(e.target.value)}>
                        <option value="">Todos</option>
                        {TIPOS_PROYECTO.map((t) => (
                          <option key={t} value={t}>
                            {TIPO_PROYECTO[t].label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </details>
              ) : null}
            </div>
          </div>
          <div
            ref={mapaRef}
            className={styles.map}
            onPointerOver={alSenalarMapa}
            onPointerLeave={alSoltarMapa}
            onFocus={alSenalarMapa}
            onBlur={alSoltarMapa}
          >
            {mapa}
          </div>
          {/* La vista previa del puntero: una línea reservada, sin región viva
              (el nombre accesible de cada departamento ya lo dice al enfocarlo). */}
          {hayLista ? (
            <p className={styles.previa}>
              {previa ? (
                <>
                  <strong>{previa.label}:</strong> {procesos(previa.n)}
                </>
              ) : (
                "Señala un departamento para ver cuántos procesos tiene abiertos."
              )}
            </p>
          ) : null}
          {modoEfectivo === "monto" ? (
            // La leyenda del servidor es la de procesos: con monto se oculta por
            // CSS (data-metrica) y se pinta esta en el mismo sitio, bajo el mapa,
            // para que cambiar de modo no mueva nada.
            <ul className={styles.leyendaMonto} aria-label="Monto en juego">
              {ESCALONES_MONTO.map((e) => (
                <li key={e.indice}>
                  <span style={{ background: `var(--aq-e${e.indice})` }} aria-hidden="true" />
                  {e.etiqueta}
                </li>
              ))}
            </ul>
          ) : null}
          {tipoFiltro ? (
            <p className={styles.ayuda}>
              El tipo cambia el mapa. La ficha mostrada corresponde al destacado general del
              departamento.
            </p>
          ) : null}
          {!mapa ? (
            <p className={styles.noData}>El mapa no está disponible en este momento.</p>
          ) : totalAbiertos == null ? (
            <p className={styles.noData}>El mapa no tiene datos disponibles en este momento.</p>
          ) : null}
          {hayLista ? (
            <>
              <details className={styles.lista} id="aq-lista-departamentos">
                <summary>
                  {departamentos.length === 1
                    ? "Ver el departamento como lista"
                    : `Ver los ${formatConteo(departamentos.length)} departamentos como lista`}
                </summary>
                <ListaTerritorios
                  departamentos={departamentos}
                  seleccionado={seleccionado}
                  onSeleccionar={onElegir}
                  resaltado={resaltado}
                  onResaltar={setResaltado}
                />
              </details>
              <p className={styles.ayuda}>
                Elige en la lista para ver una ficha aquí; abre un departamento del mapa para ver
                todos sus procesos.
              </p>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
