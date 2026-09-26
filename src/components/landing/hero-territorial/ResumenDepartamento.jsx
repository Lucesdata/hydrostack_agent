"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatConteo } from "@/src/components/secop/format";
import { mapApiItem } from "@/src/components/landing/ProcesosTicker";

/**
 * Destacados y tendencia del departamento elegido, dentro de la tarjeta de la
 * ficha. Se pide al elegir un departamento —no al pasar el puntero, que
 * dispararía una petición por cada departamento cruzado— y se guarda en memoria
 * para no volver a pedir el mismo.
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
        if (!Array.isArray(d?.semanas) || !Array.isArray(d?.destacados)) {
          setEstado({ clave, status: "empty", datos: null });
          return;
        }
        const datos = { semanas: d.semanas, destacados: d.destacados.map(mapApiItem) };
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

/** "Últimos 7 días", "Hace 1 semana", "Hace 5 semanas". i = 0 es la más antigua. */
export function rotuloSemana(i, total) {
  const atras = total - 1 - i;
  if (atras === 0) return "Últimos 7 días";
  return atras === 1 ? "Hace 1 semana" : `Hace ${atras} semanas`;
}

const ANCHO = 240;
const ALTO = 44;
const HUECO = 2;

/** Barras de una sola serie: la forma de la tendencia, sin ejes ni porcentajes. */
export function Sparkline({ semanas }) {
  const max = Math.max(1, ...semanas);
  const ancho = (ANCHO - HUECO * (semanas.length - 1)) / semanas.length;
  return (
    <svg
      className="aqSpark"
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {semanas.map((n, i) => {
        const x = i * (ancho + HUECO);
        // Una semana con publicaciones nunca se pinta como vacía.
        const alto = n > 0 ? Math.max(2, (n / max) * (ALTO - 2)) : 0;
        return (
          <g key={i}>
            {/* El blanco de la columna entera recibe el puntero: más fácil que la barra. */}
            <rect className="aqSparkHit" x={x} y={0} width={ancho} height={ALTO}>
              <title>{`${rotuloSemana(i, semanas.length)}: ${formatConteo(n)} publicados`}</title>
            </rect>
            {alto > 0 ? (
              <path
                className="aqSparkBarra"
                d={barra(x, ALTO - alto, ancho, alto, Math.min(2, ancho / 2, alto))}
              />
            ) : (
              <rect className="aqSparkCero" x={x} y={ALTO - 1} width={ancho} height={1} />
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Barra con las esquinas de arriba redondeadas y la base recta, sobre la línea base. */
function barra(x, y, w, h, r) {
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${
    y + r
  }V${y + h}Z`;
}

export default function ResumenDepartamento({ departamento, atenuado = false }) {
  const { status, datos } = useResumenDepartamento(departamento?.clave ?? null);
  if (!departamento) return null;
  const total = datos ? datos.semanas.reduce((a, b) => a + b, 0) : null;

  return (
    <section
      className="aqResumen"
      aria-label={`Actividad reciente en ${departamento.label}`}
      data-atenuado={atenuado || undefined}
    >
      <div className="aqResumenBloque">
        <h3>Publicados por semana · {departamento.label}</h3>
        {status === "live" ? (
          <>
            <Sparkline semanas={datos.semanas} />
            <p className="aqResumenNota">
              {formatConteo(total)} en las últimas {datos.semanas.length} semanas, abiertos o ya
              cerrados
            </p>
            <table className="sr-only">
              <caption>Procesos publicados por semana en {departamento.label}</caption>
              <tbody>
                {datos.semanas.map((n, i) => (
                  <tr key={i}>
                    <th scope="row">{rotuloSemana(i, datos.semanas.length)}</th>
                    <td>{formatConteo(n)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="aqResumenNota">{status === "loading" ? "Cargando…" : "—"}</p>
        )}
      </div>

      <div className="aqResumenBloque">
        <h3>Mayor presupuesto abierto</h3>
        {status === "live" && datos.destacados.length > 0 ? (
          <ol className="aqDestacados">
            {datos.destacados.map((p) => (
              <li key={p.id}>
                <Link href={p.href}>
                  {p.tipo ? (
                    <span
                      className={`aqDestTipo${p.tipo.color.familia === "otros" ? " aqDestTipo--otros" : ""}`}
                      style={{ "--tipo": p.tipo.color.claro }}
                    >
                      <i aria-hidden="true" />
                      {p.tipo.label}
                    </span>
                  ) : null}
                  <span className="aqDestObjeto">{p.objeto}</span>
                  <span className="aqDestMeta">
                    {[p.valor ?? "Sin presupuesto publicado", p.ciudad].filter(Boolean).join(" · ")}
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
      </div>
    </section>
  );
}
