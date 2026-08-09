/**
 * Captura pasiva de intención (Prompt 02). Nunca debe romper el flujo que la
 * dispara — un fallo de insert aquí no es motivo para fallar una página o un
 * endpoint, así que se traga el error como getSessionUser() ya hace en
 * src/lib/supabase/get-session-user.ts.
 */

import { db } from '@/src/lib/db/client';
import { senalUsuario } from '@/src/lib/db/schema/cuentas';

export type UserSignal = 'oferente' | 'estructurador' | 'comunidad' | 'ejecutor' | 'operador' | 'proveedor';

export async function recordUserSignal(usuarioId: string, signal: UserSignal): Promise<void> {
  try {
    await db.insert(senalUsuario).values({ usuarioId, senal: signal });
  } catch {
    // Captura silenciosa — ver docstring del módulo.
  }
}
