"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import type { Region } from "@/src/lib/marketplace/tipos";
import type { EscenaHandle } from "./Escena3D";
import s from "./marketplace.module.css";

/**
 * Importación diferida y sin SSR (SPEC §3): el JS de three solo se pide cuando
 * hace falta, **después** de hidratar la búsqueda, y nunca en un celular.
 */
const Escena3D = dynamic(() => import("./Escena3D"), { ssr: false });

function hayWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Lo que el visitante ve a la derecha del hero.
 *
 * Por defecto, el mapa 2D del servidor (`mapa2d`, enlaces reales). El 3D lo
 * sustituye solo si el navegador lo permite: ancho de escritorio (≥ 1024 px),
 * sin preferencia de movimiento reducido y con WebGL. En cualquier otro caso —y
 * si el contexto se pierde— el 2D sigue ahí: A08. El selector HTML de
 * departamento (en el buscador y en la lista de territorios) es equivalente en
 * todos los casos, de modo que el canvas es decorativo para quien usa
 * tecnologías de asistencia.
 */
export default function EscenaTerritorial({
  regiones,
  seleccionCodigo,
  destinos,
  mapa2d,
}: {
  regiones: Region[];
  seleccionCodigo: string | null;
  /** Código DIVIPOLA → URL de `/marketplace` con ese departamento. */
  destinos: Record<string, string>;
  /** El mapa 2D de servidor, mientras no haya 3D. */
  mapa2d: ReactNode;
}) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [permitido, setPermitido] = useState(false);
  const [lista, setLista] = useState(false);
  const [fallo, setFallo] = useState(false);
  const controles = useRef<EscenaHandle | null>(null);

  useEffect(() => {
    if (fallo) return undefined;
    const ancho = window.matchMedia("(min-width: 1024px)");
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)");
    let webgl: boolean | null = null;
    const evaluar = () => {
      const ok = ancho.matches && !quieto.matches;
      if (ok && webgl === null) webgl = hayWebGL();
      const permitir = ok && !!webgl;
      setPermitido(permitir);
      if (!permitir) setLista(false);
    };
    evaluar();
    ancho.addEventListener("change", evaluar);
    quieto.addEventListener("change", evaluar);
    return () => {
      ancho.removeEventListener("change", evaluar);
      quieto.removeEventListener("change", evaluar);
    };
  }, [fallo]);

  const alSeleccionar = useCallback(
    (codigo: string) => {
      const destino = destinos[codigo];
      // Misma navegación que el enlace del 2D y el `<select>`; sin saltar de scroll.
      if (destino) empezar(() => router.push(destino, { scroll: false }));
    },
    [destinos, router]
  );
  const alFallar = useCallback(() => {
    setFallo(true);
    setPermitido(false);
    setLista(false);
  }, []);
  const alEstarLista = useCallback(() => setLista(true), []);

  const en3d = permitido && !fallo;

  return (
    <div className={s.territorio3d} data-escena={lista ? "3d" : "2d"}>
      <div className={s.mapa2dCaja} hidden={lista}>
        {mapa2d}
      </div>
      {en3d ? (
        <Escena3D
          regiones={regiones}
          seleccionCodigo={seleccionCodigo}
          onSeleccionar={alSeleccionar}
          onFallo={alFallar}
          onLista={alEstarLista}
          controles={controles}
        />
      ) : null}
      {lista ? (
        <div className={s.controles3d} role="group" aria-label="Vista del mapa">
          <button type="button" onClick={() => controles.current?.acercar()} aria-label="Acercar el mapa">
            +
          </button>
          <button type="button" onClick={() => controles.current?.alejar()} aria-label="Alejar el mapa">
            −
          </button>
          <button type="button" onClick={() => controles.current?.restablecer()}>
            Restablecer vista
          </button>
        </div>
      ) : null}
      <p className={s.visuallyHidden} role="status" aria-live="polite">
        {pendiente ? "Actualizando resultados…" : ""}
      </p>
    </div>
  );
}
