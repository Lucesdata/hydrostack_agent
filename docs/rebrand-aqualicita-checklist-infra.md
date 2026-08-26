# Rebrand HydroStack → AquaLicita — checklist de infraestructura externa

> Fecha: 2026-08-26 · Rama: `rebrand/aqualicita`
>
> El repositorio ya está renombrado y verificado. Lo que sigue vive **fuera**
> del repo: son acciones irreversibles, con costo o que requieren tus
> credenciales. El código funciona hoy sin ninguna de ellas — hasta que las
> hagas, las URLs reales siguen siendo las viejas, que es exactamente por qué
> el repo las conserva.

## Orden recomendado

El orden importa: renombrar el proyecto de Vercel cambia la URL de producción,
y varias cosas apuntan a ella.

### 1. Dominio — antes que nada

- [ ] Verificar disponibilidad de `aqualicita.io` (y `.com`/`.co` defensivos).
- [ ] Comprobar colisión de marca: **Aqualia** (FCC Aqualia) es una empresa
      real de agua con operación en Colombia y LatAm. `AquaLicita` es
      distinguible, pero conviene una búsqueda en la SIC antes de comprar.
- [ ] Comprar el dominio.
- [ ] `hydrostack.io` (dominio actual declarado en el README): decidir si se
      mantiene con redirección 301 a `aqualicita.io` o se deja expirar.
      **Recomendado:** redirección, al menos 12 meses.

### 2. Vercel

- [ ] Dashboard → proyecto `hydrostacks` → *Settings* → *General* → renombrar
      a `aqualicita`.
- [ ] Esto cambia la URL de deploy a `aqualicita.vercel.app`. Vercel mantiene
      un alias del nombre viejo, pero no lo trates como permanente.
- [ ] Añadir `aqualicita.io` como dominio de producción y ponerlo como
      *Production Domain*.
- [ ] Actualizar la env var `NEXT_PUBLIC_APP_URL` en **Production** al dominio
      nuevo. Es la que construye los links absolutos de los correos y el
      `redirectTo` del OAuth de Google — si queda desfasada, los enlaces de
      unsubscribe y el login con Google se rompen.
- [ ] `.vercel/project.json` local: borrar y volver a correr `vercel link`
      (el archivo está en `.gitignore`, no se commitea).

### 3. Supabase (Auth)

- [ ] Project Settings → renombrar el proyecto a `aqualicita` (cosmético).
- [ ] **Authentication → URL Configuration**: actualizar *Site URL* y las
      *Redirect URLs* al dominio nuevo. Si esto no se hace **después** del
      paso 2, el OAuth de Google falla con `redirect_uri_mismatch`.
- [ ] Google Cloud Console → credenciales OAuth → añadir el origen y el
      redirect URI nuevos.

### 4. Resend (correos de alertas)

- [ ] Verificar el dominio nuevo (SPF + DKIM) en Resend.
- [ ] Actualizar `EMAIL_FROM` en Vercel Production a `alertas@aqualicita.io`.
- [ ] Mantener el dominio viejo verificado unas semanas: los correos ya
      enviados llevan links de unsubscribe firmados contra el host anterior.
- [ ] `AUTH_SECRET` **no se cambia**: firma los tokens de unsubscribe ya
      emitidos. Rotarlo invalida los enlaces de todos los correos en circulación.

### 5. GitHub

- [ ] Renombrar el repo `Lucesdata/hydrostack_agent` → `Lucesdata/aqualicita`.
      (El nombre viejo `_agent` viene del producto séptico deprecado; el
      rebrand es buen momento para soltarlo.)
- [ ] Actualizar el remote local:
      `git remote set-url origin git@github.com:Lucesdata/aqualicita.git`
- [ ] GitHub redirige el nombre viejo, pero no lo dejes indefinidamente.

### 6. Local (opcional, cosmético)

- [ ] La carpeta del proyecto se llama `hydrostack 2`. Renombrarla rompe las
      rutas de `.claude/` (worktrees, historial de sesiones) y los paths
      absolutos de `.claude/launch.json`. **No compensa.** El README ya dice
      `cd aqualicita` para un clon nuevo.

## Lo que el repo conserva a propósito

No son olvidos. Cada uno está documentado en el sitio donde se define:

| Literal | Dónde | Por qué |
|---|---|---|
| `hydrostack_oferente_perfil` | `src/lib/state/clientStore.ts` | Clave de localStorage en el navegador del usuario. Renombrarla borra el perfil de todo oferente anónimo. Blindada por `src/__tests__/state/clientStore-keys.test.ts`. |
| `utm_source=hydrostack` | `src/lib/email/digest.ts` | Identificador de campaña. Cambiarlo parte la serie histórica de analítica. |
| `hydrostacks.vercel.app` | `src/__tests__/email/digest.test.ts` | Dominio de producción real. Actualizar **después** del paso 2. |
| `hydrostack_dev` | `docs/fase-0/0.4-capa-normalizada.md` | Nombre de una base Postgres local real (`createdb`). |
| `HYDRO VITAL SAS` | `samples/procesos.json` | Proveedor real de SECOP. Es un dato, no la marca. |
| `Hydro_Agent` / `HydroAgent` | 68 menciones | Nombra al extractor de pliegos. Decisión de marca aparte, fuera de este rebrand. |
| `HydroStack` en docs fechados | ADRs, auditorías, `docs/fase-0/`, `docs/superpowers/` | Registros históricos. Ver la nota de marca en `docs/INDEX.md`. |

## Después del deploy

- [ ] Probar el login con Google en producción (es lo primero que rompe).
- [ ] Forzar un envío del digest de alertas y comprobar que el link de
      unsubscribe resuelve.
- [ ] Revisar `/api/cron/ingest` y `/api/cron/alertas` tras el rename del
      proyecto: siguen exigiendo `CRON_SECRET` y fallan cerrado en 401.
