/**
 * Consentimiento de correo de marketing (novedades), separado de las alertas.
 *
 * Sin migración (decisión del 2026-10-12, opción A de
 * `docs/superpowers/specs/2026-10-12-correo-marketing-resend-brevo.md`): cada
 * cambio es una fila de `senal_usuario` con señal `consentimiento:marketing:v1:alta`
 * o `…:baja`. Es un historial: el estado vigente es la **última** fila, y a
 * igual instante gana la baja. Excluir este prefijo de cualquier análisis de
 * intención, igual que `personal:` y `uso:`.
 *
 * Nunca se infiere: solo la casilla del registro (desmarcada) o el interruptor de
 * /cuenta crean una alta. Las alertas (`alerta_preferencias.activo`) son otra cosa.
 */

import { sql } from "drizzle-orm";
import { db } from "@/src/lib/db/client";

export const PREFIJO_CONSENTIMIENTO = "consentimiento:marketing:v1:";
export const SENAL_ALTA = PREFIJO_CONSENTIMIENTO + "alta";
export const SENAL_BAJA = PREFIJO_CONSENTIMIENTO + "baja";

export type EstadoConsentimiento = "alta" | "baja" | "sin_dato";

export interface FilaConsentimiento {
  senal: string;
  creadoEn: Date;
}

/** Puro: el estado vigente de un historial de filas. */
export function estadoDesdeFilas(filas: FilaConsentimiento[]): EstadoConsentimiento {
  let ultima: FilaConsentimiento | null = null;
  for (const f of filas) {
    if (f.senal !== SENAL_ALTA && f.senal !== SENAL_BAJA) continue;
    const t = f.creadoEn.getTime();
    const tUlt = ultima ? ultima.creadoEn.getTime() : -Infinity;
    if (t > tUlt || (t === tUlt && f.senal === SENAL_BAJA)) ultima = f;
  }
  if (!ultima) return "sin_dato";
  return ultima.senal === SENAL_ALTA ? "alta" : "baja";
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function filasDe(tx: Tx, usuarioId: string): Promise<FilaConsentimiento[]> {
  const r = await tx.execute<{ senal: string; creado_en: string | Date }>(
    sql`SELECT senal, creado_en FROM senal_usuario
        WHERE usuario_id=${usuarioId} AND senal LIKE ${PREFIJO_CONSENTIMIENTO + "%"}`
  );
  return r.rows.map((x) => ({ senal: x.senal, creadoEn: new Date(x.creado_en) }));
}

export async function consentimientoVigente(usuarioId: string): Promise<EstadoConsentimiento> {
  return db.transaction(async (tx) => estadoDesdeFilas(await filasDe(tx, usuarioId)));
}

/**
 * Registra el cambio solo si difiere del estado vigente (no engorda el
 * historial con repeticiones). Serializa por cuenta, como `mis-procesos/store`.
 */
export async function registrarConsentimiento(
  usuarioId: string,
  aceptado: boolean
): Promise<void> {
  const senal = aceptado ? SENAL_ALTA : SENAL_BAJA;
  await db.transaction(async (tx) => {
    const bloqueo = await tx.execute(
      sql`SELECT id FROM usuario WHERE id=${usuarioId} FOR UPDATE`
    );
    if (!bloqueo.rows.length) throw new Error("No se pudo verificar la cuenta.");
    const actual = estadoDesdeFilas(await filasDe(tx, usuarioId));
    if (actual === (aceptado ? "alta" : "baja")) return;
    if (!aceptado && actual === "sin_dato") return;
    await tx.execute(
      sql`INSERT INTO senal_usuario (usuario_id, senal, creado_en)
          VALUES (${usuarioId}, ${senal}, clock_timestamp())`
    );
  });
}

export interface ContactoMarketing {
  email: string;
  nombre: string;
}

/**
 * Cuentas cuya última decisión es «alta» y cuyo correo está verificado (sin
 * verificación, la casilla pudo marcarla quien escribió una dirección ajena).
 */
export async function contactosConsentidos(): Promise<ContactoMarketing[]> {
  const r = await db.execute<{ email: string; name: string | null }>(sql`
    SELECT u.email, u.name
    FROM usuario u
    JOIN LATERAL (
      SELECT senal FROM senal_usuario
      WHERE usuario_id = u.id AND senal LIKE ${PREFIJO_CONSENTIMIENTO + "%"}
      ORDER BY creado_en DESC, (senal = ${SENAL_BAJA}) DESC, id DESC
      LIMIT 1
    ) ult ON ult.senal = ${SENAL_ALTA}
    WHERE u."emailVerified" IS NOT NULL
    ORDER BY u.email`);
  return r.rows.map((x) => ({ email: x.email, nombre: x.name ?? "" }));
}

/** CSV para importar en Brevo. Neutraliza celdas que una hoja de cálculo evaluaría. */
export function contactosACsv(contactos: ContactoMarketing[]): string {
  const celda = (v: string) => {
    const seguro = /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
    return /[",\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
  };
  return ["email,nombre", ...contactos.map((c) => `${celda(c.email)},${celda(c.nombre)}`)].join(
    "\n"
  ) + "\n";
}
