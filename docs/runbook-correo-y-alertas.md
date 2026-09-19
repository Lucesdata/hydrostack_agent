# Runbook — levantar el registro por correo y las alertas diarias

**Escrito el 2026-09-19.** Sustituye a `PENDIENTES-CORREO.md` como guía de
ejecución; ese archivo queda como historia del diagnóstico del 2026-09-07. Al
final hay una sección con lo que de él ya no aplica.

Quién lo ejecuta: el dueño del proyecto, con sus credenciales de Resend, Vercel
y Supabase. Ningún paso de este documento es código. La única pieza que vive en
el repo —los crons de `vercel.json`— está en el paso 10 y tiene su propia
decisión pendiente.

Cada paso tiene tres partes: **qué tocar**, **qué valor poner** y **cómo
comprobar que quedó bien**. No pasar al siguiente sin la comprobación: la mitad
de los fallos de esta cadena responden 200 o "guardado" y no entregan nada.

---

## Estado de partida (verificado el 2026-09-19, solo lectura)

| Pieza | Estado | Cómo se comprobó |
|---|---|---|
| Confirmación de correo en Supabase | Obligatoria (`mailer_autoconfirm: false`) | `GET /auth/v1/settings` del proyecto |
| SMTP de Supabase | El integrado, que solo entrega a miembros del equipo | `PENDIENTES-CORREO.md` + síntoma `Email address not authorized`; no se puede leer desde fuera |
| Site URL / allowlist de Supabase | `https://aqualicita.com`; acepta `/auth/callback?next=…` | `curl` a `/auth/v1/verify` con y sin `redirect_to` |
| Dominio `aqualicita.com` | Registrado en Vercel, DNS en Vercel | `vercel domains ls` |
| Registros de correo del dominio | **Ninguno** (sin SPF, DKIM, DMARC ni MX) | `dig` sobre `aqualicita.com`, `_dmarc`, `resend._domainkey`, `send` |
| `AUTH_RESEND_KEY` / `EMAIL_FROM` en Vercel Production | **No existen** | `vercel env ls` |
| `RESEND_WEBHOOK_SECRET` en Vercel Production | Existe | `vercel env ls` |
| Webhook de Resend | Apunta a `aqualicita.vercel.app/api/webhooks/resend`; la ruta responde en ese host y en `aqualicita.com` | `curl` (405 a GET = la ruta existe y solo acepta POST) |
| Crons de Vercel | **Ninguno** (`definitions: []` en el deploy `eb40d91`) | `vercel crons ls` + API del proyecto |
| Plan de Vercel | Hobby, Fluid activo, funciones en `iad1` | API de Vercel |
| Última ingesta | **2026-09-12 20:46 UTC** — una semana sin datos nuevos | `sync_log` |
| `proceso.url` vacía | 55 de 90.622 filas | consulta de solo lectura |

Qué necesita cada cosa, leído del código:

- **Registro**: el correo lo envía **Supabase**, con el SMTP que tenga
  configurado. La app no manda nada en el alta (`signUpAction` en
  `src/lib/supabase/actions.ts`). Por eso el registro depende de los pasos 1–5 y
  **no** de las variables de Vercel.
- **Alertas**: el correo lo envía **la app** con el SDK de Resend
  (`src/lib/email/send.ts`), que lee `AUTH_RESEND_KEY` y `EMAIL_FROM`. Dependen
  de los pasos 1–3 y 6–7, y del cron del paso 10 para correr solas.

---

## Orden

```
1 dominio en Resend ─► 2 DNS en Vercel ─► 3 claves de Resend ─┬─► 4 SMTP Supabase ─► 5 rate limit ─► 8 verificar REGISTRO
                                                               └─► 6 env en Vercel ─► 7 redeploy ─► 9 verificar ALERTAS ─► 10 crons
```

El registro y las alertas comparten los pasos 1–3 y a partir de ahí son
independientes: se puede verificar el registro (8) antes de tocar Vercel.

---

## 1. Añadir el dominio en Resend

- **Qué tocar:** Resend → **Domains** → **Add Domain**.
- **Valor:** dominio `aqualicita.com`. Región: **`us-east-1`** (North Virginia).
  No es una decisión crítica, pero es la más cercana a quien llama a la API
  (las funciones de Vercel corren en `iad1`, también Virginia) y está a medio
  camino de Colombia. Cambiarla después obliga a borrar el dominio y repetir los
  pasos 1–2.
- **Comprobación:** Resend muestra el dominio en estado *Pending* con su lista de
  registros DNS. Esa lista es la entrada del paso 2: **copiarla tal cual**, sin
  reescribir nada de memoria.

## 2. Publicar los registros en el DNS de Vercel

El DNS de `aqualicita.com` lo sirve Vercel (`ns1/ns2.vercel-dns.com`), así que
los registros se ponen ahí, no en ningún registrador externo.

- **Qué tocar:** Vercel → **Domains** → `aqualicita.com` → **DNS Records** →
  *Add*. O por CLI, un registro por comando:
  ```bash
  vercel dns add aqualicita.com <nombre> <TIPO> "<valor>"            # TXT
  vercel dns add aqualicita.com <nombre> MX "<valor>" <prioridad>     # MX
  ```
- **Valor:**
  - Los registros que mostró Resend en el paso 1. Normalmente son tres: un
    **MX** y un **TXT** de SPF en el subdominio `send`, y un **TXT** de DKIM en
    `resend._domainkey`. El nombre va **sin** `.aqualicita.com` al final (Vercel
    lo añade).
  - Uno más que Resend no exige pero recomienda: nombre `_dmarc`, tipo `TXT`,
    valor `v=DMARC1; p=none;`. Sin `rua=`: el dominio no tiene buzón (no hay MX
    en la raíz) y un `rua` hacia otro dominio, como Gmail, no recibe informes
    si ese dominio no lo autoriza. `p=none` solo observa: no rechaza nada.
- **Comprobación:**
  ```bash
  dig +short TXT resend._domainkey.aqualicita.com   # devuelve "p=MIGf..." (la clave de Resend)
  dig +short MX send.aqualicita.com                 # devuelve el MX de Resend
  dig +short TXT send.aqualicita.com                # devuelve "v=spf1 include:..."
  dig +short TXT _dmarc.aqualicita.com              # devuelve "v=DMARC1; p=none;"
  ```
  Y en Resend → Domains, **Verify DNS Records** hasta que el dominio quede
  **Verified**. Mientras no lo esté, Resend solo entrega al dueño de la cuenta y
  todo lo que sigue fallará con cualquier otro destinatario.

## 3. Crear las claves de Resend

- **Qué tocar:** Resend → **API Keys** → **Create API Key**, dos veces.
- **Valor:**
  - `supabase-smtp` — permiso **Sending access**, dominio `aqualicita.com`.
  - `vercel-alertas` — permiso **Sending access**, dominio `aqualicita.com`.

  Dos claves y no una: si una se filtra o hay que rotarla, se revoca sin tumbar
  el otro camino. La clave que hay hoy en `.env.local` (creada el 2026-09-07,
  sin dominio propio) puede quedarse para desarrollo local.
- **Comprobación:** las dos aparecen en la lista con *Sending access* y el dominio
  `aqualicita.com`. Guardar cada valor (`re_…`) en el momento: Resend no lo
  vuelve a mostrar.

## 4. SMTP propio en Supabase — lo que arregla el registro

- **Qué tocar:** Supabase, proyecto `hydrostacks` → **Authentication** →
  **Emails** → pestaña **SMTP Settings** → activar **Enable Custom SMTP**.
- **Valor:**

  | Campo | Valor |
  |---|---|
  | Sender email | `no-responder@aqualicita.com` |
  | Sender name | `AquaLicita` |
  | Host | `smtp.resend.com` |
  | Port number | `465` (SSL/TLS implícito) |
  | Username | `resend` |
  | Password | la clave `supabase-smtp` del paso 3 |
  | Minimum interval between emails | dejar el valor por defecto |

  El remitente **tiene** que ser del dominio verificado en el paso 2. Con
  cualquier otro, Resend rechaza el envío y el alta vuelve a caer en
  `email_delivery_failed`. No hace falta tocar las plantillas: la de confirmación
  por defecto (`{{ .ConfirmationURL }}`) ya respeta el `emailRedirectTo` que
  manda la app hacia `/auth/callback`.
- **Comprobación:** guarda sin error. La prueba de verdad es el paso 8.

## 5. Límite de envío de Supabase

- **Qué tocar:** Supabase → **Authentication** → **Rate Limits** → *Rate limit
  for sending emails*.
- **Valor:** según la documentación de Supabase, al activar SMTP propio el límite
  pasa a **30 por hora**. Confirmar que muestra 30 o más. Para una beta basta;
  subirlo solo si se espera más de 30 altas o reenvíos por hora.
- **Comprobación:** el valor sigue ahí al recargar la página. Si sigue en 2, el
  SMTP del paso 4 no quedó activo: volver al paso 4.

## 6. Variables de entorno en Vercel — lo que arregla las alertas

- **Qué tocar:** Vercel → proyecto `aqualicita` → **Settings** → **Environment
  Variables** → *Add*. Entorno: **solo Production**.
- **Valor:**

  | Nombre | Valor | Tipo |
  |---|---|---|
  | `AUTH_RESEND_KEY` | la clave `vercel-alertas` del paso 3 | Sensitive |
  | `EMAIL_FROM` | `AquaLicita <alertas@aqualicita.com>` | normal |

  `EMAIL_FROM` también tiene que ser del dominio verificado. Si no lo es, Resend
  rechaza cada envío, `run-daily.ts` captura el error por cuenta y **el cron
  responde 200 igual** (ver "Si algo falla").

  No añadirlas a Preview: un preview enviaría correos reales a cuentas reales
  desde una rama sin revisar.
- **Comprobación:**
  ```bash
  vercel env ls production    # aparecen AUTH_RESEND_KEY y EMAIL_FROM
  ```

## 7. Redeploy de producción

Una variable nueva solo entra en un deploy **nuevo**. El que está sirviendo ahora
no la ve.

- **Qué tocar:** Vercel → **Deployments** → el deploy de Production actual →
  menú `⋯` → **Redeploy**. O bien:
  ```bash
  vercel redeploy <url-del-deploy-de-produccion>
  ```
  **No** usar `vercel --prod`: sube el directorio de trabajo local, con lo que
  haya sin commitear. Si el paso 10 se va a mergear ya, su push a `main`
  despliega solo y sirve de redeploy: se pueden juntar los dos pasos.
- **Valor:** —
- **Comprobación:** `vercel ls aqualicita` muestra un deploy de Production en
  `Ready` **creado después** del paso 6.

## 8. Verificar el REGISTRO (depende de 1–5)

1. En `https://aqualicita.com/registro`, darse de alta con un correo que **no**
   sea `lucesproject@gmail.com` (uno propio distinto).
   - **Bien:** redirige a `/login` con el aviso de "revisa tu correo".
   - **Mal:** el formulario muestra el error de envío (`email_delivery_failed`).
2. Resend → **Emails**: aparece el correo de confirmación, remitente
   `no-responder@aqualicita.com`, estado *Delivered*.
3. Abrir el enlace **en el mismo navegador** donde se hizo el alta. El callback
   usa PKCE (`exchangeCodeForSession` en `app/auth/callback/route.ts`) y el
   verificador vive en una cookie de ese navegador. Abierto en otro, falla y
   muestra `oauth_error`, aunque el error sea del correo.
   - **Bien:** entra con sesión iniciada en la página de destino.
4. Supabase → **Authentication** → **Users**: el usuario tiene *Confirmed at*
   relleno. Y en la base existe la fila de la app:
   ```sql
   select id, email, created_at from usuario where email = '<correo de la prueba>';
   ```
5. Las dos cuentas que quedaron a medias (`qa***@gmail.com` del 18 de agosto y
   `gi***@gmail.com` del 7 de septiembre) pueden terminar el alta solas desde
   `/login` → **Reenviar verificación**, que ya está desplegado y solo esperaba
   este SMTP.

## 9. Verificar las ALERTAS sin tocar a usuarios reales (depende de 1–3 y 6–7)

- **Qué tocar:** `https://aqualicita.com/mis-coincidencias`, con una cuenta propia
  → botón **Enviar ahora**.
- **Requisito:** esa cuenta necesita un perfil de oferente **completo** con al
  menos **una coincidencia**. Con cero, la app registra `sin_coincidencias` y no
  envía nada, así que la prueba no prueba nada.
- **Comprobación:**
  - La página muestra el aviso de enviado. Si muestra un error, el texto es el
    motivo real: `AUTH_RESEND_KEY no definida` o `EMAIL_FROM no definida`
    significan que el paso 7 no recogió el paso 6.
  - El correo llega a **Recibidos**, no a spam, desde `alertas@aqualicita.com`.
    En Gmail, "Mostrar original" debe decir **SPF: PASS, DKIM: PASS, DMARC: PASS**.
  - Resend → **Webhooks** → el endpoint muestra el evento `email.delivered` con
    respuesta 200.

Este camino (`envio_log.tipo = 'on_demand'`) es repetible y no consume la reserva
del envío diario.

## 10. Reactivar los crons — la única pieza del repo

`vercel.json` se vació **a propósito** el 2026-09-12 (`7f4eaa9` y `0accb2c`)
para el corte de `raw_record` (`docs/runbook-corte-raw-record.md`, paso 8).

**Decidido el 2026-09-19: el corte de `raw_record` queda abandonado.** El
`TRUNCATE` nunca se ejecutó: `raw_record` sigue con 129.007 filas, todas con
`payload` vacío, y la cuota se resolvió el 2026-09-15 con `VACUUM FULL`. Por eso:

- **`tick` vuelve a `vercel.json`** (hecho el 2026-09-19). Se había pausado para
  que la ingesta no escribiera en `raw_record` durante el `TRUNCATE`, y ese riesgo
  ya no existe. Mientras estuvo activo (del 2026-09-05 al 2026-09-12) corrió todos
  los días, con ingestas de 1 a 21 s. Ninguna de sus etapas envía correo. **Se
  activa al desplegar**: hasta que el cambio llegue a `main`, producción sigue sin
  crons.
- **`alertas` sigue fuera, y solo se añade después de que el paso 9 salga
  bien.** Se pausó porque el correo diario lee `proceso.url` sin plan B; hoy
  faltan 55 de 90.622 URL, así que esa condición está cumplida. La que falta es el
  correo: sin los pasos 1–7, el cron falla por cada cuenta y responde 200 igual.
  Reactivarlo es añadir su entrada al array, con el horario de la tabla.

De dónde sale cada horario:

| Ruta | Horario | Fuente |
|---|---|---|
| `/api/cron/tick` | `0 11 * * *` | El docstring de tick no declara horario: ocupa el hueco de `ingest`. `0 11 * * *` es el del docstring de `app/api/cron/ingest/route.ts` y el que el commit `65fdd2a` pasó de `ingest` a `tick`. |
| `/api/cron/alertas` | `0 12 * * *` | Docstring de `app/api/cron/alertas/route.ts` y `docs/plan-arquitectura-roadmap.md` §Fase 1.4. |

`/api/cron/ingest` **no** vuelve al array: `tick` ya hace la ingesta y ese
endpoint queda como disparador manual. Programar los dos ingeriría dos veces.

En Hobby, Vercel dispara cada cron **en algún momento de esa hora**: `tick`
entre 11:00 y 11:59 UTC (06:00–06:59 en Colombia) y `alertas` entre 12:00 y
12:59 UTC.

- **Comprobación, tras el push a `main`:**
  ```bash
  vercel crons ls     # hoy: /api/cron/tick; tras el paso 9, también /api/cron/alertas
  ```
  Y en Vercel → **Settings** → **Cron Jobs**, las entradas activas. Vercel manda
  solo el `Authorization: Bearer $CRON_SECRET` (ya existe en Production).
- **Comprobación, el día siguiente:**
  - `tick`:
    ```sql
    select source, status, finished_at from sync_log order by started_at desc limit 2;
    ```
    Dos filas de hoy en `ok` o `partial` (`partial` = llegó al tope de páginas,
    mañana continúa desde ahí). En Vercel → **Logs**, filtrando por
    `/api/cron/tick`, aparece la línea `[cron/tick] done` con `ingesta:true`.
  - `alertas`: **el 200 no basta.** En Vercel → **Logs**, filtrando por
    `/api/cron/alertas`, la línea `[cron/alertas] done { … errores: 0 }`. Y:
    ```sql
    select estado, count(*) from envio_log
    where fecha = current_date and tipo = 'diario' group by 1;
    ```
    Solo `enviado` y `sin_coincidencias`. Ni una fila en `error`.

## 11. Limpieza (opcional, en cualquier momento después del 9)

- Resend → **Webhooks**: cambiar la URL del endpoint de
  `https://aqualicita.vercel.app/api/webhooks/resend` a
  `https://aqualicita.com/api/webhooks/resend`. Hoy funcionan las dos. Esta
  sigue funcionando aunque cambie el alias `.vercel.app`. El secreto
  (`RESEND_WEBHOOK_SECRET`) no cambia.
- Supabase → **Authentication** → **URL Configuration**: borrar las 4 entradas
  de ruta exacta que quedaron en la allowlist. No hacen nada: una ruta exacta
  deja de coincidir en cuanto la URL lleva query string, y `callbackUrl()`
  siempre añade `?next=`. Las que sirven son las de comodín `/**`.
- **Código, fuera de este runbook:** `PENDIENTES.md` §21 pide revertir el copy
  del home (volver a poner el paso 04 «aviso diario» en `S3Motor.jsx` y en el
  cierre) cuando las alertas entreguen de verdad. Hacerlo después del paso 9, no
  antes.

---

## Si algo falla

| Síntoma | Causa probable | Dónde mirar |
|---|---|---|
| El alta muestra el error de envío de correo | SMTP no activo, o remitente fuera del dominio verificado | Supabase → Logs → Auth; Resend → Emails |
| El enlace del correo acaba en `/login?error=oauth_error` | Enlace abierto en otro navegador (PKCE), o destino fuera de la allowlist | Reabrir en el mismo navegador o usar **Reenviar verificación** |
| "Enviar ahora" dice `AUTH_RESEND_KEY no definida` | El deploy activo es anterior al paso 6 | Paso 7 |
| Resend responde 403 `domain is not verified` / `only send testing emails to your own email address` | `EMAIL_FROM` o el remitente SMTP no son de `aqualicita.com`, o el dominio no está *Verified* | Pasos 2, 4 y 6 |
| El cron de alertas da 200 pero no llega nada | Error por cuenta, capturado en `run-daily.ts` | `errores` en el log de `[cron/alertas] done`; `envio_log.estado = 'error'` |
| Reintentar el envío diario el mismo día no hace nada | La reserva de `envio_log` de hoy bloquea el reenvío (idempotencia, a propósito) | Esperar al día siguiente. `npm run al:enviar-diario -- --repetir` fuerza el reenvío, pero **borra todas las reservas `diario` de hoy en producción y envía a todas las cuentas**: es una decisión del dueño, no un reintento |
| Cron con 401 | `CRON_SECRET` no está en Production o no coincide | `vercel env ls production` |
| El correo llega a spam | SPF/DKIM/DMARC no alineados | Gmail → "Mostrar original"; `dig` del paso 2 |

---

## Qué de `PENDIENTES-CORREO.md` ya no aplica

Contrastado el 2026-09-19 contra el código y el estado real:

- **§5 (Redirect URLs) está resuelto, y además el valor que proponía estaba
  mal.** El sitio vive en `aqualicita.com` desde el 2026-09-09. La Site URL ya
  es `https://aqualicita.com` y la allowlist acepta `/auth/callback?next=…`
  (comprobado con `curl` a `/auth/v1/verify`). La entrada exacta
  `https://aqualicita.vercel.app/auth/callback` que sugería **no funcionaría**:
  las rutas exactas no coinciden si llevan query string.
- **§4, "`NEXT_PUBLIC_APP_URL` en Preview":** resuelto en código por el PR #30.
  `appUrl()` (`src/lib/app-url.ts`) usa `VERCEL_BRANCH_URL` en los previews y ya
  no cae a `localhost`.
- **§4, `GROQ_API_KEY`:** ningún archivo de `app/` ni de `src/` la lee. No hace
  falta.
- **§4, lista de variables de producción:** estaba incompleta. Hoy Production
  también tiene `RESEND_WEBHOOK_SECRET`. Además de `AUTH_RESEND_KEY`,
  `EMAIL_FROM` y `GEMINI_API_KEY`, falta `ANTHROPIC_API_KEY` (asistentes), que
  no se citaba. Ni estas dos últimas ni `SECOP_APP_TOKEN` afectan al registro ni
  a las alertas.
- **§3, "Verificar un dominio en Resend":** ya no es "conseguir un dominio":
  `aqualicita.com` existe y su DNS está en Vercel. Falta publicar los registros
  (pasos 1–2).
- **§2, rate limit "sigue en 2/hora aunque el SMTP ya sea propio":** según la
  documentación de Supabase, al activar SMTP propio el límite pasa a 30/hora. El
  paso 5 lo comprueba en el panel en vez de darlo por hecho.
- **§2, "la misma clave de `AUTH_RESEND_KEY`" para el SMTP:** funciona, pero
  este runbook recomienda dos claves (paso 3) para poder revocarlas por
  separado.
- **"Sin verificar: `drizzle/0017`":** comprobado. `drizzle.__drizzle_migrations`
  tiene 25 filas y la última es de la misma fecha que `0024` en el journal
  (2026-09-15 03:49 UTC): están aplicadas todas, `0000`–`0024`.
- **Lo que no decía:** que las alertas tampoco correrían aunque se arreglara el
  correo, porque desde el 2026-09-12 no hay cron programado (paso 10).

## Lo que este runbook no arregla (anotado, fuera de alcance)

- `run-daily.ts` responde 200 aunque fallen todos los envíos. Solo lo delata
  `summary.errores`. Hacerlo ruidoso es un cambio de código en la lógica de
  alertas.
- El docstring de `/api/cron/tick` da por hecho que Hobby admite 2 crons como
  máximo. Hoy la documentación de Vercel dice 100 por proyecto en todos los
  planes (Hobby sigue limitado a una ejecución diaria). Los docstrings de
  `ingest` y `alertas` siguen hablando de `cron/ingest` como el disparador
  diario.
- Las funciones corren en `iad1` (Virginia) y la base está en `eu-west-1`
  (Irlanda). Cada query cruza el Atlántico, y dentro de los 300 s de `tick` eso
  cuenta.
- `.env.example` presenta `DB_DRIVER` como opcional. En producción tiene que
  valer `node`: el driver por defecto (`@neondatabase/serverless`) solo habla
  con Neon.
- `SECOP_APP_TOKEN` no está en Production: la ingesta sale desde IPs compartidas
  de Vercel con el throttling anónimo de Socrata.
