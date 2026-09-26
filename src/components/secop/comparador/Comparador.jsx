"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatConteo, formatCopEscala } from "@/src/components/secop/format";
import {
  formatPorcentaje,
  porcentajeNacional,
} from "@/src/components/landing/hero-territorial/FichaDepartamento";
import { colorDeTipo } from "@/src/lib/classify/tipo-color";
import { TIPOS_PROYECTO, TIPO_PROYECTO } from "@/src/lib/classify/tipo-proyecto";
import {
  MAX_COMPARADOS,
  clavesDesdeHash,
  hashDesdeClaves,
  seleccionInicial,
} from "@/src/lib/secop/comparador";

/**
 * Hasta tres departamentos lado a lado, con las cifras de la ficha del hero.
 * Las filas son métricas y las columnas departamentos: una <table> de verdad,
 * con encabezados de fila, para que un lector de pantalla la pueda recorrer.
 *
 * La selección arranca en los dos con más procesos (igual en servidor y
 * cliente, así no hay desajuste al hidratar) y después se lee del hash.
 */
export default function Comparador({ departamentos = [], totalAbiertos = null }) {
  const porClave = useMemo(() => new Map(departamentos.map((d) => [d.clave, d])), [departamentos]);
  const ordenados = useMemo(
    () => [...departamentos].sort((a, b) => a.label.localeCompare(b.label, "es")),
    [departamentos]
  );
  const [claves, setClaves] = useState(() => seleccionInicial(departamentos));

  useEffect(() => {
    const desdeHash = clavesDesdeHash(window.location.hash, new Set(porClave.keys()));
    if (desdeHash.length) setClaves(desdeHash);
  }, [porClave]);

  const elegir = (i, clave) => {
    const nuevas = [...claves];
    nuevas[i] = clave || null;
    const limpias = nuevas.filter(Boolean);
    setClaves(limpias);
    window.history.replaceState(null, "", hashDesdeClaves(limpias) || window.location.pathname);
  };

  const elegidos = claves.map((c) => porClave.get(c)).filter(Boolean);

  if (departamentos.length === 0) {
    return <p className="cmp-vacio">Los datos por departamento no están disponibles ahora · —</p>;
  }

  return (
    <div className="cmp">
      <div className="cmp-selectores">
        {Array.from({ length: MAX_COMPARADOS }, (_, i) => (
          <label key={i} className="cmp-selector">
            <span>
              Departamento {i + 1}
              {i >= 2 ? " (opcional)" : ""}
            </span>
            <select value={claves[i] ?? ""} onChange={(e) => elegir(i, e.target.value)}>
              <option value="">{i < 2 ? "Elige un departamento" : "— Ninguno —"}</option>
              {ordenados.map((d) => (
                <option
                  key={d.clave}
                  value={d.clave}
                  disabled={claves.includes(d.clave) && claves[i] !== d.clave}
                >
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {elegidos.length === 0 ? (
        <p className="cmp-vacio">Elige al menos un departamento.</p>
      ) : (
        <div className="cmp-tabla" role="region" aria-label="Comparación" tabIndex={0}>
          <table>
            <caption className="sr-only">
              Comparación de {elegidos.map((d) => d.label).join(", ")}
            </caption>
            <thead>
              <tr>
                <td />
                {elegidos.map((d) => (
                  <th key={d.clave} scope="col">
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Fila titulo="Procesos abiertos" elegidos={elegidos}>
                {(d) => <strong>{formatConteo(d.n)}</strong>}
              </Fila>
              <Fila titulo="Del total nacional" elegidos={elegidos}>
                {(d) => formatPorcentaje(porcentajeNacional(d.n, totalAbiertos))}
              </Fila>
              <Fila titulo="Abiertos publicados en los últimos 7 días" elegidos={elegidos}>
                {(d) => formatConteo(d.nuevos7d ?? null)}
              </Fila>
              <Fila titulo="En juego (presupuesto publicado)" elegidos={elegidos}>
                {(d) => (
                  <>
                    {d.nConMonto > 0 ? formatCopEscala(d.montoAbierto) : "—"}
                    <span className="cmp-nota">
                      {formatConteo(d.nConMonto ?? 0)} de {formatConteo(d.n)} con presupuesto
                    </span>
                  </>
                )}
              </Fila>
              <Fila titulo="Entidades que contratan" elegidos={elegidos}>
                {(d) => formatConteo(d.nEntidades ?? null)}
              </Fila>
              {TIPOS_PROYECTO.map((t) => {
                const color = colorDeTipo(t);
                return (
                  <Fila
                    key={t}
                    titulo={
                      <span
                        className={`cmp-tipo${color.familia === "otros" ? " cmp-tipo--otros" : ""}`}
                        style={{ "--tipo": color.claro }}
                      >
                        <i aria-hidden="true" />
                        {TIPO_PROYECTO[t].label}
                      </span>
                    }
                    elegidos={elegidos}
                  >
                    {(d) => {
                      const n = d.tipos?.[t] ?? null;
                      const pct = n != null && d.n > 0 ? (100 * n) / d.n : null;
                      return (
                        <>
                          {formatConteo(n)}
                          {pct != null ? (
                            <span className="cmp-barra" aria-hidden="true">
                              <span style={{ width: `${pct}%`, background: color.claro }} />
                            </span>
                          ) : null}
                        </>
                      );
                    }}
                  </Fila>
                );
              })}
              <tr>
                <td />
                {elegidos.map((d) => (
                  <td key={d.clave}>
                    <Link className="cmp-ver" href={`/licitaciones/departamento/${d.slug}`}>
                      Ver fichas de {d.label} <span aria-hidden="true">→</span>
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <p className="cmp-pie">
        Procesos abiertos, por sede de la entidad contratante. Los tipos no suman el total: hay
        procesos sin clasificar.
      </p>
    </div>
  );
}

function Fila({ titulo, elegidos, children }) {
  return (
    <tr>
      <th scope="row">{titulo}</th>
      {elegidos.map((d) => (
        <td key={d.clave}>{children(d)}</td>
      ))}
    </tr>
  );
}
