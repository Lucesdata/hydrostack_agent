# Correo propio + marketing con Resend y Brevo (beta de 15–20 usuarios)

**Fecha:** 2026-10-12 · **Estado:** decisiones cerradas; Fase 2 implementada en la rama `claude/aqualicita-email-automation-7veibl` (Fases 0 y 1 son configuración del dueño).
**Pedido:** correo con dominio propio, plantillas de email marketing, envío de
campañas y automatizaciones, para probar el sitio en beta con 15–20 usuarios
como máximo. **Costo objetivo: 0 USD** (solo el dominio, si no existe ya).

## 1. Decisión

Dos herramientas, cada una con un trabajo, y **casi nada de código nuevo**:

| Trabajo | Herramienta | Dónde vive |
|---|---|---|
| Correo **transaccional** (alertas diarias, confirmación de cuenta, recuperar contraseña) | **Resend** (ya integrado, `src/lib/email/send.ts`) | Código de la app |
| Correo de **marketing** (bienvenida, novedades, campañas, plantillas, automatizaciones) | **Brevo**, plan gratis | Panel de Brevo, sin código |

Con 15–20 usuarios no se construye editor de plantillas, motor de flujos ni
sincronización automática. Se descarta la opción B (todo dentro de la app) por
desproporcionada para este volumen.

## 2. Qué dice ya el código (reconocimiento)

- Resend es el único adaptador (`send.ts`); usa `AUTH_RESEND_KEY`, `EMAIL_FROM`
  y `EMAIL_REPLY_TO` opcional. Cambiar el remitente es solo configuración.
- Las alertas llevan `List-Unsubscribe` (RFC 8058) y token HMAC
  (`unsubscribe-token.ts`); la baja apaga `alerta_preferencias.activo`.
- Webhook de entregabilidad en `app/api/webhooks/resend`.
- `usuario` solo guarda `email`, `name`, `plan`. **No hay consentimiento de
  marketing** en ningún sitio (PENDIENTES §18 y §48 lo exigen antes de recoger
  correos con fines comerciales).
- PENDIENTES §0: el correo en producción **no está confirmado** (Supabase Auth
  sin SMTP propio). Esto es **prerrequisito** de todo lo demás.

## 3. Fases

### Fase 0 — Cerrar el correo base (prerrequisito, solo configuración)

Seguir `docs/runbook-correo-y-alertas.md`. Resumen:

1. Tener un dominio (p. ej. `aqualicita.com`). Es el único costo posible.
2. En Resend: añadir el dominio y publicar sus registros DNS (SPF, DKIM) y un
   **DMARC** (`v=DMARC1; p=none; rua=mailto:...` para empezar).
3. Variables en Vercel: `EMAIL_FROM="AquaLicita <alertas@aqualicita.com>"`,
   `EMAIL_REPLY_TO` a un buzón real.
4. Supabase Auth → SMTP personalizado con las credenciales SMTP de Resend, para
   que el registro y la recuperación dejen de depender del correo integrado
   (que solo entrega a miembros del equipo).
5. Probar: alta nueva, alerta diaria, baja de un clic, evento en el webhook.

Criterio de salida: un correo llega a Gmail y Outlook **a bandeja de entrada**,
con SPF/DKIM/DMARC en «pass».

Código relacionado y fuera de esta spec: falta el flujo «olvidé mi contraseña»
(PENDIENTES, 2026-10-12); es correo transaccional y debe hacerse en la Fase 0.

### Fase 1 — Brevo gratis, sin código

1. Crear cuenta en Brevo; **autenticar el mismo dominio** (DKIM propio de Brevo,
   sin tocar el de Resend: los dos conviven con selectores distintos).
2. Remitente de marketing distinto del transaccional:
   `novedades@aqualicita.com`. Así una queja de marketing no daña la reputación
   de las alertas.
3. Crear la lista **«Beta AquaLicita»** y 2–3 plantillas en el editor de Brevo:
   bienvenida, novedades del producto, aviso a la beta.
4. Cargar los contactos **a mano o por CSV**, solo de quienes dieron
   consentimiento (§4). Con 15–20 personas es más barato y más seguro que
   automatizarlo.
5. Una automatización simple en Brevo: **bienvenida** al añadir a la lista.
   Todo lo demás (goteo, reactivación) se difiere hasta que haya audiencia.

Límites del plan gratis a respetar (verificar en su página de precios): del
orden de 300 correos/día, logo de Brevo en el pie, automatizaciones avanzadas
de pago. Con 20 contactos no se llega ni al 10 %.

### Fase 2 — Consentimiento en la app (única parte con código)

Solo si se quiere que el alta de marketing nazca desde la cuenta en vez de a
mano. **Ejecutar solo cuando la beta pase de ~20 usuarios o cuando exista la
política de datos (§18).** Contenido:

- Casilla **desmarcada por defecto**, independiente de aceptar términos y de las
  alertas: «Quiero recibir novedades de AquaLicita por correo», en el registro
  y en `/cuenta`.
- Guardar el consentimiento con fecha y texto de la versión mostrada. Dos
  caminos:
  - **A (sin migración, la que pide la restricción vigente de la Supabase al
    límite):** filas en `senal_usuario` con prefijo versionado
    `consentimiento:marketing:v1:alta` / `…:baja` (mismo patrón que
    `personal:guardado:v1:`). El estado vigente es la última fila. Excluirlas de
    cualquier análisis de intención. Inconveniente: no es una tabla de
    auditoría dedicada.
  - **B (con migración, cuando se pueda aplicar):** tabla
    `consentimiento_marketing(usuario_id, estado, version_texto, creado_en)` con
    `.enableRLS()` (regla de CLAUDE.md §4).
  Recomendado: **A** ahora, B si crece.
- Exportación de contactos consentidos: un script `npm run correo:exportar-marketing`
  que escriba un CSV (`email`, `nombre`) para importarlo en Brevo. Sin API de
  Brevo, sin clave nueva en producción.
- **Baja en los dos sentidos:** el pie de Brevo lleva su propio enlace de baja
  (obligatorio); además, quien se da de baja en Brevo debe marcarse como
  «baja» en la app en la siguiente exportación (revisar la lista de bajas de
  Brevo antes de cada importación). La baja de **alertas** y la de **marketing**
  son independientes.
- Texto de `/privacy`: nombrar a Brevo como encargado del tratamiento y el fin
  (novedades), con el derecho a retirarse.

### Fase 3 — Sincronización automática (diferida)

Solo si la audiencia crece: webhook/cron que cree o actualice el contacto en la
lista de Brevo por su API al consentir, y lo retire al revocar. Requiere
`BREVO_API_KEY` y un adaptador `src/lib/email/brevo.ts` (único punto que conoce
el SDK, igual que `send.ts`). No se implementa para la beta.

## 4. Legal y buenas prácticas (obligatorio antes de enviar marketing)

- Base legal: **autorización previa, expresa e informada** (Ley 1581 de 2012).
  No se escribe a alguien por el solo hecho de tener cuenta.
- Alertas de procesos (servicio pedido por el usuario) ≠ marketing. No mezclar
  contenido promocional en el digest diario.
- Cada correo de marketing: identifica a AquaLicita, enlace de baja visible,
  dirección de contacto.
- Mientras la política de tratamiento (§18) no exista, la beta puede recibir
  marketing **solo de personas que lo aceptaron por escrito** (p. ej. respuesta
  al correo de invitación); quedan registradas fuera de la app.

## 5. Costos

| Concepto | Costo |
|---|---|
| Resend (hasta ~3.000/mes, 100/día) | 0 |
| Brevo (plan gratis) | 0 |
| Dominio propio | el único posible, si no se tiene ya |
| Código | 0 en Fases 0–1; pequeño en Fase 2 |

## 6. Riesgos

- **Entregabilidad:** dominio nuevo sin reputación. Calentar con volumen bajo;
  con 20 usuarios no es problema. DMARC en `p=none` al inicio.
- **Límite diario de Resend (100/día)** frente al digest: con 20 usuarios cabe
  de sobra; revisar al pasar de ~80.
- **Dos listas de bajas** (Resend/app y Brevo): por eso la exportación se hace
  siempre desde la app y se cruza con las bajas de Brevo antes de importar.
- **Dependencia del §0:** si el correo base no entrega, todo lo demás es
  irrelevante.

## 7. Fuera de alcance

Editor de plantillas dentro de AquaLicita, motor de automatizaciones propio,
segmentación por perfil de oferente, pruebas A/B, métricas de campaña dentro de
la app, correo masivo a usuarios sin consentimiento.

## 8. Entregables por fase

| Fase | Quién | Resultado |
|---|---|---|
| 0 | Dueño del proyecto (paneles externos) | Correo propio entregando; auth con SMTP propio |
| 1 | Dueño del proyecto (panel de Brevo) | Lista, plantillas, bienvenida; 15–20 contactos cargados |
| 2 | Código (PR aparte) | Casilla de consentimiento, registro, script de exportación, `/privacy` |
| 3 | Código, cuando haya audiencia | Sincronización por API |

## 8bis. Estado real del DNS y Vercel (verificado el 2026-10-12)

El dominio es **`aqualicita.com`** (DNS en Vercel; el `.co` de versiones previas
de esta spec era un error de escritura). La Fase 0 está avanzada:

- Resend ya tiene **dos subdominios** con MX, SPF y DKIM publicados:
  `alertas.aqualicita.com` (digest) y `cuenta.aqualicita.com` (correo de
  cuenta). Falta comprobar en el panel de Resend que ambos estén «Verified».
- `_dmarc` existe en la raíz con `v=DMARC1; p=none;` y **sin `rua`**: no llegan
  reportes. Añadirlo cuando haya un buzón que reciba.
- El proyecto Vercel `aqualicita` ya tiene `EMAIL_FROM` y `AUTH_RESEND_KEY`
  (producción). No existe `EMAIL_REPLY_TO`: falta un buzón que reciba (el dominio
  no tiene MX en la raíz).
- **Brevo: sin registros.** Recomendado autenticar un subdominio propio, p. ej.
  `novedades.aqualicita.com`, para no mezclar reputación con las alertas. Los
  registros salen del panel de Brevo; no se pueden inventar.

## 8ter. Decisión revisada (2026-10-12, tras la Fase 0): solo Resend, sin Brevo

El plan **Free de Resend** (verificado en su panel) trae 3.000 correos/mes,
100/día y 1.000 contactos, con **Broadcasts y Automations incluidos**. Para una
beta de 15–20 usuarios alcanza para transaccional y marketing juntos (digest
≤ 20 al día, correos de cuenta, un broadcast ocasional ≤ 20). Se descarta Brevo:
una herramienta, un dominio, una reputación. Consecuencias:

- Las Fases 1 y 3 pasan a Resend: plantillas en **Templates**, campañas en
  **Broadcasts**, flujos en **Automations**, lista en **Audience**. El nombre de
  esta spec conserva «Brevo» por historia.
- El remitente de marketing conviene en un subdominio propio (p. ej.
  `novedades.aqualicita.com`) para no mezclar reputación con las alertas; añadirlo
  en Resend → Domains (3 registros en Vercel).
- El tope de **100 correos/día** es compartido: revisar al pasar de ~80 usuarios
  o antes de un broadcast grande.
- `npm run correo:exportar-marketing` sigue valiendo: el CSV se importa en la
  Audience de Resend. Las bajas se cruzan con los contactos dados de baja en Resend.
- `/privacy` ya no nombra a Brevo; Resend cubre alertas, cuenta y novedades.

### Fase 0 cerrada (verificado el 2026-10-12)

`alertas.` y `cuenta.aqualicita.com` en *Verified*; SMTP de Supabase por Resend
(correos entregados); SPF/DKIM/DMARC en PASS en un correo de cuenta; webhook en
`https://aqualicita.com/api/webhooks/resend` (un solo endpoint, sin eventos aún en
la URL nueva); plantillas «Confirm sign up» y «Reset password» en español en
Supabase; clave `supabase-smtp` sin uso borrada. `novedades.aqualicita.com` en *Verified* (2 CNAME `rsend.`/`send.` + TXT DKIM
`resend._domainkey.novedades` en la zona de Vercel; MX de recepción omitido a
propósito). Pendiente: primer evento del
webhook, `EMAIL_REPLY_TO` (falta buzón), `rua` de DMARC.

## 9. Decisiones cerradas (2026-10-12)

1. El dominio es `aqualicita.com`, ya en Resend (ver 8bis); falta Brevo.
2. Consentimiento con el **camino A, sin migración**: filas `consentimiento:marketing:v1:alta|baja` en `senal_usuario`.
3. Existe `/privacy`; se le añadió el fin «novedades por correo» y Brevo como encargado.

## 10. Implementado (Fase 2)

- `src/lib/marketing/consentimiento.ts`: estado vigente = última fila (empate: baja), `registrarConsentimiento` (transacción por cuenta, sin repeticiones), `contactosConsentidos()` (solo alta vigente **y correo verificado**), `contactosACsv()` (neutraliza fórmulas).
- Casilla desmarcada en `/registro` (`signUpAction`; un fallo no rompe el alta) e interruptor en `/cuenta`. Quien entra con Google lo activa en `/cuenta`.
- `npm run correo:exportar-marketing > contactos.csv` para importar en Brevo.
- Pruebas: `src/__tests__/lib/marketing-consentimiento{,.db}.test.ts` (PGlite con las migraciones reales).
- Sin migraciones, sin dependencias, sin claves nuevas.
