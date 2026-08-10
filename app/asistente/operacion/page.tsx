// app/asistente/operacion/page.tsx

/**
 * /asistente/operacion — protegida por middleware.ts (PROTECTED_PREFIXES).
 * Mismo patrón que app/asistente/ejecucion/page.tsx.
 */

import { getSessionUser } from '@/src/lib/supabase/get-session-user';
import { ASSISTANT_CONTEXTS } from '@/src/lib/assistants/config';
import { getOrCreateConversation, loadMessages } from '@/src/lib/assistants/conversations';
import AssistantChat from '@/src/components/assistants/AssistantChat';

export const metadata = {
  title: 'Operación de acueducto o ESP — HydroStack',
  description: 'Resuelve dudas de normativa (RAS, Res. 0330, CRA, SUI) con respuestas citadas.',
};

export default async function AsistenteOperacionPage() {
  const user = await getSessionUser();
  if (!user) return null; // el middleware ya redirige a /login antes de llegar aquí

  const context = ASSISTANT_CONTEXTS.operacion;
  const conversationId = await getOrCreateConversation(user.id, context.slug);
  const initialMessages = await loadMessages(conversationId);

  return (
    <div className="clr-page">
      <div className="clr-container" style={{ maxWidth: 780 }}>
        <header style={{ marginBottom: 24 }}>
          <span className="clr-tag">Asistente de proyecto</span>
          <h1 className="clr-h1">{context.titulo}</h1>
          <p className="clr-sub">{context.descripcion}</p>
        </header>
        <AssistantChat
          contextSlug={context.slug}
          titulo={context.titulo}
          mensajeBienvenida={context.mensajeBienvenida}
          documentoConfig={context.documento}
          initialMessages={initialMessages}
        />
      </div>
    </div>
  );
}
