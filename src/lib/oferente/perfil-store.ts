/**
 * Lectura del perfil de oferente guardado en DB (Fase 1.1). Extraído porque
 * `GET /api/perfil`, `/mis-coincidencias` y `POST /api/alertas/enviar-ahora`
 * necesitan exactamente la misma consulta — un solo sitio que conoce la forma
 * de la fila `oferente_perfil`.
 */

import { eq } from 'drizzle-orm';
import { db } from '@/src/lib/db/client';
import { oferentePerfil } from '@/src/lib/db/schema/cuentas';
import type { OferenteProfile } from './types';

export async function getPerfilDb(usuarioId: string): Promise<OferenteProfile | null> {
  const [row] = await db
    .select()
    .from(oferentePerfil)
    .where(eq(oferentePerfil.usuarioId, usuarioId))
    .limit(1);
  return row ? (row.perfil as OferenteProfile) : null;
}
