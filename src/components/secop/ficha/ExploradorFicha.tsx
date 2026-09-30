"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type SeccionFicha = {
  id: string;
  etiqueta: string;
  contenido: ReactNode;
};

const ICONOS: Record<string, ReactNode> = {
  resumen: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  proposito: (
    <>
      <path d="M12 3C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-12Z" />
      <path d="M9 15a3 3 0 0 0 3 3" />
    </>
  ),
  dinero: (
    <>
      <rect x="3" y="5" width="18" height="15" rx="2" />
      <path d="M3 9h18M16 13h5v4h-5z" />
    </>
  ),
  plazos: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2" />
    </>
  ),
  responsables: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v3" />
    </>
  ),
  metas: (
    <>
      <path d="m3 6 2 2 4-4m3 2h9M3 13l2 2 4-4m3 2h9M3 20l2 2 4-4m3 2h9" />
    </>
  ),
};

/** Solo navegación: el contenido y sus fuentes se construyen en el servidor.
 * Sin JavaScript todas las secciones quedan legibles. El hash conserva los
 * enlaces compartidos y el regreso de la subida (#pliego=ok/error:…). */
export default function ExploradorFicha({ secciones }: { secciones: SeccionFicha[] }) {
  const [activa, setActiva] = useState<string | null>(null);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame: number;
    const leerHash = () => {
      const hash = window.location.hash.slice(1);
      const pliego = hash === "pliego" || hash.startsWith("pliego=");
      const destino = pliego ? "participar" : hash.replace(/^ficha-/, "");
      const encontrada = secciones.find((s) => s.id === destino);
      setActiva(encontrada?.id ?? "resumen");
      if (pliego) {
        frame = requestAnimationFrame(() => {
          raiz.current?.querySelector("#pliego")?.scrollIntoView({ block: "start" });
        });
      }
    };
    leerHash();
    window.addEventListener("hashchange", leerHash);
    window.addEventListener("popstate", leerHash);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", leerHash);
      window.removeEventListener("popstate", leerHash);
    };
  }, [secciones]);

  function elegir(id: string) {
    setActiva(id);
    window.history.pushState(null, "", `#ficha-${id}`);
    if (id === "participar") {
      requestAnimationFrame(() => {
        const panel = raiz.current?.querySelector<HTMLElement>("#ficha-participar");
        panel?.focus({ preventScroll: true });
        panel?.scrollIntoView({ block: "start" });
      });
    }
  }

  return (
    <div className="fi-explorador" ref={raiz}>
      <div className="fi-explorar-cabecera">
        <p>Elige qué quieres conocer</p>
        <span>Una pregunta a la vez</span>
      </div>
      <nav className="fi-navegacion" aria-label="Explorar la ficha">
        {secciones
          .filter((s) => s.id !== "participar")
          .map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={(activa ?? "resumen") === s.id}
              aria-controls={`ficha-${s.id}`}
              onClick={() => elegir(s.id)}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {ICONOS[s.id]}
              </svg>
              {s.etiqueta}
            </button>
          ))}
      </nav>
      <p className="sr-only" role="status">
        {activa ? `${secciones.find((s) => s.id === activa)?.etiqueta}` : ""}
      </p>
      <div className="fi-contenido">
        {secciones.map((s) => (
          <section
            key={s.id}
            id={`ficha-${s.id}`}
            className="fi-tab-panel"
            aria-label={s.etiqueta}
            tabIndex={-1}
            hidden={activa !== null && activa !== s.id}
          >
            {s.contenido}
          </section>
        ))}
      </div>
      <div className="fi-participar">
        <span>¿Este proceso le interesa a tu empresa?</span>
        <button
          type="button"
          className="fi-btn"
          aria-controls="ficha-participar"
          aria-pressed={activa === "participar"}
          onClick={() => elegir("participar")}
        >
          Quiero participar <span aria-hidden="true">↗</span>
        </button>
      </div>
    </div>
  );
}
