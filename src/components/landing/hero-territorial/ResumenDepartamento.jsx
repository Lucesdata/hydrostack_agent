"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { mapApiItem } from "@/src/components/landing/proceso-resumen";

/**
 * Los tres procesos abiertos de mayor presupuesto del departamento elegido,
 * bajo el resultado del hero. Se piden al elegir un departamento —no al pasar
 * el puntero, que dispararía una petición por cada departamento cruzado— y se
 * guardan en memoria para no volver a pedir el mismo.
 *
 * La serie de publicados por semana salió el 2026-09-28 (decisión del usuario,
 * plan portada-esencial). `/api/departamento/[dpto]/resumen` la sigue
 * devolviendo; aquí ya no se lee (PENDIENTES).
 *
 * Solo datos reales: cargando dice que carga, y si falla muestra "—".
 */

const cache = new Map();

export function useResumenDepartamento(clave) {
  const [estado, setEstado] = useState({ clave: null, status: "loading", datos: null });

  useEffect(() => {
    if (!clave) return undefined;
    if (cache.has(clave)) {
      setEstado({ clave, status: "live", datos: cache.get(clave) });
      return undefined;
    }
    let vivo = true;
    setEstado({ clave, status: "loading", datos: null });
    fetch(`/api/departamento/${clave}/resumen`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        if (!vivo) return;
        if (!Array.isArray(d?.destacados)) {
          setEstado({ clave, status: "empty", datos: null });
          return;
        }
        const datos = { destacados: d.destacados.map(mapApiItem) };
        cache.set(clave, datos);
        setEstado({ clave, status: "live", datos });
      })
      .catch(() => {
        if (vivo) setEstado({ clave, status: "empty", datos: null });
      });
    return () => {
      vivo = false;
    };
  }, [clave]);

  return estado.clave === clave ? estado : { clave, status: "loading", datos: null };
}

export default function ResumenDepartamento({ departamento, atenuado = false }) {
  const { status, datos } = useResumenDepartamento(departamento?.clave ?? null);
  if (!departamento) return null;

  return (
    <section
      className="aqResumen"
      aria-label={`Procesos abiertos de mayor presupuesto en ${departamento.label}`}
      data-atenuado={atenuado || undefined}
    >
      <h3>Mayor presupuesto abierto</h3>
      {status === "live" && datos.destacados.length > 0 ? (
        <ol className="aqDestacados">
          {datos.destacados.map((p) => (
            <li key={p.id}>
              <Link href={p.href} title={p.objeto}>
                <span className="aqDestObjeto">{p.objeto}</span>
                <span className="aqDestValor">{p.valor ?? "Sin presupuesto"}</span>
                <span className="aqDestMeta">
                  {[p.entidad, p.ciudad].filter(Boolean).join(" · ")}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="aqResumenNota">
          {status === "loading" ? "Cargando…" : status === "live" ? "Sin procesos abiertos" : "—"}
        </p>
      )}
    </section>
  );
}
