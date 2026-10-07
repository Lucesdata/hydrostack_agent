"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FAMILIAS } from "@/src/lib/classify/tipo-color";
import { departamentoCorto, familiaDe, presupuestoCorto } from "@/src/lib/landing/proceso-portada";
import {
  criterioDe,
  FAMILIAS_DESTACADAS,
  hrefDeFamilia,
  PESTANA,
} from "@/src/lib/landing/destacados-portada";
import Minifichas, { categoriaDe } from "./Minifichas";
import { procesoDesdeObjetivo, useActivoEnMapa, useGrupoEnMapa } from "./sincronia";
import { indiceRelativo, usePrefiereMenosMovimiento, useRecorrido } from "./recorrido";
import { familiasPorDepartamento } from "@/src/lib/landing/grupos-portada";
import styles from "./hero-territorial.module.css";
import BuscadorGuiado from "./BuscadorGuiado";

/**
 * El hero de la portada: «Explora el mapa. Entiende cada proceso.» con los
 * tres destacados (spec 2026-10-07-hero-tres-destacados; sustituye a la ficha
 * central con 30 procesos al azar del 2026-10-06).
 *
 * Dos columnas: a la izquierda el mensaje, el buscador y **tres pestañas**
 * —Agua potable · Agua residual · Redes—, cada una con la ficha de su proceso
 * más relevante, la regla que lo eligió y el enlace a los demás de la familia
 * por presupuesto; a la derecha el mapa, con el anclaje de cada destacado. Mapa
 * y fichas son **la misma selección**: llegan en `destacados` desde el servidor
 * (`destacadosPortada()`). Aquí no se sortea ni se pide nada.
 *
 * Un solo estado, la pestaña elegida, y **siempre hay una**: por defecto la
 * primera con proceso. La cambian las pestañas (clic o flechas del teclado),
 * señalar un anclaje o una etiqueta del mapa, y el recorrido, que pasa por las
 * pestañas con proceso cada `INTERVALO_RECORRIDO` ms y se detiene al señalar o
 * enfocar la ficha o el mapa, con «Pausar recorrido» y si el sistema pide
 * reducir el movimiento.
 *
 * `destacados === null` es un error de carga (la consulta falló al regenerar
 * la portada). Una pestaña sin proceso dice que hoy no hay ninguno: no se
 * rellena con otro.
 */
export default function HeroTerritorial({ mapa = null, destacados = null }) {
  const [eleccion, setEleccion] = useState(null);
  const mapaRef = useRef(null);
  const lista = useMemo(() => destacados ?? [], [destacados]);
  const conProceso = useMemo(() => lista.filter((d) => d.proceso), [lista]);
  // La pestaña a la vista: la elegida o, si no, la primera con proceso.
  const activa = lista.find((d) => d.familia === eleccion) ?? conProceso[0] ?? lista[0] ?? null;
  const procesoActivo = activa?.proceso ?? null;
  const activo = procesoActivo?.id ?? null;
  const procesos = useMemo(() => conProceso.map((d) => d.proceso), [conProceso]);
  const familias = useMemo(
    () => new Map(procesos.map((p) => [p.id, familiaDe(p.tipoProyecto)])),
    [procesos]
  );
  const familiasDpto = useMemo(() => familiasPorDepartamento(procesos), [procesos]);
  useActivoEnMapa(mapaRef, activo, familias);
  // Un solo grupo: el mapa del servidor dibujó los tres destacados.
  useGrupoEnMapa(mapaRef, 0, familiasDpto);

  // El recorrido: pausado por el botón, mientras se interactúa con el hero o
  // si el sistema pide menos movimiento. Solo pasa por pestañas con proceso.
  const [pausado, setPausado] = useState(false);
  const [interactuando, setInteractuando] = useState(false);
  const menosMovimiento = usePrefiereMenosMovimiento();
  const ids = useMemo(() => conProceso.map((d) => d.familia), [conProceso]);
  const hayRecorrido = !menosMovimiento && ids.length > 1;
  const onRecorrido = useCallback((f) => setEleccion(f), []);
  useRecorrido(ids, onRecorrido, hayRecorrido && !pausado && !interactuando, activa?.familia);
  const [aviso, setAviso] = useState("");
  // Se detiene solo sobre lo que se lee —el mapa y la ficha—, no en todo el
  // hero: en escritorio ocupa casi la pantalla y no se vería nunca.
  const pausaAlInteractuar = {
    onPointerEnter: () => setInteractuando(true),
    onPointerLeave: () => setInteractuando(false),
    onFocus: () => setInteractuando(true),
    onBlur: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setInteractuando(false);
    },
  };
  const pausar = () => setPausado((p) => !p);
  // Elegir a mano se anuncia (el recorrido no), con la pestaña y el objeto.
  const elegir = (familia) => {
    const d = lista.find((x) => x.familia === familia);
    if (!d) return;
    setEleccion(familia);
    setAviso(
      d.proceso
        ? `${PESTANA[familia]}: ${d.proceso.objeto ?? d.proceso.numeroProceso}.`
        : `${PESTANA[familia]}: hoy no hay un proceso destacado.`
    );
  };
  // Pestañas con activación automática (patrón ARIA de pestañas): ← → mueven
  // la elección y el foco; Inicio y Fin van a los extremos.
  const alTeclear = (e) => {
    const i = lista.findIndex((d) => d.familia === activa?.familia);
    const destino =
      e.key === "ArrowRight"
        ? indiceRelativo(i, 1, lista.length)
        : e.key === "ArrowLeft"
          ? indiceRelativo(i, -1, lista.length)
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? lista.length - 1
              : -1;
    if (destino < 0) return;
    e.preventDefault();
    const f = lista[destino].familia;
    elegir(f);
    document.getElementById(`aq-pestana-${f}`)?.focus();
  };
  // Señalar el fondo del mapa no cambia nada: solo un anclaje o una etiqueta.
  const alSenalarMapa = (e) => {
    const id = procesoDesdeObjetivo(e.target);
    const d = id ? conProceso.find((x) => x.proceso.id === id) : null;
    if (d) setEleccion(d.familia);
  };
  // La leyenda dice las tres familias: son las tres pestañas.
  const leyenda = FAMILIAS.filter((f) => FAMILIAS_DESTACADAS.includes(f.familia));

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
              {destacados == null ? (
                <p className={styles.notaProcesos} role="status">
                  No pudimos cargar los procesos. Inténtalo de nuevo.
                </p>
              ) : (
                <>
                  <div
                    className={styles.pestanas}
                    role="tablist"
                    aria-label="Proceso más relevante por tipo de obra"
                    onKeyDown={alTeclear}
                  >
                    {lista.map((d) => {
                      const elegida = d.familia === activa?.familia;
                      return (
                        <button
                          key={d.familia}
                          id={`aq-pestana-${d.familia}`}
                          type="button"
                          role="tab"
                          className={styles.pestana}
                          data-familia={d.familia}
                          aria-selected={elegida}
                          aria-controls="aq-panel-destacado"
                          tabIndex={elegida ? 0 : -1}
                          onClick={() => elegir(d.familia)}
                        >
                          <span className={styles.pestanaPunto} aria-hidden="true" />
                          {PESTANA[d.familia]}
                        </button>
                      );
                    })}
                  </div>
                  <div
                    id="aq-panel-destacado"
                    role="tabpanel"
                    className={styles.panelDestacado}
                    aria-labelledby={activa ? `aq-pestana-${activa.familia}` : undefined}
                  >
                    {procesoActivo ? (
                      <>
                        <p className={styles.criterio}>{criterioDe(activa)}</p>
                        <Minifichas proceso={procesoActivo} />
                      </>
                    ) : (
                      <p className={styles.notaProcesos}>
                        Hoy no hay procesos de {PESTANA[activa?.familia ?? "potable"].toLowerCase()}{" "}
                        con presupuesto publicado que reciban ofertas.
                      </p>
                    )}
                    {activa ? (
                      <Link className={styles.enlaceFamilia} href={hrefDeFamilia(activa.familia)}>
                        Ver más de {PESTANA[activa.familia].toLowerCase()}, de mayor a menor
                        presupuesto <span aria-hidden="true">→</span>
                      </Link>
                    ) : null}
                  </div>
                </>
              )}
              <div className={styles.procesosPie}>
                {hayRecorrido ? (
                  <button type="button" className={styles.botonPausa} onClick={pausar}>
                    {pausado ? "Reanudar recorrido" : "Pausar recorrido"}
                  </button>
                ) : null}
                <Link className={styles.enlaceTodos} href="/licitaciones">
                  Ver todas las fichas <span aria-hidden="true">→</span>
                </Link>
              </div>
              {/* Solo al elegir a mano: el recorrido no se anuncia. */}
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
