# Checklist de lanzamiento — AquaLicita

Verificado el 2026-10-19 en solo lectura (Vercel CLI, Supabase MCP, `dig`, `curl`).
Lo marcado "por confirmar" no se puede ver desde fuera: lo comprueba el dueño.

## Ya resuelto (verificado)

- [x] Sitio, `/terms`, `/privacy` y `/recuperar` responden 200 en aqualicita.com.
- [x] Variables de producción en Vercel: `AUTH_RESEND_KEY`, `EMAIL_FROM`, `RESEND_WEBHOOK_SECRET`, `CRON_SECRET`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `DATABASE_URL`.
- [x] DNS de Resend publicado para `cuenta.` y `alertas.` (DKIM, MX de rebotes) y `_dmarc` con `p=none`.
- [x] Crons activos en Vercel: `tick` 11:00 UTC y `alertas` 12:00 UTC (ya están en `vercel.json` de main).
- [x] Ingesta al día: última corrida 2026-10-19 11:57 UTC, 93.178 procesos.
- [x] RLS activo en todas las tablas; el asesor de Supabase solo da avisos informativos.
- [x] Base en 333 MB.

## Por confirmar a mano (bloquean el lanzamiento)

- [ ] **Resend:** los dos dominios (`cuenta.` y `alertas.`) en estado *Verified* (paso 1-2 del runbook).
- [ ] **SMTP de Supabase** apuntando a Resend (`smtp.resend.com`, remitente `no-responder@cuenta.aqualicita.com`) y el límite por hora subido (pasos 4-5).
- [ ] **Registro de punta a punta** con un correo ajeno al equipo: llega el correo, el enlace confirma, entra a la cuenta (paso 8).
- [ ] **Los tres caminos del diagnóstico (§13):** Google, correo verificado y contraseña; el diagnóstico respondido sin sesión aparece en la cuenta.
- [ ] **Recuperar contraseña** (#142) con un correo real.
- [ ] **Alertas (paso 9):** crear una alerta con una cuenta de prueba y comprobar que el digest llega. Hoy `envio_log` tiene un solo envío (2026-10-08) y ninguno en los últimos 7 días.
- [ ] **Textos legales:** que `/terms` y `/privacy` sean el texto definitivo y cubran el correo de marketing (#145). Criterio jurídico.

## Antes de abrir al público (no bloquean)

- [ ] Activar *Leaked password protection* en Supabase Auth (aviso del asesor).
- [ ] Mover `pgstattuple` fuera del esquema `public`.
- [ ] Revocar GRANT de `anon`/`authenticated` (§15).
- [ ] Decidir PRs: #143 Precios, #144 Registro territorial, #112 Vitrina fase 3 (necesita migración `0025`), #39 trigger de borrado de cuentas.
- [ ] Devolver el CTA de «alerta» a la ficha y al hero cuando el paso 9 salga bien (§44).
- [ ] Vigilar el cupo de Resend (100 al día) cuando el digest se acerque a ~70 destinatarios.
- [ ] Subir DMARC de `p=none` a `quarantine` tras unas semanas sin fallos (paso 12).
- [ ] Fixture UAESP y verificación de citas del extractor (§2, §5).
