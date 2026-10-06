"use client";
import Link from "next/link";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { SenalesProceso } from "@/src/lib/secop/etapa";
import { guiaTemporal } from "@/src/lib/secop/guia-temporal";
const Contexto = createContext<ReturnType<typeof guiaTemporal> | null>(null);
export function useGuiaFicha() {
  const guia = useContext(Contexto);
  if (!guia) throw new Error("La guía temporal necesita RelojFicha");
  return guia;
}
export default function RelojFicha({
  senales,
  cierrePliego,
  ahora,
  children,
}: {
  senales: SenalesProceso;
  cierrePliego: string | null;
  ahora: string;
  children: ReactNode;
}) {
  const [reloj, setReloj] = useState(ahora);
  useEffect(() => {
    const actualizar = () => setReloj(new Date().toISOString());
    const visible = () => {
      if (document.visibilityState === "visible") actualizar();
    };
    actualizar();
    const intervalo = window.setInterval(actualizar, 60000);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", actualizar);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("focus", actualizar);
    };
  }, []);
  return (
    <Contexto.Provider value={guiaTemporal(senales, cierrePliego, new Date(reloj))}>
      {children}
    </Contexto.Provider>
  );
}
export function EstadoFicha({ plazo = false }: { plazo?: boolean }) {
  const g = useGuiaFicha();
  return <>{plazo ? g.mensajePlazo : g.suspendido ? "Suspendido" : g.etapa.nombre}</>;
}
export function SituacionFicha() {
  const g = useGuiaFicha();
  return (
    <>
      <p className="fi-texto">
        <strong>{g.suspendido ? "Suspendido" : g.etapa.nombre}</strong>
      </p>
      <p className="fi-ayuda">{g.mensajePlazo}</p>
      <dl className="fi-datos">
        {g.etapas.map((e) => (
          <div className="fi-dato" key={e.id}>
            <dt>
              {e.nombre}
              {e.actual ? " · Momento actual" : ""}
            </dt>
            <dd>{e.fecha ?? "Sin fecha publicada"}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
export function DisponibilidadFicha() {
  const g = useGuiaFicha();
  return g.etapa.etapa === "recibe_ofertas" && !g.suspendido ? null : (
    <div className="fi-nota">
      <strong>
        Este proceso no recibe ofertas ahora · {g.suspendido ? "Suspendido" : g.etapa.nombre}
      </strong>
      <p>{g.etapa.linea}</p>
      <Link className="fi-btn" href="/licitaciones">
        Explorar procesos que reciben ofertas
      </Link>
    </div>
  );
}

export function FechaImpresionFicha() {
  const g = useGuiaFicha();
  return (
    <p className="fi-fecha-impresion">
      Ficha consultada el{" "}
      {new Date(g.ahora).toLocaleString("es-CO", {
        timeZone: "America/Bogota",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}{" "}
      COT · Fuente: SECOP II
    </p>
  );
}
