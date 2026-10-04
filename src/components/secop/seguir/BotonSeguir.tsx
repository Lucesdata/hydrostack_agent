"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { EstadoSeguido } from "@/src/lib/seguir/store";

/**
 * «☆ Seguir» / «★ Siguiendo» (fase 3 de la vitrina, tarea 3).
 *
 * Seguir mete el proceso en lo que sigue la cuenta: `/mis-coincidencias` y los
 * cambios en el correo diario (`/api/seguir`, `src/lib/seguir/store.ts`).
 *
 * - En la vitrina, `ProveedorSeguir` pide el estado de todas las tarjetas en una
 *   sola petición. En la ficha, que es ISR y no tiene proveedor, el botón pide
 *   el suyo.
 * - Sin sesión, `/api/seguir` responde 401 y el botón lleva a `/registro` con
 *   `next` de vuelta a la misma página: el aviso es por correo, hace falta cuenta.
 * - Lo que la cuenta sigue por su perfil o por un filtro sale como «Siguiendo»,
 *   pero no se puede dejar desde aquí: el cron lo traería de vuelta. El botón lo
 *   dice en vez de fingir que hace algo.
 * - El HTML del servidor pinta «☆ Seguir»: sin JavaScript el botón no hace nada,
 *   y por eso no es un enlace que prometa algo.
 */

type Seguidos = Record<string, EstadoSeguido>;

interface Contexto {
  /** `null` mientras no se sabe; `false` sin sesión. */
  sesion: boolean | null;
  seguidos: Seguidos;
  fijar: (id: string, estado: EstadoSeguido | null) => void;
  sinSesion: () => void;
}

const ContextoSeguir = createContext<Contexto | null>(null);

function useSeguidos(ids: string[]) {
  const [sesion, setSesion] = useState<boolean | null>(null);
  const [seguidos, setSeguidos] = useState<Seguidos>({});
  const clave = ids.join(",");

  useEffect(() => {
    if (!clave) return;
    const control = new AbortController();
    fetch(`/api/seguir?ids=${encodeURIComponent(clave)}`, { signal: control.signal })
      .then(async (r) => {
        if (r.status === 401) return setSesion(false);
        if (!r.ok) return;
        const { seguidos: s } = (await r.json()) as { seguidos: Seguidos };
        setSesion(true);
        setSeguidos(s);
      })
      .catch(() => {
        // Sin red: el botón se queda en «Seguir» y lo intentará al pulsarlo.
      });
    return () => control.abort();
  }, [clave]);

  const fijar = useCallback((id: string, estado: EstadoSeguido | null) => {
    setSeguidos((previo) => {
      const siguiente = { ...previo };
      if (estado) siguiente[id] = estado;
      else delete siguiente[id];
      return siguiente;
    });
  }, []);

  return { sesion, seguidos, fijar, sinSesion: () => setSesion(false) };
}

export function ProveedorSeguir({ ids, children }: { ids: string[]; children: ReactNode }) {
  const valor = useSeguidos(ids);
  return <ContextoSeguir.Provider value={valor}>{children}</ContextoSeguir.Provider>;
}

/** El botón dentro de un proveedor; fuera de él (la ficha), con el suyo propio. */
export default function BotonSeguir(props: {
  id: string;
  variante: "tarjeta" | "panel" | "ficha";
}) {
  const ctx = useContext(ContextoSeguir);
  return ctx ? <Boton {...props} ctx={ctx} /> : <BotonSuelto {...props} />;
}

function BotonSuelto(props: { id: string; variante: "tarjeta" | "panel" | "ficha" }) {
  const ctx = useSeguidos([props.id]);
  return <Boton {...props} ctx={ctx} />;
}

function irAlRegistro() {
  const vuelta = window.location.pathname + window.location.search;
  window.location.assign(`/registro?next=${encodeURIComponent(vuelta)}`);
}

/** Lo que dice el botón, a partir del estado. Puro, para probarlo sin navegador. */
export function textoBoton(estado: EstadoSeguido | undefined): {
  etiqueta: string;
  ayuda: string | null;
} {
  if (!estado?.siguiendo) return { etiqueta: "☆ Seguir", ayuda: null };
  if (estado.manual) return { etiqueta: "★ Siguiendo", ayuda: null };
  return {
    etiqueta: "★ Siguiendo",
    ayuda: "Lo sigues por tu perfil o un filtro: sus cambios ya te llegan por correo.",
  };
}

function Boton({
  id,
  variante,
  ctx,
}: {
  id: string;
  variante: "tarjeta" | "panel" | "ficha";
  ctx: Contexto;
}) {
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const estado = ctx.seguidos[id];
  const { etiqueta, ayuda } = textoBoton(estado);
  const soloLectura = !!estado?.siguiendo && !estado.manual;

  async function pulsar() {
    if (ocupado || soloLectura) return;
    if (ctx.sesion === false) return irAlRegistro();

    const siguiendo = !!estado?.siguiendo;
    setOcupado(true);
    setAviso(null);
    ctx.fijar(id, siguiendo ? null : { siguiendo: true, manual: true });
    try {
      const r = await fetch("/api/seguir", {
        method: siguiendo ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ procesoId: id }),
      });
      if (r.status === 401) {
        ctx.fijar(id, estado ?? null);
        ctx.sinSesion();
        return irAlRegistro();
      }
      if (!r.ok) throw new Error(String(r.status));
      const { estado: resultado } = (await r.json()) as { estado: string };
      if (resultado === "ya-lo-seguia") ctx.fijar(id, { siguiendo: true, manual: false });
      if (resultado === "no-era-manual") ctx.fijar(id, { siguiendo: true, manual: false });
      setAviso(
        siguiendo
          ? "Dejaste de seguir este proceso."
          : "Siguiendo: sus cambios te llegarán por correo."
      );
    } catch {
      ctx.fijar(id, estado ?? null);
      setAviso("No se pudo guardar. Inténtalo de nuevo.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <span className={`sg sg--${variante}`}>
      <button
        type="button"
        className={`sg-boton${estado?.siguiendo ? " sg-boton--on" : ""}`}
        aria-pressed={!!estado?.siguiendo}
        aria-disabled={soloLectura || ocupado || undefined}
        title={ayuda ?? undefined}
        onClick={pulsar}
      >
        {etiqueta}
      </button>
      {/* Solo la ficha y el panel tienen sitio para explicar; en la tarjeta va en el title. */}
      {variante !== "tarjeta" && ayuda && <span className="sg-ayuda">{ayuda}</span>}
      <span className="sg-aviso" role="status">
        {variante !== "tarjeta" ? aviso : null}
      </span>
    </span>
  );
}
