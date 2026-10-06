"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FAMILIAS } from "@/src/lib/classify/tipo-color";
import { departamentoCorto, familiaDe, presupuestoCorto } from "@/src/lib/landing/proceso-portada";
import Minifichas, { categoriaDe } from "./Minifichas";
import { procesoDesdeObjetivo, useActivoEnMapa, useGrupoEnMapa } from "./sincronia";
import { indiceRelativo, usePrefiereMenosMovimiento, useRecorrido } from "./recorrido";
import { familiasPorDepartamento, gruposDe } from "@/src/lib/landing/grupos-portada";
import styles from "./hero-territorial.module.css";
import BuscadorGuiado from "./BuscadorGuiado";

/**
 * El hero de la portada: «Explora el mapa. Entiende cada proceso.» con una
 * ficha central (spec 2026-10-06-hero-ficha-central; sustituye a la fila de
 * cinco minifichas del 2026-10-04).
 *
 * Dos columnas: a la izquierda el mensaje, el buscador, **una** ficha —la del
 * proceso activo— y su navegación (← · puntos · «n de 5» · →); a la derecha el
 * mapa, con una sola etiqueta flotante junto al anclaje del activo, y la
 * leyenda. Mapa y ficha son **la misma selección**: llegan en `procesos` desde
 * el servidor (`muestraPortada()`), y el mapa del servidor se dibujó con esos
 * mismos objetos. Aquí no se sortea ni se pide nada.
 *
 * Un solo estado compartido, el proceso activo (su id), y **siempre hay uno**
 * mientras el grupo no esté vacío: por defecto el primero, también al cambiar
 * de grupo o pausar. Lo cambian las flechas y los puntos, señalar un anclaje o
 * enfocar una etiqueta del mapa, y el recorrido. Soltar el puntero no lo
 * borra: la ficha nunca queda vacía.
 *
 * `procesos` trae la muestra entera —hasta 30— y se ven de cinco en cinco:
 * «Ver otros 5 procesos» enciende el grupo siguiente en la ficha y en el mapa a
 * la vez (el mapa ya los trae dibujados todos). Un recorrido avanza la ficha
 * cada 5 s (`recorrido.js`); se detiene al señalar o enfocar la ficha o el
 * mapa, con «Pausar recorrido» y si el sistema pide reducir el movimiento.
 *
 * `procesos === null` es un error de carga (la consulta falló al regenerar la
 * portada); `[]`, que no hay candidatos. No hay estado «cargando»: la selección
 * viaja en el HTML.
 */
export default function HeroTerritorial({ mapa = null, procesos = null }) {
  // `null` = el primero del grupo visible. Se guarda la elección y se deriva el
  // activo: así cambiar de grupo o pausar vuelve al primero sin un efecto.
  const [eleccion, setActivo] = useState(null);
  const onActivar = useCallback((id) => setActivo(id), []);
  const mapaRef = useRef(null);
  const muestra = useMemo(() => procesos ?? [], [procesos]);
  const grupos = useMemo(() => gruposDe(muestra), [muestra]);
  const [grupo, setGrupo] = useState(0);
  const lista = useMemo(() => grupos[grupo] ?? [], [grupos, grupo]);
  const posicion = Math.max(
    0,
    lista.findIndex((p) => p.id === eleccion)
  );
  const procesoActivo = lista[posicion] ?? null;
  const activo = procesoActivo?.id ?? null;
  const familias = useMemo(
    () => new Map(muestra.map((p) => [p.id, familiaDe(p.tipoProyecto)])),
    [muestra]
  );
  const familiasDpto = useMemo(() => familiasPorDepartamento(lista), [lista]);
  useActivoEnMapa(mapaRef, activo, familias);
  useGrupoEnMapa(mapaRef, grupo, familiasDpto);

  // El recorrido: pausado por el botón, mientras se interactúa con el hero o
  // si el sistema pide menos movimiento.
  const [pausado, setPausado] = useState(false);
  const [interactuando, setInteractuando] = useState(false);
  const menosMovimiento = usePrefiereMenosMovimiento();
  const ids = useMemo(() => lista.map((p) => p.id), [lista]);
  const hayRecorrido = !menosMovimiento && ids.length > 1;
  useRecorrido(ids, onActivar, hayRecorrido && !pausado && !interactuando, activo);
  const [aviso, setAviso] = useState("");
  const verOtros = () => {
    const siguiente = (grupo + 1) % grupos.length;
    setGrupo(siguiente);
    setActivo(null);
    setAviso(
      `Mostrando ${grupos[siguiente].length} procesos más (grupo ${siguiente + 1} de ${grupos.length}).`
    );
  };
  // Se detiene solo sobre lo que se lee —el mapa y las tarjetas—, no en todo
  // el hero: en escritorio ocupa casi la pantalla y no se vería nunca.
  const pausaAlInteractuar = {
    onPointerEnter: () => setInteractuando(true),
    onPointerLeave: () => setInteractuando(false),
    onFocus: () => setInteractuando(true),
    onBlur: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setInteractuando(false);
    },
  };
  const pausar = () => {
    setPausado((p) => !p);
    setActivo(null);
  };
  // Navegación manual: se anuncia (el recorrido no), con la posición y el
  // objeto del proceso nuevo.
  const irA = (indice) => {
    const p = lista[indice];
    if (!p) return;
    setActivo(p.id);
    setAviso(`Proceso ${indice + 1} de ${lista.length}: ${p.objeto ?? p.numeroProceso}.`);
  };
  const siguienteTamano = grupos.length > 1 ? grupos[(grupo + 1) % grupos.length].length : 0;
  // Señalar el fondo del mapa no borra el activo: solo lo cambian una etiqueta
  // o un anclaje.
  const alSenalarMapa = (e) => {
    const id = procesoDesdeObjetivo(e.target);
    if (id) setActivo(id);
  };
  // La leyenda dice las tres familias siempre; «sin subsistema» solo si hay
  // algún proceso así en el grupo visible (spec §7.8).
  const conSinTipo = lista.some((p) => familiaDe(p.tipoProyecto) === "otros");
  const leyenda = FAMILIAS.filter((f) => f.familia !== "otros" || conSinTipo);

  return (
    <section className={styles.hero} aria-labelledby="aq-hero-title">
      <div className={styles.contenedor}>
        <div className={styles.grid}>
          <div className={styles.copy}>
            <h1 id="aq-hero-title">
              <span>Explora el mapa.</span> <span>Entiende cada proceso.</span>
            </h1>
            <p className={styles.lead}>
              Encuentra procesos de agua y saneamiento y revisa sus condiciones en una ficha.
            </p>
            <BuscadorGuiado />
            <div className={styles.procesos} {...pausaAlInteractuar}>
              {procesos == null ? (
                <p className={styles.notaProcesos} role="status">
                  No pudimos cargar los procesos. Inténtalo de nuevo.
                </p>
              ) : !procesoActivo ? (
                <p className={styles.notaProcesos} role="status">
                  No hay procesos disponibles para mostrar en este momento.
                </p>
              ) : (
                <>
                  <Minifichas proceso={procesoActivo} />
                  {lista.length > 1 ? (
                    <div className={styles.navFicha}>
                      <button
                        type="button"
                        className={styles.flecha}
                        aria-label="Proceso anterior"
                        onClick={() => irA(indiceRelativo(posicion, -1, lista.length))}
                      >
                        <span aria-hidden="true">←</span>
                      </button>
                      <div className={styles.puntos}>
                        {lista.map((p, i) => (
                          <button
                            key={p.id}
                            type="button"
                            className={styles.punto}
                            data-activo={i === posicion ? "" : undefined}
                            aria-label={`Ver proceso ${i + 1}`}
                            aria-current={i === posicion ? "true" : undefined}
                            onClick={() => irA(i)}
                          />
                        ))}
                      </div>
                      <p className={styles.posicion}>
                        {posicion + 1} de {lista.length}
                      </p>
                      <button
                        type="button"
                        className={styles.flecha}
                        aria-label="Proceso siguiente"
                        onClick={() => irA(indiceRelativo(posicion, 1, lista.length))}
                      >
                        <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  ) : null}
                </>
              )}
              <div className={styles.procesosPie}>
                {grupos.length > 1 ? (
                  <button type="button" className={styles.botonOtros} onClick={verOtros}>
                    <span aria-hidden="true">↻</span> Ver otros {siguienteTamano} procesos
                  </button>
                ) : null}
                {hayRecorrido ? (
                  <button type="button" className={styles.botonPausa} onClick={pausar}>
                    {pausado ? "Reanudar recorrido" : "Pausar recorrido"}
                  </button>
                ) : null}
                <Link className={styles.enlaceTodos} href="/licitaciones">
                  Ver todas las fichas <span aria-hidden="true">→</span>
                </Link>
              </div>
              {/* Solo al pulsar «Ver otros» o navegar a mano: el recorrido no
                  se anuncia. */}
              <p className="sr-only" role="status">
                {aviso}
              </p>
            </div>
          </div>

          <div className={styles.mapPanel} {...pausaAlInteractuar}>
            <div
              ref={mapaRef}
              className={styles.map}
              onPointerOver={alSenalarMapa}
              onFocus={alSenalarMapa}
            >
              {mapa}
            </div>
            {/* En móvil la etiqueta del mapa se oculta: esta línea dice dónde
                está y cuánto vale el proceso activo. Oculta al lector de
                pantalla, que ya tiene la ficha. */}
            {procesoActivo ? (
              <p className={styles.previa} aria-hidden="true">
                <strong>{departamentoCorto(procesoActivo.departamento)}</strong> ·{" "}
                {presupuestoCorto(procesoActivo.presupuesto)} ·{" "}
                {categoriaDe(procesoActivo.tipoProyecto)}
              </p>
            ) : null}
            {/* Solo los colores, discretos, bajo el mapa (2026-10-04). Las notas
                de moneda y ubicación salieron por decisión del usuario; la
                ubicación sigue en la descripción accesible del mapa y los
                créditos de la geometría, en el pie del sitio. */}
            <ul className={styles.leyenda} aria-label="Categorías del proceso">
              {leyenda.map((f) => (
                <li key={f.familia} data-familia={f.familia}>
                  <span aria-hidden="true" />
                  {f.label}
                </li>
              ))}
            </ul>
            {!mapa ? (
              <p className={styles.noData}>El mapa no está disponible en este momento.</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
