# Pendientes de correo — configuración que solo puede hacer el dueño del proyecto

**Abierto el 2026-09-07.** Todo lo de aquí es configuración en paneles externos
(Supabase, Resend, Vercel) con credenciales del dueño. No hay nada que arreglar
en el código para esto — la parte de código ya está hecha, ver "Qué ya está
resuelto" al final.

---

## Contexto: por qué el registro estaba roto

El registro por correo+contraseña llevaba fallando desde el **2026-08-18**.

`mailer_autoconfirm` está en `false`, o sea que la verificación por correo es
obligatoria. Y el servicio de correo **integrado** de Supabase se niega a
entregar a cualquier dirección que no sea de un miembro del equipo del proyecto,
respondiendo `Email address not authorized`. Además está topado en 2 mensajes
por hora.

El resultado era engañoso: Supabase **sí creaba la fila** en `auth.users`, pero
devolvía error, así que `signUpAction` cortaba antes de `syncUsuario()` y la
pantalla decía "No pudimos crear la cuenta. Intenta de nuevo." — un reintento
chocaba entonces contra "ese correo ya está registrado".

Evidencia en la base al momento del diagnóstico:

| Cuenta | Vía | Confirmada | Entró alguna vez | Fila en `public.usuario` |
|---|---|---|---|---|
| `lu***@gmail.com` ×2 | Google | Sí | Sí | Sí |
| `qa***@gmail.com` (18 ago) | correo | No | No | No |
| `gi***@gmail.com` (7 sep) | correo | No | No | No |

Las dos que funcionan entraron por Google, que no envía correo alguno. Las dos
que fallaron usaron direcciones distintas de la del único miembro del equipo.

Referencia: [Send emails with custom SMTP — Supabase Docs](https://supabase.com/docs/guides/auth/auth-smtp)

---

## 1. Desbloqueo inmediato (1 minuto)

Supabase → **Authentication → Users** → buscar la cuenta `gi***@gmail.com` →
confirmarla a mano.

Sirve para volver a trabajar hoy. No arregla nada de fondo.

## 2. SMTP propio en Supabase — **este es el arreglo real**

Sin esto, cualquier alta con un correo que no sea el del dueño va a seguir
fallando, y el reenvío de verificación que ya está en el código va a fallar
igual.

Supabase → **Authentication → Emails → SMTP Settings**:

| Campo | Valor |
|---|---|
| Host | `smtp.resend.com` |
| Puerto | `465` |
| Usuario | `resend` |
| Contraseña | la API key de Resend (la misma de `AUTH_RESEND_KEY`) |
| Sender email | lo que hoy está en `EMAIL_FROM` |

Después de guardarlo, subir el rate limit en **Authentication → Rate Limits**,
que sigue en el default de 2/hora aunque el SMTP ya sea propio.

## 3. Verificar un dominio en Resend

Hasta que haya dominio verificado, Resend solo entrega a la dirección del dueño
de la cuenta. Si se va a probar el registro con correos de terceros —o cuando
entren usuarios reales— esto es parte del camino, no un extra.

## 4. Variables de entorno que faltan en Vercel

Listadas con `vercel env ls` el 2026-09-07. En producción solo existen
`NEXT_PUBLIC_APP_URL`, `DB_DRIVER`, `DATABASE_URL`, las dos de Supabase,
`CRON_SECRET` y `AUTH_SECRET`. Faltan:

- **`AUTH_RESEND_KEY` y `EMAIL_FROM`** → sin ellas, `src/lib/email/send.ts:16`
  lanza `AUTH_RESEND_KEY no definida`. Las **alertas diarias y el envío desde
  `/mis-coincidencias` están caídos en producción** por la misma raíz que el
  registro: el correo nunca se terminó de conectar.
- **`GEMINI_API_KEY`** → el extractor de pliegos no corre desplegado.
- **`GROQ_API_KEY`** → verificar si sigue haciendo falta; el extractor Groq se
  retiró en la remediación del 2026-08-12.
- **`NEXT_PUBLIC_APP_URL` en Preview** (hoy solo está en Production). Sin ella
  el fallback de `appUrl()` manda los enlaces de verificación de los deploys de
  preview a `http://localhost:3000`.

## 5. Redirect URLs en Supabase

Supabase → **Authentication → URL Configuration**: confirmar que la allow-list
incluye `https://aqualicita.vercel.app/auth/callback` además del localhost. Si
no está, la verificación por correo y el OAuth de Google fallan en producción
aunque el envío ya funcione.

---

## Sin verificar

**Si `drizzle/0017` (columna `usuario.plan`) ya se aplicó a la Supabase viva.**
`CLAUDE.md` dice que no, y en disco ya vamos por `drizzle/0022`, así que el
desfase puede ser mayor de lo documentado. Intenté consultarlo y el permiso me
lo bloqueó el clasificador de la sesión — quedó sin comprobar, no comprobado y
descartado.

---

## Qué ya está resuelto (no rehacer)

Hecho el 2026-09-07, con `tsc` limpio, 755/755 tests en verde y lint sin errores
nuevos:

- **Mapeo honesto de errores.** `authErrorCode()` en
  `src/lib/supabase/auth-messages.ts` traduce el mensaje crudo de GoTrue a un
  código estable; las tres piezas del vocabulario (mensaje crudo → código →
  texto al usuario) viven en ese archivo. `Email address not authorized` y
  `Error sending confirmation email` ahora caen en `email_delivery_failed`, con
  un texto que **no** invita a reintentar. Cubierto por
  `src/__tests__/supabase/auth-messages.test.ts` (13 casos).
- **Reenvío de verificación.** `resendConfirmationAction` en
  `src/lib/supabase/actions.ts` + `src/components/auth/ResendConfirmation.tsx`,
  desplegado en `/login` cuando el usuario está esperando el correo. Pide la
  dirección en su propio campo a propósito: por la URL quedaría en el historial
  del navegador y en los logs del servidor.
- **`callbackUrl(next)`** unifica el destino del enlace del correo entre alta,
  reenvío y Google. Si divergen, el reenviado deja de pasar por
  `/auth/callback` y el usuario pierde el reclamo de su diagnóstico anónimo.

Nada de eso se puede probar de punta a punta hasta que exista el punto 2.
