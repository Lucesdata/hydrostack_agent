/**
 * Captura pasiva de intención (Prompt 02). Nunca debe romper el flujo que la
 * dispara — un fallo de insert aquí no es motivo para fallar una página o un
 * endpoint, así que se traga el error como getSessionUser() ya hace en
 * src/lib/supabase/get-session-user.ts.
 */

import { db } from '@/src/lib/db/client';
import { userSignal } from '@/src/lib/db/schema/cuentas';

export type UserSignal = 'oferente' | 'estructurador' | 'comunidad';

export async function recordUserSignal(usuarioId: string, signal: UserSignal): Promise<void> {
  try {
    await db.insert(userSignal).values({ usuarioId, signal });
  } catch {
    // Captura silenciosa — ver docstring del módulo.
  }
}
