"use client";

import { useEffect, useRef, type ReactNode } from "react";
import s from "./marketplace.module.css";

export default function PanelFiltros({ children }: { children: ReactNode }) {
  const panel = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const escritorio = window.matchMedia("(min-width: 960px)");
    const ajustar = () => {
      if (panel.current) panel.current.open = escritorio.matches;
    };
    ajustar();
    escritorio.addEventListener("change", ajustar);
    return () => escritorio.removeEventListener("change", ajustar);
  }, []);

  return (
    <details ref={panel} className={s.panelFiltros} aria-label="Filtros de oportunidades">
      <summary className={s.abrirFiltros}>Filtros y orden</summary>
      <h3>Filtros rápidos</h3>
      {children}
    </details>
  );
}
