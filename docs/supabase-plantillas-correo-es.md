# Plantillas de correo de Supabase Auth, en español (2026-10-12)

Los correos de Auth salían con las plantillas por defecto de Supabase, en inglés
(«Confirm your email address»). La web está en español.

**Dónde se pegan:** Supabase → proyecto `hydrostacks` → Authentication → Emails →
**Templates**. Cada plantilla tiene *Subject* y *Message body (HTML)*. Las plantillas
no viven en el repo ni en la base: este archivo es la fuente para volver a pegarlas.

**Variables de Supabase usadas** (no cambiar sus nombres): `{{ .ConfirmationURL }}`,
`{{ .Email }}`, `{{ .NewEmail }}`, `{{ .Token }}`.

**Estado de uso real:** hoy la app solo dispara *Confirm sign up*. *Reset password*
no se usa porque la app no tiene recuperación de contraseña (PENDIENTES §59); se
deja traducida para cuando exista. El resto, por si se activan.

**Probar después de pegar:** registro con un alias, una sola vez, y comprobar el
correo en la bandeja (asunto en español, un único enlace que abre `/auth/callback`).
No cambia el remitente (`no-responder@cuenta.aqualicita.com`) ni SPF/DKIM/DMARC.

El color de los botones es el acento del sitio (`#0369A1`, blanco sobre él, contraste
de 5,9:1). Sin imágenes ni rastreadores: el correo no debe cargar nada externo.

---

## 1. Confirm sign up

**Subject:** `Confirma tu correo en AquaLicita`

```html
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;color:#0A1F1C;line-height:1.5">
  <h2 style="margin:0 0 12px;font-size:20px">Confirma tu correo</h2>
  <p>Gracias por crear tu cuenta en AquaLicita. Para terminar el registro, confirma que este correo es tuyo:</p>
  <p style="margin:24px 0">
    <a href="{{ .ConfirmationURL }}" style="background:#0369A1;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;display:inline-block;font-weight:600">Confirmar correo</a>
  </p>
  <p style="font-size:13px;color:#4a5b58">Abre el enlace en el mismo navegador donde te registraste. Si no creaste esta cuenta, ignora este mensaje: no pasará nada.</p>
</div>
```

## 2. Invite user

**Subject:** `Te invitaron a AquaLicita`

```html
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;color:#0A1F1C;line-height:1.5">
  <h2 style="margin:0 0 12px;font-size:20px">Te invitaron a AquaLicita</h2>
  <p>Aceptando la invitación podrás crear tu cuenta y seguir los procesos de contratación de agua y saneamiento.</p>
  <p style="margin:24px 0">
    <a href="{{ .ConfirmationURL }}" style="background:#0369A1;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;display:inline-block;font-weight:600">Aceptar la invitación</a>
  </p>
  <p style="font-size:13px;color:#4a5b58">Si no esperabas esta invitación, ignora este mensaje.</p>
</div>
```

## 3. Magic link

**Subject:** `Tu enlace para entrar a AquaLicita`

```html
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;color:#0A1F1C;line-height:1.5">
  <h2 style="margin:0 0 12px;font-size:20px">Entra a AquaLicita</h2>
  <p>Usa este enlace para iniciar sesión. Funciona una sola vez y caduca pronto.</p>
  <p style="margin:24px 0">
    <a href="{{ .ConfirmationURL }}" style="background:#0369A1;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;display:inline-block;font-weight:600">Iniciar sesión</a>
  </p>
  <p style="font-size:13px;color:#4a5b58">Si no pediste este enlace, ignora este mensaje.</p>
</div>
```

## 4. Change email address

**Subject:** `Confirma tu nuevo correo en AquaLicita`

```html
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;color:#0A1F1C;line-height:1.5">
  <h2 style="margin:0 0 12px;font-size:20px">Confirma tu nuevo correo</h2>
  <p>Pediste cambiar el correo de tu cuenta de {{ .Email }} a {{ .NewEmail }}. Confirma el cambio con este enlace:</p>
  <p style="margin:24px 0">
    <a href="{{ .ConfirmationURL }}" style="background:#0369A1;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;display:inline-block;font-weight:600">Confirmar el cambio</a>
  </p>
  <p style="font-size:13px;color:#4a5b58">Si no pediste este cambio, ignora este mensaje y tu correo seguirá igual.</p>
</div>
```

## 5. Reset password (sin uso hasta que exista la recuperación)

**Subject:** `Restablece tu contraseña de AquaLicita`

```html
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;color:#0A1F1C;line-height:1.5">
  <h2 style="margin:0 0 12px;font-size:20px">Restablece tu contraseña</h2>
  <p>Recibimos una solicitud para cambiar la contraseña de tu cuenta. Usa este enlace para elegir una nueva:</p>
  <p style="margin:24px 0">
    <a href="{{ .ConfirmationURL }}" style="background:#0369A1;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;display:inline-block;font-weight:600">Elegir una contraseña nueva</a>
  </p>
  <p style="font-size:13px;color:#4a5b58">Si no la pediste tú, ignora este mensaje: tu contraseña no cambia.</p>
</div>
```

## 6. Reauthentication

**Subject:** `Tu código de verificación de AquaLicita`

```html
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;color:#0A1F1C;line-height:1.5">
  <h2 style="margin:0 0 12px;font-size:20px">Tu código de verificación</h2>
  <p>Escribe este código para confirmar que eres tú:</p>
  <p style="font-size:28px;letter-spacing:6px;font-weight:700;margin:20px 0">{{ .Token }}</p>
  <p style="font-size:13px;color:#4a5b58">No compartas este código con nadie. Si no lo pediste, ignora este mensaje.</p>
</div>
```

---

## Reversión

Supabase no guarda historial de plantillas. Para volver a las de fábrica: en cada
plantilla, borrar el contenido y el *Subject* y guardar (Supabase repone el texto
por defecto), o pegar de nuevo la versión anterior desde esta página tras
cambiarla.
