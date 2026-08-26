# Rebrand HydroStack → AquaLicita — checklist de infraestructura externa

> Fecha: 2026-08-26 · Rama: `rebrand/aqualicita`
>
> El repositorio ya está renombrado y verificado. Lo que sigue vive **fuera**
> del repo: requiere tus credenciales en Vercel, Supabase y Google Cloud.

## Contexto: por qué esto es sencillo hoy

Al momento del rebrand la base tenía 2 usuarios, 1 perfil de oferente, 2
correos en `envio_log`, 0 coincidencias y 0 preferencias de alerta — es decir,
datos de prueba propios, no un producto en uso.

Eso permitió renombrar sin puentes de compatibilidad la clave de localStorage,
el `utm_source` de los correos y el host de producción en los tests. **Esa
ventana ya se cerró**: en cuanto haya un usuario real, cada uno de esos
literales vuelve a ser un dato que vive fuera del repo y exige migración.

Por la misma razón no hace falta comprar dominio propio todavía. Basta con
renombrar el proyecto de Vercel, que es gratis e instantáneo.

## 1. Vercel — renombrar el proyecto ✅ HECHO 2026-08-26

- [x] Proyecto `hydrostacks` renombrado a `aqualicita`
      (`vercel project rename`).
- [x] `NEXT_PUBLIC_APP_URL` en **Production** = `https://aqualicita.vercel.app`.
      Tuvo que crearse como *non-sensitive*: Vercel rechaza visibilidad
      secreta en cualquier variable con prefijo `NEXT_PUBLIC`.
- [x] `.vercel/project.json` local actualizado.
- [x] Borrado el proyecto huérfano `hydrostack` (creado 212 días antes,
      último deploy 41 días antes, sin dominios y con solo las dos variables
      públicas de Supabase). La cuenta queda con un único proyecto de este
      producto.

### La URL de producción es `https://aqualicita.vercel.app` ✅

Resuelto el 2026-08-26, y con una lección que conviene no repetir.

Renombrar el proyecto **no cambia** el subdominio corto por sí solo:
`hydrostacks.vercel.app` siguió siendo la URL de producción. El error fue
intentar arreglarlo con `vercel alias set`, que crea un **alias de
despliegue** — y esos sí caen bajo
`ssoProtection.deploymentType = "all_except_custom_domains"`, así que la URL
respondía con la pantalla *"Login – Vercel"*. Eso llevó a la conclusión
equivocada de que hacía falta comprar un dominio propio.

Lo correcto es que el subdominio esté asignado **al proyecto**, no a un
deployment. `vercel domains add aqualicita.vercel.app aqualicita` respondió
`domain_already_assigned`: ya lo estaba desde el rename, y era el alias de
despliegue el que lo tapaba. Al borrarlo con `vercel alias rm`, la URL quedó
pública sirviendo la aplicación.

**Regla para la próxima vez:** para un subdominio `.vercel.app` usar
`vercel domains add <dominio> <proyecto>`, nunca `vercel alias set`. El alias
apunta a un deployment concreto y hereda la protección SSO; el dominio del
proyecto no.

Las dos URLs conviven hoy y ambas sirven la aplicación:
`aqualicita.vercel.app` (la buena) y `hydrostacks.vercel.app` (heredada). La
vieja puede retirarse cuando se quiera desde *Settings → Domains*.

**Trampa de las env vars de Vercel:** se congelan por deployment. Cambiar
`NEXT_PUBLIC_APP_URL` no surte efecto hasta el siguiente build.

## 2. Supabase — lo único que falta, y hay que hacerlo

Dashboard → *Authentication* → *URL Configuration*:

- [x] **Redirect URLs** — HECHO 2026-08-26. La lista quedó con 3 entradas:
      `http://localhost:3000/auth/callback`,
      `https://hydrostacks.vercel.app/auth/callback` y la nueva
      `https://aqualicita.vercel.app/auth/callback`. Se usó la ruta exacta,
      no el comodín `/**`, para replicar el formato que ya funcionaba. Las dos
      de producción conviven: no hay ventana con el login roto. La vieja se
      borra días después del push.
- [x] **Site URL** = `https://aqualicita.vercel.app` (2026-08-26). Alimenta
      `{{ .SiteURL }}` de las plantillas de correo de Supabase.
- [ ] Project Settings → renombrar el proyecto a `aqualicita` (cosmético;
      hoy se llama `hydrostacks`).

> **Aparte, y urgente:** el dashboard muestra **`EXCEEDING USAGE LIMITS`**
> sobre la organización `giovanny` (plan Free) el 2026-08-26. No tiene que ver
> con el rebrand, pero Supabase restringe o pausa proyectos que se pasan de
> los límites del plan gratuito — y si el proyecto de auth se pausa, nadie
> entra. Conviene revisar el uso antes que el rebrand.

> **No uses `supabase config push` para esto.** El CLI solo tiene `push`, no
> `pull`: empuja el `supabase/config.toml` local al proyecto remoto y
> sobrescribe la configuración de auth con lo que diga el archivo. Este repo
> no tiene carpeta `supabase/`, así que `supabase init` generaría un
> config.toml por defecto — con el provider de Google **deshabilitado**. El
> push apagaría el login con Google entero para arreglar dos campos.
> Estado verificado el 2026-08-26 vía `/auth/v1/settings`: `google: true`,
> `email: true`, `disable_signup: false`. Si algún día se adopta
> `config.toml`, hay que reconstruirlo a mano contra el dashboard primero.

El `redirectTo` que la app le pasa a Supabase es
`${NEXT_PUBLIC_APP_URL}/auth/callback` (`src/lib/supabase/actions.ts`), y
Supabase rechaza cualquier destino que no esté en la lista de Redirect URLs.
Si esto no se hace, el login con Google falla en cuanto el deploy nuevo esté
arriba — para ti también.

## 3. Google Cloud — NO hace falta tocar nada

El flujo es app → Supabase → Google → Supabase → app. El redirect URI
registrado en Google apunta a **Supabase**
(`https://prnipcaspjadhypsclyi.supabase.co/auth/v1/callback`), no a tu
dominio, así que renombrar el proyecto de Vercel no lo afecta. Solo habría
que tocarlo si algún día migras fuera de Supabase Auth.

## 4. GitHub

- [ ] Renombrar `Lucesdata/hydrostack_agent` → `Lucesdata/aqualicita`.
      (El sufijo `_agent` viene del producto séptico deprecado; el rebrand es
      buen momento para soltarlo.)
- [ ] `git remote set-url origin git@github.com:Lucesdata/aqualicita.git`

## 5. Dominio propio — opcional, ya no bloquea nada

El rebrand está completo sin él: la URL de producción ya lleva la marca.
Precios reales del registrador de Vercel el 2026-08-26, todos disponibles:
`.com` $11,25 (renueva igual), `.app` $9,99 (renueva $15), `.co` $29,99
(renueva $24,80), `.io` $30 (renueva $46). El `.com` es el único que no sube
al renovar.

- [ ] Verificado libre el 2026-08-26: `aqualicita.com`, `aqualicita.io`,
      `aqualicita.co`, `aqualicita.com.co`, `aqualicita.app`.
- [ ] Colisión de marca a revisar antes de comprar: **Aqualia** (FCC Aqualia)
      es una empresa de agua real con operación en Colombia y LatAm.
      `AquaLicita` es distinguible, pero conviene una búsqueda en la SIC.
- [ ] Al comprarlo: `vercel domains add <dominio>`, marcarlo como *Production
      Domain*, y volver a actualizar `NEXT_PUBLIC_APP_URL`, Supabase y Google
      Cloud — los mismos tres sitios de los pasos 1–3.

## 6. Local — no hacer

- [ ] La carpeta del proyecto se llama `hydrostack 2`. Renombrarla rompe las
      rutas de `.claude/` (worktrees, historial de sesiones) y los paths
      absolutos de `.claude/launch.json`. **No compensa.** El README ya dice
      `cd aqualicita` para un clon nuevo.

## Lo que el repo conserva a propósito

No son olvidos:

| Literal | Dónde | Por qué |
|---|---|---|
| `HydroStack` en docs fechados | ADRs, auditorías, `docs/fase-0/`, `docs/superpowers/` | Registros históricos: reescribirlos falsearía lo que se decidió entonces. Ver la nota de marca en `docs/INDEX.md`. |
| `hydrostack_dev` | `docs/fase-0/0.4-capa-normalizada.md` | Nombre de una base Postgres local real (`createdb`). |
| `HYDRO VITAL SAS` | `samples/procesos.json` | Proveedor real de SECOP. Es un dato, no la marca. |
| `Hydro_Agent` / `HydroAgent` | 68 menciones | Nombra al extractor de pliegos. Decisión de marca aparte, fuera de este rebrand. |

## Después del deploy

- [ ] Probar el login con Google en producción.
- [ ] Revisar que `/api/cron/ingest` y `/api/cron/alertas` sigan exigiendo
      `CRON_SECRET` y fallando cerrado en 401.
