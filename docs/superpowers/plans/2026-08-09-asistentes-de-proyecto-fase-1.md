# Asistentes de proyecto (Fase 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two session-gated conversational assistants (`/asistente/ejecucion`, `/asistente/operacion`) sharing one streaming chat engine, plus a new home-page section that links to them and to a waitlist for a future third context, without touching any existing route, component, or styling.

**Architecture:** One reusable `AssistantChat` client component (Vercel AI SDK `useChat`) talks to one route handler (`POST /api/assistant`) that resolves a context from `src/lib/assistants/config.ts`, streams from Claude via `@ai-sdk/anthropic`, and persists turns to Neon/Postgres (`conversacion`/`mensaje` tables — no RLS, same app-level `usuarioId` filtering as every other table in this repo, see the note in Task 2). Contract uploads go through a small route handler that extracts text with the PDF tool already in the repo (`pdfToText`, poppler-based) and stores the original file in a private Supabase Storage bucket (`contracts`) protected by real Postgres RLS on `storage.objects`, since that table *is* queried through the user's own Supabase session and RLS applies there. Adding the future "mercado" context later is a one-entry addition to the `ASSISTANT_CONTEXTS` config object — no new files.

**Tech Stack:** Next.js 14 App Router, `ai`/`@ai-sdk/react`/`@ai-sdk/anthropic` (Vercel AI SDK v7), Drizzle ORM on Neon Postgres, Supabase Auth + Storage, Vitest.

---

## Important deviations from the literal prompt (read before executing)

1. **No Postgres RLS on `documents`/`conversations`/`messages`.** This repo's Neon database is always queried with the server's own `DATABASE_URL`, never as the end user — a Postgres RLS policy keyed on `auth.uid()` would never fire (this is already documented in `CLAUDE.md` §4 and in the header comment of `src/lib/db/schema/cuentas.ts`, which made the same call for `senal_usuario`). The isolation mechanism for the new tables is the same one every other table in this repo uses: every query is filtered by `usuarioId` in application code. RLS *is* used for the one place it actually applies — the Supabase Storage bucket, via `storage.objects` policies (Task manual steps).
2. **Reusing the existing signal table.** The prompt asks for a `user_signals` table; this repo already has `senal_usuario` (Spanish-named, added 2026-08-08 for the same "passive intent capture" purpose) with a `recordUserSignal()` helper. This plan extends that helper's union type instead of creating a parallel table.
3. **No new PDF-extraction dependency.** `src/lib/pliego/rules/pdfToText.ts` already wraps `pdftotext` (poppler) and is reused as-is for contract/reference documents. `@anthropic-ai/sdk` is also not added — the chat engine uses `@ai-sdk/anthropic` (direct Anthropic provider, keyed off `ANTHROPIC_API_KEY` exactly as the prompt specifies) through the Vercel AI SDK, which gives streaming + `useChat` for free instead of hand-rolling SSE.
4. **Auth check via middleware only**, matching the existing `/pliego` and `/cuenta` pattern — no redundant session check duplicated inside each new page beyond what's needed to load the user's own data.

If any of these four points should instead follow the prompt literally, stop before executing and say so — otherwise proceed as written.

---

## File Structure

New files:
- `src/lib/db/schema/asistentes.ts` — `documento`, `conversacion`, `mensaje`, `listaEsperaMercado` tables
- `src/lib/assistants/config.ts` — context registry (slug, título, system prompt, doc config, welcome message, signal)
- `src/lib/assistants/conversations.ts` — get-or-create conversation, load/save messages
- `src/lib/assistants/documents.ts` — upload to Supabase Storage + extract text + persist row
- `app/api/assistant/route.ts` — streaming chat route handler
- `app/api/documents/upload/route.ts` — contract/reference PDF upload route handler
- `app/api/mercado/waitlist/route.ts` — waitlist signup route handler
- `src/components/assistants/AssistantChat.tsx` — reusable chat UI
- `app/asistente/ejecucion/page.tsx`
- `app/asistente/operacion/page.tsx`
- `src/__tests__/signals/record-signal.test.ts` — extended (existing file, new case added)
- `src/__tests__/assistants/config.test.ts`
- `src/__tests__/assistants/conversations.test.ts`
- `src/__tests__/assistants/documents.test.ts`
- `src/__tests__/api/assistant-route.test.ts`
- `src/__tests__/api/documents-upload-route.test.ts`
- `src/__tests__/api/waitlist-route.test.ts`

Modified files:
- `src/lib/db/schema/index.ts` — export the new schema module
- `src/lib/signals/record-signal.ts` — extend `UserSignal` union
- `middleware.ts` — add new protected prefixes
- `app/page.js` — insert one new section (Fig. 06); nothing else changes
- `.env.example` — add `ANTHROPIC_API_KEY`
- `package.json` / `package-lock.json` — `ai` (already installed during planning research), `@ai-sdk/react`, `@ai-sdk/anthropic` (already installed during planning research too — Task 1 just confirms/documents this)

---

### Task 1: Dependencies and environment variable

**Files:**
- Modify: `package.json`, `package-lock.json`
- Modify: `.env.example`

- [ ] **Step 1: Confirm the AI SDK packages are installed**

They were installed during planning research to inspect their type definitions. Confirm:

```bash
grep -E '"ai"|@ai-sdk/react|@ai-sdk/anthropic' package.json
```

Expected: all three present (`ai@^7.0.58`, `@ai-sdk/react@^4.0.61`, `@ai-sdk/anthropic@^4.0.36` or newer patch versions). If any is missing, run:

```bash
npm install ai @ai-sdk/react @ai-sdk/anthropic
```

- [ ] **Step 2: Add `ANTHROPIC_API_KEY` to `.env.example`**

Add this block after the existing `GEMINI_API_KEY` block:

```
# Anthropic API key — REQUIRED for the project assistants (/asistente/*)
# Powers the AssistantChat engine (app/api/assistant/route.ts) via
# @ai-sdk/anthropic, model claude-sonnet-4-5. Get your key at:
# https://console.anthropic.com/settings/keys
ANTHROPIC_API_KEY=
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: add AI SDK deps and ANTHROPIC_API_KEY for project assistants"
```

---

### Task 2: DB schema — tablas de asistentes

**Files:**
- Create: `src/lib/db/schema/asistentes.ts`
- Modify: `src/lib/db/schema/index.ts`

- [ ] **Step 1: Write the schema file**

```ts
// src/lib/db/schema/asistentes.ts

/**
 * Asistentes de proyecto (Prompt 03 — Fase 1): documento subido, conversación
 * y mensajes por contexto ('ejecucion' | 'operacion', ver
 * src/lib/assistants/config.ts) + lista de espera del contexto 'mercado'
 * (aún no implementado). Sin RLS de Postgres — mismo motivo que
 * senal_usuario en cuentas.ts: este DB (Neon) se consulta siempre con el
 * DATABASE_URL de servidor, nunca como el usuario final. Aislamiento por
 * usuarioId en cada query de aplicación, como el resto del repo.
 */

import { pgTable, text, timestamp, uuid, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { usuario } from './cuentas';

/** Un documento subido por el usuario (contrato adjudicado o referencia normativa). */
export const documento = pgTable(
  'documento',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'cascade' }),
    /** 'contrato' | 'referencia' */
    tipo: text('tipo').notNull(),
    /** 'ejecucion' | 'operacion' */
    contexto: text('contexto').notNull(),
    nombreArchivo: text('nombre_archivo').notNull(),
    /** Ruta dentro del bucket privado 'contracts' de Supabase Storage. */
    rutaStorage: text('ruta_storage').notNull(),
    textoExtraido: text('texto_extraido').notNull(),
    creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('documento_usuario_contexto_idx').on(t.usuarioId, t.contexto)],
);

/**
 * Una conversación por (usuario, contexto) — el motor de chat es único pero
 * cada contexto mantiene su propio historial. `onConflictDoNothing` en
 * getOrCreateConversation (conversations.ts) se apoya en este unique.
 */
export const conversacion = pgTable(
  'conversacion',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'cascade' }),
    contexto: text('contexto').notNull(),
    creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('conversacion_usuario_contexto_uq').on(t.usuarioId, t.contexto)],
);

/** Un turno de la conversación. `contenido` guarda el UIMessage completo (parts incluidas). */
export const mensaje = pgTable(
  'mensaje',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversacionId: uuid('conversacion_id')
      .notNull()
      .references(() => conversacion.id, { onDelete: 'cascade' }),
    /** 'user' | 'assistant' | 'system' */
    rol: text('rol').notNull(),
    contenido: text('contenido').notNull(),
    creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('mensaje_conversacion_idx').on(t.conversacionId)],
);

/** Interés registrado para el contexto 'mercado' (Fase 2, aún sin implementar). */
export const listaEsperaMercado = pgTable(
  'lista_espera_mercado',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'cascade' }),
    creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('lista_espera_mercado_usuario_uq').on(t.usuarioId)],
);
```

Note: `contenido` is stored as `text` (JSON-stringified `UIMessage`), not `jsonb` — Task 6 stringifies on write and parses on read. This keeps the round-trip trivial and avoids relying on Drizzle's jsonb typing for an SDK type that isn't a plain data shape (`UIMessage` includes discriminated unions).

- [ ] **Step 2: Export it from the schema index**

In `src/lib/db/schema/index.ts`, add one line after the existing exports:

```ts
export * from './raw';
export * from './catalogos';
export * from './hechos';
export * from './control';
export * from './clasificacion';
export * from './quarantine';
export * from './cuentas';
export * from './asistentes';
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/schema/asistentes.ts src/lib/db/schema/index.ts
git commit -m "feat(db): add documento/conversacion/mensaje/lista_espera_mercado tables"
```

---

### Task 3: Generar migración

**Files:**
- Create: `drizzle/00XX_*.sql` (auto-named by drizzle-kit)

- [ ] **Step 1: Generate the migration**

```bash
npm run db:generate
```

Expected: a new file under `drizzle/` (e.g. `drizzle/0008_<random-name>.sql`) containing `CREATE TABLE "documento"`, `"conversacion"`, `"mensaje"`, `"lista_espera_mercado"` plus their indexes/foreign keys.

- [ ] **Step 2: Read the generated SQL and confirm it matches Task 2's schema**

No manual edits expected. If drizzle-kit asks interactive questions about column renames (it may, since `mensaje`/`documento` are new tables with no ambiguity — this should be a clean `CREATE TABLE` diff), answer with "create new table" for each.

- [ ] **Step 3: Commit**

```bash
git add drizzle/
git commit -m "chore(db): generate migration for asistentes tables"
```

(The migration is applied against the real Neon database with `npm run db:migrate` — see the manual steps in Task 16. Do not run `db:migrate` against production data as part of this task.)

---

### Task 4: Extender señales de usuario

**Files:**
- Modify: `src/lib/signals/record-signal.ts`
- Modify: `src/__tests__/signals/record-signal.test.ts`

- [ ] **Step 1: Extend the `UserSignal` union**

In `src/lib/signals/record-signal.ts`, change:

```ts
export type UserSignal = 'oferente' | 'estructurador' | 'comunidad';
```

to:

```ts
export type UserSignal = 'oferente' | 'estructurador' | 'comunidad' | 'ejecutor' | 'operador' | 'proveedor';
```

Nothing else in the file changes — `recordUserSignal` is already generic over the union.

- [ ] **Step 2: Add a regression case to the existing test**

In `src/__tests__/signals/record-signal.test.ts`, add a third `it` block after the existing two:

```ts
  it('accepts the Fase 1 assistant signals', async () => {
    const { recordUserSignal } = await import('@/src/lib/signals/record-signal');
    await recordUserSignal('user-123', 'ejecutor');
    expect(valuesMock).toHaveBeenCalledWith({ usuarioId: 'user-123', senal: 'ejecutor' });
  });
```

- [ ] **Step 3: Run the test**

```bash
npx vitest run src/__tests__/signals/record-signal.test.ts
```

Expected: 3 passed.

- [ ] **Step 4: Commit**

```bash
git add src/lib/signals/record-signal.ts src/__tests__/signals/record-signal.test.ts
git commit -m "feat(signals): add ejecutor/operador/proveedor signals for asistentes"
```

---

### Task 5: Configuración de contextos de asistente

**Files:**
- Create: `src/lib/assistants/config.ts`
- Create: `src/__tests__/assistants/config.test.ts`

- [ ] **Step 1: Write the config**

```ts
// src/lib/assistants/config.ts

/**
 * Registro de contextos del motor de chat único (Prompt 03 — Fase 1). Cada
 * entrada define su propio conocimiento (system prompt), qué documento
 * acepta como ancla y qué señal registra. Un tercer contexto ('mercado')
 * llegará en una fase futura — agregarlo es una entrada nueva aquí, sin
 * tocar el motor (AssistantChat, /api/assistant).
 */

import type { UserSignal } from '@/src/lib/signals/record-signal';

export type AssistantContextSlug = 'ejecucion' | 'operacion';

export interface AssistantDocumentConfig {
  tipo: 'contrato' | 'referencia';
  label: string;
  accept: string;
  maxBytes: number;
  /** Si está definido, se envía como primer turno automático tras subir el documento. */
  mensajePosSubida?: string;
}

export interface AssistantContext {
  slug: AssistantContextSlug;
  titulo: string;
  descripcion: string;
  systemPrompt: string;
  mensajeBienvenida: string;
  documento?: AssistantDocumentConfig;
  senal: UserSignal;
}

const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

export const ASSISTANT_CONTEXTS: Record<AssistantContextSlug, AssistantContext> = {
  ejecucion: {
    slug: 'ejecucion',
    titulo: 'Ejecución de contrato',
    descripcion: 'Sube tu contrato y te acompañamos en la ejecución: actas, pólizas, informes, liquidación.',
    systemPrompt:
      'Eres un experto en ejecución de contratos públicos de agua y saneamiento en Colombia ' +
      '(Ley 80 de 1993, Ley 1150 de 2007, garantías, interventoría, actas de inicio y de ' +
      'liquidación). Responde siempre con base en el texto del contrato subido por el usuario ' +
      'cuando se incluya en este prompt. Si no hay contrato incluido, invita al usuario a ' +
      'subirlo y responde de forma general sobre ejecución contractual.',
    mensajeBienvenida:
      'Sube el contrato adjudicado (PDF) y te doy un resumen con partes, objeto, valor, plazo ' +
      'y las obligaciones más críticas. Después pregúntame lo que necesites: actas, pólizas, informes, liquidación.',
    documento: {
      tipo: 'contrato',
      label: 'contrato adjudicado',
      accept: 'application/pdf',
      maxBytes: MAX_DOCUMENT_BYTES,
      mensajePosSubida:
        'Resume el contrato que acabo de subir: partes, objeto, valor, plazo y las 5 ' +
        'obligaciones o fechas más críticas detectadas.',
    },
    senal: 'ejecutor',
  },
  operacion: {
    slug: 'operacion',
    titulo: 'Operación de acueducto o ESP',
    descripcion: 'Resuelve dudas de normativa (RAS, Res. 0330, CRA, SUI) con respuestas citadas.',
    systemPrompt:
      'Eres un experto en normativa colombiana de agua y saneamiento (RAS, Resolución 0330 de ' +
      '2017, regulación CRA, reportes SUI, PSMV, IRCA). Toda afirmación normativa debe citar el ' +
      'artículo o resolución específica. Si no tienes certeza de la fuente exacta, dilo ' +
      'explícitamente en vez de adivinar y recomienda consultar la fuente oficial. Nunca ' +
      'inventes números de artículo o de resolución. Si el usuario sube un documento de ' +
      'referencia, básate en su texto cuando esté incluido en este prompt.',
    mensajeBienvenida:
      'Pregunta sobre RAS, Resolución 0330, CRA o SUI — o sube un documento de referencia para ' +
      'que lo tenga en cuenta.',
    documento: {
      tipo: 'referencia',
      label: 'documento de referencia',
      accept: 'application/pdf',
      maxBytes: MAX_DOCUMENT_BYTES,
    },
    senal: 'operador',
  },
};

export function getAssistantContext(slug: string): AssistantContext | null {
  return slug in ASSISTANT_CONTEXTS ? ASSISTANT_CONTEXTS[slug as AssistantContextSlug] : null;
}
```

- [ ] **Step 2: Write the test**

```ts
// src/__tests__/assistants/config.test.ts
import { describe, expect, it } from 'vitest';
import { ASSISTANT_CONTEXTS, getAssistantContext } from '@/src/lib/assistants/config';

describe('getAssistantContext', () => {
  it('resolves known slugs', () => {
    expect(getAssistantContext('ejecucion')?.slug).toBe('ejecucion');
    expect(getAssistantContext('operacion')?.slug).toBe('operacion');
  });

  it('returns null for unknown slugs', () => {
    expect(getAssistantContext('mercado')).toBeNull();
    expect(getAssistantContext('')).toBeNull();
  });

  it('every context has a non-empty system prompt and welcome message', () => {
    for (const context of Object.values(ASSISTANT_CONTEXTS)) {
      expect(context.systemPrompt.length).toBeGreaterThan(0);
      expect(context.mensajeBienvenida.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 3: Run the test**

```bash
npx vitest run src/__tests__/assistants/config.test.ts
```

Expected: 3 passed.

- [ ] **Step 4: Commit**

```bash
git add src/lib/assistants/config.ts src/__tests__/assistants/config.test.ts
git commit -m "feat(assistants): add context registry for ejecucion/operacion"
```

---

### Task 6: Persistencia de conversaciones

**Files:**
- Create: `src/lib/assistants/conversations.ts`
- Create: `src/__tests__/assistants/conversations.test.ts`

- [ ] **Step 1: Write the helper**

```ts
// src/lib/assistants/conversations.ts

/**
 * Persistencia del historial por (usuario, contexto). Una conversación por
 * par — el motor es único, cada contexto mantiene su propio hilo (ver
 * conversacion_usuario_contexto_uq en asistentes.ts). `mensaje.contenido`
 * guarda el UIMessage completo serializado a JSON (parts incluidas), no solo
 * el texto — se necesita para reconstruir la UI al recargar la página.
 */

import type { UIMessage } from 'ai';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/src/lib/db/client';
import { conversacion, mensaje } from '@/src/lib/db/schema/asistentes';
import type { AssistantContextSlug } from './config';

export async function getOrCreateConversation(
  usuarioId: string,
  contexto: AssistantContextSlug,
): Promise<string> {
  const existing = await db
    .select({ id: conversacion.id })
    .from(conversacion)
    .where(and(eq(conversacion.usuarioId, usuarioId), eq(conversacion.contexto, contexto)))
    .limit(1);
  if (existing[0]) return existing[0].id;

  const created = await db
    .insert(conversacion)
    .values({ usuarioId, contexto })
    .onConflictDoNothing({ target: [conversacion.usuarioId, conversacion.contexto] })
    .returning({ id: conversacion.id });
  if (created[0]) return created[0].id;

  // Carrera: otra request creó la fila entre el select y el insert.
  const row = await db
    .select({ id: conversacion.id })
    .from(conversacion)
    .where(and(eq(conversacion.usuarioId, usuarioId), eq(conversacion.contexto, contexto)))
    .limit(1);
  return row[0].id;
}

export async function loadMessages(conversacionId: string): Promise<UIMessage[]> {
  const rows = await db
    .select({ contenido: mensaje.contenido })
    .from(mensaje)
    .where(eq(mensaje.conversacionId, conversacionId))
    .orderBy(asc(mensaje.creadoEn));
  return rows.map((r) => JSON.parse(r.contenido) as UIMessage);
}

export async function saveMessages(conversacionId: string, messages: UIMessage[]): Promise<void> {
  if (messages.length === 0) return;
  await db.insert(mensaje).values(
    messages.map((m) => ({
      conversacionId,
      rol: m.role,
      contenido: JSON.stringify(m),
    })),
  );
}
```

- [ ] **Step 2: Write the test**

```ts
// src/__tests__/assistants/conversations.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

const selectMock = vi.fn();
const insertValuesMock = vi.fn();
const onConflictMock = vi.fn();
const returningMock = vi.fn();

vi.mock('@/src/lib/db/client', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: selectMock,
          orderBy: selectMock,
        }),
      }),
    }),
    insert: () => ({
      values: (v: unknown) => {
        insertValuesMock(v);
        return { onConflictDoNothing: onConflictMock };
      },
    }),
  },
}));

onConflictMock.mockReturnValue({ returning: returningMock });

describe('getOrCreateConversation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the existing conversation id without inserting', async () => {
    selectMock.mockResolvedValueOnce([{ id: 'conv-1' }]);
    const { getOrCreateConversation } = await import('@/src/lib/assistants/conversations');
    const id = await getOrCreateConversation('user-1', 'ejecucion');
    expect(id).toBe('conv-1');
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it('creates a new conversation when none exists', async () => {
    selectMock.mockResolvedValueOnce([]);
    returningMock.mockResolvedValueOnce([{ id: 'conv-2' }]);
    const { getOrCreateConversation } = await import('@/src/lib/assistants/conversations');
    const id = await getOrCreateConversation('user-1', 'operacion');
    expect(id).toBe('conv-2');
    expect(insertValuesMock).toHaveBeenCalledWith({ usuarioId: 'user-1', contexto: 'operacion' });
  });
});

describe('loadMessages', () => {
  beforeEach(() => vi.clearAllMocks());

  it('parses stored JSON content back into UIMessage objects', async () => {
    const stored = { id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hola' }] };
    selectMock.mockResolvedValueOnce([{ contenido: JSON.stringify(stored) }]);
    const { loadMessages } = await import('@/src/lib/assistants/conversations');
    const messages = await loadMessages('conv-1');
    expect(messages).toEqual([stored]);
  });
});
```

- [ ] **Step 3: Run the test**

```bash
npx vitest run src/__tests__/assistants/conversations.test.ts
```

Expected: 3 passed.

- [ ] **Step 4: Commit**

```bash
git add src/lib/assistants/conversations.ts src/__tests__/assistants/conversations.test.ts
git commit -m "feat(assistants): add conversation get-or-create and message persistence"
```

---

### Task 7: Documentos — subida y extracción

**Files:**
- Create: `src/lib/assistants/documents.ts`
- Create: `src/__tests__/assistants/documents.test.ts`

- [ ] **Step 1: Write the helper**

```ts
// src/lib/assistants/documents.ts

/**
 * Sube un documento (contrato o referencia) al bucket privado 'contracts' de
 * Supabase Storage, extrae su texto con el mismo extractor que ya usa
 * /api/pliego/extract (pdfToText.ts, poppler), y guarda la fila en
 * `documento`. El upload usa el cliente Supabase atado a la sesión del
 * usuario (createClient() de src/lib/supabase/server.ts) — las policies RLS
 * del bucket (ver Task 16, pasos manuales) filtran por auth.uid(), a
 * diferencia de las tablas de Neon donde esa comparación nunca aplicaría.
 */

import { randomUUID } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/src/lib/db/client';
import { documento } from '@/src/lib/db/schema/asistentes';
import { createClient } from '@/src/lib/supabase/server';
import { pdfToText } from '@/src/lib/pliego/rules/pdfToText';
import type { AssistantContextSlug } from './config';

const BUCKET = 'contracts';
/** Tope defensivo para no exceder la ventana de contexto del modelo con un PDF muy largo. */
const MAX_PROMPT_CHARS = 400_000;

export class DocumentUploadError extends Error {}

export interface UploadedDocument {
  id: string;
  textoExtraido: string;
}

export async function uploadDocument(params: {
  usuarioId: string;
  contexto: AssistantContextSlug;
  tipo: 'contrato' | 'referencia';
  file: Buffer;
  nombreArchivo: string;
}): Promise<UploadedDocument> {
  const { usuarioId, contexto, tipo, file, nombreArchivo } = params;

  let textoExtraido: string;
  try {
    textoExtraido = await pdfToText(file);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new DocumentUploadError(`No se pudo leer el texto del PDF: ${message}`);
  }

  const supabase = await createClient();
  const rutaStorage = `${usuarioId}/${contexto}/${randomUUID()}-${nombreArchivo}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(rutaStorage, file, { contentType: 'application/pdf' });
  if (uploadError) {
    throw new DocumentUploadError(`No se pudo guardar el archivo: ${uploadError.message}`);
  }

  const [row] = await db
    .insert(documento)
    .values({ usuarioId, contexto, tipo, nombreArchivo, rutaStorage, textoExtraido })
    .returning({ id: documento.id });

  return { id: row.id, textoExtraido };
}

interface DocumentForAssistant {
  nombreArchivo: string;
  textoExtraido: string;
}

function truncateForPrompt(doc: DocumentForAssistant): DocumentForAssistant {
  if (doc.textoExtraido.length <= MAX_PROMPT_CHARS) return doc;
  return { ...doc, textoExtraido: doc.textoExtraido.slice(0, MAX_PROMPT_CHARS) };
}

export async function getLatestDocument(
  usuarioId: string,
  contexto: AssistantContextSlug,
): Promise<DocumentForAssistant | null> {
  const rows = await db
    .select({ nombreArchivo: documento.nombreArchivo, textoExtraido: documento.textoExtraido })
    .from(documento)
    .where(and(eq(documento.usuarioId, usuarioId), eq(documento.contexto, contexto)))
    .orderBy(desc(documento.creadoEn))
    .limit(1);
  return rows[0] ? truncateForPrompt(rows[0]) : null;
}

export async function getDocumentById(
  usuarioId: string,
  documentId: string,
): Promise<DocumentForAssistant | null> {
  const rows = await db
    .select({ nombreArchivo: documento.nombreArchivo, textoExtraido: documento.textoExtraido })
    .from(documento)
    .where(and(eq(documento.usuarioId, usuarioId), eq(documento.id, documentId)))
    .limit(1);
  return rows[0] ? truncateForPrompt(rows[0]) : null;
}
```

- [ ] **Step 2: Write the test**

```ts
// src/__tests__/assistants/documents.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

const pdfToTextMock = vi.fn();
vi.mock('@/src/lib/pliego/rules/pdfToText', () => ({ pdfToText: pdfToTextMock }));

const storageUploadMock = vi.fn();
vi.mock('@/src/lib/supabase/server', () => ({
  createClient: async () => ({
    storage: { from: () => ({ upload: storageUploadMock }) },
  }),
}));

const selectMock = vi.fn();
const returningMock = vi.fn();
vi.mock('@/src/lib/db/client', () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: selectMock }), limit: selectMock }) }) }),
    insert: () => ({ values: () => ({ returning: returningMock }) }),
  },
}));

describe('uploadDocument', () => {
  beforeEach(() => vi.clearAllMocks());

  it('extracts text, uploads to storage, and persists the row', async () => {
    pdfToTextMock.mockResolvedValue('texto del contrato');
    storageUploadMock.mockResolvedValue({ error: null });
    returningMock.mockResolvedValue([{ id: 'doc-1' }]);

    const { uploadDocument } = await import('@/src/lib/assistants/documents');
    const result = await uploadDocument({
      usuarioId: 'user-1',
      contexto: 'ejecucion',
      tipo: 'contrato',
      file: Buffer.from('%PDF-1.4 fake'),
      nombreArchivo: 'contrato.pdf',
    });

    expect(result).toEqual({ id: 'doc-1', textoExtraido: 'texto del contrato' });
    expect(storageUploadMock).toHaveBeenCalled();
  });

  it('throws DocumentUploadError when storage upload fails', async () => {
    pdfToTextMock.mockResolvedValue('texto');
    storageUploadMock.mockResolvedValue({ error: { message: 'bucket lleno' } });

    const { uploadDocument, DocumentUploadError } = await import('@/src/lib/assistants/documents');
    await expect(
      uploadDocument({
        usuarioId: 'user-1',
        contexto: 'ejecucion',
        tipo: 'contrato',
        file: Buffer.from('%PDF-1.4 fake'),
        nombreArchivo: 'contrato.pdf',
      }),
    ).rejects.toThrow(DocumentUploadError);
  });

  it('throws DocumentUploadError when pdfToText fails', async () => {
    pdfToTextMock.mockRejectedValue(new Error('escaneo sin OCR'));

    const { uploadDocument, DocumentUploadError } = await import('@/src/lib/assistants/documents');
    await expect(
      uploadDocument({
        usuarioId: 'user-1',
        contexto: 'ejecucion',
        tipo: 'contrato',
        file: Buffer.from('%PDF-1.4 fake'),
        nombreArchivo: 'contrato.pdf',
      }),
    ).rejects.toThrow(DocumentUploadError);
  });
});

describe('getLatestDocument', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when the user has no documents in this context', async () => {
    selectMock.mockResolvedValue([]);
    const { getLatestDocument } = await import('@/src/lib/assistants/documents');
    expect(await getLatestDocument('user-1', 'operacion')).toBeNull();
  });

  it('returns the row when present', async () => {
    selectMock.mockResolvedValue([{ nombreArchivo: 'ref.pdf', textoExtraido: 'texto' }]);
    const { getLatestDocument } = await import('@/src/lib/assistants/documents');
    expect(await getLatestDocument('user-1', 'operacion')).toEqual({
      nombreArchivo: 'ref.pdf',
      textoExtraido: 'texto',
    });
  });
});
```

- [ ] **Step 3: Run the test**

```bash
npx vitest run src/__tests__/assistants/documents.test.ts
```

Expected: 5 passed.

- [ ] **Step 4: Commit**

```bash
git add src/lib/assistants/documents.ts src/__tests__/assistants/documents.test.ts
git commit -m "feat(assistants): add document upload/extraction and lookup helpers"
```

---

### Task 8: Ruta de waitlist de mercado

**Files:**
- Create: `app/api/mercado/waitlist/route.ts`
- Create: `src/__tests__/api/waitlist-route.test.ts`

- [ ] **Step 1: Write the route handler**

```ts
// app/api/mercado/waitlist/route.ts

/**
 * POST /api/mercado/waitlist — guarda el interés del usuario en el futuro
 * contexto 'mercado' (tarjeta 3 de Fig. 06 en la home, "Vendo o fabrico
 * soluciones"). Upsert idempotente: un clic repetido no duplica la fila
 * (lista_espera_mercado_usuario_uq).
 */

import { NextResponse } from 'next/server';
import { db } from '@/src/lib/db/client';
import { listaEsperaMercado } from '@/src/lib/db/schema/asistentes';
import { getSessionUser } from '@/src/lib/supabase/get-session-user';
import { recordUserSignal } from '@/src/lib/signals/record-signal';

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  await db
    .insert(listaEsperaMercado)
    .values({ usuarioId: user.id })
    .onConflictDoNothing({ target: listaEsperaMercado.usuarioId });

  await recordUserSignal(user.id, 'proveedor');

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Write the test**

```ts
// src/__tests__/api/waitlist-route.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockAuth = vi.fn();
vi.mock('@/src/lib/supabase/get-session-user', () => ({
  getSessionUser: () => mockAuth(),
}));

const mockRecordSignal = vi.fn();
vi.mock('@/src/lib/signals/record-signal', () => ({
  recordUserSignal: (...args: unknown[]) => mockRecordSignal(...args),
}));

const onConflictMock = vi.fn();
vi.mock('@/src/lib/db/client', () => ({
  db: {
    insert: () => ({ values: () => ({ onConflictDoNothing: onConflictMock }) }),
  },
}));

describe('POST /api/mercado/waitlist', () => {
  beforeEach(() => vi.clearAllMocks());

  it('401 sin sesión', async () => {
    mockAuth.mockResolvedValue(null);
    const { POST } = await import('@/app/api/mercado/waitlist/route');
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it('guarda el interés y registra la señal proveedor', async () => {
    mockAuth.mockResolvedValue({ id: 'user-1', email: 'a@b.com' });
    onConflictMock.mockResolvedValue(undefined);
    const { POST } = await import('@/app/api/mercado/waitlist/route');
    const res = await POST();
    expect(res.status).toBe(200);
    expect(mockRecordSignal).toHaveBeenCalledWith('user-1', 'proveedor');
  });
});
```

- [ ] **Step 3: Run the test**

```bash
npx vitest run src/__tests__/api/waitlist-route.test.ts
```

Expected: 2 passed.

- [ ] **Step 4: Commit**

```bash
git add app/api/mercado/waitlist/route.ts src/__tests__/api/waitlist-route.test.ts
git commit -m "feat(api): add mercado waitlist route"
```

---

### Task 9: Ruta del motor de chat (`/api/assistant`)

**Files:**
- Create: `app/api/assistant/route.ts`
- Create: `src/__tests__/api/assistant-route.test.ts`

- [ ] **Step 1: Write the route handler**

```ts
// app/api/assistant/route.ts

/**
 * POST /api/assistant — motor de chat único, parametrizado por `context`
 * (ver src/lib/assistants/config.ts). Recibe {context, messages, documentId?},
 * resuelve el documento ancla (el explícito o el más reciente del usuario en
 * ese contexto), lo inyecta en el system prompt cuando existe, y transmite la
 * respuesta de Claude en streaming. Persiste solo los mensajes nuevos de este
 * turno (los que el cliente aún no tenía guardados) al terminar el stream.
 */

import { NextResponse } from 'next/server';
import {
  streamText,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  type UIMessage,
} from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { getSessionUser } from '@/src/lib/supabase/get-session-user';
import { recordUserSignal } from '@/src/lib/signals/record-signal';
import { getAssistantContext } from '@/src/lib/assistants/config';
import { getOrCreateConversation, loadMessages, saveMessages } from '@/src/lib/assistants/conversations';
import { getDocumentById, getLatestDocument } from '@/src/lib/assistants/documents';

export const runtime = 'nodejs';
export const maxDuration = 120;

interface AssistantRequestBody {
  context?: string;
  messages?: UIMessage[];
  documentId?: string;
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada en el servidor.' }, { status: 500 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  let body: AssistantRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido: se espera JSON.' }, { status: 400 });
  }

  const context = body.context ? getAssistantContext(body.context) : null;
  if (!context) {
    return NextResponse.json({ error: `Contexto desconocido: ${body.context}` }, { status: 400 });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: 'Falta `messages`.' }, { status: 400 });
  }
  const clientMessages = body.messages;

  const conversationId = await getOrCreateConversation(user.id, context.slug);
  const alreadySaved = await loadMessages(conversationId);

  const document = body.documentId
    ? await getDocumentById(user.id, body.documentId)
    : await getLatestDocument(user.id, context.slug);

  const systemPrompt = document
    ? `${context.systemPrompt}\n\n--- Texto del documento subido por el usuario (${document.nombreArchivo}) ---\n${document.textoExtraido}`
    : context.systemPrompt;

  await recordUserSignal(user.id, context.senal);

  const result = streamText({
    model: anthropic('claude-sonnet-4-5'),
    system: systemPrompt,
    messages: await convertToModelMessages(clientMessages),
  });

  result.consumeStream();

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: clientMessages,
      onEnd: async ({ messages: finalMessages }) => {
        const newMessages = finalMessages.slice(alreadySaved.length);
        await saveMessages(conversationId, newMessages);
      },
    }),
  });
}
```

- [ ] **Step 2: Write the test**

This test covers the gates (auth, body validation, context validation) without exercising the real streaming call — `streamText` talks to the network and is out of scope for a unit test.

```ts
// src/__tests__/api/assistant-route.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockAuth = vi.fn();
vi.mock('@/src/lib/supabase/get-session-user', () => ({
  getSessionUser: () => mockAuth(),
}));

vi.mock('@/src/lib/signals/record-signal', () => ({
  recordUserSignal: vi.fn(),
}));

vi.mock('@/src/lib/assistants/conversations', () => ({
  getOrCreateConversation: vi.fn().mockResolvedValue('conv-1'),
  loadMessages: vi.fn().mockResolvedValue([]),
  saveMessages: vi.fn(),
}));

vi.mock('@/src/lib/assistants/documents', () => ({
  getDocumentById: vi.fn().mockResolvedValue(null),
  getLatestDocument: vi.fn().mockResolvedValue(null),
}));

vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn(() => 'mock-model'),
}));

vi.mock('ai', async () => {
  const actual = await vi.importActual<typeof import('ai')>('ai');
  return {
    ...actual,
    streamText: vi.fn(() => ({
      stream: new ReadableStream(),
      consumeStream: vi.fn(),
    })),
  };
});

const postReq = (body: unknown) =>
  new NextRequest('http://localhost/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('POST /api/assistant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  it('500 sin ANTHROPIC_API_KEY', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { POST } = await import('@/app/api/assistant/route');
    const res = await POST(postReq({ context: 'ejecucion', messages: [] }));
    expect(res.status).toBe(500);
  });

  it('401 sin sesión', async () => {
    mockAuth.mockResolvedValue(null);
    const { POST } = await import('@/app/api/assistant/route');
    const res = await POST(postReq({ context: 'ejecucion', messages: [] }));
    expect(res.status).toBe(401);
  });

  it('400 con contexto desconocido', async () => {
    mockAuth.mockResolvedValue({ id: 'user-1', email: 'a@b.com' });
    const { POST } = await import('@/app/api/assistant/route');
    const res = await POST(postReq({ context: 'inventado', messages: [{ id: '1', role: 'user', parts: [] }] }));
    expect(res.status).toBe(400);
  });

  it('400 sin messages', async () => {
    mockAuth.mockResolvedValue({ id: 'user-1', email: 'a@b.com' });
    const { POST } = await import('@/app/api/assistant/route');
    const res = await POST(postReq({ context: 'ejecucion', messages: [] }));
    expect(res.status).toBe(400);
  });

  it('200 con contexto y mensajes válidos', async () => {
    mockAuth.mockResolvedValue({ id: 'user-1', email: 'a@b.com' });
    const { POST } = await import('@/app/api/assistant/route');
    const res = await POST(
      postReq({ context: 'ejecucion', messages: [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hola' }] }] }),
    );
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 3: Run the test**

```bash
npx vitest run src/__tests__/api/assistant-route.test.ts
```

Expected: 5 passed.

- [ ] **Step 4: Commit**

```bash
git add app/api/assistant/route.ts src/__tests__/api/assistant-route.test.ts
git commit -m "feat(api): add streaming assistant chat route handler"
```

---

### Task 10: Ruta de subida de documentos

**Files:**
- Create: `app/api/documents/upload/route.ts`
- Create: `src/__tests__/api/documents-upload-route.test.ts`

- [ ] **Step 1: Write the route handler**

```ts
// app/api/documents/upload/route.ts

/**
 * POST /api/documents/upload — sube un PDF (contrato o referencia, según el
 * `context`) para uno de los asistentes. Mismo gate tipo MIME + magic bytes
 * + tope de tamaño que /api/pliego/extract, antes de gastar tiempo en
 * extracción y subida a Storage.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/src/lib/supabase/get-session-user';
import { uploadDocument, DocumentUploadError } from '@/src/lib/assistants/documents';
import { getAssistantContext } from '@/src/lib/assistants/config';

export const runtime = 'nodejs';
export const maxDuration = 120;

const MAX_BYTES = 20 * 1024 * 1024;
const PDF_MAGIC = '%PDF-';

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Body inválido: se espera multipart/form-data.' }, { status: 400 });
  }

  const contextSlug = formData.get('context');
  const context = typeof contextSlug === 'string' ? getAssistantContext(contextSlug) : null;
  if (!context) {
    return NextResponse.json({ error: 'Falta `context` o es inválido.' }, { status: 400 });
  }
  if (!context.documento) {
    return NextResponse.json({ error: `El contexto ${contextSlug} no acepta documentos.` }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Falta el archivo `file`.' }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'El archivo está vacío.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `El archivo supera el máximo de ${MAX_BYTES / (1024 * 1024)}MB.` },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const looksLikePdf = buffer.subarray(0, PDF_MAGIC.length).toString('ascii') === PDF_MAGIC;
  if (!looksLikePdf) {
    return NextResponse.json({ error: 'El archivo no es un PDF válido (no empieza con %PDF-).' }, { status: 400 });
  }

  const nombreArchivo = file instanceof File ? file.name : 'documento.pdf';

  try {
    const { id, textoExtraido } = await uploadDocument({
      usuarioId: user.id,
      contexto: context.slug,
      tipo: context.documento.tipo,
      file: buffer,
      nombreArchivo,
    });
    return NextResponse.json({ documentId: id, preview: textoExtraido.slice(0, 500) });
  } catch (e) {
    const message = e instanceof DocumentUploadError ? e.message : 'No se pudo procesar el documento.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
```

- [ ] **Step 2: Write the test**

```ts
// src/__tests__/api/documents-upload-route.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockAuth = vi.fn();
vi.mock('@/src/lib/supabase/get-session-user', () => ({
  getSessionUser: () => mockAuth(),
}));

const mockUpload = vi.fn();
vi.mock('@/src/lib/assistants/documents', async () => {
  const actual = await vi.importActual<typeof import('@/src/lib/assistants/documents')>(
    '@/src/lib/assistants/documents',
  );
  return { ...actual, uploadDocument: (...args: unknown[]) => mockUpload(...args) };
});

function pdfRequest(opts: { context?: string; fileContent?: string; fileName?: string }) {
  const formData = new FormData();
  if (opts.context !== undefined) formData.append('context', opts.context);
  if (opts.fileContent !== undefined) {
    formData.append('file', new File([opts.fileContent], opts.fileName ?? 'doc.pdf', { type: 'application/pdf' }));
  }
  return new NextRequest('http://localhost/api/documents/upload', { method: 'POST', body: formData });
}

describe('POST /api/documents/upload', () => {
  beforeEach(() => vi.clearAllMocks());

  it('401 sin sesión', async () => {
    mockAuth.mockResolvedValue(null);
    const { POST } = await import('@/app/api/documents/upload/route');
    const res = await POST(pdfRequest({ context: 'ejecucion', fileContent: '%PDF-1.4 x' }));
    expect(res.status).toBe(401);
  });

  it('400 con context inválido', async () => {
    mockAuth.mockResolvedValue({ id: 'user-1', email: 'a@b.com' });
    const { POST } = await import('@/app/api/documents/upload/route');
    const res = await POST(pdfRequest({ context: 'inventado', fileContent: '%PDF-1.4 x' }));
    expect(res.status).toBe(400);
  });

  it('400 sin archivo', async () => {
    mockAuth.mockResolvedValue({ id: 'user-1', email: 'a@b.com' });
    const { POST } = await import('@/app/api/documents/upload/route');
    const res = await POST(pdfRequest({ context: 'ejecucion' }));
    expect(res.status).toBe(400);
  });

  it('400 cuando el archivo no empieza con %PDF-', async () => {
    mockAuth.mockResolvedValue({ id: 'user-1', email: 'a@b.com' });
    const { POST } = await import('@/app/api/documents/upload/route');
    const res = await POST(pdfRequest({ context: 'ejecucion', fileContent: 'no es un pdf' }));
    expect(res.status).toBe(400);
  });

  it('200 y devuelve documentId con un PDF válido', async () => {
    mockAuth.mockResolvedValue({ id: 'user-1', email: 'a@b.com' });
    mockUpload.mockResolvedValue({ id: 'doc-1', textoExtraido: 'texto extraído' });
    const { POST } = await import('@/app/api/documents/upload/route');
    const res = await POST(pdfRequest({ context: 'ejecucion', fileContent: '%PDF-1.4 contenido' }));
    expect(res.status).toBe(200);
    expect((await res.json()).documentId).toBe('doc-1');
  });
});
```

- [ ] **Step 3: Run the test**

```bash
npx vitest run src/__tests__/api/documents-upload-route.test.ts
```

Expected: 5 passed.

- [ ] **Step 4: Commit**

```bash
git add app/api/documents/upload/route.ts src/__tests__/api/documents-upload-route.test.ts
git commit -m "feat(api): add document upload route for asistentes"
```

---

### Task 11: Middleware — proteger rutas nuevas

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Add the new prefixes**

In `middleware.ts`, change:

```ts
const PROTECTED_PREFIXES = ['/pliego', '/api/pliego', '/cuenta'];
```

to:

```ts
const PROTECTED_PREFIXES = [
  '/pliego',
  '/api/pliego',
  '/cuenta',
  '/asistente',
  '/api/assistant',
  '/api/documents',
  '/api/mercado/waitlist',
];
```

Update the comment above it (currently describes only `/pliego` and `/cuenta`):

```ts
/**
 * Refresca la sesión de Supabase en cada request y protege las rutas que
 * requieren cuenta: /pliego (análisis de pliegos), /cuenta (preferencias de
 * alerta), /asistente/* (asistentes de proyecto, Prompt 03) y sus rutas de
 * API (/api/assistant, /api/documents, /api/mercado/waitlist). El resto del
 * gating (evaluación de elegibilidad, embebida en /licitaciones) no es una
 * ruta dedicada — se protege en el componente que dispara el flujo, ver
 * ProcessDetail/OferenteWizard.
 */
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat(auth): protect /asistente routes and their API endpoints"
```

---

### Task 12: Componente `AssistantChat`

**Files:**
- Create: `src/components/assistants/AssistantChat.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/assistants/AssistantChat.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import type { AssistantContextSlug, AssistantDocumentConfig } from '@/src/lib/assistants/config';

interface AssistantChatProps {
  contextSlug: AssistantContextSlug;
  titulo: string;
  mensajeBienvenida: string;
  documentoConfig?: AssistantDocumentConfig;
  initialMessages: UIMessage[];
}

type UploadStatus = 'idle' | 'uploading' | 'error';

export default function AssistantChat({
  contextSlug,
  titulo,
  mensajeBienvenida,
  documentoConfig,
  initialMessages,
}: AssistantChatProps) {
  const [input, setInput] = useState('');
  const [documentId, setDocumentId] = useState<string | undefined>(undefined);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/assistant',
      body: () => ({ context: contextSlug, documentId }),
    }),
  });

  const isBusy = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleUpload(file: File) {
    if (!documentoConfig) return;
    setUploadStatus('uploading');
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('context', contextSlug);
      const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
      const responseBody = await res.json();
      if (!res.ok) {
        setUploadError(responseBody.error || `Error ${res.status}`);
        setUploadStatus('error');
        return;
      }
      setDocumentId(responseBody.documentId);
      setDocumentName(file.name);
      setUploadStatus('idle');
      if (documentoConfig.mensajePosSubida) {
        sendMessage({ text: documentoConfig.mensajePosSubida });
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e));
      setUploadStatus('error');
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isBusy) return;
    sendMessage({ text: input });
    setInput('');
  }

  return (
    <div className="asc-wrap">
      <header className="asc-header">
        <span className="asc-tag">[ {titulo} ]</span>
        {documentoConfig && (
          <label className="asc-upload">
            <input
              type="file"
              accept={documentoConfig.accept}
              disabled={uploadStatus === 'uploading'}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = '';
              }}
            />
            <span>
              {uploadStatus === 'uploading'
                ? 'Subiendo…'
                : documentName
                  ? `Documento: ${documentName}`
                  : `[ Subir ${documentoConfig.label} ]`}
            </span>
          </label>
        )}
      </header>

      {uploadError && <div className="asc-error">{uploadError}</div>}

      <div className="asc-messages">
        {messages.length === 0 && <div className="asc-welcome">{mensajeBienvenida}</div>}
        {messages.map((m) => (
          <div key={m.id} className={`asc-bubble asc-bubble-${m.role}`}>
            <span className="asc-role">{m.role === 'user' ? 'TÚ' : 'ASISTENTE'}</span>
            <div className="asc-text">
              {m.parts.map((part, i) => (part.type === 'text' ? <span key={`${m.id}-${i}`}>{part.text}</span> : null))}
            </div>
          </div>
        ))}
        {isBusy && <div className="asc-bubble asc-bubble-assistant asc-pending">[ ... ]</div>}
        {error && <div className="asc-error">{error.message}</div>}
        <div ref={bottomRef} />
      </div>

      <form className="asc-input-row" onSubmit={handleSubmit}>
        <input
          className="asc-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta…"
          disabled={isBusy}
        />
        <button className="asc-send" type="submit" disabled={isBusy || !input.trim()}>
          [ Enviar ]
        </button>
      </form>

      <style jsx>{`
        .asc-wrap {
          display: flex;
          flex-direction: column;
          height: 70vh;
          max-height: 720px;
          border: 1px solid var(--line, #dadad2);
          background: var(--surface, #fff);
          border-radius: var(--radius-lg, 14px);
          overflow: hidden;
        }
        .asc-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px dashed var(--line, #dadad2);
        }
        .asc-tag {
          font: 600 11px var(--font-mono, monospace);
          letter-spacing: 0.06em;
          color: var(--accent, #0369a1);
          text-transform: uppercase;
        }
        .asc-upload {
          cursor: pointer;
          font: 600 11px var(--font-mono, monospace);
          color: var(--ink-600, #525b5a);
        }
        .asc-upload input {
          display: none;
        }
        .asc-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .asc-welcome {
          font-size: 13px;
          color: var(--ink-300, #6b746f);
          font-family: var(--font-mono, monospace);
        }
        .asc-bubble {
          max-width: 80%;
          padding: 10px 14px;
          border: 1px solid var(--line, #dadad2);
          border-radius: 4px;
        }
        .asc-bubble-user {
          align-self: flex-end;
          background: var(--ink-900, #0a1f1c);
          color: #fff;
          border-color: var(--ink-900, #0a1f1c);
        }
        .asc-bubble-assistant {
          align-self: flex-start;
          background: var(--surface-alt, #f7f7f2);
        }
        .asc-role {
          display: block;
          font: 700 9px var(--font-mono, monospace);
          letter-spacing: 0.08em;
          opacity: 0.6;
          margin-bottom: 4px;
        }
        .asc-text {
          font-size: 13.5px;
          line-height: 1.55;
          white-space: pre-wrap;
        }
        .asc-pending {
          font-family: var(--font-mono, monospace);
          color: var(--ink-300, #6b746f);
        }
        .asc-error {
          margin: 0 16px;
          padding: 10px 12px;
          border: 1px solid var(--danger, #dc2626);
          color: var(--danger, #dc2626);
          font-size: 12.5px;
          border-radius: 6px;
        }
        .asc-input-row {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          border-top: 1px dashed var(--line, #dadad2);
        }
        .asc-input {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid var(--line, #dadad2);
          border-radius: 8px;
          font-size: 13.5px;
          font-family: var(--font-sans);
        }
        .asc-send {
          font: 600 12px var(--font-mono, monospace);
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          background: var(--accent, #0369a1);
          color: #fff;
          cursor: pointer;
        }
        .asc-send:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/assistants/AssistantChat.tsx
git commit -m "feat(assistants): add reusable AssistantChat component"
```

---

### Task 13: Página `/asistente/ejecucion`

**Files:**
- Create: `app/asistente/ejecucion/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
// app/asistente/ejecucion/page.tsx

/**
 * /asistente/ejecucion — protegida por middleware.ts (PROTECTED_PREFIXES).
 * Server Component: carga el historial existente (o crea la conversación
 * vacía) y se lo pasa a AssistantChat como estado inicial.
 */

import { getSessionUser } from '@/src/lib/supabase/get-session-user';
import { ASSISTANT_CONTEXTS } from '@/src/lib/assistants/config';
import { getOrCreateConversation, loadMessages } from '@/src/lib/assistants/conversations';
import AssistantChat from '@/src/components/assistants/AssistantChat';

export const metadata = {
  title: 'Ejecución de contrato — HydroStack',
  description: 'Sube tu contrato y te acompañamos en la ejecución: actas, pólizas, informes, liquidación.',
};

export default async function AsistenteEjecucionPage() {
  const user = await getSessionUser();
  if (!user) return null; // el middleware ya redirige a /login antes de llegar aquí

  const context = ASSISTANT_CONTEXTS.ejecucion;
  const conversationId = await getOrCreateConversation(user.id, context.slug);
  const initialMessages = await loadMessages(conversationId);

  return (
    <div className="clr-page">
      <div className="clr-container" style={{ maxWidth: 780 }}>
        <header style={{ marginBottom: 24 }}>
          <span className="clr-tag">Asistente de proyecto</span>
          <h1 className="clr-h1">{context.titulo}</h1>
          <p className="clr-sub">{context.descripcion}</p>
        </header>
        <AssistantChat
          contextSlug={context.slug}
          titulo={context.titulo}
          mensajeBienvenida={context.mensajeBienvenida}
          documentoConfig={context.documento}
          initialMessages={initialMessages}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/asistente/ejecucion/page.tsx
git commit -m "feat(assistants): add /asistente/ejecucion page"
```

---

### Task 14: Página `/asistente/operacion`

**Files:**
- Create: `app/asistente/operacion/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
// app/asistente/operacion/page.tsx

/**
 * /asistente/operacion — protegida por middleware.ts (PROTECTED_PREFIXES).
 * Mismo patrón que app/asistente/ejecucion/page.tsx.
 */

import { getSessionUser } from '@/src/lib/supabase/get-session-user';
import { ASSISTANT_CONTEXTS } from '@/src/lib/assistants/config';
import { getOrCreateConversation, loadMessages } from '@/src/lib/assistants/conversations';
import AssistantChat from '@/src/components/assistants/AssistantChat';

export const metadata = {
  title: 'Operación de acueducto o ESP — HydroStack',
  description: 'Resuelve dudas de normativa (RAS, Res. 0330, CRA, SUI) con respuestas citadas.',
};

export default async function AsistenteOperacionPage() {
  const user = await getSessionUser();
  if (!user) return null; // el middleware ya redirige a /login antes de llegar aquí

  const context = ASSISTANT_CONTEXTS.operacion;
  const conversationId = await getOrCreateConversation(user.id, context.slug);
  const initialMessages = await loadMessages(conversationId);

  return (
    <div className="clr-page">
      <div className="clr-container" style={{ maxWidth: 780 }}>
        <header style={{ marginBottom: 24 }}>
          <span className="clr-tag">Asistente de proyecto</span>
          <h1 className="clr-h1">{context.titulo}</h1>
          <p className="clr-sub">{context.descripcion}</p>
        </header>
        <AssistantChat
          contextSlug={context.slug}
          titulo={context.titulo}
          mensajeBienvenida={context.mensajeBienvenida}
          documentoConfig={context.documento}
          initialMessages={initialMessages}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/asistente/operacion/page.tsx
git commit -m "feat(assistants): add /asistente/operacion page"
```

---

### Task 15: Sección Fig. 06 en la home

**Files:**
- Modify: `app/page.js`

This is the only change to an existing file with visible UI — everything else in `app/page.js` (hero, Fig. 01–05, closing, footer) stays exactly as-is. The new section is inserted as a sibling `<div>` right after the closing tag of the existing `Fig. 02` block (`INTENT_ROUTES` cards) and right before `<div ref={statsRef}><LandingCards /></div>`. It's labelled **Fig. 06** (the next unused figure number), even though it appears before Fig. 03–05 in scroll order — that keeps every existing figure label untouched instead of renumbering the page.

- [ ] **Step 1: Add local state for the waitlist button**

Near the top of `app/page.js`, inside `export default function LandingPage() {`, right after `const { heroRef, statsRef, problemRef, howRef, pillarsRef } = fx.refs;`, add:

```jsx
  const [waitlistStatus, setWaitlistStatus] = useState("idle"); // idle | loading | done | error
  const [waitlistError, setWaitlistError] = useState(null);

  async function handleWaitlist() {
    setWaitlistStatus("loading");
    setWaitlistError(null);
    try {
      const res = await fetch("/api/mercado/waitlist", { method: "POST" });
      if (res.status === 401) {
        window.location.href = "/login?next=" + encodeURIComponent("/#asistentes-proyecto");
        return;
      }
      if (!res.ok) {
        setWaitlistStatus("error");
        setWaitlistError("No se pudo guardar tu interés. Intenta de nuevo.");
        return;
      }
      setWaitlistStatus("done");
    } catch {
      setWaitlistStatus("error");
      setWaitlistError("No se pudo guardar tu interés. Intenta de nuevo.");
    }
  }
```

- [ ] **Step 2: Insert the new section**

Find this block (the end of the Fig. 02 section, immediately followed by the `statsRef`/`LandingCards` div):

```jsx
        <div className="bp-pillars-wrap">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
            <span style={{ width: 8, height: 8, background: "#0369A1" }} />
            <span style={{ font: "11px var(--font-jetbrains-mono),monospace", color: "#0369A1", letterSpacing: ".12em", textTransform: "uppercase" }}>Fig. 02 — ¿Qué necesitas resolver?</span>
          </div>
          <div className="bp-pillars-grid">
            {INTENT_ROUTES.map((c) => (
              <Link key={c.n} href={c.href} className="bp-card" style={{ border: "1px solid #DADAD2", padding: 22, background: "#fff", color: "#0A1F1C", display: "flex", flexDirection: "column", gap: 12, minHeight: 180 }}>
                <span style={{ position: "absolute", top: -1, left: -1, width: 10, height: 10, borderTop: "2px solid #0369A1", borderLeft: "2px solid #0369A1" }} />
                <span style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderBottom: "2px solid #0369A1", borderRight: "2px solid #0369A1" }} />
                <span style={{ font: "10px var(--font-jetbrains-mono),monospace", color: "#6B746F" }}>[ {c.n} ]</span>
                <div style={{ font: "600 16px/1.3 var(--font-inter)" }}>{c.title}</div>
                <p style={{ font: "13px/1.5 var(--font-inter)", color: "#525B5A", flexGrow: 1, margin: 0 }}>{c.desc}</p>
                <span style={{ font: "600 12px var(--font-jetbrains-mono),monospace", color: "#0369A1" }}>[ {c.cta} <span className="bp-card-arrow">→</span> ]</span>
              </Link>
            ))}
          </div>
        </div>

        <div ref={statsRef}>
          <LandingCards />
        </div>
```

Insert a new `<div>` between them (nothing above or below is modified):

```jsx
        <div className="bp-pillars-wrap">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
            <span style={{ width: 8, height: 8, background: "#0369A1" }} />
            <span style={{ font: "11px var(--font-jetbrains-mono),monospace", color: "#0369A1", letterSpacing: ".12em", textTransform: "uppercase" }}>Fig. 02 — ¿Qué necesitas resolver?</span>
          </div>
          <div className="bp-pillars-grid">
            {INTENT_ROUTES.map((c) => (
              <Link key={c.n} href={c.href} className="bp-card" style={{ border: "1px solid #DADAD2", padding: 22, background: "#fff", color: "#0A1F1C", display: "flex", flexDirection: "column", gap: 12, minHeight: 180 }}>
                <span style={{ position: "absolute", top: -1, left: -1, width: 10, height: 10, borderTop: "2px solid #0369A1", borderLeft: "2px solid #0369A1" }} />
                <span style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderBottom: "2px solid #0369A1", borderRight: "2px solid #0369A1" }} />
                <span style={{ font: "10px var(--font-jetbrains-mono),monospace", color: "#6B746F" }}>[ {c.n} ]</span>
                <div style={{ font: "600 16px/1.3 var(--font-inter)" }}>{c.title}</div>
                <p style={{ font: "13px/1.5 var(--font-inter)", color: "#525B5A", flexGrow: 1, margin: 0 }}>{c.desc}</p>
                <span style={{ font: "600 12px var(--font-jetbrains-mono),monospace", color: "#0369A1" }}>[ {c.cta} <span className="bp-card-arrow">→</span> ]</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="bp-pillars-wrap" id="asistentes-proyecto">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
            <span style={{ width: 8, height: 8, background: "#0369A1" }} />
            <span style={{ font: "11px var(--font-jetbrains-mono),monospace", color: "#0369A1", letterSpacing: ".12em", textTransform: "uppercase" }}>Fig. 06 — Asistentes de proyecto</span>
          </div>
          <div className="bp-pillars-grid">
            <Link href="/asistente/ejecucion" className="bp-card" style={{ border: "1px solid #DADAD2", padding: 22, background: "#fff", color: "#0A1F1C", display: "flex", flexDirection: "column", gap: 12, minHeight: 180 }}>
              <span style={{ position: "absolute", top: -1, left: -1, width: 10, height: 10, borderTop: "2px solid #0369A1", borderLeft: "2px solid #0369A1" }} />
              <span style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderBottom: "2px solid #0369A1", borderRight: "2px solid #0369A1" }} />
              <span style={{ font: "10px var(--font-jetbrains-mono),monospace", color: "#6B746F" }}>[ 01 ]</span>
              <div style={{ font: "600 16px/1.3 var(--font-inter)" }}>Gané un contrato, ¿ahora qué?</div>
              <p style={{ font: "13px/1.5 var(--font-inter)", color: "#525B5A", flexGrow: 1, margin: 0 }}>Sube tu contrato y te acompañamos en la ejecución: actas, pólizas, informes, liquidación.</p>
              <span style={{ font: "600 12px var(--font-jetbrains-mono),monospace", color: "#0369A1" }}>[ EMPEZAR <span className="bp-card-arrow">→</span> ]</span>
            </Link>

            <Link href="/asistente/operacion" className="bp-card" style={{ border: "1px solid #DADAD2", padding: 22, background: "#fff", color: "#0A1F1C", display: "flex", flexDirection: "column", gap: 12, minHeight: 180 }}>
              <span style={{ position: "absolute", top: -1, left: -1, width: 10, height: 10, borderTop: "2px solid #0369A1", borderLeft: "2px solid #0369A1" }} />
              <span style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderBottom: "2px solid #0369A1", borderRight: "2px solid #0369A1" }} />
              <span style={{ font: "10px var(--font-jetbrains-mono),monospace", color: "#6B746F" }}>[ 02 ]</span>
              <div style={{ font: "600 16px/1.3 var(--font-inter)" }}>Opero un acueducto o una ESP</div>
              <p style={{ font: "13px/1.5 var(--font-inter)", color: "#525B5A", flexGrow: 1, margin: 0 }}>Resuelve dudas de normativa (RAS, Res. 0330, CRA, SUI) con respuestas citadas.</p>
              <span style={{ font: "600 12px var(--font-jetbrains-mono),monospace", color: "#0369A1" }}>[ CONSULTAR <span className="bp-card-arrow">→</span> ]</span>
            </Link>

            <div className="bp-card" style={{ position: "relative", border: "1px dashed #DADAD2", padding: 22, background: "#fff", color: "#0A1F1C", display: "flex", flexDirection: "column", gap: 12, minHeight: 180 }}>
              <span style={{ position: "absolute", top: 10, right: 14, font: "9px var(--font-jetbrains-mono),monospace", color: "#6B746F", letterSpacing: ".08em", textTransform: "uppercase" }}>Próximamente</span>
              <span style={{ font: "10px var(--font-jetbrains-mono),monospace", color: "#6B746F" }}>[ 03 ]</span>
              <div style={{ font: "600 16px/1.3 var(--font-inter)" }}>Vendo o fabrico soluciones</div>
              <p style={{ font: "13px/1.5 var(--font-inter)", color: "#525B5A", flexGrow: 1, margin: 0 }}>Pronto: oportunidades reales de comunidades y ESP que necesitan lo que ofreces.</p>
              {waitlistStatus === "done" ? (
                <span style={{ font: "600 12px var(--font-jetbrains-mono),monospace", color: "#16A34A" }}>[ Te avisaremos ]</span>
              ) : (
                <button
                  type="button"
                  onClick={handleWaitlist}
                  disabled={waitlistStatus === "loading"}
                  style={{ alignSelf: "flex-start", cursor: "pointer", background: "transparent", border: "1px solid #0369A1", padding: "6px 12px", font: "600 12px var(--font-jetbrains-mono),monospace", color: "#0369A1" }}
                >
                  {waitlistStatus === "loading" ? "[ Guardando… ]" : "[ Avísame cuando abra ]"}
                </button>
              )}
              {waitlistStatus === "error" && waitlistError && (
                <span style={{ font: "11px var(--font-inter)", color: "#DC2626" }}>{waitlistError}</span>
              )}
            </div>
          </div>
        </div>

        <div ref={statsRef}>
          <LandingCards />
        </div>
```

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: build succeeds, no new type or lint errors.

- [ ] **Step 4: Commit**

```bash
git add app/page.js
git commit -m "feat(home): add Fig. 06 asistentes de proyecto section"
```

---

### Task 16: Verificación final y pasos manuales

**Files:** none (verification + operator instructions only)

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```

Expected: all tests pass, including every new file from Tasks 4–10.

- [ ] **Step 2: Typecheck and build**

```bash
npx tsc --noEmit
npm run build
```

Expected: both succeed with no new errors.

- [ ] **Step 3: Manual steps (cannot be done by this plan — run these yourself before the feature works end-to-end)**

1. **Create the Supabase Storage bucket** — in the Supabase dashboard (or via SQL editor), create a **private** bucket named `contracts`:

   ```sql
   insert into storage.buckets (id, name, public)
   values ('contracts', 'contracts', false)
   on conflict (id) do nothing;
   ```

2. **Add RLS policies scoped to the uploading user** — this is the one place in this feature where a Postgres RLS policy on `auth.uid()` genuinely applies (Supabase Storage queries run as the authenticated user, unlike the Neon tables in Task 2):

   ```sql
   create policy "Users can upload their own documents"
     on storage.objects for insert
     with check (bucket_id = 'contracts' and (storage.foldername(name))[1] = auth.uid()::text);

   create policy "Users can read their own documents"
     on storage.objects for select
     using (bucket_id = 'contracts' and (storage.foldername(name))[1] = auth.uid()::text);
   ```

   (`uploadDocument` in `src/lib/assistants/documents.ts` writes to `${usuarioId}/${contexto}/...`, so `usuarioId` is always the first path segment — matches `(storage.foldername(name))[1]`.)

3. **Run the migration against the real database:**

   ```bash
   npm run db:migrate
   ```

4. **Add `ANTHROPIC_API_KEY` in Vercel** — Project Settings → Environment Variables, for Production (and Preview if you want the assistants to work on preview deployments). Get a key at https://console.anthropic.com/settings/keys.

5. **Redeploy** so the new environment variable takes effect.

- [ ] **Step 4: Manual smoke test (after the steps above)**

- Visit `/` while logged out — confirm the three new cards render under "Fig. 06 — Asistentes de proyecto", the whole rest of the page is unchanged.
- Click "Gané un contrato, ¿ahora qué?" while logged out — confirm redirect to `/login?next=/asistente/ejecucion` and that logging in lands back on `/asistente/ejecucion`.
- On `/asistente/ejecucion`, upload a small real PDF contract — confirm an automatic summary turn appears referencing partes/objeto/valor/plazo.
- On `/asistente/operacion`, ask a normativa question — confirm the answer cites an artículo/resolución or explicitly says it can't verify one.
- Reload either `/asistente/*` page — confirm the prior conversation is still there (persistence).
- Click "[ Avísame cuando abra ]" on the third card — confirm it flips to "[ Te avisaremos ]" and a second click doesn't error (idempotent upsert).

---

## Self-Review

**Spec coverage:**
- Home section with 3 cards, correct copy/CTAs/routes, "Próximamente" state with waitlist → Task 15.
- Single reusable `AssistantChat` parametrized by context, config in one file → Tasks 5, 12.
- `/api/assistant` streaming via Claude (`claude-sonnet-4-5`, `ANTHROPIC_API_KEY`) → Task 9.
- Monospace metadata, engineering-blueprint bubbles, `[ ... ]` streaming indicator → Task 12.
- Both routes gated to session with `?next=` redirect → Task 11 (middleware, same mechanism as `/pliego`/`/cuenta`).
- Ejecución: PDF upload ≤20MB to private storage, text extraction, `documento` table, system prompt grounded in contract, general fallback when absent, automatic first-turn summary → Tasks 7, 9, 10, 12 (`mensajePosSubida`).
- Operación: normativa system prompt with mandatory citation + explicit "can't verify" fallback, no fabricated article numbers, accepts reference documents → Task 5 (`systemPrompt`), reuses Task 7/10 upload path.
- `conversations`/`messages` persistence with history surviving reload → Task 6, wired into pages in Tasks 13–14.
- Signals `ejecutor`/`operador`/`proveedor` → Task 4, recorded in Tasks 9 and 8.
- `.env.example` gets `ANTHROPIC_API_KEY`; manual steps for bucket, migration, Vercel env → Tasks 1, 16.
- Prohibitions honored: no existing route/section modified beyond the one insertion in Task 15 (see the deviations note for the two spots — RLS location and signal table — where this plan intentionally departs from the literal prompt to match the codebase's real architecture); no profile selector/onboarding added; API key never touches the client (all calls go through `app/api/assistant/route.ts`); new dependencies are the AI SDK packages only, no new PDF library.

**Placeholder scan:** none found — every step has complete, runnable code.

**Type consistency:** `AssistantContextSlug`, `AssistantContext`, `AssistantDocumentConfig` (Task 5) are the single source of truth imported unchanged in Tasks 6, 7, 9, 10, 12, 13, 14. `UploadedDocument`/`DocumentUploadError` (Task 7) are imported as-is in Tasks 9, 10. `getOrCreateConversation`/`loadMessages`/`saveMessages` (Task 6) signatures match their call sites in Task 9 and Tasks 13–14 exactly.
