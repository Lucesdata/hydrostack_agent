"use client";
import { useState } from "react";
import { useGuiaFicha } from "./RelojFicha";
export default function GuiaTemporal() {
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const g = useGuiaFicha();
  const activa = seleccion ?? g.etapas.find((e) => e.actual)?.id ?? "publicacion";
  const elegida = g.etapas.find((e) => e.id === activa)!;
  return (
    <aside className="fi-guia" aria-label="Guía temporal del proceso">
      <div className="fi-guia-top">
        <span>El proceso, de un vistazo</span>
        <strong>{g.suspendido ? "Suspendido" : g.etapa.nombre}</strong>
      </div>
      <p className="fi-guia-kicker">Momento actual</p>
      <h2>{g.accion.titulo}</h2>
      <p className="fi-guia-intro">{g.accion.texto}</p>
      <div className="fi-guia-etapas" role="group" aria-label="Explorar el ciclo del proceso">
        {g.etapas.map((e) => (
          <button
            type="button"
            key={e.id}
            aria-pressed={activa === e.id}
            aria-current={e.actual ? "step" : undefined}
            onClick={() => setSeleccion(e.id)}
            className={`${e.actual ? "actual" : ""} ${e.completada ? "completa" : ""}`}
          >
            <span className="fi-guia-dot" aria-hidden="true">
              {e.completada ? "✓" : ""}
            </span>
            <span>{e.nombre}</span>
            <small>{e.actual ? "Estás aquí" : (e.fecha ?? "Sin fecha")}</small>
          </button>
        ))}
      </div>
      <p className="fi-guia-nota" role="status">
        <strong>
          {elegida.nombre}
          {elegida.fecha ? ` · ${elegida.fecha}` : " · fecha no publicada"}
        </strong>
        <br />
        {elegida.texto}
      </p>
      <div className="fi-guia-reloj">
        <span className="fi-guia-kicker">
          {g.dias !== null ? "Tiempo para presentar la oferta" : "Situación del plazo"}
        </span>
        {g.dias !== null && (
          <div className="fi-guia-dias">
            <strong>{g.dias}</strong>
            <span>{g.dias === 1 ? "día natural" : "días naturales"}</span>
          </div>
        )}
        <p>{g.mensajePlazo}</p>
        {g.cierre && (
          <p className="fi-guia-fecha">
            <strong>{g.cierre}</strong>
            <span>Fecha de referencia en Colombia</span>
          </p>
        )}
        {g.avance !== null && (
          <>
            <div className="fi-guia-barra" aria-hidden="true">
              <span style={{ width: `${g.avance}%` }} />
            </div>
            <div className="fi-guia-extremos">
              <span>Publicación</span>
              <span>Cierre de ofertas</span>
            </div>
          </>
        )}
      </div>
      <a className="fi-guia-accion" href={g.accion.href}>
        {g.accion.enlace} <span aria-hidden="true">↗</span>
      </a>
      <a className="fi-guia-enlace" href="#ficha-plazos">
        Consultar cronograma completo →
      </a>
      <p className="fi-guia-pie">
        Según la última información disponible. Las fechas pueden cambiar; confirma su vigencia en
        SECOP II.
      </p>
    </aside>
  );
}
