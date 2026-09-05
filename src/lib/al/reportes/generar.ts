/**
 * Reportes permanentes (SDD §9, Fase 6).
 *
 * **Permanentes, no efímeros:** el contenido se congela en `al_reportes.payload`
 * al generarse y NO se recalcula al visitarse. Eso es lo que permite enlazarlos
 * desde un correo que alguien abrirá tres semanas después y que siga diciendo lo
 * mismo que decía el correo.
 *
 * Dos visibilidades, y la frontera es dura:
 *
 *  - `privado`  el digest de una cuenta. Exige sesión **y** que el `account_id`
 *               coincida. Un slug filtrado no basta.
 *  - `publico`  reportes de mercado, indexables. **No pueden contener el nombre,
 *               el email, el perfil ni los filtros de ninguna cuenta** — hay un
 *               test que lo verifica sobre el payload serializado.
 */

import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { alReportes } from "@/src/lib/db/schema/aqualicita";

export type TipoReporte = "digest_diario" | "competidor" | "entidad" | "mercado_departamento";

/**
 * Sufijo aleatorio para que el slug no sea adivinable. Un reporte privado se
 * protege por sesión, pero un slug predecible convierte cualquier fuga de log en
 * una enumeración de las cuentas.
 */
function sufijo(): string {
  return randomBytes(5).toString("hex");
}

export function slugDigest(fecha: string): string {
  return `digest-${fecha}-${sufijo()}`;
}

export interface ReporteGenerado {
  id: string;
  slug: string;
  url: string;
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function generarReporte(params: {
  slug: string;
  tipo: TipoReporte;
  titulo: string;
  visibilidad: "publico" | "privado";
  accountId: string | null;
  parametros: Record<string, unknown>;
  payload: Record<string, unknown>;
}): Promise<ReporteGenerado> {
  if (params.visibilidad === "privado" && !params.accountId) {
    throw new Error("Un reporte privado necesita account_id: sin él nadie podría abrirlo.");
  }
  if (params.visibilidad === "publico" && params.accountId) {
    // Un reporte público con cuenta es una fuga esperando a pasar: se rechaza
    // en vez de confiar en que el render no la muestre.
    throw new Error("Un reporte público no puede llevar account_id.");
  }

  const [row] = await db
    .insert(alReportes)
    .values({
      slug: params.slug,
      tipo: params.tipo,
      titulo: params.titulo,
      visibilidad: params.visibilidad,
      accountId: params.accountId,
      parametros: params.parametros,
      payload: params.payload,
    })
    .onConflictDoUpdate({
      target: alReportes.slug,
      set: {
        payload: sql`excluded.payload`,
        titulo: sql`excluded.titulo`,
        actualizadoEn: new Date(),
      },
    })
    .returning({ id: alReportes.id, slug: alReportes.slug });

  return { id: row.id, slug: row.slug, url: `${appUrl()}/reportes/${row.slug}` };
}

/** Incremento de visitas. Best-effort: un fallo aquí no puede tumbar el render. */
export async function registrarVisita(slug: string): Promise<void> {
  try {
    await db
      .update(alReportes)
      .set({ vistas: sql`${alReportes.vistas} + 1` })
      .where(eq(alReportes.slug, slug));
  } catch {
    // Contar visitas no vale romper la página.
  }
}
