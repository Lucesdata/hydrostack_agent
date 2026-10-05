/**
 * El panel de detalle del Radar de la vitrina (fase 2 de
 * `docs/superpowers/plans/2026-10-04-vitrina-radar.md`).
 *
 * Para las tarjetas de una página trae lo que el panel necesita: la ficha de
 * cada proceso (las mismas columnas que `/licitaciones/[slug]`) y si tiene
 * pliego subido, y lo convierte en los datos del bloque de decisión con
 * `datosDecisionDe`, el mismo helper que usa la ficha. Dos consultas por
 * página, en paralelo, sea cual sea el número de tarjetas.
 */

import { inArray } from "drizzle-orm";
import { db } from "../db/client";
import { pliegoProceso } from "../db/schema";
import { TIPO_PROYECTO } from "../classify/tipo-proyecto";
import { colorDeTipo } from "../classify/tipo-color";
import type { DatosDecision } from "@/src/components/secop/ficha/BloqueDecision";
import { sentenceCaseTitle } from "@/src/components/secop/format";
import { datosDecisionDe } from "./datos-decision";
import { procesosFichaPorIds } from "./ficha";

export interface DetalleRadar {
  id: string;
  /** La ficha completa del proceso. */
  href: string;
  /** El objeto entero, en minúscula de oración (la tarjeta lo recorta). */
  titulo: string;
  entidad: string;
  lugar: string;
  /** Nombre del tipo de obra y su color de familia, resueltos aquí para que el
   * cliente no cargue el clasificador. `null` sin tipo. */
  tipoLabel: string | null;
  tipoColor: string | null;
  datos: DatosDecision;
}

/**
 * Un detalle por tarjeta, en el orden de `tarjetas`. Las que no aparezcan en
 * la base (borradas entre una consulta y otra) se omiten: el panel no las
 * ofrece y la tarjeta sigue enlazando a su ficha.
 */
export async function detallesDeRadar(
  tarjetas: { secopProcesoId: string; href: string }[]
): Promise<DetalleRadar[]> {
  const ids = tarjetas.map((t) => t.secopProcesoId);
  if (ids.length === 0) return [];

  const [fichas, pliegos] = await Promise.all([
    procesosFichaPorIds(ids),
    db
      .selectDistinct({ procesoId: pliegoProceso.procesoId })
      .from(pliegoProceso)
      .where(inArray(pliegoProceso.procesoId, ids)),
  ]);

  const conPliego = new Set(pliegos.map((f) => f.procesoId));
  const porId = new Map(fichas.map((f) => [f.secopProcesoId, f]));

  return tarjetas.flatMap(({ secopProcesoId, href }) => {
    const p = porId.get(secopProcesoId);
    if (!p) return [];
    return [
      {
        id: secopProcesoId,
        href,
        titulo: sentenceCaseTitle(p.objeto ?? secopProcesoId),
        entidad: p.entidadNombre ?? "Entidad no informada",
        lugar: [p.municipio, p.departamento].filter(Boolean).join(", ") || "Ubicación no informada",
        tipoLabel: p.tipoProyecto ? TIPO_PROYECTO[p.tipoProyecto].label : null,
        tipoColor:
          p.tipoProyecto && colorDeTipo(p.tipoProyecto)?.familia !== "otros"
            ? (colorDeTipo(p.tipoProyecto)?.claro ?? null)
            : null,
        datos: datosDecisionDe(p, { conPliego: conPliego.has(secopProcesoId), hrefFicha: href }),
      },
    ];
  });
}
