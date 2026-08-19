# Puente captcha→upload en /mis-coincidencias Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ofrecer subida manual del Documento Base de un pliego en cada tarjeta de `/mis-coincidencias`, persistir el resultado de la extracción ligado al proceso (compartido entre usuarios), y mostrarlo en la tarjeta la próxima vez que se cargue la página.

**Architecture:** Nueva tabla `pliego_proceso` (upsert por `procesoId`, el id nativo de SECOP — no un uuid interno, porque el motor de matching solo conoce el id nativo). Función pura `uploadPliego()` (extrae + valida + persiste, testeada con mocks) envuelta en un server action `uploadPliegoAction` que dos bloques de tarjeta en `page.tsx` invocan vía `<form action={...}>`. Una consulta `getPliegoStatusForProcesos()` trae el estado ya guardado para mezclarlo con las listas de matches existentes, sin tocar `matchProcesos`/`getMatchesForPerfil`.

**Tech Stack:** Next.js 14 App Router (Server Components + Server Actions), Drizzle ORM / Neon Postgres, Vitest.

Ver spec: [docs/superpowers/specs/2026-08-19-captcha-upload-bridge-design.md](../specs/2026-08-19-captcha-upload-bridge-design.md).

---

### Task 1: Helper compartido de validación de PDF crudo

El chequeo de magic bytes `%PDF-` + tope de tamaño está duplicado hoy en `app/api/pliego/extract/route.ts` y `app/api/documents/upload/route.ts`. Se extrae a `src/lib/pliego/validate.ts` (ya alberga la validación del pliego) antes de escribir una tercera copia en el nuevo flujo.

**Files:**
- Modify: `src/lib/pliego/validate.ts`
- Modify: `app/api/pliego/extract/route.ts:29-30,71` (constantes y chequeo)
- Modify: `app/api/documents/upload/route.ts:18-19,53-56` (constantes y chequeo)
- Test: `src/__tests__/pliego/validate.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Agregar al final de `src/__tests__/pliego/validate.test.ts` (después del último `describe`, sin tocar los existentes):

```ts
// --- isPdfBuffer -------------------------------------------------------

describe("isPdfBuffer", () => {
  it("acepta un buffer que empieza con %PDF-", () => {
    expect(isPdfBuffer(Buffer.from("%PDF-1.7\n%âãÏÓ\n1 0 obj"))).toBe(true);
  });

  it("rechaza un buffer que no empieza con %PDF-", () => {
    expect(isPdfBuffer(Buffer.from("<html><body>captcha</body></html>"))).toBe(false);
  });

  it("rechaza un buffer vacío", () => {
    expect(isPdfBuffer(Buffer.alloc(0))).toBe(false);
  });
});
```

Y agregar `isPdfBuffer` al import existente en la primera línea del archivo:

```ts
import { validatePliego } from "@/src/lib/pliego/validate";
```

pasa a:

```ts
import { validatePliego, isPdfBuffer } from "@/src/lib/pliego/validate";
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/__tests__/pliego/validate.test.ts`
Expected: FAIL — `isPdfBuffer` no está exportado de `@/src/lib/pliego/validate`.

- [ ] **Step 3: Implementar `isPdfBuffer` y `MAX_BYTES_PDF`**

Agregar al final de `src/lib/pliego/validate.ts` (después de la función `validatePliego`, antes del cierre del archivo):

```ts
/** Tope compartido para la subida directa del Documento Base (PDF). */
export const MAX_BYTES_PDF = 20 * 1024 * 1024;

const PDF_MAGIC = "%PDF-";

/** Chequeo barato de magic bytes — descarta un HTML de captcha/login antes de gastar una llamada al extractor. */
export function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.subarray(0, PDF_MAGIC.length).toString("ascii") === PDF_MAGIC;
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/__tests__/pliego/validate.test.ts`
Expected: PASS (todos los tests del archivo, incluidos los 3 nuevos).

- [ ] **Step 5: Commit**

```bash
git add src/lib/pliego/validate.ts src/__tests__/pliego/validate.test.ts
git commit -m "feat(pliego): extrae isPdfBuffer/MAX_BYTES_PDF compartidos a validate.ts"
```

- [ ] **Step 6: Refactorizar `app/api/pliego/extract/route.ts` para usar el helper**

En `app/api/pliego/extract/route.ts`, reemplazar:

```ts
import { extractPliegoHybrid } from "@/src/lib/pliego/extractPliegoHybrid";
import { validatePliego } from "@/src/lib/pliego/validate";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { recordUserSignal } from "@/src/lib/signals/record-signal";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES_PDF = 20 * 1024 * 1024; // 20MB — margen cómodo bajo el límite de request de la API de Gemini tras base64.
const MAX_BYTES_XLS = 10 * 1024 * 1024;
const PDF_MAGIC = "%PDF-";
```

por:

```ts
import { extractPliegoHybrid } from "@/src/lib/pliego/extractPliegoHybrid";
import { validatePliego, isPdfBuffer, MAX_BYTES_PDF } from "@/src/lib/pliego/validate";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { recordUserSignal } from "@/src/lib/signals/record-signal";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES_XLS = 10 * 1024 * 1024;
```

Y reemplazar el chequeo inline:

```ts
  const buffer = Buffer.from(await file.arrayBuffer());
  const looksLikePdf = buffer.subarray(0, PDF_MAGIC.length).toString("ascii") === PDF_MAGIC;
  if (!looksLikePdf) {
```

por:

```ts
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!isPdfBuffer(buffer)) {
```

- [ ] **Step 7: Refactorizar `app/api/documents/upload/route.ts` para usar el helper**

En `app/api/documents/upload/route.ts`, reemplazar:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/src/lib/supabase/get-session-user';
import { uploadDocument, DocumentUploadError } from '@/src/lib/assistants/documents';
import { getAssistantContext } from '@/src/lib/assistants/config';

export const runtime = 'nodejs';
export const maxDuration = 120;

const MAX_BYTES = 20 * 1024 * 1024;
const PDF_MAGIC = '%PDF-';
```

por:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/src/lib/supabase/get-session-user';
import { uploadDocument, DocumentUploadError } from '@/src/lib/assistants/documents';
import { getAssistantContext } from '@/src/lib/assistants/config';
import { isPdfBuffer, MAX_BYTES_PDF as MAX_BYTES } from '@/src/lib/pliego/validate';

export const runtime = 'nodejs';
export const maxDuration = 120;
```

Y reemplazar el chequeo inline (más abajo en el mismo archivo):

```ts
  const buffer = Buffer.from(await file.arrayBuffer());
  const looksLikePdf = buffer.subarray(0, PDF_MAGIC.length).toString('ascii') === PDF_MAGIC;
  if (!looksLikePdf) {
```

por:

```ts
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!isPdfBuffer(buffer)) {
```

- [ ] **Step 8: Verificar que el proyecto compila (no hay test de ruta para estos dos endpoints)**

Run: `npm run build`
Expected: build exitoso, sin errores de tipos en `app/api/pliego/extract/route.ts` ni `app/api/documents/upload/route.ts`.

- [ ] **Step 9: Commit**

```bash
git add app/api/pliego/extract/route.ts app/api/documents/upload/route.ts
git commit -m "refactor(pliego): usa isPdfBuffer/MAX_BYTES_PDF compartidos en las 2 rutas de upload"
```

---

### Task 2: Tabla `pliego_proceso`

**Files:**
- Create: `src/lib/db/schema/pliego.ts`
- Modify: `src/lib/db/schema/index.ts`

- [ ] **Step 1: Crear el archivo de esquema**

Crear `src/lib/db/schema/pliego.ts`:

```ts
// src/lib/db/schema/pliego.ts

/**
 * Pliego subido manualmente por un usuario cuando SECOP II bloquea el
 * acceso automático (muro ReCaptcha, ver document-access.ts — un probe
 * server-side nunca lo pasa). Un pliego activo por proceso: el documento
 * es público, no privado por usuario, así que subir uno nuevo reemplaza al
 * anterior (upsert por `procesoId`).
 *
 * `procesoId` es el id NATIVO de SECOP (`secopProcesoId`, tipo
 * "CO1.REQ.xxxx"), no el uuid interno de la tabla `proceso` — el motor de
 * matching (`SecopProceso.id` en src/lib/secop/types.ts) solo conoce el id
 * nativo, mismo criterio que `coincidencia.procesoId` en cuentas.ts.
 */

import {
  pgTable,
  text,
  uuid,
  jsonb,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { usuario } from "./cuentas";

export const pliegoProceso = pgTable(
  "pliego_proceso",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    procesoId: text("proceso_id").notNull(),
    subidoPorUsuarioId: text("subido_por_usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    nombreArchivo: text("nombre_archivo").notNull(),
    /** PliegoExtraction (src/lib/pliego/schema.ts) */
    extraction: jsonb("extraction").notNull(),
    /** ValidationReport (src/lib/pliego/validate.ts) */
    validation: jsonb("validation").notNull(),
    /** HybridExtraction["origen"] — por campo, reglas vs. llm */
    origen: jsonb("origen").notNull(),
    /** Denormalizado desde validation.ok — filtra sin deserializar el jsonb. */
    gateMatematicoPasado: boolean("gate_matematico_pasado").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("pliego_proceso_proceso_id_uq").on(t.procesoId),
    index("pliego_proceso_gate_idx").on(t.gateMatematicoPasado),
  ]
);
```

- [ ] **Step 2: Exportarlo desde el índice de esquema**

En `src/lib/db/schema/index.ts`, agregar la línea (mantener orden alfabético con las existentes no es necesario, el archivo no lo sigue estrictamente — agregar al final):

```ts
export * from "./raw";
export * from "./catalogos";
export * from "./hechos";
export * from "./control";
export * from "./clasificacion";
export * from "./quarantine";
export * from "./cuentas";
export * from "./asistentes";
export * from "./eligibility";
export * from "./pliego";
```

- [ ] **Step 3: Generar la migración (solo generar, NO aplicar)**

Run: `npm run db:generate`
Expected: crea un nuevo archivo `drizzle/00XX_<nombre>.sql` con un `CREATE TABLE "pliego_proceso" (...)` y sus índices/FK. Revisar el SQL generado a ojo — debe tener exactamente las columnas del Step 1, la FK a `usuario(id)` con `ON DELETE CASCADE`, y los dos índices (unique en `proceso_id`, simple en `gate_matematico_pasado`).

**No correr `npm run db:migrate` en este task** — eso es el Task 6, con confirmación explícita del usuario antes de tocar la base compartida.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/schema/pliego.ts src/lib/db/schema/index.ts drizzle/
git commit -m "feat(db): agrega tabla pliego_proceso (pliego subido por proceso)"
```

---

### Task 3: Consulta de estado del pliego por proceso

Sigue el mismo criterio que `src/lib/secop/db-search.ts`: la función que hace el `SELECT` real no se testea (mismo patrón que `searchProcesosDb`, sin test); solo se testea el mapeo puro fila→tipo (`mapPliegoRow`, mismo patrón que `mapDbRowToProceso`).

**Files:**
- Create: `src/lib/secop/pliego-status.ts`
- Test: `src/__tests__/secop/pliego-status.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/__tests__/secop/pliego-status.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { mapPliegoRow, type PliegoProcesoRow } from "@/src/lib/secop/pliego-status";
import { NO_ENCONTRADO } from "@/src/lib/pliego/schema";

function row(over: Partial<PliegoProcesoRow> = {}): PliegoProcesoRow {
  return {
    procesoId: "CO1.REQ.1",
    gateMatematicoPasado: true,
    createdAt: new Date("2026-08-19T10:00:00Z"),
    extraction: {
      proceso: "P-1",
      entidad: "E",
      objeto_contrato: NO_ENCONTRADO,
      modalidad_contratacion: NO_ENCONTRADO,
      fecha_publicacion: NO_ENCONTRADO,
      fecha_cierre: "2026-09-15",
      presupuesto_oficial_cop: 250_000_000,
      moneda: "COP",
      capitulos: [],
      reglas_presupuesto: [],
      requisitos_habilitantes: {
        experiencia_especifica: NO_ENCONTRADO,
        capacidad_financiera: NO_ENCONTRADO,
        capacidad_organizacional: NO_ENCONTRADO,
      },
      cronograma: [],
      verificacion: {
        campos_no_encontrados: [],
        confianza_general: "alta",
        justificacion_confianza: "ok",
      },
      lagunas_pendientes: [],
    },
    ...over,
  };
}

describe("mapPliegoRow (fila DB → PliegoStatus)", () => {
  it("extrae presupuesto y fecha de cierre desde el jsonb de extraction", () => {
    const status = mapPliegoRow(row());
    expect(status.presupuestoOficialCop).toBe(250_000_000);
    expect(status.fechaCierre).toBe("2026-09-15");
    expect(status.gateMatematicoPasado).toBe(true);
    expect(status.createdAt).toEqual(new Date("2026-08-19T10:00:00Z"));
  });

  it("propaga gateMatematicoPasado:false sin tocarlo", () => {
    const status = mapPliegoRow(row({ gateMatematicoPasado: false }));
    expect(status.gateMatematicoPasado).toBe(false);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/__tests__/secop/pliego-status.test.ts`
Expected: FAIL — el módulo `@/src/lib/secop/pliego-status` no existe.

- [ ] **Step 3: Implementar `mapPliegoRow` y `getPliegoStatusForProcesos`**

Crear `src/lib/secop/pliego-status.ts`:

```ts
// src/lib/secop/pliego-status.ts

/**
 * Estado del pliego subido manualmente, por proceso — usado en
 * /mis-coincidencias para mostrar si ya hay un pliego cargado para cada
 * match. No toca matchProcesos/getMatchesForPerfil: es una consulta aparte
 * que el caller mezcla por procesoId.
 *
 * `getPliegoStatusForProcesos` (el SELECT real) no tiene test directo —
 * mismo criterio que `searchProcesosDb` en db-search.ts: solo se testea el
 * mapeo puro `mapPliegoRow`.
 */

import { inArray } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { pliegoProceso } from "@/src/lib/db/schema/pliego";
import type { PliegoExtraction } from "@/src/lib/pliego/schema";

export interface PliegoProcesoRow {
  procesoId: string;
  gateMatematicoPasado: boolean;
  createdAt: Date;
  extraction: PliegoExtraction;
}

export interface PliegoStatus {
  gateMatematicoPasado: boolean;
  createdAt: Date;
  presupuestoOficialCop: number;
  fechaCierre: string;
}

export function mapPliegoRow(row: PliegoProcesoRow): PliegoStatus {
  return {
    gateMatematicoPasado: row.gateMatematicoPasado,
    createdAt: row.createdAt,
    presupuestoOficialCop: row.extraction.presupuesto_oficial_cop,
    fechaCierre: row.extraction.fecha_cierre,
  };
}

export async function getPliegoStatusForProcesos(
  procesoIds: string[]
): Promise<Map<string, PliegoStatus>> {
  if (procesoIds.length === 0) return new Map();

  const rows = await db
    .select({
      procesoId: pliegoProceso.procesoId,
      gateMatematicoPasado: pliegoProceso.gateMatematicoPasado,
      createdAt: pliegoProceso.createdAt,
      extraction: pliegoProceso.extraction,
    })
    .from(pliegoProceso)
    .where(inArray(pliegoProceso.procesoId, procesoIds));

  const map = new Map<string, PliegoStatus>();
  for (const row of rows) {
    map.set(row.procesoId, mapPliegoRow(row as PliegoProcesoRow));
  }
  return map;
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/__tests__/secop/pliego-status.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/secop/pliego-status.ts src/__tests__/secop/pliego-status.test.ts
git commit -m "feat(secop): getPliegoStatusForProcesos + mapPliegoRow"
```

---

### Task 4: `uploadPliego` (lógica pura) + `uploadPliegoAction` (server action)

Sigue el mismo criterio que `src/lib/alertas/enviar-ahora.ts` (lógica pura, testeada con mocks) vs. el wrapper `"use server"` que la envuelve (no testeado — mismo criterio que `handleEnviarAhora`/`saveMinimoPerfilAction`, que tampoco tienen test directo).

**Files:**
- Create: `src/lib/secop/pliego-upload.ts`
- Create: `src/lib/secop/pliego-actions.ts`
- Test: `src/__tests__/secop/pliego-upload.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/__tests__/secop/pliego-upload.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";

const insertValuesMock = vi.fn();
const onConflictMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/src/lib/db/client", () => ({
  db: {
    insert: () => ({
      values: (...args: unknown[]) => {
        insertValuesMock(...args);
        return { onConflictDoUpdate: (...cArgs: unknown[]) => onConflictMock(...cArgs) };
      },
    }),
  },
}));

const recordUserSignalMock = vi.fn().mockResolvedValue(undefined);
vi.mock("@/src/lib/signals/record-signal", () => ({
  recordUserSignal: (...args: unknown[]) => recordUserSignalMock(...args),
}));

const extractPliegoHybridMock = vi.fn();
vi.mock("@/src/lib/pliego/extractPliegoHybrid", () => ({
  extractPliegoHybrid: (...args: unknown[]) => extractPliegoHybridMock(...args),
}));

import { uploadPliego } from "@/src/lib/secop/pliego-upload";
import { NO_ENCONTRADO, type PliegoExtraction } from "@/src/lib/pliego/schema";

function extraccion(over: Partial<PliegoExtraction> = {}): PliegoExtraction {
  return {
    proceso: "P-1",
    entidad: "E",
    objeto_contrato: NO_ENCONTRADO,
    modalidad_contratacion: NO_ENCONTRADO,
    fecha_publicacion: NO_ENCONTRADO,
    fecha_cierre: "2026-09-01",
    presupuesto_oficial_cop: 1000,
    moneda: "COP",
    capitulos: [
      {
        nombre: "Cap A",
        items: [
          {
            codigo: "1",
            descripcion: "x",
            unidad: "GLB",
            cantidad: 1,
            valor_unitario: 1000,
            valor_total: 1000,
            cita_textual: "cita",
          },
        ],
      },
    ],
    reglas_presupuesto: [],
    requisitos_habilitantes: {
      experiencia_especifica: NO_ENCONTRADO,
      capacidad_financiera: NO_ENCONTRADO,
      capacidad_organizacional: NO_ENCONTRADO,
    },
    cronograma: [],
    verificacion: {
      campos_no_encontrados: [],
      confianza_general: "alta",
      justificacion_confianza: "ok",
    },
    lagunas_pendientes: [],
    ...over,
  };
}

const PDF_BUFFER = Buffer.from("%PDF-1.7\nfake");
const ORIGEN_LLM = {
  reglas_presupuesto: "llm" as const,
  requisitos_habilitantes: "llm" as const,
  capitulos: "llm" as const,
};

describe("uploadPliego", () => {
  it("rechaza un archivo que no es PDF sin llamar al extractor", async () => {
    const r = await uploadPliego({
      procesoId: "CO1.REQ.1",
      subidoPorUsuarioId: "u1",
      nombreArchivo: "x.txt",
      buffer: Buffer.from("no soy un pdf"),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("PDF válido");
    expect(extractPliegoHybridMock).not.toHaveBeenCalled();
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it("persiste con gateMatematicoPasado:true cuando la extracción es consistente", async () => {
    extractPliegoHybridMock.mockResolvedValueOnce({ extraction: extraccion(), origen: ORIGEN_LLM });

    const r = await uploadPliego({
      procesoId: "CO1.REQ.1",
      subidoPorUsuarioId: "u1",
      nombreArchivo: "pliego.pdf",
      buffer: PDF_BUFFER,
    });

    expect(r).toEqual({ ok: true, gateMatematicoPasado: true });
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        procesoId: "CO1.REQ.1",
        subidoPorUsuarioId: "u1",
        nombreArchivo: "pliego.pdf",
        gateMatematicoPasado: true,
      })
    );
    expect(recordUserSignalMock).toHaveBeenCalledWith("u1", "estructurador");
  });

  it("persiste con gateMatematicoPasado:false cuando la aritmética no cuadra", async () => {
    const inconsistente = extraccion();
    inconsistente.capitulos[0].items[0].valor_total = 9999;
    extractPliegoHybridMock.mockResolvedValueOnce({ extraction: inconsistente, origen: ORIGEN_LLM });

    const r = await uploadPliego({
      procesoId: "CO1.REQ.1",
      subidoPorUsuarioId: "u1",
      nombreArchivo: "pliego.pdf",
      buffer: PDF_BUFFER,
    });

    expect(r).toEqual({ ok: true, gateMatematicoPasado: false });
  });

  it("devuelve error si extractPliegoHybrid lanza, sin persistir", async () => {
    extractPliegoHybridMock.mockRejectedValueOnce(new Error("Gemini no disponible"));

    const r = await uploadPliego({
      procesoId: "CO1.REQ.1",
      subidoPorUsuarioId: "u1",
      nombreArchivo: "pliego.pdf",
      buffer: PDF_BUFFER,
    });

    expect(r).toEqual({ ok: false, error: "Extracción falló: Gemini no disponible" });
    expect(insertValuesMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/__tests__/secop/pliego-upload.test.ts`
Expected: FAIL — el módulo `@/src/lib/secop/pliego-upload` no existe.

- [ ] **Step 3: Implementar `uploadPliego`**

Crear `src/lib/secop/pliego-upload.ts`:

```ts
// src/lib/secop/pliego-upload.ts

/**
 * Lógica pura de la subida manual de pliego (puente captcha→upload):
 * valida el PDF, extrae con el mismo extractor híbrido que
 * /api/pliego/extract, y persiste el resultado en pliego_proceso (upsert
 * por procesoId — el pliego de un proceso es el mismo documento público
 * para cualquier usuario que lo suba). El wrapper `"use server"` que llama
 * a esto vive en pliego-actions.ts.
 */

import { isPdfBuffer, MAX_BYTES_PDF } from "@/src/lib/pliego/validate";
import { extractPliegoHybrid } from "@/src/lib/pliego/extractPliegoHybrid";
import { validatePliego } from "@/src/lib/pliego/validate";
import { db } from "@/src/lib/db/client";
import { pliegoProceso } from "@/src/lib/db/schema/pliego";
import { recordUserSignal } from "@/src/lib/signals/record-signal";

export interface UploadPliegoParams {
  procesoId: string;
  subidoPorUsuarioId: string;
  nombreArchivo: string;
  buffer: Buffer;
}

export type UploadPliegoResult =
  | { ok: true; gateMatematicoPasado: boolean }
  | { ok: false; error: string };

export async function uploadPliego(params: UploadPliegoParams): Promise<UploadPliegoResult> {
  if (!isPdfBuffer(params.buffer)) {
    return { ok: false, error: "El archivo no es un PDF válido (no empieza con %PDF-)." };
  }
  if (params.buffer.byteLength > MAX_BYTES_PDF) {
    return {
      ok: false,
      error: `El archivo supera el máximo de ${MAX_BYTES_PDF / (1024 * 1024)}MB.`,
    };
  }

  let extraction;
  let origen;
  try {
    const result = await extractPliegoHybrid(params.buffer, {});
    extraction = result.extraction;
    origen = result.origen;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Extracción falló: ${message}` };
  }

  const validation = validatePliego(extraction);

  await db
    .insert(pliegoProceso)
    .values({
      procesoId: params.procesoId,
      subidoPorUsuarioId: params.subidoPorUsuarioId,
      nombreArchivo: params.nombreArchivo,
      extraction,
      validation,
      origen,
      gateMatematicoPasado: validation.ok,
    })
    .onConflictDoUpdate({
      target: pliegoProceso.procesoId,
      set: {
        subidoPorUsuarioId: params.subidoPorUsuarioId,
        nombreArchivo: params.nombreArchivo,
        extraction,
        validation,
        origen,
        gateMatematicoPasado: validation.ok,
        updatedAt: new Date(),
      },
    });

  await recordUserSignal(params.subidoPorUsuarioId, "estructurador");

  return { ok: true, gateMatematicoPasado: validation.ok };
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/__tests__/secop/pliego-upload.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/secop/pliego-upload.ts src/__tests__/secop/pliego-upload.test.ts
git commit -m "feat(secop): uploadPliego — extrae, valida y persiste el pliego subido"
```

- [ ] **Step 6: Implementar el server action wrapper**

Crear `src/lib/secop/pliego-actions.ts`:

```ts
// src/lib/secop/pliego-actions.ts
"use server";

/**
 * Wrapper `"use server"` de uploadPliego() — parsea el FormData del
 * formulario de la tarjeta, resuelve la sesión, y redirige con el
 * resultado en query params (mismo patrón que handleEnviarAhora en
 * app/mis-coincidencias/page.tsx). No tiene test directo — mismo criterio
 * que saveMinimoPerfilAction en src/lib/oferente/actions.ts.
 */

import { redirect } from "next/navigation";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { uploadPliego } from "./pliego-upload";

export async function uploadPliegoAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user?.id) {
    redirect("/login?next=/mis-coincidencias");
  }

  const procesoId = formData.get("procesoId");
  if (typeof procesoId !== "string" || !procesoId) {
    redirect("/mis-coincidencias?pliego=error&pliegoDetalle=falta_proceso");
  }

  const file = formData.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    redirect("/mis-coincidencias?pliego=error&pliegoDetalle=falta_archivo");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const resultado = await uploadPliego({
    procesoId,
    subidoPorUsuarioId: user.id,
    nombreArchivo: file.name || "pliego.pdf",
    buffer,
  });

  if (!resultado.ok) {
    redirect(`/mis-coincidencias?pliego=error&pliegoDetalle=${encodeURIComponent(resultado.error)}`);
  }

  redirect("/mis-coincidencias?pliego=ok");
}
```

- [ ] **Step 7: Verificar que el proyecto compila**

Run: `npm run build`
Expected: build exitoso, sin errores de tipos.

- [ ] **Step 8: Commit**

```bash
git add src/lib/secop/pliego-actions.ts
git commit -m "feat(secop): uploadPliegoAction — server action de subida desde la tarjeta"
```

---

### Task 5: UI — bloque de subida en cada tarjeta de `/mis-coincidencias`

**Files:**
- Create: `src/components/secop/PliegoUploadBlock.tsx`
- Modify: `app/mis-coincidencias/page.tsx`

- [ ] **Step 1: Crear el componente de presentación**

Crear `src/components/secop/PliegoUploadBlock.tsx`:

```tsx
// src/components/secop/PliegoUploadBlock.tsx

/**
 * Bloque colapsable dentro de cada tarjeta de /mis-coincidencias: puente
 * captcha→upload. `<details>` nativo — sin JS, coherente con que la página
 * es Server Component puro. Ver
 * docs/superpowers/specs/2026-08-19-captcha-upload-bridge-design.md.
 */

import { uploadPliegoAction } from "@/src/lib/secop/pliego-actions";
import type { PliegoStatus } from "@/src/lib/secop/pliego-status";
import { formatCopCompact, formatShortDate } from "./format";

interface Props {
  procesoId: string;
  procesoUrl: string | null;
  status: PliegoStatus | undefined;
}

export function PliegoUploadBlock({ procesoId, procesoUrl, status }: Props) {
  return (
    <details className="clr-mc-pliego">
      <summary className="clr-mc-pliego-summary">
        {status ? (
          <>
            <span
              className={`clr-mc-pliego-glyph clr-mc-pliego-glyph--${status.gateMatematicoPasado ? "pass" : "fail"}`}
            >
              {status.gateMatematicoPasado ? "✓" : "✕"}
            </span>
            Pliego cargado{formatShortDate(status.createdAt.toISOString()) ? ` · ${formatShortDate(status.createdAt.toISOString())}` : ""}
          </>
        ) : (
          "Subir pliego"
        )}
      </summary>
      <div className="clr-mc-pliego-body">
        {status && (
          <p className="clr-mc-pliego-fields">
            Presupuesto: {formatCopCompact(status.presupuestoOficialCop)} · Cierre:{" "}
            {status.fechaCierre}
          </p>
        )}
        <p className="clr-mc-pliego-hint">
          SECOP pide verificación humana para abrir este documento.
          {procesoUrl && (
            <>
              {" "}
              <a href={procesoUrl} target="_blank" rel="noreferrer">
                Ábrelo en SECOP ↗
              </a>
            </>
          )}{" "}
          descarga el Documento Base y súbelo aquí.
        </p>
        <form action={uploadPliegoAction} className="clr-mc-pliego-form">
          <input type="hidden" name="procesoId" value={procesoId} />
          <input type="file" name="file" accept="application/pdf" required />
          <button type="submit">{status ? "Volver a subir" : "Subir"}</button>
        </form>
      </div>
    </details>
  );
}
```

- [ ] **Step 2: Agregar CSS al `STYLE` de la página**

En `app/mis-coincidencias/page.tsx`, dentro del template string `STYLE`, agregar antes del cierre (después de la regla `.clr-mc-cta:hover`):

```css
  .clr-mc-pliego{ margin-top: 8px; border-top: 1px solid var(--line); padding-top: 8px; }
  .clr-mc-pliego-summary{
    cursor: pointer; font-size: 12px; color: var(--ink-600); display: flex;
    align-items: center; gap: 6px; list-style: none;
  }
  .clr-mc-pliego-summary::-webkit-details-marker{ display: none; }
  .clr-mc-pliego-glyph{
    display: inline-flex; align-items: center; justify-content: center;
    width: 14px; height: 14px; border-radius: 999px; font-size: 10px; font-weight: 700;
  }
  .clr-mc-pliego-glyph--pass{ background: #dcfce7; color: #16a34a; }
  .clr-mc-pliego-glyph--fail{ background: #fee2e2; color: #dc2626; }
  .clr-mc-pliego-body{ margin-top: 8px; display: flex; flex-direction: column; gap: 8px; }
  .clr-mc-pliego-fields{ font-size: 12px; color: var(--ink-900); margin: 0; }
  .clr-mc-pliego-hint{ font-size: 11.5px; color: var(--ink-600); margin: 0; }
  .clr-mc-pliego-hint a{ color: var(--accent); }
  .clr-mc-pliego-form{ display: flex; align-items: center; gap: 8px; }
  .clr-mc-pliego-form input[type="file"]{ font-size: 11.5px; max-width: 220px; }
  .clr-mc-pliego-form button{
    background: var(--accent); color: #fff; border: none; font-size: 11.5px;
    padding: 5px 10px; border-radius: var(--radius-md); cursor: pointer;
  }
```

- [ ] **Step 3: Importar el componente y la consulta de estado, y extender `Props`**

En `app/mis-coincidencias/page.tsx`, agregar a los imports (después del import de `SectorZonaSetup`):

```ts
import { PliegoUploadBlock } from "@/src/components/secop/PliegoUploadBlock";
import { getPliegoStatusForProcesos } from "@/src/lib/secop/pliego-status";
```

Y extender la interfaz `Props`:

```ts
interface Props {
  searchParams: {
    resultado?: string;
    resultadoError?: string;
    perfilError?: string;
    pliego?: string;
    pliegoDetalle?: string;
  };
}
```

- [ ] **Step 4: Agregar el banner de resultado del pliego**

En `app/mis-coincidencias/page.tsx`, después de la constante `PERFIL_ERROR` (antes de `const STYLE = ...`), agregar:

```ts
const pliegoBanner = (searchParams: Props["searchParams"]): string | null => {
  if (searchParams.pliego === "ok") return "Pliego cargado y extraído.";
  if (searchParams.pliego === "error") {
    return `No se pudo procesar el pliego: ${searchParams.pliegoDetalle ?? "error desconocido"}.`;
  }
  return null;
};
```

En el cuerpo de `MisCoincidenciasPage`, justo después de la línea `const perfilError = PERFIL_ERROR[searchParams.perfilError ?? ""] ?? null;`, agregar:

```ts
  const pliegoResultBanner = pliegoBanner(searchParams);
```

- [ ] **Step 5: Insertar el bloque en la rama de perfil mínimo**

En `app/mis-coincidencias/page.tsx`, en la rama `if (!isPerfilCompleto(perfilGuardado))`, justo antes de `const matches = await getMatchesForPerfilMinimo(perfilGuardado);` no hace falta cambio; después de esa línea agregar:

```ts
    const matches = await getMatchesForPerfilMinimo(perfilGuardado);
    const pliegoStatusMap = await getPliegoStatusForProcesos(matches.map((m) => m.proceso.id));
```

Y dentro del `.map((m: MatchMinimo) => ...)`, agregar el bloque justo antes del `</div>` de cierre de `.clr-mc-card` (después del `<div className="clr-mc-card-foot">...</div>`):

```tsx
                <PliegoUploadBlock
                  procesoId={m.proceso.id}
                  procesoUrl={m.proceso.url}
                  status={pliegoStatusMap.get(m.proceso.id)}
                />
```

Y agregar el banner justo después de `{perfilError && <div className="clr-mc-banner">{perfilError}</div>}` — en esta rama no existe ese `perfilError` (vive en la rama sin perfil), así que agregar antes del `<div className="clr-mc-list">`:

```tsx
        {pliegoResultBanner && <div className="clr-mc-banner">{pliegoResultBanner}</div>}
```

- [ ] **Step 6: Insertar el bloque en la rama de perfil completo**

En la misma página, después de `const matches = await getMatchesForPerfil(perfilGuardado);` agregar:

```ts
  const pliegoStatusMap = await getPliegoStatusForProcesos(matches.map((m) => m.proceso.id));
```

Dentro del `.map(({ proceso, verdict }: Match) => ...)`, agregar el bloque justo antes del `</div>` de cierre de `.clr-mc-card` (después del `<div className="clr-mc-card-foot">...</div>`):

```tsx
                <PliegoUploadBlock
                  procesoId={proceso.id}
                  procesoUrl={proceso.url}
                  status={pliegoStatusMap.get(proceso.id)}
                />
```

Y agregar el banner del pliego junto al banner existente:

```tsx
      {banner && <div className="clr-mc-banner">{banner}</div>}
      {pliegoResultBanner && <div className="clr-mc-banner">{pliegoResultBanner}</div>}
```

- [ ] **Step 7: Verificar que el proyecto compila**

Run: `npm run build`
Expected: build exitoso, sin errores de tipos en `app/mis-coincidencias/page.tsx` ni `src/components/secop/PliegoUploadBlock.tsx`.

- [ ] **Step 8: Correr toda la suite de tests para verificar que nada se rompió**

Run: `npm test`
Expected: PASS — todos los tests existentes siguen pasando, más los 6 nuevos de los Tasks 1/3/4.

- [ ] **Step 9: Commit**

```bash
git add src/components/secop/PliegoUploadBlock.tsx app/mis-coincidencias/page.tsx
git commit -m "feat(secop): bloque de subida de pliego en cada tarjeta de /mis-coincidencias"
```

---

### Task 6: Aplicar la migración (gate manual — requiere confirmación)

**Este task no se ejecuta automáticamente.** Antes de correrlo, quien ejecute el plan debe parar y pedir confirmación explícita al dueño del proyecto — es una migración contra Neon, base compartida.

- [ ] **Step 1: Parar y pedir confirmación**

Mostrar al usuario el SQL generado en el Task 2 (Step 3) y preguntar explícitamente si se aplica ahora contra la base de Neon configurada en `DATABASE_URL`. No continuar sin un sí explícito.

- [ ] **Step 2: Aplicar la migración**

Solo tras confirmación:

Run: `npm run db:migrate`
Expected: la migración se aplica sin error; `pliego_proceso` existe en la base.

- [ ] **Step 3: Verificación manual en el navegador**

Con un usuario de prueba autenticado y al menos un match visible en `/mis-coincidencias`:
1. Abrir el bloque "Subir pliego" de una tarjeta.
2. Subir un PDF real de un Documento Base de SECOP (o cualquier PDF de prueba, para ver el flujo de error si `GEMINI_API_KEY` no está configurada en local).
3. Confirmar que redirige con el banner correspondiente (éxito o error).
4. Recargar la página y confirmar que la tarjeta ahora muestra "Pliego cargado ✓/✕" con los campos extraídos, sin tener que volver a subir el archivo.

- [ ] **Step 4: Commit (si hubo cambios, p. ej. ajustes menores tras la verificación manual)**

```bash
git add -A
git commit -m "chore(secop): aplica migración pliego_proceso y verifica el flujo end-to-end"
```
