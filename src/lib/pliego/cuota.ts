/**
 * Cuota de extracción de pliegos por cuenta: cinco en una ventana móvil de 24
 * horas (decisión del usuario, 2026-09-27).
 *
 * Existe porque el análisis de pliego es gratis y está en cada ficha pública:
 * cualquier cuenta puede subir un PDF, y cada subida gasta una o dos llamadas a
 * Gemini (la extracción y, si hay requisitos, su estructuración). Sin tope, una
 * cuenta en bucle agota la cuota de todo el producto.
 *
 * **Cuenta el intento, no el éxito.** La reserva se escribe ANTES de llamar al
 * modelo: un PDF que falla también gastó la llamada, y contar solo los éxitos
 * dejaría rodear el límite provocando fallos. Lo que se rechaza antes de llegar
 * al modelo (no es PDF, pesa demasiado) no cuenta, porque no gasta nada.
 *
 * **Dónde se guarda.** En `senal_usuario`, con la señal `uso:extractor_pliego`:
 * es append-only, ya tiene RLS, índice por usuario y fecha de creación, y nadie
 * la lee para otra cosa. Una tabla propia sería más limpia, pero exigiría una
 * migración aplicada a mano en Supabase, y hasta aplicarla la subida fallaría.
 * Si algún día se analizan las señales de intención, hay que excluir esta.
 *
 * **Concurrencia.** Se reserva primero y se cuenta después, incluida la propia
 * reserva; si se pasa del tope, la reserva se borra. Dos subidas simultáneas en
 * el borde pueden rechazarse las dos, nunca aceptarse las dos: el error cae del
 * lado barato.
 */

import { and, asc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { senalUsuario } from "@/src/lib/db/schema/cuentas";
import { CUOTA_PLIEGOS, VENTANA_HORAS } from "./cuota-limites";

export { CUOTA_PLIEGOS, VENTANA_HORAS };
export const SENAL_USO_EXTRACTOR = "uso:extractor_pliego";

export type Reserva =
  { ok: true; restantes: number } | { ok: false; limite: number; disponibleDesde: Date };

const VENTANA_MS = VENTANA_HORAS * 60 * 60 * 1000;

export async function reservarExtraccion(
  usuarioId: string,
  ahora: Date = new Date()
): Promise<Reserva> {
  const [reserva] = await db
    .insert(senalUsuario)
    .values({ usuarioId, senal: SENAL_USO_EXTRACTOR, creadoEn: ahora })
    .returning({ id: senalUsuario.id });

  const desde = new Date(ahora.getTime() - VENTANA_MS);
  const enVentana = and(
    eq(senalUsuario.usuarioId, usuarioId),
    eq(senalUsuario.senal, SENAL_USO_EXTRACTOR),
    gt(senalUsuario.creadoEn, desde)
  );

  const [{ usados }] = await db
    .select({ usados: sql<number>`count(*)::int` })
    .from(senalUsuario)
    .where(enVentana);

  if (usados <= CUOTA_PLIEGOS) return { ok: true, restantes: CUOTA_PLIEGOS - usados };

  await db.delete(senalUsuario).where(eq(senalUsuario.id, reserva.id));

  // Se libera un hueco cuando el intento más antiguo de la ventana cumple 24 h.
  const [masAntiguo] = await db
    .select({ creadoEn: senalUsuario.creadoEn })
    .from(senalUsuario)
    .where(enVentana)
    .orderBy(asc(senalUsuario.creadoEn))
    .limit(1);

  return {
    ok: false,
    limite: CUOTA_PLIEGOS,
    disponibleDesde: new Date((masAntiguo?.creadoEn ?? ahora).getTime() + VENTANA_MS),
  };
}

/** "Podrás procesar otro a partir del 28 de septiembre a las 09:15 (hora de Colombia)." */
export function mensajeCuotaAgotada(r: Extract<Reserva, { ok: false }>): string {
  const cuando = r.disponibleDesde.toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `Llegaste al límite de ${r.limite} pliegos en ${VENTANA_HORAS} horas. Podrás procesar otro a partir del ${cuando} (hora de Colombia).`;
}
