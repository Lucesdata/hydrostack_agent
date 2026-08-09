// app/cuenta/page.tsx

/**
 * Cuenta (Fase 1.1, migrado a Supabase Auth) — preferencias de alerta.
 * El login/registro vive en /login y /registro; esta página solo se
 * alcanza con sesión (protegida por middleware.ts), así que aquí no hay
 * formulario de acceso, solo el estado de la cuenta + preferencias.
 */

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { getPreferencias, savePreferencias } from "@/src/lib/alertas/preferencias-store";

async function handleTogglePausa() {
  "use server";
  const user = await getSessionUser();
  if (!user) return;
  const actuales = await getPreferencias(user.id);
  await savePreferencias(user.id, { ...actuales, activo: !actuales.activo });
  revalidatePath("/cuenta");
}

async function handleGuardarHora(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) return;
  const horaEnvio = Number(formData.get("horaEnvio"));
  if (!Number.isInteger(horaEnvio) || horaEnvio < 0 || horaEnvio > 23) return;
  const actuales = await getPreferencias(user.id);
  await savePreferencias(user.id, { ...actuales, horaEnvio });
  revalidatePath("/cuenta");
}

export default async function CuentaPage() {
  const user = await getSessionUser();
  const preferencias = user ? await getPreferencias(user.id) : null;

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
        <h1 className="clr-cuenta-title">Tu cuenta</h1>
        {user && <p className="clr-cuenta-email">{user.email}</p>}
        <form action="/logout" method="POST">
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
              La hora se guarda para cuando el envío por horario esté disponible; por ahora el
              correo diario sale a una hora fija para todas las cuentas.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
