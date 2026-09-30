"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { mapApiItem } from "@/src/components/landing/proceso-resumen";
import Semaforo from "@/src/components/secop/semaforo/Semaforo";
import { compuertasAbsolutas } from "@/src/lib/secop/semaforo";

/**
 * Los tres procesos abiertos de mayor presupuesto bajo el resultado del hero.
 *
 * Del departamento elegido: se piden al elegirlo —no al pasar el puntero, que
 * dispararía una petición por cada departamento cruzado— y se guardan en
 * memoria para no volver a pedir el mismo. Sin departamento (la vista país, la
 * inicial) no se pinta: no hay consulta nacional sin tocar el backend
 * (decisión del 2026-09-30).
 *
 * La API no trae la fecha de recepción ni el estado de apertura, así que la
 * compuerta Plazo sale «sin datos» (`UNKNOWN`): se dice que falta, no se deduce.
 *
 * Cada fila lleva el semáforo en su lectura absoluta (`DATO`): qué exige el
 * proceso, sin juzgar a nadie. Por eso ya no pinta el importe a la derecha: la
 * compuerta Cuantía lo enuncia y la fila lo diría dos veces (TRASPASO §4.9).
 * Con perfil el semáforo debería pasar a relativo y el gancho ocultarse, como
 * hace `SemaforoConPerfil` en la ficha: pendiente, fuera de este cambio.
 *
 * Solo datos reales: cargando dice que carga, y si falla muestra "—".
 *
 * Dos filas y cuatro compuertas, no tres y cinco (2026-09-29): con el semáforo
 * cada fila ocupa 2–3 líneas en la columna de 380 px, y el hero se pasaba 124 px
 * del primer pantallazo en 1366×768, con el botón principal debajo. Habilitación
 * sale del hero porque aquí siempre dice «sin datos»: vive en el pliego. La
 * ficha sigue mostrando las cinco. La API sigue sirviendo tres.
 */

const FILAS_HERO = 2;
const sinHabilitacion = (c) => c.clave !== "habilitacion";

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

/** Las filas con su semáforo. Separada del componente para probarla sin red. */
export function ListaDestacados({ destacados }) {
  return (
    <>
      <ol className="aqDestacados">
        {destacados.slice(0, FILAS_HERO).map((p) => (
          <li key={p.id}>
            <Link href={p.href} title={p.objeto}>
              <span className="aqDestObjeto">{p.objeto}</span>
              <span className="aqDestMeta">
                {[p.entidad, p.ciudad].filter(Boolean).join(" · ")}
              </span>
              {/* Un div: el semáforo es una lista, y un span no puede contenerla. */}
              <div className="aqDestSemaforo">
                <Semaforo
                  compuertas={compuertasAbsolutas(p.semaforo).filter(sinHabilitacion)}
                  disposicion="linea"
                />
              </div>
            </Link>
          </li>
        ))}
      </ol>
      <p className="aqGancho">
        Así ves qué exige cada proceso. <Link href="/registro">Crea tu perfil</Link> para saber si
        cumples.
      </p>
    </>
  );
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
        <ListaDestacados destacados={datos.destacados} />
      ) : (
        <p className="aqResumenNota">
          {status === "loading" ? "Cargando…" : status === "live" ? "Sin procesos abiertos" : "—"}
        </p>
      )}
    </section>
  );
}
