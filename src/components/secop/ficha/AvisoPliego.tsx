"use client";

import { useEffect, useState } from "react";

/**
 * El resultado de la subida del pliego, leído del hash (`#pliego=ok` o
 * `#pliego=error:<detalle>`) que deja `subirPliegoDesdeFichaAction`.
 *
 * Va en el hash y no en la query porque la ficha es estática (ISR): leer
 * `searchParams` la volvería dinámica entera por un aviso. El hash nunca llega
 * al servidor, así que solo lo puede leer el cliente.
 */
export default function AvisoPliego() {
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  useEffect(() => {
    const leer = () => {
      const m = window.location.hash.match(/^#pliego=(.*)$/);
      if (!m) return setAviso(null);
      const estado = decodeURIComponent(m[1]);
      if (estado === "ok") {
        setAviso({ ok: true, texto: "Pliego procesado. Lo que dice está justo debajo." });
      } else if (estado.startsWith("error:")) {
        setAviso({ ok: false, texto: `No se pudo procesar el pliego. ${estado.slice(6)}` });
      }
    };
    leer();
    window.addEventListener("hashchange", leer);
    return () => window.removeEventListener("hashchange", leer);
  }, []);

  if (!aviso) return null;
  return (
    <p role="status" className={`fi-pl-resultado ${aviso.ok ? "fi-pl-ok" : "fi-pl-aviso"}`}>
      {aviso.texto}
    </p>
  );
}
