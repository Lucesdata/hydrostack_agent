"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatConteo } from "@/src/components/secop/format";
import { ruta } from "@/src/components/landing/seccionesHome";
import { TIPOS_PROYECTO, TIPO_PROYECTO } from "@/src/lib/classify/tipo-proyecto";
import ListaTerritorios from "./ListaTerritorios";
import FichaDepartamento from "./FichaDepartamento";
import ResumenDepartamento from "./ResumenDepartamento";
import BuscadorFichas from "./BuscadorFichas";
import { dptoDesdeObjetivo, indicesDeModo, useMarcasEnMapa, usePinturaEnMapa } from "./sincronia";
import { ESCALONES_MONTO, escalonDe, escalonMontoDe } from "@/src/lib/mapa/escala";
import styles from "./hero-territorial.module.css";

/**
 * El hero de la portada: dos zonas (2026-09-27, plan portada-esencial).
 *
 * A la izquierda, el mensaje, el buscador de fichas y el resultado de elegir en
 * el mapa: nombre, procesos abiertos, los tres de mayor presupuesto y el enlace
 * a sus fichas. A la derecha, el mapa. Las opciones del mapa y la lista de
 * departamentos van plegadas.
 *
 * Salió lo que había hecho decir a los usuarios que la portada estaba muy
 * cargada: tercera columna, tipos por departamento, tooltip de seis líneas,
 * segundo botón, enlace a precios, línea de procesos del sector y un segundo
 * buscador. Lo que salió y sigue existiendo vive en su página (comparar,
 * facetas de tipo, /diagnostico, /precios), enlazada desde el pie.
 */
export default function HeroTerritorial({ mapa = null, departamentos = [], totalAbiertos = null }) {
  const [elegido, setElegido] = useState(null);
  const datosDisponibles = totalAbiertos != null;
  const seleccionado = useMemo(
    () => departamentos.find((d) => d.clave === elegido) ?? departamentos[0] ?? null,
    [departamentos, elegido]
  );
  // Lo que el puntero o el foco señalan en el mapa o en la lista. Mientras
  // existe, el resultado lo muestra de vista previa; al soltarlo vuelve al
  // elegido. Hace de tooltip: el mapa ya no lleva uno propio.
  const [resaltado, setResaltado] = useState(null);
  const previa = useMemo(
    () => (resaltado ? (departamentos.find((d) => d.clave === resaltado) ?? null) : null),
    [departamentos, resaltado]
  );
  const vista = previa ?? seleccionado;
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
  const explorar = ruta("explorar");

  return (
    <section className={styles.hero} aria-labelledby="aq-hero-title">
      <div className={styles.grid}>
        <div className={styles.colIzq}>
          <div className={styles.copy}>
            <h1 id="aq-hero-title">
              Explora el mercado de agua y saneamiento de <span>Colombia.</span>
            </h1>
            <p className={styles.lead}>
              Cada proceso del SECOP II tiene su ficha: qué se contrata, si puedes participar y qué
              te falta.
            </p>
            <BuscadorFichas />
            <Link className={styles.primaryCta} href={explorar.href}>
              Ver fichas de procesos <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className={styles.resultado}>
            <FichaDepartamento
              departamento={vista}
              totalAbiertos={totalAbiertos}
              vistaPrevia={previa != null}
            />
            {/* Del departamento elegido, no del señalado: pedirlo al pasar el
                puntero sería una petición por cada departamento cruzado. Mientras
                se previsualiza otro, se atenúa. */}
            <ResumenDepartamento
              departamento={seleccionado}
              atenuado={previa != null && previa.clave !== seleccionado?.clave}
            />
            {vista && vista.n > 0 ? (
              <Link className={styles.fichaCta} href={`/licitaciones/departamento/${vista.slug}`}>
                Ver {vista.n === 1 ? "la ficha" : `las ${formatConteo(vista.n)} fichas`} de{" "}
                {vista.label} <span aria-hidden="true">→</span>
              </Link>
            ) : null}
          </div>
        </div>

        <div className={styles.mapPanel} aria-label="Procesos abiertos por departamento">
          <div className={styles.mapaCab}>
            <p>
              <strong>Procesos abiertos por departamento</strong>{" "}
              <span>· según ubicación de la entidad contratante</span>
            </p>
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
          {mapa && totalAbiertos == null ? (
            <p className={styles.noData}>El mapa no tiene datos disponibles en este momento.</p>
          ) : null}
          {datosDisponibles && departamentos.length > 0 ? (
            <details className={styles.lista} id="aq-lista-departamentos">
              <summary>
                {departamentos.length === 1
                  ? "Ver el departamento como lista"
                  : `Ver los ${formatConteo(departamentos.length)} departamentos como lista`}
              </summary>
              <ListaTerritorios
                departamentos={departamentos}
                seleccionado={seleccionado}
                onSeleccionar={setElegido}
                resaltado={resaltado}
                onResaltar={setResaltado}
              />
            </details>
          ) : null}
        </div>
      </div>
    </section>
  );
}
