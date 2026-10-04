"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import BloqueDecision from "../ficha/BloqueDecision";
import BotonSeguir from "../seguir/BotonSeguir";
import { ANCHO_RADAR, clicDelPanel, vecino } from "@/src/lib/secop/radar-navegacion";
import type { DetalleRadar } from "@/src/lib/secop/radar";

/**
 * El Radar de la vitrina (fase 2 de `2026-10-04-vitrina-radar.md`): desde
 * 1100 px, la lista a la izquierda y el detalle del proceso elegido a la
 * derecha, sin cambiar de página, como en LinkedIn Empleos o Indeed.
 *
 * Mejora progresiva sobre la rejilla de tarjetas, que sigue siendo del
 * servidor y sigue siendo de enlaces:
 * - Sin JavaScript, o por debajo de 1100 px, cada tarjeta lleva a su ficha. En
 *   el celular la ficha es la pantalla de detalle; no hay otra.
 * - Con JavaScript y ancho suficiente, un clic principal elige la tarjeta y
 *   pinta su detalle en el panel. Ctrl, Cmd, Mayúsculas o el botón central
 *   abren la ficha como siempre (`clicDelPanel`).
 * - ↑/↓ recorren la lista y eligen; Enter sobre una tarjeta abre su ficha.
 *
 * El panel aloja el mismo `BloqueDecision` de la ficha, con los datos que arma
 * el servidor (`detallesDeRadar`): veredicto con el perfil, las cinco
 * compuertas y el siguiente paso. Se monta solo cuando se sabe que hay ancho,
 * para no pedir el veredicto en un celular que no va a enseñarlo.
 */
export default function RadarVitrina({
  detalles,
  children,
}: {
  detalles: DetalleRadar[];
  children: ReactNode;
}) {
  const ids = detalles.map((d) => d.id);
  const clave = ids.join(",");
  const [elegido, setElegido] = useState<string | null>(ids[0] ?? null);
  // `null` mientras no se sabe (servidor y primer render): el CSS decide.
  const [ancho, setAncho] = useState<boolean | null>(null);
  const lista = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${ANCHO_RADAR}px)`);
    const leer = () => setAncho(mq.matches);
    leer();
    mq.addEventListener("change", leer);
    return () => mq.removeEventListener("change", leer);
  }, []);

  // Otra página u otros filtros: vuelve a la primera tarjeta.
  useEffect(() => {
    setElegido((actual) =>
      actual && clave.split(",").includes(actual) ? actual : clave.split(",")[0] || null
    );
  }, [clave]);

  // La tarjeta elegida se marca en el DOM del servidor, sin volver a pintarlo.
  useEffect(() => {
    lista.current?.querySelectorAll<HTMLAnchorElement>("a.fc[data-id]").forEach((a) => {
      const marcada = ancho === true && a.dataset.id === elegido;
      a.toggleAttribute("data-elegida", marcada);
      if (marcada) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
  }, [elegido, ancho]);

  function elegir(id: string) {
    setElegido(id);
    panel.current?.scrollTo({ top: 0 });
  }

  function alClic(e: MouseEvent<HTMLDivElement>) {
    if (ancho !== true || !clicDelPanel(e)) return;
    const a = (e.target as Element).closest<HTMLAnchorElement>("a.fc[data-id]");
    const id = a?.dataset.id;
    if (!id || !ids.includes(id)) return;
    e.preventDefault();
    elegir(id);
  }

  function alTeclear(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const a = (e.target as Element).closest<HTMLAnchorElement>("a.fc[data-id]");
    if (!a) return;
    const siguiente = vecino(ids, a.dataset.id ?? null, e.key === "ArrowDown" ? 1 : -1);
    if (!siguiente) return;
    e.preventDefault();
    lista.current
      ?.querySelector<HTMLAnchorElement>(`a.fc[data-id="${CSS.escape(siguiente)}"]`)
      ?.focus();
    if (ancho === true) elegir(siguiente);
  }

  const detalle = detalles.find((d) => d.id === elegido) ?? null;

  return (
    <div className="vr">
      {/* La delegación de clic y teclado mejora enlaces que ya funcionan solos. */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div className="vr-lista" ref={lista} onClick={alClic} onKeyDown={alTeclear}>
        {children}
      </div>
      {ancho !== false && detalle && (
        <aside className="vr-panel" ref={panel} aria-label="Detalle del proceso elegido">
          <p className="vr-oculto" aria-live="polite">
            {ancho === true ? `Detalle: ${detalle.titulo}` : ""}
          </p>
          <header className="vr-cab">
            <p className="vr-meta">
              {detalle.tipoLabel && (
                <span className="vr-tipo">
                  <span
                    className={`vr-punto${detalle.tipoColor ? "" : " vr-punto--otros"}`}
                    style={detalle.tipoColor ? { background: detalle.tipoColor } : undefined}
                    aria-hidden="true"
                  />
                  {detalle.tipoLabel}
                </span>
              )}
              <span>{detalle.lugar}</span>
            </p>
            <h2 className="vr-titulo">{detalle.titulo}</h2>
            <p className="vr-entidad">
              {detalle.entidad} · <span className="vr-id">{detalle.id}</span>
            </p>
            <div className="vr-acciones">
              <BotonSeguir id={detalle.id} variante="panel" />
              <Link className="vr-abrir" href={detalle.href}>
                Abrir la ficha completa →
              </Link>
              {detalle.datos.urlSecop && (
                <a
                  className="vr-secop"
                  href={detalle.datos.urlSecop}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ver en SECOP II ↗
                </a>
              )}
            </div>
          </header>
          {ancho === true && <BloqueDecision key={detalle.id} {...detalle.datos} />}
        </aside>
      )}
    </div>
  );
}
