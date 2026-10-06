"use client";

import { useEffect } from "react";

/**
 * Sincronía mapa ↔ minifichas del hero (spec 2026-10-04-hero-cinco-minifichas §8).
 *
 * El mapa es SVG de servidor y no lleva JS: cada etiqueta lleva el id del
 * proceso en `data-proceso`, cada anclaje los ids que comparte en
 * `data-procesos` y cada departamento su código en `data-dpto`. El hero escucha
 * por delegación y marca con clases y atributos lo que toca resaltar. Nunca
 * reordena el SVG: lo pinta React y moverle nodos rompería la reconciliación.
 *
 * Hasta el 2026-10-04 esto sincronizaba departamentos (mapa, lista y ficha del
 * departamento); su estado previo está en git.
 */

/**
 * El id del proceso bajo el puntero o el foco, o `null`. Una etiqueta da el
 * suyo; un anclaje (o su zona de impacto), el primero de su departamento
 * (hero con ficha central, 2026-10-06).
 */
export function procesoDesdeObjetivo(objetivo) {
  const el = objetivo?.closest?.("[data-proceso]");
  if (el) return el.getAttribute("data-proceso");
  const ancla = objetivo?.closest?.("[data-ancla]");
  if (!ancla) return null;
  const ids = ancla.getAttribute("data-primero") ?? ancla.getAttribute("data-procesos") ?? "";
  return ids.split(" ").filter(Boolean)[0] ?? null;
}

/**
 * Qué marcar para un proceso activo, sin DOM: el departamento de su anclaje y
 * la familia que toma ese anclaje. `anclas` son los anclajes del mapa con los
 * ids que comparten; `familias`, id → familia, del mismo contrato que pinta las
 * tarjetas. Un id que el mapa no conoce no marca nada.
 */
export function marcasDeActivo(activo, anclas, familias) {
  if (activo == null) return { dpto: null, familia: null };
  const ancla = anclas.find((a) => a.ids.includes(activo));
  if (!ancla) return { dpto: null, familia: null };
  return { dpto: ancla.dpto, familia: familias.get(activo) ?? "otros" };
}

/**
 * Aplica el proceso activo al mapa:
 * - `is-activo` en su etiqueta, que es la única visible (2026-10-06);
 * - `data-activa` en su anclaje, con su familia: un anclaje compartido por
 *   categorías distintas toma la del activo mientras dure (spec §7.6);
 * - `is-resaltado` en su departamento;
 * - `data-activo` en la raíz, que atenúa el resto sin ocultarlo.
 */
export function aplicarActivo(raiz, activo, familias) {
  if (!raiz) return;
  const nodosAncla = [...raiz.querySelectorAll("[data-procesos]")];
  const anclas = nodosAncla.map((el) => ({
    el,
    dpto: el.getAttribute("data-ancla"),
    ids: (el.getAttribute("data-procesos") ?? "").split(" ").filter(Boolean),
  }));
  const { dpto, familia } = marcasDeActivo(activo, anclas, familias);
  for (const el of raiz.querySelectorAll("[data-proceso]")) {
    el.classList.toggle("is-activo", dpto != null && el.getAttribute("data-proceso") === activo);
  }
  for (const a of anclas) {
    if (dpto != null && a.ids.includes(activo)) a.el.setAttribute("data-activa", familia);
    else a.el.removeAttribute("data-activa");
  }
  for (const el of raiz.querySelectorAll("path[data-dpto]")) {
    el.classList.toggle("is-resaltado", dpto != null && el.getAttribute("data-dpto") === dpto);
  }
  if (dpto != null) raiz.setAttribute("data-activo", "");
  else raiz.removeAttribute("data-activo");
}

export function useActivoEnMapa(contenedorRef, activo, familias) {
  useEffect(() => {
    aplicarActivo(contenedorRef.current, activo, familias);
  }, [contenedorRef, activo, familias]);
}

/**
 * Enciende el grupo `grupo` de señales del mapa y repinta el tinte de los
 * departamentos con las familias de ese grupo (`familiasDpto`: código →
 * familia o "mixta"). El SVG trae todos los grupos dibujados desde el
 * servidor; aquí solo se cambian clases y atributos, nunca nodos.
 */
export function aplicarGrupo(raiz, grupo, familiasDpto) {
  if (!raiz) return;
  for (const el of raiz.querySelectorAll("[data-grupo]")) {
    el.classList.toggle("is-oculto", Number(el.getAttribute("data-grupo")) !== grupo);
  }
  for (const el of raiz.querySelectorAll("path[data-dpto]")) {
    const familia = familiasDpto.get(el.getAttribute("data-dpto"));
    el.classList.toggle("clr-mapa__dpto--sel", familia != null);
    if (familia != null) el.setAttribute("data-familia", familia);
    else el.removeAttribute("data-familia");
  }
}

export function useGrupoEnMapa(contenedorRef, grupo, familiasDpto) {
  useEffect(() => {
    aplicarGrupo(contenedorRef.current, grupo, familiasDpto);
  }, [contenedorRef, grupo, familiasDpto]);
}
