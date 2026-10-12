# Plan: recuperación de contraseña (2026-10-12)

Estado: **plan para aprobación. Sin código.** Toca autenticación, así que por
`docs/CONDUCTA.md` §4 necesita plan aprobado antes de implementarse.

## Qué se quiere (sin tecnología)

Quien olvida su contraseña puede, desde `/login`, pedir un correo, abrir su enlace y
elegir una contraseña nueva, sin ayuda nuestra. Hoy no puede: no hay pantalla ni
acción (PENDIENTES §59), y quien se registró con correo y contraseña solo entra
si la recuerda (o con Google, si usó el mismo correo).

**Criterios de aceptación**
1. Desde `/login` hay «¿Olvidaste tu contraseña?» que lleva a una pantalla que pide el correo.
2. La respuesta es la **misma exista o no la cuenta** (no revela qué correos están registrados).
3. El correo llega en español, de `no-responder@cuenta.aqualicita.com`, con SPF, DKIM y DMARC en PASS.
4. El enlace abre una pantalla para elegir contraseña nueva (mínimo 8 caracteres, escrita dos veces); sin enlace válido esa pantalla no deja cambiar nada.
5. Tras el cambio, el usuario entra con la contraseña nueva y la vieja deja de funcionar.
6. Un enlace usado o vencido da un mensaje claro y la salida de pedir otro; nunca un error técnico.
7. El límite de un correo por minuto de Supabase se muestra como «Espera un minuto…» (ya existe el código `rate_limit`).
8. Probado de extremo a extremo con una cuenta de prueba y un buzón controlado.

## Qué existe ya (reconocimiento)

- `src/lib/supabase/actions.ts`: `signUpAction`, `signInWithPasswordAction`, `resendConfirmationAction`, `callbackUrl(next)` y `safeNext()`. **Sin** `resetPasswordForEmail` ni `updateUser`.
- `app/auth/callback/route.ts`: ya intercambia `code` por sesión (PKCE), sincroniza `usuario` y reclama el diagnóstico anónimo, y redirige a `next` (validado contra open-redirect). Sirve tal cual para el enlace de recuperación.
- `src/lib/supabase/auth-messages.ts`: vocabulario único de códigos y textos (`rate_limit`, `weak_password`…); hay que añadir los nuevos aquí, no sueltos.
- `app/login/page.tsx` y `app/registro/page.tsx` sobre `AuthCard`; `ResendConfirmation` es el patrón de «pide el correo en su propio campo, no por la URL».
- `middleware.ts`: protege por prefijo (`/cuenta`, `/mis-procesos`, `/diagnostico/historial`); solo distingue anónimo/con sesión.
- Plantilla de correo «Reset password» ya traducida en `docs/supabase-plantillas-correo-es.md` (pendiente de pegar en Supabase).
- Entorno local sin Supabase: las páginas de acceso redirigen a `/dev/sesion` con `sesionLocalActiva()`; las nuevas deben hacer lo mismo.

## Diseño propuesto (opción A, la más pequeña)

Reutiliza el mismo mecanismo que el alta, así que el flujo se parece al que ya funciona:

1. `/recuperar` (página nueva): un campo de correo. Su acción de servidor llama `supabase.auth.resetPasswordForEmail(email, { redirectTo: callbackUrl("/restablecer") })` y **siempre** redirige a `/recuperar?notice=reset_sent` con el aviso único «Si ese correo tiene cuenta, te enviamos un enlace». Los errores de límite se mapean a `rate_limit`; cualquier otro, al mismo aviso neutro (se registra en el log del servidor).
2. El correo lleva a Supabase (`/auth/v1/verify`) y de ahí a `/auth/callback?code=…&next=/restablecer`: **sin cambios** en el callback, salvo el punto de decisión D3.
3. `/restablecer` (página nueva, con sesión de recuperación): dos campos (contraseña y repetirla) y su acción llama `supabase.auth.updateUser({ password })`. Sin sesión → redirige a `/recuperar?error=link_invalid`.
4. Tras el cambio: `auth.signOut({ scope: "others" })` (cierra las demás sesiones) y redirige a `next` con aviso «Contraseña actualizada».
5. `/login`: enlace «¿Olvidaste tu contraseña?» bajo el botón Entrar.

**Archivos:** `actions.ts` (+2 acciones), `app/recuperar/page.tsx`, `app/restablecer/page.tsx`,
`auth-messages.ts` (códigos y avisos nuevos), `app/login/page.tsx` (enlace), pruebas
(`auth-messages.test.ts` y las acciones con Supabase simulado, como `auth-actions.test.ts`),
`PENDIENTES.md` §59 (cerrar), runbook de correo y `CLAUDE.md` (una nota). **Sin dependencias, sin
migraciones, sin tablas ni variables nuevas.**

## Decisiones que necesito de ti

- **D1. Cómo se abre el enlace.** *A (recomendada):* PKCE como el alta — el enlace solo funciona en el **mismo navegador** donde se pidió. *B:* enlace con `token_hash` y una ruta nueva `/auth/confirmar` (más una plantilla distinta): funciona desde **otro dispositivo** y en el navegador interno de la app de correo del celular, pero añade una ruta y cambia el callback. Con A, quien abre el correo desde el móvil en otro navegador verá «enlace inválido» y tendrá que pedir otro. Empezar por A y pasar a B si molesta.
- **D2. Cuentas creadas solo con Google.** Pueden pedir recuperación y, al elegir contraseña, quedan con las dos formas de entrar. *Recomendado: permitirlo* (el correo ya está verificado por Google).
- **D3. Quién puede cambiar la contraseña en `/restablecer`.** *A (recomendada):* solo quien llegó por el enlace — el callback deja una cookie `httpOnly` de 15 minutos al entrar con `next=/restablecer` y la acción la exige y la borra. *B:* cualquier sesión abierta (más simple, pero en un navegador compartido con sesión abierta se cambiaría la contraseña sin saber la actual). *C:* pedir la contraseña actual (no sirve a quien la olvidó).
- **D4. Después del cambio.** *Recomendado:* seguir con la sesión abierta y cerrar las otras. Alternativa: cerrar todas y volver a `/login`.
- **D5. Cuentas sin confirmar.** Con el correo sin confirmar, Supabase puede reenviar la confirmación en vez del enlace de recuperación; **no verificado** (se comprueba en la prueba de extremo a extremo y, si ocurre, se muestra el aviso neutro igual).

## Riesgos

- **PKCE entre navegadores:** el mismo límite que el alta (ver D1). Mitigación: mensaje claro y pedir otro enlace.
- **Enumeración de correos:** se evita con la respuesta única; el tiempo de respuesta también debe ser parecido (no hay consulta propia a la base antes de llamar a Supabase).
- **Abuso del envío:** Supabase limita a un correo por usuario por minuto y 30 por hora en total con SMTP propio; la pantalla nunca llama dos veces seguidas (se reutiliza `BotonEnvio` de #137).
- **Lista blanca de redirecciones:** la URL `…/auth/callback?next=%2Frestablecer` debe estar permitida. El runbook dice que existen las entradas con comodín `/**`; el propietario debe confirmarlo en Supabase → Authentication → URL Configuration antes de probar.
- **Plantilla en inglés mientras no se pegue la traducida** (el correo saldría con el texto por defecto).
- **`next`:** se valida con `safeNext()` en ambas acciones, igual que hoy.

## Orden de trabajo y verificación

1. Pegar la plantilla «Reset password» traducida y confirmar la lista blanca (propietario).
2. Mensajes y pruebas puras (`auth-messages`), luego las acciones con Supabase simulado.
3. Páginas `/recuperar` y `/restablecer`, y el enlace en `/login`.
4. Revisar las consultas y rutas contra `docs/CONDUCTA.md` §4 (no hay consultas a cuentas propias: todo pasa por Supabase Auth).
5. PR; CI en verde; despliegue.
6. **Prueba real:** cuenta de prueba confirmada, pedir recuperación desde `/recuperar`, leer el correo (SPF/DKIM/DMARC y texto en español), abrir el enlace en el mismo navegador, elegir contraseña, entrar con ella y comprobar que la anterior ya no entra; repetir con un enlace usado y con otro navegador para ver el mensaje de error.

Reversión: revertir el PR (las páginas y acciones son nuevas y aisladas); no hay datos ni esquema que deshacer.
