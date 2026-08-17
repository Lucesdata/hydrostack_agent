/**
 * Perfil mínimo de matching (sector + zona) — setup inline de baja fricción
 * en /mis-coincidencias, alternativa al wizard completo de OferenteProfile.
 * Se guarda en la misma fila `oferente_perfil` (columna `perfil` jsonb): no
 * hay tabla ni columna nueva, solo una forma más chica del mismo campo.
 *
 * Deliberadamente sin `cuantiaObjetivo`/`capacidadFinanciera`/`tipoPersona`:
 * inventar esos valores contaminaría el semáforo de elegibilidad con datos
 * falsos. Un perfil mínimo solo alimenta sectorialGate/ubicacionGate — ver
 * `src/lib/matching/match-minimo.ts`.
 */

import type { OferenteProfile, CoberturaGeografica, UnspscCodigo } from "./types";

export interface PerfilMinimo {
  id: string;
  sectoresUnspsc: UnspscCodigo[];
  cobertura: CoberturaGeografica;
}

export type PerfilGuardado = OferenteProfile | PerfilMinimo;

/** Discrimina por presencia de `cuantiaObjetivo`, exclusivo del perfil completo. */
export function isPerfilCompleto(p: PerfilGuardado): p is OferenteProfile {
  return "cuantiaObjetivo" in p;
}
