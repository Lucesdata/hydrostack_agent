"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FAMILIAS } from "@/src/lib/classify/tipo-color";
import { departamentoCorto, familiaDe, presupuestoCorto } from "@/src/lib/landing/proceso-portada";
import Minifichas, { categoriaDe } from "./Minifichas";
import { procesoDesdeObjetivo, useActivoEnMapa } from "./sincronia";
import styles from "./hero-territorial.module.css";

/**
 * El hero de la portada: «Explora el mapa. Entiende cada proceso.» con cinco
 * minifichas (spec 2026-10-04-hero-cinco-minifichas).
 *
 * Arriba, el mensaje a la izquierda y el mapa a la derecha; debajo, a todo el
 * ancho, «Procesos para explorar», con la leyenda del mapa en la misma franja
 * que su título (como la referencia). En el DOM la leyenda va justo después del
 * mapa: así se lee en móvil, donde las zonas se apilan. Mapa y tarjetas son **la misma selección**:
 * llegan en `procesos` desde el servidor (`muestraPortada()`), y el mapa del
 * servidor se dibujó con esos mismos objetos. Aquí no se sortea ni se pide nada.
 *
 * Un solo estado compartido, el proceso activo (su id): señalar o enfocar una
 * tarjeta resalta su etiqueta, su anclaje y su departamento; señalar o enfocar
 * una etiqueta del mapa resalta su tarjeta. Nada de eso cambia la selección ni
 * mueve la página.
 *
 * `procesos === null` es un error de carga (la consulta falló al regenerar la
 * portada); `[]`, que no hay candidatos. No hay estado «cargando»: la selección
 * viaja en el HTML.
 */
export default function HeroTerritorial({ mapa = null, procesos = null }) {
  const [activo, setActivo] = useState(null);
  const onActivar = useCallback((id) => setActivo(id), []);
  const mapaRef = useRef(null);
  const lista = useMemo(() => procesos ?? [], [procesos]);
  const familias = useMemo(
    () => new Map(lista.map((p) => [p.id, familiaDe(p.tipoProyecto)])),
    [lista]
  );
  useActivoEnMapa(mapaRef, activo, familias);
  const alSenalarMapa = (e) => setActivo(procesoDesdeObjetivo(e.target));
  const alSoltarMapa = () => setActivo(null);
  const procesoActivo = lista.find((p) => p.id === activo) ?? null;
  // La leyenda dice las tres familias siempre; «sin subsistema» solo si hay
  // alguna tarjeta así a la vista (spec §7.8).
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
          </div>

          <div className={styles.mapPanel}>
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
            {/* En móvil las etiquetas del mapa no caben: esta línea dice dónde
                está y cuánto vale el proceso activo. Oculta al lector de
                pantalla, que ya tiene las tarjetas, para no anunciar cada
                desplazamiento. */}
            {lista.length > 0 ? (
              <p className={styles.previa} aria-hidden="true">
                {procesoActivo ? (
                  <>
                    <strong>{departamentoCorto(procesoActivo.departamento)}</strong> ·{" "}
                    {presupuestoCorto(procesoActivo.presupuesto)} ·{" "}
                    {categoriaDe(procesoActivo.tipoProyecto)}
                  </>
                ) : (
                  "Desliza las tarjetas para ver cada proceso en el mapa."
                )}
              </p>
            ) : null}
            {!mapa ? (
              <p className={styles.noData}>El mapa no está disponible en este momento.</p>
            ) : null}
          </div>

          <div className={styles.leyendaFila}>
            <ul className={styles.leyenda} aria-label="Categorías del proceso">
              {leyenda.map((f) => (
                <li key={f.familia} data-familia={f.familia}>
                  <span aria-hidden="true" />
                  {f.label}
                </li>
              ))}
            </ul>
            <p className={styles.nota}>
              Valores en COP · Ubicación de la entidad contratante, no de la obra.
            </p>
          </div>

          <h2 id="aq-procesos-titulo" className={styles.procesosTitulo}>
            Procesos para explorar
          </h2>
          <div className={styles.procesos}>
            {procesos == null ? (
              <p className={styles.notaProcesos} role="status">
                No pudimos cargar los procesos. Inténtalo de nuevo.
              </p>
            ) : lista.length === 0 ? (
              <p className={styles.notaProcesos} role="status">
                No hay procesos disponibles para mostrar en este momento.
              </p>
            ) : (
              <Minifichas procesos={lista} activo={activo} onActivar={onActivar} />
            )}
            <Link className={styles.enlaceTodos} href="/licitaciones">
              Ver todas las fichas <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
