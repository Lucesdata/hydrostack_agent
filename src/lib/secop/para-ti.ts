/**
 * El estante «Para ti» de la vitrina (fase 3, tarea 6; decisión D3: solo
 * cuentas con perfil, calculado en el servidor).
 *
 * Son las coincidencias de `/mis-coincidencias` con la misma regla que allí: el
 * perfil completo pasa por `getMatchesForPerfil` (las cinco compuertas) y el
 * mínimo por `getMatchesForPerfilMinimo` (sector y zona). Las dos descartan
 * `FAIL` y lo que cae fuera de la cobertura, y ordenan PASS antes que WARN antes
 * que UNKNOWN. El estante enseña las primeras y enlaza a la lista entera.
 */

import { formatValorProceso, sentenceCaseTitle } from "@/src/components/secop/format";
import { getPerfilDb } from "../oferente/perfil-store";
import { isPerfilCompleto } from "../oferente/perfil-minimo";
import { getMatchesForPerfil } from "../matching/get-matches-for-perfil";
import { getMatchesForPerfilMinimo } from "../matching/get-matches-for-perfil-minimo";
import type { GateStatus } from "./verdict";
import type { SecopProceso } from "./types";
import { slugDeProceso } from "./slug";

/** Cuántas enseña el estante. El resto, en `/mis-coincidencias`. */
export const TARJETAS_PARA_TI = 4;

export interface TarjetaParaTi {
  id: string;
  href: string;
  titulo: string;
  entidad: string;
  lugar: string;
  presupuesto: string;
  overall: GateStatus;
}

export interface EstanteParaTi {
  /** Cuántas coincidencias hay en total (las 25 que mira la consulta, como mucho). */
  total: number;
  tarjetas: TarjetaParaTi[];
}

function tarjeta(p: SecopProceso, overall: GateStatus): TarjetaParaTi {
  return {
    id: p.id,
    href: `/licitaciones/${slugDeProceso(p.nombre || null, p.id)}`,
    titulo: sentenceCaseTitle(p.nombre || p.id),
    entidad: p.entidad || "Entidad no informada",
    lugar: [p.ciudad, p.departamento].filter(Boolean).join(", ") || "Ubicación no informada",
    presupuesto: formatValorProceso({ valorAdjudicacion: null, precioBase: p.precioBase }),
    overall,
  };
}

/** `null` sin perfil guardado: no hay estante, y el aviso de la fase 1b ocupa su sitio. */
export async function estanteParaTi(usuarioId: string): Promise<EstanteParaTi | null> {
  const perfil = await getPerfilDb(usuarioId);
  if (!perfil) return null;

  const filas = isPerfilCompleto(perfil)
    ? (await getMatchesForPerfil(perfil)).map((m) => ({
        proceso: m.proceso,
        overall: m.verdict.overall,
      }))
    : (await getMatchesForPerfilMinimo(perfil)).map((m) => ({
        proceso: m.proceso,
        overall: m.overall,
      }));

  return {
    total: filas.length,
    tarjetas: filas.slice(0, TARJETAS_PARA_TI).map((f) => tarjeta(f.proceso, f.overall)),
  };
}
