"use client";

import { useState } from "react";
import Link from "next/link";
import type { CuerpoAlerta } from "@/src/lib/secop/alerta-vitrina";

/**
 * «🔔 Avisarme de procesos nuevos así» (fase 3 de la vitrina, tarea 5).
 *
 * Guarda la búsqueda de la vitrina como un filtro de `/mis-filtros`
 * (`POST /api/al/filtros`): el cron lo corre cada día y lo que case llega en el
 * correo. Antes de guardar enseña lo que va a vigilar y en qué se diferencia de
 * la búsqueda, y deja cambiar el nombre. `/mis-filtros` no edita filtros, solo
 * los pausa o los borra: el texto de ayuda no promete más. El cuerpo lo arma el servidor
 * (`filtroDesdeVitrina`); aquí solo se manda.
 *
 * Sin sesión, la API responde 401 y se lleva al registro con `next` de vuelta.
 */
export default function AlertaVitrina({
  cuerpo,
  criterios,
  conBusqueda,
}: {
  cuerpo: CuerpoAlerta;
  criterios: string[];
  /** Hay texto buscado: se avisa de que la alerta lo busca solo en el proceso. */
  conBusqueda: boolean;
}) {
  const [nombre, setNombre] = useState(cuerpo.nombre);
  const [estado, setEstado] = useState<"quieto" | "guardando" | "hecho" | "error">("quieto");
  const [error, setError] = useState<string | null>(null);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setEstado("guardando");
    setError(null);
    try {
      const r = await fetch("/api/al/filtros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...cuerpo, nombre: nombre.trim() || cuerpo.nombre }),
      });
      if (r.status === 401) {
        const vuelta = window.location.pathname + window.location.search;
        window.location.assign(`/registro?next=${encodeURIComponent(vuelta)}`);
        return;
      }
      if (!r.ok) {
        const data = (await r.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "No se pudo crear la alerta.");
        setEstado("error");
        return;
      }
      setEstado("hecho");
    } catch {
      setError("No se pudo crear la alerta. Revisa la conexión e inténtalo de nuevo.");
      setEstado("error");
    }
  }

  return (
    <details className="va">
      <summary className="va-resumen">🔔 Avisarme de procesos nuevos así</summary>
      {estado === "hecho" ? (
        <p className="va-hecho" role="status">
          Alerta creada. Los procesos nuevos que casen te llegarán en el correo diario.{" "}
          <Link href="/mis-filtros">Ver mis alertas</Link>
        </p>
      ) : (
        <form className="va-form" onSubmit={guardar}>
          <p className="va-texto">Cada día te avisaremos por correo de los procesos nuevos con:</p>
          <ul className="va-lista">
            {criterios.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          {conBusqueda && (
            <p className="va-nota">
              En la alerta, la palabra se busca en el objeto y la descripción del proceso, no en la
              entidad ni el municipio.
            </p>
          )}
          <label className="va-nombre">
            Nombre de la alerta
            <input
              className="clr-input"
              value={nombre}
              maxLength={120}
              onChange={(e) => setNombre(e.target.value)}
            />
          </label>
          <div className="va-acciones">
            <button className="va-boton" type="submit" disabled={estado === "guardando"}>
              {estado === "guardando" ? "Creando…" : "Crear alerta"}
            </button>
            <span className="va-ayuda">
              Necesitas una cuenta gratuita. La pausas o la borras en Mis filtros.
            </span>
          </div>
          {error && (
            <p className="va-error" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </details>
  );
}
