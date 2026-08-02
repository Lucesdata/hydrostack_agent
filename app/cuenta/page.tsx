// app/cuenta/page.tsx

/**
 * Cuenta con solo correo (Fase 1.1) — magic link vía Resend.
 * Server component: sin sesión, formulario de email (server action → signIn);
 * con sesión, estado + logout + preferencias de alerta (Fase 1.5). Nada de
 * estado de cliente — Auth.js v5 resuelve signin/signout como acciones de
 * servidor, y las preferencias siguen el mismo patrón de form + server action.
 */

import { revalidatePath } from "next/cache";
import { auth, signIn, signOut } from "@/src/lib/auth/config";
import { getPreferencias, savePreferencias } from "@/src/lib/alertas/preferencias-store";

async function handleSignIn(formData: FormData) {
  "use server";
  await signIn("resend", formData);
}

async function handleSignOut() {
  "use server";
  await signOut();
}

async function handleTogglePausa() {
  "use server";
  const session = await auth();
  const usuarioId = session?.user?.id;
  if (!usuarioId) return;
  const actuales = await getPreferencias(usuarioId);
  await savePreferencias(usuarioId, { ...actuales, activo: !actuales.activo });
  revalidatePath("/cuenta");
}

async function handleGuardarHora(formData: FormData) {
  "use server";
  const session = await auth();
  const usuarioId = session?.user?.id;
  if (!usuarioId) return;
  const horaEnvio = Number(formData.get("horaEnvio"));
  if (!Number.isInteger(horaEnvio) || horaEnvio < 0 || horaEnvio > 23) return;
  const actuales = await getPreferencias(usuarioId);
  await savePreferencias(usuarioId, { ...actuales, horaEnvio });
  revalidatePath("/cuenta");
}

export default async function CuentaPage() {
  const session = await auth();
  const usuarioId = session?.user?.id;
  const preferencias = usuarioId ? await getPreferencias(usuarioId) : null;

  return (
    <main className="clr-cuenta">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .clr-cuenta{ max-width: 420px; margin: 64px auto; padding: 0 20px; font-family: var(--font-sans); }
        .clr-cuenta-card{
          background: var(--card, #fff); border: 1px solid var(--line);
          border-radius: var(--radius-lg); padding: 24px;
        }
        .clr-cuenta-title{ font-size: 18px; font-weight: 600; color: var(--ink-900); margin: 0 0 6px; }
        .clr-cuenta-sub{ font-size: 13px; color: var(--ink-600); margin: 0 0 18px; }
        .clr-cuenta-input{
          width: 100%; padding: 10px 12px; font-size: 13px; color: var(--ink-900);
          border: 1px solid var(--line); border-radius: var(--radius-md); margin-bottom: 12px;
        }
        .clr-cuenta-btn{
          background: var(--accent); color: #fff; border: none;
          font-size: 13px; font-weight: 500; padding: 9px 16px;
          border-radius: var(--radius-md); cursor: pointer; width: 100%;
        }
        .clr-cuenta-btn:hover{ opacity: 0.92; }
        .clr-cuenta-email{ font-size: 13px; color: var(--ink-900); margin: 0 0 16px; }
        .clr-cuenta-btn-secondary{
          background: transparent; color: var(--ink-600); border: 1px solid var(--line);
          font-size: 13px; padding: 9px 16px; border-radius: var(--radius-md); cursor: pointer; width: 100%;
        }
        .clr-cuenta-btn-secondary:hover{ color: var(--ink-900); border-color: var(--accent-soft); }
        .clr-cuenta-prefs{ margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--line); }
        .clr-cuenta-prefs-title{ font-size: 13px; font-weight: 600; color: var(--ink-900); margin: 0 0 4px; }
        .clr-cuenta-prefs-row{ display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
        .clr-cuenta-prefs-status{ font-size: 12.5px; color: var(--ink-600); }
        .clr-cuenta-prefs-status b{ color: var(--ink-900); }
        .clr-cuenta-prefs-select{
          font-size: 12.5px; color: var(--ink-900); border: 1px solid var(--line);
          border-radius: var(--radius-md); padding: 6px 8px;
        }
        .clr-cuenta-btn-sm{
          background: var(--accent); color: #fff; border: none; font-size: 12px;
          font-weight: 500; padding: 6px 12px; border-radius: var(--radius-md); cursor: pointer;
        }
        .clr-cuenta-btn-sm:hover{ opacity: 0.9; }
        .clr-cuenta-prefs-note{ font-size: 11px; color: var(--ink-300); margin-top: 10px; }
      `,
        }}
      />
      <div className="clr-cuenta-card">
        {session?.user ? (
          <>
            <h1 className="clr-cuenta-title">Tu cuenta</h1>
            <p className="clr-cuenta-email">{session.user.email}</p>
            <form action={handleSignOut}>
              <button type="submit" className="clr-cuenta-btn-secondary">
                Cerrar sesión
              </button>
            </form>
            {preferencias && (
              <div className="clr-cuenta-prefs">
                <p className="clr-cuenta-prefs-title">Alertas por correo</p>
                <div className="clr-cuenta-prefs-row">
                  <span className="clr-cuenta-prefs-status">
                    Estado: <b>{preferencias.activo ? "activas" : "pausadas"}</b>
                  </span>
                  <form action={handleTogglePausa}>
                    <button type="submit" className="clr-cuenta-btn-sm">
                      {preferencias.activo ? "Pausar" : "Reactivar"}
                    </button>
                  </form>
                </div>
                <form action={handleGuardarHora} className="clr-cuenta-prefs-row">
                  <label className="clr-cuenta-prefs-status" htmlFor="horaEnvio">
                    Hora de envío (Colombia)
                  </label>
                  <span style={{ display: "flex", gap: 8 }}>
                    <select
                      id="horaEnvio"
                      name="horaEnvio"
                      defaultValue={preferencias.horaEnvio}
                      className="clr-cuenta-prefs-select"
                    >
                      {Array.from({ length: 24 }, (_, h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, "0")}:00
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="clr-cuenta-btn-sm">
                      Guardar
                    </button>
                  </span>
                </form>
                <p className="clr-cuenta-prefs-note">
                  La hora se guarda para cuando el envío por horario esté disponible; por ahora
                  el correo diario sale a una hora fija para todas las cuentas.
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="clr-cuenta-title">Entrar con tu correo</h1>
            <p className="clr-cuenta-sub">
              Te enviamos un enlace de acceso — sin contraseña. Tu perfil de oferente queda
              guardado en tu cuenta.
            </p>
            <form action={handleSignIn}>
              <input
                type="email"
                name="email"
                placeholder="tu@correo.com"
                required
                className="clr-cuenta-input"
              />
              <button type="submit" className="clr-cuenta-btn">
                Enviarme el enlace
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
