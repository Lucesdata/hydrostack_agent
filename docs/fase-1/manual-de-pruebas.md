# Fase 1 (1.1–1.5) — Resumen y manual de pruebas de A a Z

> Cubre: cuentas por correo, matching visible, correo bajo demanda, envío diario automático y control de preferencias. Todo implementado, testeado (368 tests) y verificado en vivo contra el Neon real del proyecto. También se endureció el extractor de pliegos de Fase 0 (grounding con citas) — ver §7.

---

## 1. Resumen de lo realizado

### 1.1 — Cuentas con solo correo
Login sin contraseña (magic link vía Resend) con Auth.js v5 + `@auth/drizzle-adapter`. El perfil de oferente (`OferenteProfile`), que antes vivía solo en `localStorage`, ahora se sincroniza a la tabla `oferente_perfil` cuando hay sesión — el wizard de `/licitaciones/explorar` sigue funcionando igual para anónimos.

- Tablas: `usuario`, `cuenta`, `sesion`, `token_verificacion` (contrato del adapter) + `oferente_perfil`.
- Rutas: `app/api/auth/[...nextauth]`, `GET`/`PUT /api/perfil`.
- Página: `/cuenta` (login + estado de sesión).

### 1.2 — Matching visible
`src/lib/matching/match.ts` reusa el mismo motor de veredicto Nivel 0 (`buildVerdict`) que ya corría en el detalle de un proceso, pero aplicado a una página completa de resultados.

- Página: `/mis-coincidencias` — lista los procesos abiertos del sector agua que pasan las compuertas del perfil (descarta `FAIL`, ordena PASS → WARN → UNKNOWN).

### 1.3 — Correo bajo demanda
Botón "Enviarme por correo ahora" en `/mis-coincidencias`. Envía el mismo digest que usará el cron diario, vía Resend, con headers `List-Unsubscribe` (RFC 8058) desde el primer correo.

- Tablas: `envio_log` (idempotencia/registro), `alerta_preferencias` (para el unsubscribe).
- Rutas: `POST /api/alertas/enviar-ahora`, `GET /api/alertas/unsubscribe?token=...` (HMAC, sin sesión).

### 1.4 — Envío diario automático
Cron de Vercel que recorre todas las cuentas con perfil y les manda el digest si hay coincidencias — con idempotencia real (insert-first en `envio_log`: reintentar el cron el mismo día no duplica correos) y respeto a `alerta_preferencias.activo`.

- Ruta: `GET /api/cron/alertas` (protegida por `CRON_SECRET` si está definido).
- `vercel.json`: nueva entrada `0 12 * * *` (una hora después de la ingesta).

### 1.5 — Control del correo por el usuario
Sección "Alertas por correo" en `/cuenta`: pausar/reactivar y elegir hora de envío (0–23, hora Colombia).

- Rutas: `GET`/`PUT /api/alertas/preferencias`.
- **Limitación conocida y deliberada**: `horaEnvio` se guarda pero el cron diario sigue mandando a una hora fija única para todos — pasar a un cron por hora depende de que el plan de Vercel lo soporte (riesgo ya anticipado en el roadmap). No es un bug, es un fallback documentado.

### 7 — Extractor de pliegos (Fase 0, endurecido)
`src/lib/pliego/` ahora exige grounding estricto: `NO_ENCONTRADO` obligatorio en vez de inventar, `cita_textual` por ítem/hito, bloque `verificacion` con confianza. La verificación matemática se quedó en el validador TS determinístico (`validatePliego`), no en el LLM — evita el no-determinismo de pedirle a un modelo que "recalcule" cifras.

---

## 2. Prerrequisitos antes de probar

### 2.1 Variables de entorno (`.env.local`)

Ya están documentadas en `.env.example`. Para Fase 1 necesitas mínimo:

```bash
DATABASE_URL=postgresql://...           # ya lo tienes (Neon)
AUTH_SECRET=                            # genera uno: npx auth secret
AUTH_RESEND_KEY=re_...                  # tu API key de https://resend.com/api-keys
EMAIL_FROM=alertas@tudominio.com        # dominio verificado en Resend (SPF/DKIM)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Sin `AUTH_RESEND_KEY`/`EMAIL_FROM` reales**: todo funciona salvo el envío de correo en sí — verás el error "API key is invalid" en el paso donde se manda el digest, pero el resto del flujo (sesión, matching, idempotencia, preferencias) se puede probar igual. Así los probé yo durante la implementación.

### 2.2 Migraciones

```bash
npm run db:generate   # solo si tocaste el schema; ya están generadas
npm run db:migrate    # aplica contra tu DATABASE_URL
```

### 2.3 Arrancar el servidor

```bash
npm run dev
```

---

## 3. Guía de prueba manual, paso a paso

### Paso 1 — Login (1.1)

1. Ve a `http://localhost:3000/cuenta`.
2. Escribe tu correo y pulsa "Enviarme el enlace".
   - **Con Resend real**: revisa tu bandeja, haz clic en el magic link.
   - **Sin Resend real (atajo de desarrollo)**: el envío fallará. Puedes crear una sesión directo en la base para seguir probando:
     ```bash
     npx tsx -e "
     import('./scripts/_env.js').then(async () => {
       const { randomUUID } = await import('node:crypto');
       const { eq } = await import('drizzle-orm');
       const { db } = await import('./src/lib/db/client');
       const { usuario, sesion } = await import('./src/lib/db/schema/cuentas');
       const email = 'prueba@local.test';
       await db.insert(usuario).values({ id: randomUUID(), email }).onConflictDoNothing({ target: usuario.email });
       const [u] = await db.select().from(usuario).where(eq(usuario.email, email)).limit(1);
       const token = randomUUID();
       await db.insert(sesion).values({ sessionToken: token, userId: u.id, expires: new Date(Date.now()+86400000) });
       console.log('cookie: authjs.session-token=' + token);
     });"
     ```
     Copia el valor y en la consola del navegador (F12): `document.cookie = "authjs.session-token=<token>; path=/"`, luego recarga `/cuenta`.
3. Confirma que `/cuenta` muestra tu correo y el botón "Cerrar sesión".

### Paso 2 — Perfil de oferente (prerrequisito de 1.2/1.3)

1. Con sesión activa, ve a `/licitaciones/explorar`.
2. Abre un proceso y pulsa "Cuéntanos de ti →" (o el CTA equivalente del wizard).
3. Completa las 4 preguntas (empresa/persona natural, sectores UNSPSC, cobertura, cuantía objetivo) y termina el wizard.
4. Verifica en base de datos que quedó guardado:
   ```bash
   npm run db:studio
   ```
   Busca la tabla `oferente_perfil` — debe existir una fila con tu `usuario_id`.

### Paso 3 — Mis coincidencias (1.2)

1. Ve a `/mis-coincidencias`.
2. Deberías ver: contador de procesos, y una tarjeta por cada proceso que pasa tus compuertas (con score `n/5` y link "Ver en SECOP").
3. Si dice "Sin coincidencias", es un resultado real (depende de qué haya en la tabla `proceso` en ese momento) — no un error. Prueba ampliando tus sectores UNSPSC o cuantía en el wizard para forzar coincidencias durante la prueba.

### Paso 4 — Correo bajo demanda (1.3)

1. En `/mis-coincidencias`, pulsa "Enviarme por correo ahora".
2. Resultado esperado:
   - **Con Resend real y dominio verificado**: banner "Correo enviado" + correo real en tu bandeja, con el link de unsubscribe al pie.
   - **Sin Resend real**: banner "No se pudo enviar el correo. Revisa la configuración de Resend" — es el comportamiento correcto ante una API key inválida.
3. Verifica en `db:studio` la tabla `envio_log`: debe haber una fila `tipo:'on_demand'` con `fecha` de hoy y el `estado` correspondiente.
4. Vuelve a pulsar el botón un par de veces — el `envio_log` de hoy se **actualiza** (upsert), no se duplica.

### Paso 5 — Unsubscribe (1.3)

1. Genera un token válido para tu usuario:
   ```bash
   npx tsx -e "
   import('./scripts/_env.js').then(async () => {
     const { signUnsubscribeToken } = await import('./src/lib/email/unsubscribe-token');
     console.log(signUnsubscribeToken('<tu-usuario-id-de-la-tabla-usuario>'));
   });"
   ```
2. Visita `http://localhost:3000/api/alertas/unsubscribe?token=<token>`.
3. Debe mostrar "Listo — ya no recibirás alertas...".
4. Confirma en `db:studio` que `alerta_preferencias.activo = false` para ese usuario.
5. Prueba con un token inventado — debe mostrar "Enlace de baja inválido o vencido" sin tocar la base.

### Paso 6 — Cron diario (1.4)

1. Si no tienes `CRON_SECRET` en `.env.local`, el endpoint queda abierto en dev (con warning en consola) — más fácil para probar:
   ```bash
   curl http://localhost:3000/api/cron/alertas
   ```
2. Revisa la respuesta JSON: `{ ok: true, summary: { cuentas, enviados, sinCoincidencias, saltados, errores } }`.
3. **Vuelve a llamarlo inmediatamente** (mismo día):
   ```bash
   curl http://localhost:3000/api/cron/alertas
   ```
   La segunda corrida debe mostrar tu cuenta en `saltados`, no reprocesada — esa es la idempotencia.
4. Si diste de baja tu cuenta en el Paso 5, esa cuenta debe aparecer en `saltados` también (por `activo:false`), sin siquiera intentar reservar fila en `envio_log`.
5. Si tienes `CRON_SECRET` configurado, agrega el header: `curl -H "Authorization: Bearer <tu-secreto>" http://localhost:3000/api/cron/alertas`.

### Paso 7 — Preferencias (1.5)

1. En `/cuenta`, con sesión activa, busca la sección "Alertas por correo".
2. Pulsa "Pausar"/"Reactivar" — el estado debe cambiar **al instante** en la misma pantalla (sin recargar).
3. Cambia la hora en el selector y pulsa "Guardar" — al recargar la página, la hora guardada debe seguir seleccionada.
4. Confirma en `db:studio` (`alerta_preferencias`) que `activo`/`hora_envio` coinciden con lo que ves en pantalla.

### Paso 8 (opcional) — Extractor de pliegos endurecido

```bash
npm run analyze-pliego <ruta-a-un-pliego.pdf>
```
Requiere `ANTHROPIC_API_KEY`. Revisa que cada ítem del JSON de salida traiga `cita_textual` no vacía, que los campos ausentes digan literalmente `"NO_ENCONTRADO"`, y que `_validation.inconsistencias` marque `cita_faltante` si algún ítem quedara sin cita.

---

## 4. Checklist rápido de aceptación

- [ ] Login por correo crea usuario + sesión (Paso 1)
- [ ] Perfil de oferente se guarda en DB al completar el wizard con sesión activa (Paso 2)
- [ ] `/mis-coincidencias` muestra procesos con score y link a SECOP (Paso 3)
- [ ] Botón "enviarme ahora" registra en `envio_log` y no duplica en clics repetidos (Paso 4)
- [ ] Unsubscribe válido apaga `activo`; token inválido no toca la DB (Paso 5)
- [ ] Cron diario es idempotente: segunda corrida el mismo día = `saltados` (Paso 6)
- [ ] Cuenta dada de baja se salta en el cron sin reservar fila (Paso 6)
- [ ] Pausar/reactivar y cambiar hora se reflejan de inmediato en `/cuenta` (Paso 7)

## 5. Riesgo de despliegue a vigilar (no es código)

`vercel.json` ahora tiene 2 crons (`ingest` + `alertas`). Si el proyecto está en plan **Hobby** de Vercel, confirma el límite de cantidad/frecuencia de crons al desplegar — es el mismo riesgo que ya señalaba el roadmap original.
