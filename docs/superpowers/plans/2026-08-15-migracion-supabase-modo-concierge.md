# Migración a Supabase + Modo Concierge — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restaurar el flujo interactivo completo de HydroStack (registro → perfil de oferente → coincidencias → alertas) migrando la base de datos de Neon (bloqueado, cuota de transferencia excedida, no pagable ahora) a Supabase (gratuito, ya provisionado para Auth) — y de paso corregir el crecimiento sin techo que llevó a Neon a ese bloqueo, para que no se repita en el proveedor nuevo. Mientras la migración se completa, degradar con gracia el guardado de perfil para no perder los datos de los primeros usuarios que se registren.

**Architecture:** Las dos partes grandes (A y B) son independientes y se pueden ejecutar en paralelo u orden inverso. Dentro de la Parte A, el rediseño de `raw_record` (A2) tiene que ir antes de migrar el schema (A3), porque cambia lo que se migra.
- **Parte A (infraestructura + rediseño de datos):** el proyecto de Supabase que ya usas para Auth (`NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`) trae su propia base Postgres completa — Auth solo usa el schema `auth` dentro de ella. Las tablas de la app (`usuario`, `oferente_perfil`, `proceso`, etc.) pueden vivir en el schema `public` de esa misma base, sin crear un segundo proyecto. El código ya tiene el driver que hace falta: `DB_DRIVER=node` en `src/lib/db/client.ts` usa `pg` (TCP normal) en vez del protocolo propietario de Neon — obligatorio para hablar con Supabase. Antes de migrar el schema tal cual, `raw_record` pasa de append-only (un INSERT por cada cambio de hash, sin techo — la causa de que Neon se llenara) a UPSERT por `(source, source_record_id)`: una fila por registro, se sobrescribe al cambiar. Eso acota el tamaño al número de procesos/contratos del sector, no a cuántas veces cambian, y elimina `contrato_evento` (que consumía ese historial y hoy no tiene ningún lector — ninguna vista, API o email la usa).
- **Parte B (código, TDD):** `PUT /api/perfil` hoy no tiene try/catch alrededor de la escritura — si la base no responde, el usuario ve un error genérico y su perfil se pierde. Se envuelve esa escritura y, si falla, se le devuelve al cliente su propio perfil junto con un código de error explícito, para que la UI le ofrezca copiarlo/enviarlo por correo manualmente. Cero infraestructura nueva (no depende de Resend, que hoy no está configurado ni en local ni en producción — se verificó con `vercel env ls production`).

**Hallazgo importante de la exploración previa:** `AUTH_RESEND_KEY` y `EMAIL_FROM` **no existen en ningún environment de Vercel** (`vercel env ls production` no las lista). Esto significa que el cron diario de alertas (`runDailyAlertas` → `sendDigestEmail`) probablemente esté fallando en silencio en producción incluso antes del problema de Neon — está fuera del alcance de este plan, pero debe quedar anotado como hallazgo para revisar aparte una vez la base esté migrada.

**Decisión de arquitectura (2026-08-16, confirmada con el owner):** se descartó conservar `contrato_evento` con un job de retención — más piezas móviles para un lector que no existe hoy. Se va directo a upsert. Si en el futuro hace falta historial de cambios, se puede reconstruir agregando de nuevo un log append-only *acotado* (ej. solo los últimos N eventos por contrato), pero no antes de que alguien lo lea.

**Tech Stack:** Next.js 14 App Router, Drizzle ORM (`drizzle-orm/node-postgres`), Postgres (Supabase), Vitest.

---

## Parte A — Migrar la base a Supabase

Es sobre todo un runbook operativo (dashboard + CLI) — el código que hace posible la conexión (`DB_DRIVER=node`) ya existe y no se toca. La excepción es A2: ahí sí se modifica código (el modelo de `raw_record`), pero no se escriben tests nuevos — se corre la suite existente para confirmar que nada quedó roto tras eliminar `contrato_evento`.

### A1: Obtener el connection string de Supabase

- [ ] **Paso 1:** En el dashboard de Supabase (el mismo proyecto de `NEXT_PUBLIC_SUPABASE_URL`) → *Project Settings → Database*. Copia dos strings:
  - **Direct connection** (puerto `5432`) — se usa solo para correr migraciones localmente.
  - **Transaction pooler** (puerto `6543`, PgBouncer) — es la que va a `DATABASE_URL` real (app + Vercel), porque las funciones serverless de Vercel abren muchas conexiones cortas y el plan gratuito de Supabase tiene un límite bajo de conexiones directas concurrentes (~60).

- [ ] **Paso 2:** En `.env.local`, añade temporalmente (sin borrar el `DATABASE_URL` de Neon todavía, coméntalo):

```bash
# DB_DRIVER=node contra un Postgres normal (Supabase habla TCP estándar, no
# el protocolo WebSocket propietario de Neon) — ver src/lib/db/client.ts.
DB_DRIVER=node
DATABASE_URL="<direct connection string, puerto 5432>"
```

- [ ] **Paso 3: Verifica que conecta**

Run: `DB_DRIVER=node npx tsx -e "import('./src/lib/db/client').then(({pool}) => pool.query('select 1').then(() => { console.log('OK'); process.exit(0); }))"`
Expected: `OK`

### A2: Rediseñar `raw_record` a upsert y eliminar `contrato_evento`

Esto se hace **local, sobre el código, antes de tocar Supabase** — genera una migración nueva (`0011`) que se aplica junto con las demás en A3. No requiere conexión a ninguna base.

**Files:**
- Modify: `src/lib/db/schema/raw.ts` — agregar `uniqueIndex("raw_record_source_recid_uq").on(t.source, t.sourceRecordId)` (target del futuro `onConflictDoUpdate`)
- Modify: `src/lib/db/schema/hechos.ts:99-131` — eliminar la tabla `contratoEvento` completa (y el comment block que la documenta)
- Modify: `src/lib/transform/index.ts` — quitar `export * from "./eventWriter"` y `export * from "./events"` del barrel
- Modify: `src/lib/transform/orchestrator.ts:48,65-70,282-296` — quitar el import de `rebuildContratoEventos`/`EventMetrics`, el campo `eventos` de `TransformSummary`, y la línea `const eventos = await rebuildContratoEventos(db);` (el `return` de `runTransform` queda `{ batchId, procesos, contratos }`)
- Modify: `scripts/run-transform.ts` — quitar el import de `EventMetrics`, la función `fmtEventos`, y la línea `process.stdout.write(\`${fmtEventos(summary.eventos)}\n\n\`);`
- Modify: `scripts/run-ingest.ts` — el plan original no lo listaba; `tsc --noEmit` lo destapó: `fmtTransform` también leía `t.eventos`, quitar esa línea
- Modify: `src/lib/ingest/dbIngest.ts:100-109` (`makeDbSink`) — cambiar de "leer último hash + `insert` si cambió" a `insert(rawRecord).values(records).onConflictDoUpdate({ target: [rawRecord.source, rawRecord.sourceRecordId], set: { payload: sql\`excluded.payload\`, payloadHash: sql\`excluded.payload_hash\`, ingestedAt: sql\`excluded.ingested_at\`, sourceUpdatedAt: sql\`excluded.source_updated_at\`, batchId: sql\`excluded.batch_id\` } })`; ya no hace falta `latestHashes` como paso separado (el propio `ON CONFLICT` resuelve el dedup), pero devuelve `records.length` en vez de un conteo de "solo lo que cambió" — anotar esa pérdida de precisión en el log de `db:ingest` si se usa para métricas
- Delete: `src/lib/transform/eventWriter.ts`, `src/lib/transform/events.ts`
- Delete: `src/__tests__/transform/eventWriter.test.ts`, `src/__tests__/transform/events.test.ts`

- [x] **Paso 1: Aplica los cambios de arriba**

- [x] **Paso 2: Corre la suite completa**

Run: `npm run test`
Expected: PASS — sin los tests de `eventWriter`/`events` (borrados), el resto no debería haberse tocado. Si algo más referencia `contratoEvento`/`eventWriter`, aquí revienta.
Resultado real: 402/403 PASS. La única falla (`src/__tests__/alertas/run-daily.test.ts`) es preexistente, del feature de "coincidencias" en curso (sin relación con `raw_record`/`contrato_evento`/`eventWriter` — confirmado por grep) — no se tocó.

- [x] **Paso 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores — confirma que no quedó ninguna referencia suelta a `contratoEvento`, `EventMetrics` ni `rebuildContratoEventos`.
Resultado real: reveló un archivo que el plan no había listado — `scripts/run-ingest.ts` (`fmtTransform` leía `t.eventos`). Corregido y agregado a la lista de Files arriba. Segunda corrida: limpia.

- [x] **Paso 4: Genera la migración**

Run: `npx drizzle-kit generate`
Expected: crea `drizzle/0011_<nombre-random>.sql` con `DROP TABLE "contrato_evento"` + `CREATE UNIQUE INDEX "raw_record_source_recid_uq"` (y sus statements de FK-drop asociados si drizzle-kit los separa). Revisa el SQL generado antes de seguir — debe ser solo eso, nada de `raw_record` ni `proceso`/`contrato`.
Resultado real: `drizzle/0011_cool_echo.sql` — exactamente `DISABLE ROW LEVEL SECURITY` + `DROP TABLE "contrato_evento" CASCADE` + `CREATE UNIQUE INDEX "raw_record_source_recid_uq"`. Nada más.

- [x] **Paso 5: Commit**

```bash
git add src/lib/db/schema src/lib/transform src/lib/ingest/dbIngest.ts scripts/run-transform.ts scripts/run-ingest.ts drizzle/0011_*.sql drizzle/meta
git commit -m "refactor(raw_record): upsert por (source, source_record_id), elimina contrato_evento sin lectores"
```
Resultado real: commit `6885048`.

### A3: Migrar el schema (0000 → 0011, incluida `coincidencia`, sin `contrato_evento`)

- [ ] **Paso 1:** Con `DATABASE_URL` apuntando a la conexión **directa** (puerto 5432) y `DB_DRIVER=node`:

Run: `npm run db:migrate`
Expected: log de drizzle-kit aplicando las 12 migraciones (`0000_...` a `0011_...`) sin errores.

- [ ] **Paso 2: Confirma que las tablas quedaron**

Run: `DB_DRIVER=node npx tsx -e "import('./src/lib/db/client').then(({pool}) => pool.query(\"select tablename from pg_tables where schemaname='public'\").then(r => { console.log(r.rows.map(x=>x.tablename)); process.exit(0); }))"`
Expected: incluye `usuario`, `oferente_perfil`, `envio_log`, `coincidencia`, `alerta_preferencias`, `proceso`, `contrato`, `entidad`, `geografia`, `raw_record`. **NO** debe incluir `contrato_evento`.

- [ ] **Paso 3: Seed de geografía (las tablas `proceso` la referencian por FK)**

Run: `DB_DRIVER=node npm run db:seed-geografia`
Expected: log de filas insertadas en `geografia`, sin errores.

### A4: Re-ingestar datos SECOP directo en Supabase

No hay nada que migrar de Neon (sigue bloqueado — no se puede ni conectar para hacer `pg_dump`). Los procesos/contratos son datos públicos de SECOP: se re-descargan, no se pierden.

- [ ] **Paso 1:**

Run: `DB_DRIVER=node npm run db:ingest`
Expected: termina sin error, log de registros crudos insertados/actualizados (upsert) en `raw_record`.

- [ ] **Paso 2:**

Run: `DB_DRIVER=node npm run db:transform`
Expected: log con métricas de `procesos upsert` / `contratos upsert` > 0 (usa el mismo formato que ya viste en `scripts/run-transform.ts`, ahora sin el bloque de `eventos`).

- [ ] **Paso 3: Verifica con el dev server local**

Run: `DB_DRIVER=node npm run dev` → abre `http://localhost:3000/licitaciones`
Expected: la lista de procesos recientes carga con datos reales, `fuente` interno sería `"db"` (Supabase, no Neon).

### A5: Reapuntar Vercel a Supabase

**Esto toca configuración compartida/producción — confirmar contigo antes de ejecutar cualquier comando de esta tarea.**

- [ ] **Paso 1:** Quitar la integración Neon del proyecto en Vercel (Dashboard → proyecto `hydrostacks` → *Storage* → integración Neon → *Remove*). Esto también elimina las env vars que gestiona automáticamente (`NEON_PROJECT_ID`, `POSTGRES_*`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, etc. — confirmado con `vercel env ls production` que hoy están ahí, `created 38d ago`, vía integración de Marketplace).

- [ ] **Paso 2:** Agregar las nuevas variables (usando la conexión **pooler**, puerto 6543, para el tráfico de la app):

```bash
vercel env add DATABASE_URL production
# pega el connection string del POOLER (puerto 6543)

vercel env add DB_DRIVER production
# valor: node
```

Repite para `preview` si el equipo prueba ahí también.

- [ ] **Paso 3: Redeploy**

```bash
vercel --prod
```

- [ ] **Paso 4: Verifica en producción**

Abre la URL de producción → `/licitaciones` (datos cargan) → registra un usuario de prueba → `/perfil` (guarda sin error) → `/mis-coincidencias` (no revienta).

---

## Parte B — Modo concierge: no perder el perfil si la base falla

**Files:**
- Modify: `app/api/perfil/route.ts:42-69`
- Modify: `src/__tests__/api/perfil-route.test.ts`
- Modify: `src/components/perfil/PerfilForm.tsx`
- Modify: `.env.example`

### Task B1: `PUT /api/perfil` degrada con gracia si la escritura falla

- [ ] **Step 1: Escribe el test que falla**

Añade a `src/__tests__/api/perfil-route.test.ts`, dentro del `describe` existente, después del test `"PUT hace upsert y devuelve el perfil guardado"`:

```typescript
  it("PUT 503 + eco del perfil si la escritura falla (base inalcanzable — modo concierge)", async () => {
    mockAuth.mockResolvedValue({ id: "u1", email: "u1@example.com" });
    mockReturning.mockRejectedValue(new Error("connection refused"));
    const res = await PUT(putReq(perfil));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("DB_UNAVAILABLE");
    expect(body.perfil.id).toBe("oferente-1");
  });
```

- [ ] **Step 2: Corre el test para confirmar que falla**

Run: `npx vitest run src/__tests__/api/perfil-route.test.ts`
Expected: FAIL — hoy el `insert(...).returning()` no está en un try/catch, así que el rechazo de `mockReturning` se propaga y el `await PUT(putReq(perfil))` del test lanza la excepción en vez de devolver una `NextResponse`; vitest reporta el test como fallido con ese error, no como los `expect` que buscamos.

- [ ] **Step 3: Implementa**

En `app/api/perfil/route.ts`, reemplaza el cuerpo de `PUT` desde el insert (líneas 60-69):

```typescript
  try {
    const [row] = await db
      .insert(oferentePerfil)
      .values({ usuarioId, perfil: body })
      .onConflictDoUpdate({
        target: oferentePerfil.usuarioId,
        set: { perfil: body, actualizadoEn: new Date() },
      })
      .returning();

    return NextResponse.json({ perfil: row.perfil as OferenteProfile });
  } catch {
    // Base no alcanzable (p. ej. cuota de Neon excedida, o migración en curso
    // a Supabase) — modo concierge: devolvemos el perfil recibido (ya
    // validado arriba) para que el cliente lo ofrezca por correo en vez de
    // perderlo. No es un dato nuevo: es lo que el usuario ya envió en este
    // mismo request.
    return NextResponse.json({ error: "DB_UNAVAILABLE", perfil: body }, { status: 503 });
  }
```

- [ ] **Step 4: Corre el test para confirmar que pasa**

Run: `npx vitest run src/__tests__/api/perfil-route.test.ts`
Expected: PASS (los 6 tests existentes + el nuevo)

- [ ] **Step 5: Commit**

```bash
git add app/api/perfil/route.ts src/__tests__/api/perfil-route.test.ts
git commit -m "fix(perfil): degrada con gracia si la escritura falla, sin perder el perfil enviado"
```

### Task B2: UI — ofrecer el perfil por correo cuando el guardado falla

**Files:**
- Modify: `src/components/perfil/PerfilForm.tsx`

- [ ] **Step 1: Guarda el perfil "huérfano" en estado cuando el PUT devuelve DB_UNAVAILABLE**

En `src/components/perfil/PerfilForm.tsx`, cambia el estado `status` (línea 31) para incluir el caso nuevo:

```typescript
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error" | "concierge">("idle");
```

Reemplaza `guardar()` (líneas 35-47):

```typescript
  async function guardar() {
    setStatus("saving");
    try {
      const res = await fetch("/api/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(perfil),
      });
      if (res.ok) {
        setStatus("saved");
        return;
      }
      const body = await res.json().catch(() => null);
      setStatus(body?.error === "DB_UNAVAILABLE" ? "concierge" : "error");
    } catch {
      setStatus("error");
    }
  }

  function mailtoConcierge(): string {
    const contacto = process.env.NEXT_PUBLIC_CONCIERGE_EMAIL || "";
    const subject = `Perfil RUP — registro manual (${perfil.id})`;
    const cuerpo = [
      "No se pudo guardar automáticamente. Copio mi perfil para que lo registren manualmente:",
      "",
      JSON.stringify(perfil, null, 2),
    ].join("\n");
    return `mailto:${contacto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(cuerpo)}`;
  }
```

- [ ] **Step 2: Muestra el aviso, con mailto prellenado**

Reemplaza la línea con el mensaje de error genérico (línea 277):

```jsx
      {status === "error" && <span>Error al guardar — intenta de nuevo.</span>}
      {status === "concierge" && (
        <div className="clr-perfil-concierge" role="alert">
          <p>
            Estamos migrando de proveedor de base de datos y no pudimos guardar tu perfil
            automáticamente. Envíanoslo por correo y lo registramos nosotros mientras tanto —
            ya viene listo para copiar y pegar.
          </p>
          <a href={mailtoConcierge()}>Enviar mi perfil por correo →</a>
        </div>
      )}
```

- [ ] **Step 3: Documenta la variable de entorno**

En `.env.example`, junto al bloque de `SHOWCASE_MODE` (o donde esté el resto de config de contacto), añade:

```bash
# Modo concierge (2026-08-15): destino del mailto que PerfilForm ofrece
# cuando /api/perfil no puede escribir en la base (ver app/api/perfil/route.ts,
# error DB_UNAVAILABLE). Si queda vacío, el enlace igual funciona pero sin
# destinatario prellenado.
NEXT_PUBLIC_CONCIERGE_EMAIL=
```

Y agrégala también a Vercel:

```bash
vercel env add NEXT_PUBLIC_CONCIERGE_EMAIL production
# valor: tu correo de contacto para atender perfiles manualmente
```

- [ ] **Step 4: Verifica manualmente**

Run: `npm run dev` con `DATABASE_URL` apuntando a algo inválido (o simplemente corriendo sin `DATABASE_URL` en `.env.local`) → llena el formulario de `/perfil` → click "Guardar perfil" → confirma que aparece el aviso concierge con el link mailto, y que al hacer click se abre el cliente de correo con el JSON del perfil en el cuerpo.

- [ ] **Step 5: Commit**

```bash
git add src/components/perfil/PerfilForm.tsx .env.example
git commit -m "feat(perfil): modo concierge — ofrece el perfil por correo si el guardado falla"
```

---

## Orden sugerido de ejecución

Las dos partes no se bloquean entre sí, pero si solo hay tiempo para una ronda: **Parte B primero** (15-20 min, código autocontenido, protege a cualquiera que se registre HOY) y **Parte A después** (requiere ir al dashboard de Supabase, tocar Vercel en producción, y re-ingestar datos — más tiempo y una confirmación explícita antes del paso A5).

Una vez Parte A esté en producción, Parte B queda como red de seguridad silenciosa (nunca se activa si la base responde) — no hace falta revertirla.
