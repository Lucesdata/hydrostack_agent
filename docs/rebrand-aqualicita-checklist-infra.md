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

**El alias nuevo todavía no resuelve.** `aqualicita.vercel.app` da 404 y
`hydrostacks.vercel.app` sigue sirviendo 200 con el build viejo: Vercel asigna
los alias del proyecto al *siguiente* deployment de producción. Es decir, la
URL nueva se enciende con el `git push`, no antes. Mientras tanto no hay nada
roto.

Esa env var es el único sitio del que salen las URLs absolutas de la app:
`src/lib/email/digest.ts` (enlaces de los correos) y
`src/lib/supabase/actions.ts` (`redirectTo` del OAuth de Google). No hay
ningún host escrito a mano en el runtime.

## 2. Supabase — antes de volver a entrar

- [ ] *Authentication* → *URL Configuration* → *Site URL* y *Redirect URLs*
      al dominio nuevo.
- [ ] Project Settings → renombrar el proyecto a `aqualicita` (cosmético).

## 3. Google Cloud — credenciales OAuth

- [ ] Añadir el origen y el redirect URI nuevos a las credenciales OAuth.

**Si 2 y 3 quedan desfasados, el login con Google falla con
`redirect_uri_mismatch` y no podrás entrar ni tú.** Es lo primero que se rompe
y lo más fácil de no notar hasta que alguien lo intenta.

## 4. GitHub

- [ ] Renombrar `Lucesdata/hydrostack_agent` → `Lucesdata/aqualicita`.
      (El sufijo `_agent` viene del producto séptico deprecado; el rebrand es
      buen momento para soltarlo.)
- [ ] `git remote set-url origin git@github.com:Lucesdata/aqualicita.git`

## 5. Dominio propio — cuando haya a quién enseñárselo

No es necesario para que el rebrand quede completo.

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
