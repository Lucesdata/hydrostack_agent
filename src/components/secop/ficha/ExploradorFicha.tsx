"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
export type SeccionFicha = {
  id: string;
  etiqueta: string;
  contenido: ReactNode;
  desplegable?: boolean;
  abierta?: boolean;
};
/** Las anclas antiguas se conservan; el contenido sigue construido en servidor. */
export function destinoFicha(hash: string): string {
  const limpio = hash.replace(/^#/, "");
  if (limpio === "pliego" || limpio.startsWith("pliego=")) return "pliego";
  const id = limpio.replace(/^ficha-/, "");
  const aliases: Record<string, string> = {
    objeto: "proposito",
    cronologia: "situacion",
    cronograma: "plazos",
    presupuesto: "dinero",
    requisitos: "participar",
    responsables: "general",
    tecnica: "metas",
    resumen: "resumen",
    documentos: "documentos",
    secop: "secop",
  };
  return `ficha-${aliases[id] ?? id}`;
}
export default function ExploradorFicha({
  secciones,
  acciones,
}: {
  secciones: SeccionFicha[];
  acciones?: ReactNode;
}) {
  const [rapida, setRapida] = useState(false),
    [todos, setTodos] = useState(false),
    [aviso, setAviso] = useState(""),
    [activa, setActiva] = useState("");
  const raiz = useRef<HTMLDivElement>(null);
  const avisoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (avisoTimer.current) clearTimeout(avisoTimer.current);
    },
    []
  );
  useEffect(() => {
    let frame = 0;
    const abrirDestino = (hash = window.location.hash) => {
      if (!hash) return;
      const id = destinoFicha(hash);
      const target = document.getElementById(id);
      if (!target) return;
      setRapida(false);
      let parent: HTMLElement | null = target;
      while (parent) {
        if (parent instanceof HTMLDetailsElement) parent.open = true;
        parent = parent.parentElement;
      }
      frame = requestAnimationFrame(() => {
        target.scrollIntoView({ block: "start", behavior: "instant" });
        target.focus({ preventScroll: true });
      });
    };
    const cambioHash = () => abrirDestino();
    const ficha = raiz.current?.closest(".fi");
    const click = (event: Event) => {
      if (
        !(event instanceof MouseEvent) ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.defaultPrevented
      )
        return;
      const enlace =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href^='#']")
          : null;
      const hash = enlace?.getAttribute("href");
      if (!hash || !document.getElementById(destinoFicha(hash))) return;
      event.preventDefault();
      if (window.location.hash !== hash) window.history.pushState(null, "", hash);
      abrirDestino(hash);
    };
    ficha?.addEventListener("click", click);
    abrirDestino();
    window.addEventListener("hashchange", cambioHash);
    window.addEventListener("popstate", cambioHash);
    return () => {
      cancelAnimationFrame(frame);
      ficha?.removeEventListener("click", click);
      window.removeEventListener("hashchange", cambioHash);
      window.removeEventListener("popstate", cambioHash);
    };
  }, []);
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActiva(e.target.id);
      },
      { rootMargin: "-10% 0px -65% 0px" }
    );
    raiz.current?.querySelectorAll("[data-ficha-seccion]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  function desplegar() {
    setRapida(false);
    const lista = raiz.current?.querySelectorAll<HTMLDetailsElement>("details.fi-detalle");
    lista?.forEach((d) => (d.open = !todos));
    setTodos(!todos);
  }
  const estadoImpresion = useRef<{
    lista: HTMLDetailsElement[];
    abiertos: boolean[];
    rapida: boolean;
  } | null>(null);
  useEffect(() => {
    const preparar = () => {
      if (estadoImpresion.current) return;
      const lista = [...document.querySelectorAll<HTMLDetailsElement>(".fi details")];
      estadoImpresion.current = { lista, abiertos: lista.map((d) => d.open), rapida };
      lista.forEach((d) => {
        d.open = true;
      });
      setRapida(false);
    };
    const restaurar = () => {
      const anterior = estadoImpresion.current;
      if (!anterior) return;
      anterior.lista.forEach((d, i) => {
        d.open = anterior.abiertos[i];
      });
      setRapida(anterior.rapida);
      estadoImpresion.current = null;
    };
    window.addEventListener("beforeprint", preparar);
    window.addEventListener("afterprint", restaurar);
    return () => {
      window.removeEventListener("beforeprint", preparar);
      window.removeEventListener("afterprint", restaurar);
    };
  }, [rapida]);
  function imprimir() {
    window.print();
  }
  async function copiar() {
    const code = document.getElementById("ficha-codigo")?.textContent ?? "";
    try {
      await navigator.clipboard.writeText(code);
      setAviso("Código copiado");
    } catch (error) {
      console.error("[ficha] No se pudo copiar el código", error);
      setAviso("Selecciona el código visible para copiarlo.");
    }
    if (avisoTimer.current) clearTimeout(avisoTimer.current);
    avisoTimer.current = setTimeout(() => setAviso(""), 4000);
  }
  return (
    <div className={`fi-explorador${rapida ? " fi-rapida" : ""}`} ref={raiz}>
      <div className="fi-herramientas">
        <div className="fi-modos" role="group" aria-label="Nivel de lectura">
          <span className="sr-only">
            La lectura rápida muestra los puntos esenciales; la ficha completa incluye los detalles
            desplegables.
          </span>
          <button type="button" aria-pressed={!rapida} onClick={() => setRapida(false)}>
            Ficha completa
          </button>
          <button type="button" aria-pressed={rapida} onClick={() => setRapida(true)}>
            Lectura rápida
          </button>
        </div>
        <div className="fi-acciones">
          {acciones}
          <button type="button" className="fi-btn" onClick={copiar}>
            Copiar código
          </button>
          <button type="button" className="fi-btn" onClick={imprimir}>
            Imprimir / PDF
          </button>
        </div>
      </div>
      <p className="fi-aviso" role="status">
        {aviso}
      </p>
      <nav className="fi-atajos" aria-label="Accesos rápidos">
        <a href="#ficha-situacion">Próximo hito</a>
        <a href="#ficha-participar">Requisitos mínimos</a>
        <a href="#ficha-dinero">Presupuesto</a>
        <a href="#ficha-documentos">Documentos</a>
      </nav>
      <div className="fi-layout">
        <div className="fi-contenido">
          {secciones.map((s) =>
            s.desplegable ? (
              <details
                key={s.id}
                id={`ficha-${s.id}`}
                data-ficha-seccion
                tabIndex={-1}
                className="fi-detalle"
                open={s.abierta}
                onToggle={() => {
                  const ds = [
                    ...(raiz.current?.querySelectorAll<HTMLDetailsElement>("details.fi-detalle") ??
                      []),
                  ];
                  setTodos(ds.length > 0 && ds.every((d) => d.open));
                }}
              >
                <summary>
                  <h2>{s.etiqueta}</h2>
                  <span aria-hidden="true">+</span>
                </summary>
                <div className="fi-detalle-cuerpo">{s.contenido}</div>
              </details>
            ) : (
              <section
                key={s.id}
                id={`ficha-${s.id}`}
                data-ficha-seccion
                className="fi-card"
                tabIndex={-1}
              >
                <h2>{s.etiqueta}</h2>
                {s.contenido}
              </section>
            )
          )}
        </div>
        <aside className="fi-indice">
          <nav aria-label="En esta ficha">
            <p>En esta ficha</p>
            {secciones.map((s) => (
              <a
                key={s.id}
                href={`#ficha-${s.id}`}

                aria-current={activa === `ficha-${s.id}` ? "location" : undefined}
              >
                {s.etiqueta}
              </a>
            ))}
          </nav>
          <button type="button" className="fi-btn" onClick={desplegar}>
            {todos ? "Contraer todo" : "Desplegar todo"}
          </button>
          <a href="#ficha-inicio" className="fi-volver">
            ↑ Volver al inicio
          </a>
        </aside>
      </div>
    </div>
  );
}
