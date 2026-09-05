/**
 * Escritura de `al_descartes` (SDD §4.4, §6.2).
 *
 * Es el único mecanismo que hace auditable el modo de fallo caro de este
 * producto. Un error de curación en la red o en el diccionario **no genera
 * falsos positivos: genera silencio**, y sin esta tabla el silencio es
 * indistinguible de "no había nada".
 *
 * Crece más rápido que cualquier otra tabla del esquema: un descarte por
 * proceso evaluado y por filtro. `podarDescartes` implementa la retención que
 * el SDD dejó pendiente — el crecimiento sin límite de una append-only ya llenó
 * la cuota una vez (`raw_record`, agosto de 2026).
 */

import { lt, sql } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { alDescartes } from "@/src/lib/db/schema/aqualicita";
import type { MotivoDescarte } from "./tipos";

export type CapaDescarte = "ingesta" | "filtro";

export interface DescarteInput {
  accountId?: string | null;
  filtroId?: string | null;
  secopProcesoId: string;
  objetoResumen?: string | null;
  unspscObservado?: string | null;
  valorEstimado?: string | null;
  entidadNit?: string | null;
  divipola?: string | null;
  motivo: MotivoDescarte;
  evidencia?: Record<string, unknown> | null;
  redVersion: string;
}

/** El objeto se recorta: auditable a ojo sin duplicar el payload en otra tabla. */
const LARGO_RESUMEN = 300;

/** Retención por defecto. El SDD la dejó como candidato; aquí se fija. */
export const DIAS_RETENCION = 90;

export async function registrarDescartes(
  capa: CapaDescarte,
  descartes: DescarteInput[]
): Promise<number> {
  if (descartes.length === 0) return 0;

  await db.insert(alDescartes).values(
    descartes.map((d) => ({
      capa,
      accountId: d.accountId ?? null,
      filtroId: d.filtroId ?? null,
      secopProcesoId: d.secopProcesoId,
      objetoResumen: d.objetoResumen ? d.objetoResumen.slice(0, LARGO_RESUMEN) : null,
      unspscObservado: d.unspscObservado ?? null,
      valorEstimado: d.valorEstimado ?? null,
      entidadNit: d.entidadNit ?? null,
      divipola: d.divipola ?? null,
      motivo: d.motivo,
      evidencia: d.evidencia ?? null,
      redVersion: d.redVersion,
    }))
  );

  return descartes.length;
}

/**
 * Borra los descartes de una corrida anterior del mismo filtro antes de escribir
 * los nuevos. Sin esto la tabla acumularía una copia por ejecución del cron y la
 * consulta de auditoría mostraría el mismo proceso decenas de veces.
 */
export async function limpiarDescartesDeFiltro(filtroId: string): Promise<void> {
  await db.delete(alDescartes).where(sql`${alDescartes.filtroId} = ${filtroId}`);
}

export async function podarDescartes(dias: number = DIAS_RETENCION): Promise<number> {
  const corte = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
  const res = await db.delete(alDescartes).where(lt(alDescartes.creadoEn, corte)).returning({
    id: alDescartes.id,
  });
  return res.length;
}
