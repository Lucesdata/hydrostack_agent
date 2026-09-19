# Runbook — levantar el registro por correo y las alertas diarias

**Escrito el 2026-09-19 y revisado el mismo día por la tarde** con cuatro cosas
que la primera versión no tenía: los registros que Resend emite hoy (CNAME, no
solo MX + TXT), la decisión de enviar desde dos subdominios en vez de la raíz,
los límites de los planes gratuitos y la lista de lo que ya existe y **no** hay
que rehacer. Sustituye a `PENDIENTES-CORREO.md` como guía de ejecución; ese
archivo queda como historia del diagnóstico del 2026-09-07. Al final hay una
sección con lo que de él ya no aplica.

Quién lo ejecuta: el dueño del proyecto, con sus credenciales de Resend, Vercel
y Supabase. Ningún paso de este documento es código. La única pieza que vive en
el repo —los crons de `vercel.json`— está en el paso 10.

**Restricción: todo dentro de los planes gratuitos** (Resend Free, Supabase
Free, Vercel Hobby). Nada de lo que sigue exige pagar. Los límites que mandan
están en su propia sección, y cada paso los respeta.

Cada paso tiene tres partes: **qué tocar**, **qué valor poner** y **cómo
comprobar que quedó bien**. No pasar al siguiente sin la comprobación: la mitad
de los fallos de esta cadena responden 200 o "guardado" y no entregan nada.

---

## Estado de partida (verificado el 2026-09-19, solo lectura)

| Pieza | Estado | Cómo se comprobó |
|---|---|---|
| Confirmación de correo en Supabase | Obligatoria (`mailer_autoconfirm: false`) | `GET /auth/v1/settings` del proyecto |
| SMTP de Supabase | El integrado: solo entrega a miembros del equipo, 2 por hora | `PENDIENTES-CORREO.md` + síntoma `Email address not authorized` |
| Site URL / allowlist de Supabase | **Bien, no tocar.** Acepta `https://aqualicita.com/auth/callback?next=…` y los previews `aqualicita-git-…vercel.app`; un dominio ajeno cae al Site URL | `curl` a `/auth/v1/verify` con token inválido y tres `redirect_to` distintos |
| Dominio `aqualicita.com` | Registrado en Vercel, DNS en Vercel (`ns1/ns2.vercel-dns.com`) | `vercel domains ls`, `dig NS` |
| Zona DNS | Solo lo que Vercel crea por defecto: 3 CAA, `ALIAS` en la raíz y un comodín `*`. TTL negativo del SOA: **600 s** | `vercel dns ls aqualicita.com`, `dig SOA` |
| Registros de correo | **Ninguno**: nada en `send`, `rsend`, `resend._domainkey` ni `_dmarc`, ni en la raíz ni en `cuenta.` / `alertas.` | `dig` contra `ns1.vercel-dns.com` |
| Variables en Vercel Production | **Ya existen:** `CRON_SECRET`, `AUTH_SECRET` (las dos desde el 2026-08-02), `RESEND_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`. **Faltan:** `AUTH_RESEND_KEY`, `EMAIL_FROM` | `vercel env ls production` |
| Variables en Vercel Preview | Solo base de datos y Supabase. Sin `NEXT_PUBLIC_APP_URL`, **a propósito** (paso 6) | `vercel env ls preview` |
| Webhook de Resend | Existe. Apunta a `aqualicita.vercel.app/api/webhooks/resend` con 4 eventos; la ruta responde en ese host y en `aqualicita.com` | `curl` (405 a GET = la ruta existe y solo acepta POST) |
| Crons de Vercel | Solo `/api/cron/tick` (PR #35, desplegado el 2026-09-19; primera corrida el 2026-09-20 entre 11:00 y 11:59 UTC). `alertas` fuera a propósito | `vercel crons ls` |
| Cuentas en `auth.users` | 4, de las que 2 confirmadas. Las 2 a medias: `qa***@gmail.com` (2026-08-18, **con** fila en `usuario`) y `gi***@gmail.com` (2026-09-03, sin fila) | consulta de solo lectura sobre `auth.users` y `usuario` |
| Plan de Vercel | Hobby, Fluid activo, funciones en `iad1` | API de Vercel |
| Última ingesta | 2026-09-12 20:46 UTC | `sync_log` |

Qué necesita cada cosa, leído del código:

- **Registro**: el correo lo envía **Supabase**, con el SMTP que tenga
  configurado. La app no manda nada en el alta (`signUpAction` en
  `src/lib/supabase/actions.ts`). Por eso el registro depende de los pasos 1–5 y
  **no** de las variables de Vercel.
- **Alertas**: el correo lo envía **la app** con el SDK de Resend
  (`src/lib/email/send.ts`), que lee `AUTH_RESEND_KEY` y `EMAIL_FROM`. La baja de
  un clic ya va en cada correo (`List-Unsubscribe` + `List-Unsubscribe-Post`,
  RFC 8058), firmada con `AUTH_SECRET`. Dependen de los pasos 1–3 y 6–7, y del
  cron del paso 10 para correr solas.

---

## Límites de los planes gratuitos

Medidos el 2026-09-19 en las páginas de precios y documentación de cada
servicio.

| Servicio y plan | Límite | Qué significa aquí |
|---|---|---|
| Resend Free | **100 correos al día** y 3.000 al mes, **sumando todo**: altas de Supabase, digest diario, "Enviar ahora" y reenvíos de verificación. Los correos *recibidos* también cuentan | Es el límite que manda. Ver "Presupuesto del cupo" abajo |
| Resend Free | 3 dominios | Caben los dos subdominios de la decisión 0 y sobra uno |
| Resend Free | 30 días de historial | Resend → **Emails** sirve para comprobar envíos del último mes |
| Resend Free | Webhooks, claves con permisos por dominio, DKIM/SPF/DMARC incluidos | Nada de este runbook queda fuera del plan |
| Supabase Free | SMTP propio permitido; al activarlo, **30 correos de Auth por hora** | Paso 5 |
| Vercel Hobby | Cada cron corre **una vez al día**, en algún momento de la hora programada | Paso 10 |
| Vercel Hobby | **Los logs de ejecución duran 1 hora** | Cualquier comprobación "mirar en Logs" se hace dentro de la hora siguiente al cron, o no se hace. Lo que dura es `envio_log` y `sync_log` en la base |
| Vercel Hobby | DNS del dominio incluido | Los registros del paso 2 no cuestan nada |

**Presupuesto del cupo de Resend.** El digest sale a las 12:00 UTC (07:00 en
Colombia) y gasta primero. Si agotara los 100, **las altas fallarían el resto
del día**: Resend responde 429 `daily_quota_exceeded`, el alta cae en
`email_delivery_failed` y deja otra cuenta a medias. Regla práctica:

- **Digest por debajo de ~70 destinatarios** deja ~30 para altas y reenvíos,
  que coincide con el tope horario de Supabase.
- Hoy hay 4 cuentas. Vigilarlo con:
  ```sql
  select fecha, count(*) from envio_log
  where estado = 'enviado' and fecha > current_date - 7 group by 1 order by 1;
  ```
- Al acercarse a 70, el plan gratuito deja de alcanzar y hay que decidir: pagar
  Resend Pro o cambiar la cadencia del digest (eso ya es código). Es una
  decisión del dueño, no un paso de este runbook.

---

## Decisión 0 — dos subdominios, no la raíz

| Uso | Dominio en Resend | Remitente | Clave de API (paso 3) |
|---|---|---|---|
| Alta (Supabase Auth) | `cuenta.aqualicita.com` | `AquaLicita <no-responder@cuenta.aqualicita.com>` | `supabase-smtp` |
| Digest diario (la app) | `alertas.aqualicita.com` | `AquaLicita <avisos@alertas.aqualicita.com>` | `vercel-alertas` |

La raíz `aqualicita.com` **no** se verifica en Resend: queda libre para correo
humano (Google Workspace u otro) sin compartir reputación con el tráfico
automático.

Por qué dos y no uno:

- **Aislar el alta del digest.** Las quejas de spam vendrán casi seguro del
  digest (alguien olvida que se suscribió y pulsa "spam"), y dañan la reputación
  del dominio que envía. Si fuera el mismo que manda la confirmación de alta, el
  registro empezaría a caer en spam. Resend recomienda esta separación.
- **Cabe en el plan gratuito** (3 dominios).
- **Cada clave queda limitada a su subdominio**: una clave filtrada solo puede
  enviar como ese subdominio.

**No usar `send` ni `rsend` como nombre de subdominio de envío.** Son los nombres
que Resend usa para los rebotes *debajo* del dominio verificado. Verificar
`send.aqualicita.com` produciría registros en `send.send.aqualicita.com` y un
remitente `…@send.aqualicita.com`.

**Si aun así se prefiere la raíz:** mismo procedimiento con un solo dominio
(`aqualicita.com`); los nombres DNS del paso 2 van sin `.cuenta` / `.alertas`,
los remitentes pasan a `no-responder@aqualicita.com` y `alertas@aqualicita.com`,
y las dos claves se limitan a `aqualicita.com`. Se pierde el aislamiento.

---

## Orden

```
1 dominios en Resend ─► 2 DNS en Vercel ─► ⏳ los dos "Verified" ─► 4 SMTP Supabase ─► 5 rate limit ─► 8 verificar REGISTRO
                     └─► 3 claves ─► 6 env en Vercel ─► 7 redeploy ──────────────────────────────────► 9 verificar ALERTAS ─► 10 cron alertas
                                                                                                           ... semanas después ─► 12 DMARC
```

- **El paso 4 nunca antes de "Verified".** Con el SMTP propio activo, cada alta
  envía su correo sola; no hay forma de "no enviar todavía". Con el dominio
  pendiente, Resend rechaza todos los envíos, cada alta cae en
  `email_delivery_failed` y deja otra cuenta a medias (Supabase crea la fila en
  `auth.users` aunque el correo falle). Hoy el SMTP integrado al menos entrega a
  los miembros del equipo; activarlo antes de tiempo rompe también eso.
- **Los pasos 3, 6 y 7 pueden ir mientras se verifica.** El cron de alertas no
  está programado, así que nadie envía nada; "Enviar ahora" fallaría con 403
  hasta que el dominio esté verificado, y eso es todo.
- El registro y las alertas son independientes a partir del paso 3: se puede
  verificar el registro (8) sin haber tocado Vercel.

---

## 1. Añadir los dominios en Resend

- **Qué tocar:** Resend → **Domains** → **Add Domain**, dos veces.
- **Valor:**
  - `cuenta.aqualicita.com` y `alertas.aqualicita.com`.
  - Región: **`us-east-1`** (North Virginia) en los dos. No es una decisión
    crítica, pero es la más cercana a quien llama a la API (las funciones de
    Vercel corren en `iad1`, también Virginia). **No se puede cambiar después**:
    habría que borrar el dominio y repetir los pasos 1–2.
  - *Advanced options* (return path personalizado): no tocar.
  - **No activar Receiving.** Exige un MX y, en el plan gratuito, los correos
    recibidos también gastan el cupo de 100 al día.
  - **Tracking de aperturas y clics: apagado** (Resend lo trae así). El de clics
    reescribe los enlaces, incluido el de confirmación de Supabase, y Resend
    advierte que el tracking hace que el correo transaccional parezca
    publicitario. Consecuencia: el evento `opened` al que está suscrito el
    webhook no llegará nunca, y es lo esperado.
- **Comprobación:** los dos dominios aparecen en estado *Pending*, cada uno con su
  lista de registros DNS. Esa lista es la entrada del paso 2: **copiarla tal
  cual**, sin reescribir nada de memoria.

## 2. Publicar los registros en el DNS de Vercel

El DNS de `aqualicita.com` lo sirve Vercel, así que los registros se ponen ahí,
no en ningún registrador externo.

- **Qué tocar:** Vercel → **Domains** → `aqualicita.com` → **DNS Records** →
  **Add**. Campos: Name, Type, Value, TTL (y Priority si es MX). Por CLI también
  se puede (`vercel dns add aqualicita.com <nombre> <TIPO> <valor>`), pero el
  panel muestra el sufijo y ahí está la trampa principal.
- **Regla del campo Name:** Vercel añade `.aqualicita.com` solo. Se escribe
  **únicamente lo que va delante**. Si se pega `send.cuenta.aqualicita.com`,
  Vercel crea `send.cuenta.aqualicita.com.aqualicita.com` y Resend nunca
  verifica. Es el fallo más común.

### Valor

Resend muestra **uno de dos formatos**. Copiar el que salga; no mezclarlos.

**Formato CNAME** (el que emite a las cuentas recientes). Para `cuenta`:

| Name | Type | Value (ejemplo; copiar el de Resend) | TTL |
|---|---|---|---|
| `send.cuenta` | CNAME | `send.forge.rmta.net.` | 60 |
| `rsend.cuenta` | CNAME | `rsend-use1.forge.rmta.net.` | 60 |
| `resend._domainkey.cuenta` | TXT | `p=MIGfMA0GCSq…` (clave única de este dominio) | 60 |

**Formato clásico.** Para `cuenta`:

| Name | Type | Value | TTL |
|---|---|---|---|
| `send.cuenta` | MX, prioridad 10 | `feedback-smtp.us-east-1.amazonses.com` | 60 |
| `send.cuenta` | TXT | `v=spf1 include:amazonses.com ~all` | 60 |
| `resend._domainkey.cuenta` | TXT | `p=MIGfMA0GCSq…` | 60 |

**Para `alertas`:** los mismos tres, cambiando `.cuenta` por `.alertas`. El DKIM
es distinto: cada dominio tiene su clave.

**Una sola vez, para los dos:**

| Name | Type | Value | TTL |
|---|---|---|---|
| `_dmarc` | TXT | `v=DMARC1; p=none;` | 60 |

Sin `rua=` (la dirección de informes): el dominio no tiene buzón, y un `rua`
hacia otro dominio, como Gmail, no recibe informes, porque quien los envía exige
que el dominio destino los autorice con un registro que Gmail no publica. Hay
servicios de informes con plan gratuito, pero con Resend como único remitente no
hacen falta (paso 12).

TTL 60 es el valor por defecto de Vercel: si algo sale mal, la corrección se ve
en un minuto. Se puede dejar así; con este volumen, un TTL mayor no aporta nada.

### Qué hace cada registro

Todo correo lleva dos remitentes: el **`From:`**, que ve el usuario
(`no-responder@cuenta.aqualicita.com`), y el **Return-Path** (remitente de
sobre), invisible, que es a donde vuelven los rebotes. Resend lo pone en
`send.cuenta.aqualicita.com`.

- **DKIM (`resend._domainkey`)** — el más importante. Resend firma cada correo
  con una clave privada; este TXT publica la clave pública. El receptor lee en la
  firma el dominio (`d=`) y el selector (`resend`), busca
  `resend._domainkey.<dominio>` y comprueba que la firma cuadra con las cabeceras
  y el cuerpo. Prueba que el dueño del dominio autorizó el envío y que nadie
  alteró el mensaje. Aquí `d=cuenta.aqualicita.com`, el mismo dominio del `From`:
  de esa coincidencia vive el DMARC.
- **`send`, formato clásico.** El TXT de SPF es la lista de servidores
  autorizados a enviar con ese Return-Path: el receptor comprueba que la IP que le
  entrega el correo esté en ella. El MX **no** recibe correo de personas: recibe
  los rebotes y las quejas de spam, que Resend convierte en los eventos
  `email.bounced` y `email.complained` que el webhook guarda en `envio_log`.
- **`send` y `rsend`, formato CNAME.** Hacen lo mismo, delegado: el nombre apunta
  a Resend y él publica el MX y el SPF al otro lado. Comprobado con `dig`:
  `send.forge.rmta.net` publica `MX 10 feedback.forge.rmta.net` y un SPF con las
  IP propias de Resend; `rsend-use1.forge.rmta.net` publica
  `MX 10 feedback-smtp.us-east-1.amazonses.com` y
  `v=spf1 include:amazonses.com ~all`. Son dos porque Resend envía por dos
  infraestructuras (la suya y Amazon SES). Si Resend cambia de IP, no hay que
  tocar el DNS.
- **La raíz no necesita SPF.** SPF se evalúa sobre el dominio del Return-Path,
  nunca sobre el del `From`. Que `dig TXT aqualicita.com` salga vacío no afecta.
- **DMARC (`_dmarc`)** exige que SPF o DKIM pasen **y** coincidan con el `From`
  visible (alineación), y dice qué hacer si no. Vive solo en la raíz: como
  `cuenta.aqualicita.com` no tiene `_dmarc` propio, el receptor consulta
  `_dmarc.aqualicita.com`. Aquí se pasa por las dos vías: DKIM con el dominio
  exacto del `From`, y SPF porque `send.cuenta.aqualicita.com` comparte dominio
  base con él (alineación relajada, la de por defecto).

### Precauciones

- **TXT sin comillas.** Si luego `dig` muestra `"\"p=…\""`, sobran comillas.
- **Copiar el DKIM con el botón de copiar de Resend**, no seleccionándolo con el
  ratón. Un DKIM cortado o con espacios no verifica.
- **Es `rsend`, no `resend`.** Es fácil "corregirlo" creyendo que es una errata.
- **Un CNAME no convive con otro registro del mismo nombre.** No añadir un TXT en
  `send.cuenta` "por si acaso".
- **El comodín `*` de Vercel no estorba**: un nombre explícito siempre le gana.

### Comprobación

Primero contra el servidor de Vercel, sin cachés de por medio. Si aquí no
aparece, el problema está en el registro, no en la propagación:

```bash
for n in send.cuenta rsend.cuenta send.alertas rsend.alertas; do echo "== $n"; dig +short CNAME $n.aqualicita.com @ns1.vercel-dns.com; done
```

```bash
for n in resend._domainkey.cuenta resend._domainkey.alertas _dmarc; do echo "== $n"; dig +short TXT $n.aqualicita.com @ns1.vercel-dns.com; done
```

Los CNAME devuelven `send.forge.rmta.net.` o `rsend-use1.forge.rmta.net.`; los
TXT, `"p=MIGf…"` y `"v=DMARC1; p=none;"`. Si el destino de un CNAME sale como
`send.forge.rmta.net.aqualicita.com.`, Vercel le pegó el dominio: recrearlo con
un punto final. (En formato clásico, el primer comando no devuelve nada; el
tercero es el que cuenta.)

Luego contra resolutores públicos, que es lo que ven Resend y Gmail:

```bash
for r in 1.1.1.1 8.8.8.8; do echo "== $r"; dig +short TXT resend._domainkey.cuenta.aqualicita.com @$r; dig +short TXT resend._domainkey.alertas.aqualicita.com @$r; dig +short TXT _dmarc.aqualicita.com @$r; done
```

Y siguiendo la cadena como la resuelve un receptor (debe salir el MX de rebotes
y el SPF):

```bash
for n in send.cuenta rsend.cuenta send.alertas rsend.alertas; do echo "== $n"; dig +short MX $n.aqualicita.com; dig +short TXT $n.aqualicita.com; done
```

Por último, Resend → **Domains** → **Verify DNS Records** hasta que **los dos**
queden **Verified**.

**Cuánto tarda.** Poco, porque los nameservers ya son de Vercel: el registro está
en `ns1.vercel-dns.com` en segundos, y un nombre que nadie ha preguntado se ve al
momento en los resolutores públicos. La excepción es la **caché negativa**: si
alguien consultó el nombre antes de que existiera (Resend, si se pulsó Verify
antes de tiempo, o uno mismo con `dig`), ese resolutor recuerda "no existe"
durante hasta **10 minutos** (el TTL negativo de 600 s del SOA de la zona).
Resend suele verificar en menos de 15 minutos; las "72 horas" de su
documentación son un margen genérico pensado para cambios de nameservers.
**En la práctica: crear todo, esperar 10 minutos, y entonces pulsar Verify.**

**Si no verifica**, en este orden:

| Qué se ve | Causa | Arreglo |
|---|---|---|
| El servidor de Vercel no devuelve nada | Nombre mal escrito o sufijo duplicado | `vercel dns ls aqualicita.com`: buscar nombres con `.aqualicita.com` dentro; borrar y recrear |
| Vercel responde, 1.1.1.1 / 8.8.8.8 no | Caché negativa | Esperar 10 minutos |
| El valor no coincide con el de Resend | Comillas, DKIM cortado, dominio pegado al destino del CNAME | Recrear copiando con el botón de Resend; CNAME con punto final |
| Estado `partially_verified` | Falta uno de los dos CNAME (casi siempre `rsend`) | Revisar esa fila |
| Aparece la región `eu-west-1` | Valores copiados de un tutorial | Copiar los que muestra este dominio en Resend |
| `dig` cuadra y sigue *Pending* tras 24 h | Verificación atascada | **Restart verification** en Resend; si no, soporte (incluido en el plan gratuito, por ticket) con la salida de `dig` |

## 3. Crear las claves de Resend

- **Qué tocar:** Resend → **API Keys** → **Create API Key**, dos veces.
- **Valor:**
  - `supabase-smtp` — permiso **Sending access**, dominio `cuenta.aqualicita.com`.
  - `vercel-alertas` — permiso **Sending access**, dominio `alertas.aqualicita.com`.

  Dos claves y no una: si una se filtra o hay que rotarla, se revoca sin tumbar
  el otro camino, y cada una solo puede enviar como su subdominio. Si Resend no
  ofrece todavía un dominio *Pending* en el desplegable, crear las claves en
  cuanto verifique. La clave que hay hoy en `.env.local` (creada el 2026-09-07,
  sin dominio propio) puede quedarse para desarrollo local.
- **Comprobación:** las dos aparecen en la lista con *Sending access* y su
  dominio. Guardar cada valor (`re_…`) en el momento: Resend no lo vuelve a
  mostrar.

## 4. SMTP propio en Supabase — lo que arregla el registro

- **Requisito: `cuenta.aqualicita.com` en *Verified*.** Ver "Orden".
- **Qué tocar:** Supabase, proyecto `hydrostacks` → **Authentication** →
  **Emails** → pestaña **SMTP Settings** → activar **Enable Custom SMTP**.
- **Valor:**

  | Campo | Valor |
  |---|---|
  | Sender email | `no-responder@cuenta.aqualicita.com` |
  | Sender name | `AquaLicita` |
  | Host | `smtp.resend.com` |
  | Port number | `465` (SSL/TLS implícito) |
  | Username | `resend` |
  | Password | la clave `supabase-smtp` del paso 3 |
  | Minimum interval between emails | dejar el valor por defecto |

  El remitente **tiene** que ser del dominio verificado exacto:
  `…@aqualicita.com` o `…@alertas.aqualicita.com` no sirven con esta clave y
  Resend rechaza el envío. No hace falta tocar las plantillas: la de
  confirmación por defecto (`{{ .ConfirmationURL }}`) ya respeta el
  `emailRedirectTo` que manda la app hacia `/auth/callback`.
- **No tocar la allowlist** (Authentication → URL Configuration): ya acepta la
  URL de producción con `?next=`, comprobado el 2026-09-19. Añadir la ruta exacta
  `https://aqualicita.com/auth/callback` no haría nada: el enlace siempre lleva
  `?next=` (`callbackUrl()` en `src/lib/supabase/actions.ts`) y una entrada exacta
  no coincide si la URL lleva query string.
- **Comprobación:** guarda sin error. La prueba de verdad es el paso 8.

## 5. Límite de envío de Supabase

- **Qué tocar:** Supabase → **Authentication** → **Rate Limits** → *Rate limit
  for sending emails*.
- **Valor:** según la documentación de Supabase, al activar SMTP propio el límite
  pasa a **30 por hora**. Confirmar que muestra 30. **No subirlo** mientras el
  plan de Resend sea el gratuito: 30 por hora ya puede agotar en poco más de tres
  horas el cupo diario de 100 que comparten altas y digest.
- **Comprobación:** el valor sigue ahí al recargar la página. Si sigue en 2, el
  SMTP del paso 4 no quedó activo: volver al paso 4.

## 6. Variables de entorno en Vercel — lo que arregla las alertas

- **Qué tocar:** Vercel → proyecto `aqualicita` → **Settings** → **Environment
  Variables** → *Add*. Entorno: **solo Production**.
- **Valor — solo estas dos, las únicas que faltan:**

  | Nombre | Valor | Tipo |
  |---|---|---|
  | `AUTH_RESEND_KEY` | la clave `vercel-alertas` del paso 3 | Sensitive |
  | `EMAIL_FROM` | `AquaLicita <avisos@alertas.aqualicita.com>` | normal |

  `EMAIL_FROM` también tiene que ser del dominio verificado exacto. Si no lo es,
  Resend rechaza cada envío, `run-daily.ts` captura el error por cuenta y **el
  cron responde 200 igual** (ver "Si algo falla").

- **Ya existen, no generar ni cambiar:**
  - `CRON_SECRET` y `RESEND_WEBHOOK_SECRET`: funcionan; cambiarlos solo obliga a
    tocar otros sitios.
  - `AUTH_SECRET`: firma con HMAC el enlace de baja de cada correo
    (`src/lib/email/unsubscribe-token.ts`). Cambiarlo invalida los enlaces de baja
    de los correos ya enviados.
  - `NEXT_PUBLIC_APP_URL`: está en Production y basta.
- **No añadir nada a Preview, tampoco `NEXT_PUBLIC_APP_URL`.** En los previews
  `appUrl()` usa `VERCEL_BRANCH_URL` a propósito (PR #30, `src/lib/app-url.ts`).
  Si la variable existiera en Preview ganaría ella, y con `https://aqualicita.com`
  el login de cualquier preview volvería a producción. Las claves de correo
  tampoco: un preview enviaría correos reales a cuentas reales desde una rama sin
  revisar.
- **Comprobación:**
  ```bash
  vercel env ls production
  ```
  Aparecen `AUTH_RESEND_KEY` y `EMAIL_FROM` junto a las que ya estaban.

## 7. Redeploy de producción

Una variable nueva solo entra en un deploy **nuevo**. El que está sirviendo ahora
no la ve.

- **Qué tocar:** Vercel → **Deployments** → el deploy de Production actual →
  menú `⋯` → **Redeploy**. O bien `vercel redeploy <url-del-deploy-de-produccion>`.
  **No** usar `vercel --prod`: sube el directorio de trabajo local, con lo que
  haya sin commitear. Si hay un push a `main` pendiente, ese push despliega solo y
  sirve de redeploy.
- **Valor:** —
- **Comprobación:** `vercel ls aqualicita` muestra un deploy de Production en
  `Ready` **creado después** del paso 6.

## 8. Verificar el REGISTRO (depende de 1–5)

1. En `https://aqualicita.com/registro`, darse de alta con un correo que **no**
   sea `lucesproject@gmail.com` (uno propio distinto).
   - **Bien:** redirige a `/login` con el aviso de "revisa tu correo".
   - **Mal:** el formulario muestra el error de envío (`email_delivery_failed`).
2. Resend → **Emails**: aparece el correo de confirmación, remitente
   `no-responder@cuenta.aqualicita.com`, estado *Delivered*.
3. Abrir el enlace **en el mismo navegador** donde se hizo el alta. El callback
   usa PKCE (`exchangeCodeForSession` en `app/auth/callback/route.ts`) y el
   verificador vive en una cookie de ese navegador. Abierto en otro, falla y
   muestra `oauth_error`, aunque el error parezca del correo.
   - **Bien:** entra con sesión iniciada en la página de destino.
   - En Gmail, "Mostrar original" del correo de confirmación: **SPF: PASS, DKIM:
     PASS (dominio `cuenta.aqualicita.com`), DMARC: PASS**.
4. Supabase → **Authentication** → **Users**: el usuario tiene *Confirmed at*
   relleno. Y en la base existe la fila de la app:
   ```sql
   select id, email, created_at from usuario where email = '<correo de la prueba>';
   ```
5. Las dos cuentas a medias (`qa***@gmail.com` del 2026-08-18 y
   `gi***@gmail.com` del 2026-09-03, fechas de `auth.users`) terminan el alta
   solas desde `/login` → **Reenviar verificación**, que ya está desplegado y solo
   esperaba este SMTP.

   **No borrarlas en Supabase.** `qa***` tiene fila en `usuario`, y borrar el
   usuario de Auth no la borra (no hay FK ni trigger entre `auth.users` y
   `usuario`). Si esa persona se registrara de nuevo, Supabase le daría otro id,
   `syncUsuario` intentaría insertar el mismo correo con ese id nuevo, y el
   `UNIQUE` de `usuario.email` haría fallar el alta: su `ON CONFLICT` solo cubre
   el id. `gi***` no tiene fila y se podría borrar sin ese riesgo, pero tampoco
   hace falta.

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
  - El correo llega a **Recibidos**, no a spam, desde
    `avisos@alertas.aqualicita.com`. En Gmail, "Mostrar original" debe decir
    **SPF: PASS, DKIM: PASS (dominio `alertas.aqualicita.com`), DMARC: PASS**.
  - Resend → **Webhooks** → el endpoint muestra el evento `email.delivered` con
    respuesta 200.

Este camino (`envio_log.tipo = 'on_demand'`) es repetible y no consume la reserva
del envío diario. Sí consume cupo de Resend: cada prueba es uno de los 100 del
día.

## 10. Reactivar el cron de alertas — la única pieza del repo

`vercel.json` se vació **a propósito** el 2026-09-12 (`7f4eaa9` y `0accb2c`)
para el corte de `raw_record`. El corte quedó **abandonado** el 2026-09-19: el
`TRUNCATE` nunca se ejecutó y la cuota se resolvió el 2026-09-15 con
`VACUUM FULL`. Por eso:

- **`tick` ya volvió** (PR #35, desplegado el 2026-09-19). `vercel crons ls` lo
  lista; la primera corrida es el 2026-09-20 entre 11:00 y 11:59 UTC. Ninguna de
  sus etapas envía correo.
- **`alertas` se añade solo después de que el paso 9 salga bien.** Reactivarlo
  es añadir su entrada al array de `vercel.json`, con el horario de la tabla, y
  mergear a `main`.

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
  vercel crons ls
  ```
  Aparecen `/api/cron/tick` y `/api/cron/alertas`. Vercel manda solo el
  `Authorization: Bearer $CRON_SECRET` (ya existe en Production).
- **Comprobación, el día siguiente — en la base, no en los logs.** En Hobby los
  logs de Vercel duran **1 hora**: al día siguiente la línea `[cron/alertas] done`
  ya no está. Lo que dura es la base:
  - `tick`:
    ```sql
    select source, status, finished_at from sync_log order by started_at desc limit 2;
    ```
    Dos filas de hoy en `ok` o `partial` (`partial` = llegó al tope de páginas,
    mañana continúa desde ahí).
  - `alertas` — **el 200 no basta:**
    ```sql
    select estado, count(*) from envio_log
    where fecha = current_date and tipo = 'diario' group by 1;
    ```
    Solo `enviado` y `sin_coincidencias`. Ni una fila en `error`. Si se quiere ver
    el log, hay que abrir Vercel → **Logs** entre las 12:00 y las 13:59 UTC.

## 11. Limpieza (opcional, en cualquier momento después del 9)

- **Webhook de Resend: editar el existente, no crear otro.** Resend →
  **Webhooks** → el endpoint actual → cambiar la URL de
  `https://aqualicita.vercel.app/api/webhooks/resend` a
  `https://aqualicita.com/api/webhooks/resend`. El secreto no cambia.
  **No crear un segundo webhook**: Resend genera un `whsec_` distinto por
  endpoint. Con dos, cada evento llega dos veces, y como en
  `RESEND_WEBHOOK_SECRET` solo cabe uno, los eventos del otro fallan la
  verificación de firma.
- Supabase → **Authentication** → **URL Configuration**: borrar las 4 entradas
  de ruta exacta que quedaron en la allowlist. No hacen nada: una ruta exacta
  deja de coincidir en cuanto la URL lleva query string, y `callbackUrl()`
  siempre añade `?next=`. Las que sirven son las de comodín `/**`.
- **Código, fuera de este runbook:** `PENDIENTES.md` §21 pide revertir el copy
  del home (volver a poner el paso 04 «aviso diario» en `S3Motor.jsx` y en el
  cierre) cuando las alertas entreguen de verdad. Hacerlo después del paso 9, no
  antes.

## 12. Endurecer el DMARC (semanas después del 9)

Sin `rua` no hay informes, y en este caso no hacen falta: los informes sirven
sobre todo para descubrir remitentes legítimos que uno no conocía, y **Resend es
el único que envía como `aqualicita.com`**. Basta con mirar cabeceras.

1. **Hoy:** `v=DMARC1; p=none;` (paso 2). Solo observa, no bloquea nada.
2. **Tras unas 2 semanas de envío real de los dos flujos:**
   `v=DMARC1; p=quarantine;`. Antes, abrir un correo de cada tipo en Gmail y otro
   en Outlook/Hotmail y confirmar en "Mostrar original" DKIM PASS con su
   subdominio y DMARC PASS.
3. **Tras 2–4 semanas más sin incidencias:** `v=DMARC1; p=reject;`. Si la raíz
   nunca va a enviar correo, añadir también un TXT en la raíz (Name vacío o `@`)
   con `v=spf1 -all`, que significa "desde aquí no sale correo".

- **Qué tocar:** Vercel → DNS Records → editar el TXT `_dmarc`.
- **No usar** `pct=` (Resend documenta que la mayoría de proveedores lo ignoran)
  **ni** `aspf=s`: el modo estricto rompe la alineación de SPF, porque el
  Return-Path (`send.cuenta…`) es un subdominio del `From`. DMARC seguiría
  pasando por DKIM, pero sin respaldo.
- **Único riesgo del `reject`:** si algún día otra herramienta envía como
  `@aqualicita.com` (Workspace, un CRM, un newsletter), hay que configurar su DKIM
  **antes** de su primer envío o sus correos rebotan.
- **Por qué merece la pena:** la zona tiene un comodín `*`, así que cualquier
  subdominio "existe" a ojos de un filtro. El `p=reject` de la raíz cubre todos
  los subdominios sin DMARC propio, e impide que alguien envíe como
  `pagos.aqualicita.com`.
- **Comprobación:**
  ```bash
  dig +short TXT _dmarc.aqualicita.com @ns1.vercel-dns.com
  ```

---

## Si algo falla

| Síntoma | Causa probable | Dónde mirar |
|---|---|---|
| El alta muestra el error de envío de correo | SMTP no activo, remitente fuera del dominio verificado, o cupo diario agotado | Supabase → Logs → Auth; Resend → Emails |
| Resend responde 429 `daily_quota_exceeded` | Se gastaron los 100 correos del día (el digest gasta primero) | Resend → Emails; la cuenta de `envio_log` de "Presupuesto del cupo". Se repone al día siguiente |
| El enlace del correo acaba en `/login?error=oauth_error` | Enlace abierto en otro navegador (PKCE), o destino fuera de la allowlist | Reabrir en el mismo navegador o usar **Reenviar verificación** |
| "Enviar ahora" dice `AUTH_RESEND_KEY no definida` | El deploy activo es anterior al paso 6 | Paso 7 |
| Resend responde 403 `domain is not verified` / `only send testing emails to your own email address` | El remitente no es del subdominio exacto de su clave (`cuenta.` para Supabase, `alertas.` para la app), o ese dominio no está *Verified* | Pasos 2, 4 y 6 |
| El cron de alertas da 200 pero no llega nada | Error por cuenta, capturado en `run-daily.ts` | `envio_log.estado = 'error'` (el mensaje solo está en los logs de Vercel, que en Hobby duran 1 hora) |
| Reintentar el envío diario el mismo día no hace nada | La reserva de `envio_log` de hoy bloquea el reenvío (idempotencia, a propósito) | Esperar al día siguiente. `npm run al:enviar-diario -- --repetir` fuerza el reenvío, pero **borra todas las reservas `diario` de hoy en producción y envía a todas las cuentas**: es una decisión del dueño, no un reintento, y gasta cupo |
| Un alta falla después de haber borrado a esa persona en Supabase | Fila huérfana en `usuario` con el mismo correo (paso 8.5) | `select id, email from usuario where email = '…'` |
| Cron con 401 | `CRON_SECRET` no está en Production o no coincide | `vercel env ls production` |
| El correo llega a spam | SPF/DKIM/DMARC no alineados, o tracking activado | Gmail → "Mostrar original"; `dig` del paso 2; paso 1 |

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
  no cae a `localhost`. Añadir la variable en Preview ahora sería dañino (paso 6).
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
  este runbook recomienda dos claves (paso 3), una por subdominio.
- **"Sin verificar: `drizzle/0017`":** comprobado. `drizzle.__drizzle_migrations`
  tiene 25 filas y la última es de la misma fecha que `0024` en el journal
  (2026-09-15 03:49 UTC): están aplicadas todas, `0000`–`0024`.
- **Lo que no decía:** que las alertas tampoco correrían aunque se arreglara el
  correo, porque desde el 2026-09-12 no había cron programado (paso 10).

## Lo que este runbook no arregla (anotado, fuera de alcance)

- **`syncUsuario` falla si se re-registra un correo cuyo usuario de Auth se
  borró** (paso 8.5). Su `ON CONFLICT` solo cubre el id y `usuario.email` es
  `UNIQUE`. Abierto como tarea aparte el 2026-09-19.
- **Vercel Hobby es solo para uso personal y no comercial**, según sus
  condiciones de uso razonable. El día que AquaLicita cobre (`usuario.plan =
  'pro'`), el plan gratuito de Vercel deja de valer, independientemente del
  correo.
- `run-daily.ts` responde 200 aunque fallen todos los envíos, y no se detiene al
  recibir un 429 de cupo: sigue intentando cada cuenta y las marca todas como
  `error`. Solo lo delata `summary.errores`. Hacerlo ruidoso es un cambio de
  código en la lógica de alertas.
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
