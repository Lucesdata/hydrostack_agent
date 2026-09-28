// De un `ProcesoResumen` (src/lib/secop/recientes.ts) a lo que pinta una fila de
// proceso en la portada: los destacados del departamento.
//
// Vivía dentro de ProcesosTicker.jsx, que salió de la portada el 2026-09-27
// (docs/superpowers/plans/2026-09-27-portada-esencial.md). Es puro y sin
// "use client": lo importa un componente de cliente y lo prueban los tests.

import { colorDeTipo } from "@/src/lib/classify/tipo-color";
import { TIPO_PROYECTO } from "@/src/lib/classify/tipo-proyecto";
import { frase, titulo } from "./texto";

/** 4_850_000_000 → "$4.850 M" (millones COP). */
function fmtValor(n) {
  if (n == null || !Number.isFinite(n)) return null;
  const m = Math.round(n / 1e6);
  if (m < 1) return "< $1 M";
  return `$${m.toLocaleString("es-CO")} M`;
}

export function mapApiItem(p) {
  const color = colorDeTipo(p.tipoProyecto);
  return {
    id: p.id,
    // Lo primero que se lee es qué se va a construir, no quién lo contrata.
    objeto: frase(p.objeto) || titulo(p.entidad) || "Proceso sin objeto publicado",
    tipo: color ? { label: TIPO_PROYECTO[p.tipoProyecto].label, color } : null,
    // Quién contrata: sin ella, un objeto como «Suministro» no dice nada.
    entidad: titulo(p.entidad) || null,
    valor: fmtValor(p.valorEstimado),
    ciudad: titulo(p.municipio, false),
    departamento: titulo(p.departamento, false),
    estado: titulo(p.estado) || "Publicado",
    href: p.ficha || "/licitaciones",
    fecha: p.fechaPublicacion ?? null,
  };
}
