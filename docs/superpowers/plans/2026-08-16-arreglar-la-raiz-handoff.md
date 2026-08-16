# Handoff — "arreglar la raíz" (2026-08-16)

> Continuación de una sesión de Cowork en la nube que quedó bloqueada por un
> problema de infraestructura (cada `git add`/`git commit` corrido a través
> del puente remoto dejaba un `.git/index.lock` que la sesión en la nube no
> podía borrar). El usuario decidió continuar esta tarea corriéndola en su
> computador (app de escritorio → selector "Run this task" → en tu
> computador) para que git funcione directo sobre el disco. Este doc es el
> resumen para que la sesión nueva no tenga que rederivar todo el
> diagnóstico.

## Diagnóstico (por qué NO se reconstruye el backend de cero)

El pedido original del usuario era "backend desde cero" (no entiende el
código, comportamiento impredecible en producción, no refleja su visión).
Antes de ejecutar eso se auditó el repo real y se encontró:

- 402-408 tests pasando, invariantes documentados (ej. D18: el veredicto de
  elegibilidad nunca se persiste), extractor de pliegos ya certificado contra
  un caso real (UAESP).
- Lo roto es infraestructura, no arquitectura:
  - **Neon (Postgres) está bloqueado** por cuota de transferencia excedida —
    causa raíz de que el sitio se sienta impredecible.
  - **`AUTH_RESEND_KEY`/`EMAIL_FROM` no están en Vercel producción** — el cron
    diario de alertas probablemente falla en silencio.
  - Ya existe un plan de migración a Supabase, parcialmente ejecutado
    (`docs/superpowers/plans/2026-08-15-migracion-supabase-modo-concierge.md`),
    parte A2 ya commiteada (`6885048`).
  - Varios planes de IA superpuestos en pocos días (showcase mode superseded
    por concierge mode) — de ahí la sensación de falta de control.

El usuario confirmó: **arreglar la raíz primero, sin borrar el backend
actual.** Ver el plan completo aprobado más abajo.

## Estado del trabajo AHORA MISMO

**Paso 1 del plan (ver abajo) — verificado pero SIN commitear:**

Ya en tu disco, listos para `git add` + `git commit` (esto es lo primero que
debe hacer la sesión nueva):

- `src/__tests__/matching/record-coincidencias.test.ts` — **archivo nuevo**,
  tests para la feature de badge de coincidencias que estaba sin cobertura.
- `src/__tests__/alertas/run-daily.test.ts` — **1 línea modificada**: el
  fixture `matches` ahora incluye `verdict: { overall: "PASS" }` (antes
  faltaba y rompía el test tras agregar `recordCoincidencias`).

Verificado en una copia del repo (mismo `package.json`/lockfile, `npm
install` limpio): **408/408 tests pasan, `npx tsc --noEmit` sin errores.**

El resto de archivos modificados/sin trackear que ya estaban ahí (feature de
badge de coincidencias completa, 4 docs de plan, `drizzle/0010_*.sql`) siguen
intactos — ver `git status --short` para la lista completa.

**Próxima acción concreta:**

```bash
git add app/layout.js app/mis-coincidencias/page.tsx src/components/Navbar.js \
  src/lib/alertas/run-daily.ts src/lib/db/schema/cuentas.ts \
  src/lib/supabase/get-session-user.ts src/lib/matching/record-coincidencias.ts \
  src/__tests__/matching/record-coincidencias.test.ts \
  src/__tests__/alertas/run-daily.test.ts \
  drizzle/0010_strong_richard_fisk.sql drizzle/meta
git commit -m "feat(matching): badge de coincidencias no vistas en el Navbar"

git add docs/superpowers/plans/2026-08-09-perfil-rup-semaforo-elegibilidad.md \
  docs/superpowers/plans/2026-08-09-rutas-intencion-sin-perfilamiento.md \
  docs/superpowers/plans/2026-08-15-migracion-supabase-modo-concierge.md \
  docs/superpowers/plans/2026-08-15-showcase-mode-licitaciones.md \
  docs/superpowers/plans/2026-08-16-arreglar-la-raiz-handoff.md
git commit -m "docs: registra planes de perfil RUP, rutas de intención, migración Supabase, showcase mode y este handoff"
```

Nota: hay una carpeta `_to_delete/` en la raíz del repo con un tar.gz de
trabajo (copia temporal usada por la sesión en la nube para correr los tests
con red) — se puede borrar sin problema, no es parte del repo.

## Plan completo aprobado (pasos 2-6 aún no empezados)

1. ~~Asegurar el trabajo suelto~~ (en progreso, ver arriba).
2. Terminar Parte A de la migración a Supabase (A1: connection string desde
   el dashboard de Supabase — requiere al usuario; A3: `db:migrate` +
   `db:seed-geografia`; A4: `db:ingest` + `db:transform`, verificar
   `/licitaciones` en dev local).
3. Reapuntar Vercel a Supabase (A5) — **toca producción, confirmar
   explícitamente con el usuario antes de cada comando de Vercel.**
4. Modo concierge en `/api/perfil` (Parte B del plan de migración) — TDD,
   sin infraestructura nueva.
5. Arreglar env vars de Resend en Vercel producción (`AUTH_RESEND_KEY`,
   `EMAIL_FROM`) — confirmar valores reales con el usuario primero.
6. Crear `STATUS.md` (fuente única de verdad: en producción / en curso /
   bloqueado) + endpoint `/api/status` protegido por `CRON_SECRET`.
7. (Futuro, fuera de alcance) Rewrite selectivo módulo por módulo si sigue
   pareciendo necesario una vez que todo lo anterior esté resuelto y visible
   — nunca un borrón completo del backend.

Detalle completo de cada paso, con comandos y archivos exactos, en
`docs/superpowers/plans/2026-08-15-migracion-supabase-modo-concierge.md`
(Partes A y B) y en el razonamiento de arriba.
