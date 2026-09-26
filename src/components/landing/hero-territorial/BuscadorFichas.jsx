"use client";

import { useEffect, useRef, useState } from "react";
import { formatCopCompact } from "@/src/components/secop/format";
import { frase, titulo } from "@/src/components/landing/ProcesosTicker";
import { slugDeProceso } from "@/src/lib/secop/slug";

/**
 * Buscador del hero: mientras se escribe, los cinco primeros procesos abiertos
 * que coinciden, cada uno enlazado a su ficha; con Enter, todos en el explorador.
 *
 * Usa `/api/secop`, el mismo endpoint del explorador, que busca en el objeto y
 * en el nombre de la entidad —no en el municipio—, y el placeholder dice
 * exactamente eso. Sin JS, el formulario hace lo mismo que Enter: va al
 * explorador con `?q=`.
 */

const MIN = 3;
const EXPLORAR = "/licitaciones/explorar";

/** De un SecopProceso a lo que pinta una fila. `href` solo si el id es de una ficha. */
export function resultadoDeBusqueda(p) {
  const esFicha = /^CO1\.[A-Z]+\.\d+$/i.test(p.id ?? "");
  const lugar = [titulo(p.ciudad), titulo(p.departamento)].filter(Boolean).join(", ");
  return {
    id: p.id,
    objeto: frase(p.nombre || p.descripcion) || "Proceso sin objeto publicado",
    detalle: [titulo(p.entidad), lugar].filter(Boolean).join(" · "),
    monto: p.precioBase > 0 ? formatCopCompact(p.precioBase) : null,
    href: esFicha ? `/licitaciones/${slugDeProceso(p.nombre, p.id)}` : null,
  };
}

export function urlExplorador(q) {
  return `${EXPLORAR}?q=${encodeURIComponent(q.trim())}`;
}

export default function BuscadorFichas({ className = "" }) {
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("inactivo"); // inactivo | buscando | listo | error
  const [resultados, setResultados] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const listaRef = useRef(null);
  const termino = q.trim();

  useEffect(() => {
    if (termino.length < MIN) {
      setEstado("inactivo");
      setResultados([]);
      return;
    }
    const control = new AbortController();
    // Espera a que se deje de teclear: una consulta por palabra, no por letra.
    const espera = setTimeout(async () => {
      setEstado("buscando");
      try {
        const params = new URLSearchParams({
          tipo: "procesos",
          q: termino,
          apertura: "Abierto",
          page: "1",
          pageSize: "5",
          orden: "fecha",
        });
        const res = await fetch(`/api/secop?${params}`, { signal: control.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const datos = await res.json();
        setResultados((datos.items ?? []).map(resultadoDeBusqueda).filter((r) => r.href));
        setEstado("listo");
      } catch (e) {
        if (e?.name !== "AbortError") setEstado("error");
      }
    }, 300);
    return () => {
      clearTimeout(espera);
      control.abort();
    };
  }, [termino]);

  const mostrar = abierto && estado !== "inactivo";

  return (
    <form
      role="search"
      className={`aqBuscadorHero ${className}`}
      action={EXPLORAR}
      method="get"
      onSubmit={(e) => {
        if (termino.length === 0) e.preventDefault();
      }}
      onBlur={(e) => {
        // Se cierra al salir del buscador, no al pasar del campo a un resultado.
        if (!e.currentTarget.contains(e.relatedTarget)) setAbierto(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setAbierto(false);
      }}
    >
      <label className="aqBuscadorHeroCampo">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          name="q"
          value={q}
          maxLength={120}
          autoComplete="off"
          aria-label="Buscar fichas de procesos abiertos"
          placeholder="Busca por entidad u objeto del contrato…"
          aria-controls="aq-buscador-resultados"
          aria-expanded={mostrar}
          onChange={(e) => {
            setQ(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              listaRef.current?.querySelector("a")?.focus();
            }
          }}
        />
      </label>

      <div
        id="aq-buscador-resultados"
        className="aqBuscadorHeroPanel"
        hidden={!mostrar}
        onKeyDown={(e) => {
          if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
          const enlaces = [...(listaRef.current?.querySelectorAll("a") ?? [])];
          const i = enlaces.indexOf(document.activeElement);
          const siguiente = enlaces[i + (e.key === "ArrowDown" ? 1 : -1)];
          if (siguiente) {
            e.preventDefault();
            siguiente.focus();
          }
        }}
      >
        <p className="aqBuscadorHeroEstado" role="status">
          {estado === "buscando"
            ? "Buscando…"
            : estado === "error"
              ? "No se pudo buscar ahora. Pulsa Enter para abrir el explorador."
              : estado === "listo" && resultados.length === 0
                ? `Ningún proceso abierto coincide con «${termino}».`
                : estado === "listo"
                  ? `${resultados.length === 5 ? "Primeros 5" : resultados.length} procesos abiertos`
                  : ""}
        </p>
        <ul ref={listaRef}>
          {resultados.map((r) => (
            <li key={r.id}>
              <a href={r.href}>
                <span className="aqBuscadorHeroObjeto">{r.objeto}</span>
                <span className="aqBuscadorHeroDetalle">
                  {r.detalle}
                  {r.monto ? <b>{r.monto}</b> : null}
                </span>
              </a>
            </li>
          ))}
        </ul>
        {termino.length >= MIN ? (
          <a className="aqBuscadorHeroTodos" href={urlExplorador(termino)}>
            Ver todos los resultados en el explorador <span aria-hidden="true">→</span>
          </a>
        ) : null}
      </div>
    </form>
  );
}
