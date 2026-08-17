// src/lib/oferente/perfil-store.ts
/**
 * Lectura/escritura del perfil de oferente en DB (Fase 1.1). Extraído porque
 * `GET /api/perfil`, `/mis-coincidencias` y las alertas necesitan exactamente
 * la misma consulta — un solo sitio que conoce la forma de la fila
 * `oferente_perfil`.
 *
 * Desde el perfil mínimo (sector+zona, ver perfil-minimo.ts), la columna
 * `perfil` (jsonb) puede contener un `OferenteProfile` completo o un
 * `PerfilMinimo` — mismo esquema de tabla, sin migración. Todo caller de
 * `getPerfilDb` debe chequear `isPerfilCompleto()` antes de asumir los
 * campos de RUP/cuantía (ver Task 5 de
 * docs/superpowers/plans/2026-08-17-mis-coincidencias-refinamiento.md).
 */

import { eq } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { oferentePerfil } from "@/src/lib/db/schema/cuentas";
import type { PerfilGuardado, PerfilMinimo } from "./perfil-minimo";

export async function getPerfilDb(usuarioId: string): Promise<PerfilGuardado | null> {
  const [row] = await db
    .select()
    .from(oferentePerfil)
    .where(eq(oferentePerfil.usuarioId, usuarioId))
    .limit(1);
  return row ? (row.perfil as PerfilGuardado) : null;
}

export async function savePerfilMinimoDb(
  usuarioId: string,
  perfil: PerfilMinimo
): Promise<{ ok: true } | { ok: false; error: "DB_UNAVAILABLE" }> {
  try {
    await db
      .insert(oferentePerfil)
      .values({ usuarioId, perfil })
      .onConflictDoUpdate({
        target: oferentePerfil.usuarioId,
        set: { perfil, actualizadoEn: new Date() },
      });
    return { ok: true };
  } catch {
    // Mismo patrón "modo concierge" de app/api/perfil/route.ts (bbfeaf1):
    // base no alcanzable (Neon bloqueado / migración a Supabase en curso).
    return { ok: false, error: "DB_UNAVAILABLE" };
  }
}
