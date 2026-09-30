/**
 * El DTO de un proceso en resumen y su mapeo desde la fila de base.
 *
 * Nació para el ticker "últimos 25 procesos" de la portada, que salió el
 * 2026-09-27 junto con `/api/procesos/recientes` (plan
 * `docs/superpowers/plans/2026-09-27-portada-esencial.md`). Lo que queda lo usa
 * `resumen-departamento.ts` para los destacados del departamento. Su estado
 * previo, con la consulta y el fallback a Socrata en vivo, está en git.
 */

import { montoConDato } from "./monto";

/** DTO liviano de un proceso en resumen: lo que pinta una fila de destacados. */
export interface ProcesoResumen {
  id: string;
  referencia: string | null;
  objeto: string;
  entidad: string | null;
  departamento: string | null;
  municipio: string | null;
  modalidad: string | null;
  estado: string | null;
  valorEstimado: number | null;
  fechaPublicacion: string | null;
  url: string | null;
  /** Uno de `TIPOS_PROYECTO`, o `null` si no está clasificado. */
  tipoProyecto: string | null;
  /**
   * Ruta de la ficha pública. `mapRowToResumen` no la inventa: la añade quien
   * lee la fila, que sabe que el proceso está ingerido.
   */
  ficha: string | null;
}

/** `urlproceso` llega como `{ url }`, string, o basura. Igual que en client.ts. */
export function extractUrlProceso(v: unknown): string | null {
  if (typeof v === "string" && v.startsWith("http")) return v;
  if (typeof v === "object" && v !== null && "url" in v) {
    const u = (v as { url?: unknown }).url;
    return typeof u === "string" && u.startsWith("http") ? u : null;
  }
  return null;
}

/** Fila cruda del select (numeric llega como string desde pg). */
export interface RecienteRow {
  secopProcesoId: string;
  referencia: string | null;
  objeto: string | null;
  modalidad: string | null;
  estado: string | null;
  valorEstimado: string | null;
  fechaPublicacion: string | null;
  entidadNombre: string | null;
  departamento: string | null;
  municipio: string | null;
  urlRaw: unknown;
  tipoProyecto?: string | null;
}

export function mapRowToResumen(r: RecienteRow): ProcesoResumen {
  return {
    id: r.secopProcesoId,
    referencia: r.referencia,
    objeto: r.objeto ?? "",
    entidad: r.entidadNombre,
    departamento: r.departamento,
    municipio: r.municipio,
    modalidad: r.modalidad,
    estado: r.estado,
    // El 0 del dataset se corta aquí, en la frontera del DTO, y no en la
    // tarjeta: `valorEstimado: number | null` significa "cuantía publicada o
    // ninguna", y un 0 que llegue al componente ya viaja como una afirmación.
    valorEstimado: montoConDato(r.valorEstimado),
    fechaPublicacion: r.fechaPublicacion,
    url: extractUrlProceso(r.urlRaw),
    tipoProyecto: r.tipoProyecto ?? null,
    ficha: null,
  };
}
