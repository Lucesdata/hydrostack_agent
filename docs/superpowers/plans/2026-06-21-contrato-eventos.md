# Materializador de eventos contractuales (D-007) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Materializar la tabla `contrato_evento` detectando adiciones, prórrogas, suspensiones, terminaciones y cesiones por diff entre snapshots de `raw_record`.

**Architecture:** Núcleo PURO (`buildContratoEventos`, `groupAndSort`) que transforma grupos de snapshots ordenados en filas de evento, más un adaptador IO delgado (`rebuildContratoEventos`) que lee de `raw_record`, resuelve FKs y persiste con `DELETE`+`INSERT` transaccional (rebuild completo idempotente). Se cablea en `runTransform()` tras el upsert de contratos. La lógica de diff ya existe y probada en `events.ts` y NO se toca.

**Tech Stack:** TypeScript, Drizzle ORM (Neon serverless), Vitest, tsx CLI.

**Spec:** `docs/superpowers/specs/2026-06-19-materializador-eventos-design.md`

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `src/lib/transform/eventWriter.ts` | **crear** | Núcleo puro (`groupAndSort`, `buildContratoEventos`, tipos) + adaptador IO (`rebuildContratoEventos`, `EventMetrics`). |
| `src/__tests__/transform/eventWriter.test.ts` | **crear** | Tests puros del núcleo (sin BD). |
| `src/lib/transform/index.ts` | **modificar** | Exportar el nuevo módulo. |
| `src/lib/transform/orchestrator.ts` | **modificar** | `runTransform` llama al materializador; `TransformSummary` gana `eventos`. |
| `scripts/run-transform.ts` | **modificar** | Imprimir métricas de eventos. |
| `scripts/run-ingest.ts` | **modificar** | Imprimir métricas de eventos en `fmtTransform`. |
| `src/lib/transform/events.ts` | **sin cambios** | Lógica de diff existente. |
| `src/lib/db/schema/hechos.ts` | **sin cambios** | La tabla `contrato_evento` ya existe. |

---

## Task 1: Núcleo puro — `groupAndSort` + `buildContratoEventos`

**Files:**
- Create: `src/lib/transform/eventWriter.ts` (solo parte pura en esta task)
- Test: `src/__tests__/transform/eventWriter.test.ts`

- [ ] **Step 1: Write the failing test**

Crear `src/__tests__/transform/eventWriter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  buildContratoEventos,
  groupAndSort,
  type ContratoSnapshotRow,
} from '@/src/lib/transform/eventWriter';

// --- Helpers ----------------------------------------------------------------

/** Construye el payload crudo que `contratoSnapshotFromRow` sabe leer. */
function payload(o: {
  valor?: string;
  fechaFin?: string;
  estado?: string;
  doc?: string;
  tipoDoc?: string;
}): Record<string, unknown> {
  return {
    valor_del_contrato: o.valor,
    fecha_de_fin_del_contrato: o.fechaFin,
    estado_contrato: o.estado,
    documento_proveedor: o.doc,
    tipodocproveedor: o.tipoDoc,
  };
}

function snap(
  rawRecordId: string,
  sourceUpdatedAt: Date | null,
  ingestedAt: Date,
  p: Parameters<typeof payload>[0],
  sourceRecordId = 'C-1',
): ContratoSnapshotRow {
  return { rawRecordId, sourceRecordId, sourceUpdatedAt, ingestedAt, payload: payload(p) };
}

const D = (iso: string) => new Date(iso);
/** Generador de correlation_id determinista para asertar agrupación. */
function counter() {
  let n = 0;
  return () => `corr-${n++}`;
}

// --- groupAndSort -----------------------------------------------------------

describe('groupAndSort', () => {
  it('agrupa por source_record_id y ordena por source_updated_at asc', () => {
    const rows: ContratoSnapshotRow[] = [
      snap('r2', D('2024-03-01T00:00:00Z'), D('2024-03-01T00:00:00Z'), {}, 'C-1'),
      snap('r1', D('2024-01-01T00:00:00Z'), D('2024-01-01T00:00:00Z'), {}, 'C-1'),
      snap('r3', D('2024-02-01T00:00:00Z'), D('2024-02-01T00:00:00Z'), {}, 'C-2'),
    ];
    const g = groupAndSort(rows);
    expect([...g.keys()].sort()).toEqual(['C-1', 'C-2']);
    expect(g.get('C-1')!.map((s) => s.rawRecordId)).toEqual(['r1', 'r2']);
    expect(g.get('C-2')!.map((s) => s.rawRecordId)).toEqual(['r3']);
  });

  it('pone los snapshots sin source_updated_at al final (NULLS LAST), desempata por ingested_at', () => {
    const rows: ContratoSnapshotRow[] = [
      snap('rNull', null, D('2024-05-01T00:00:00Z'), {}),
      snap('rTs', D('2024-01-01T00:00:00Z'), D('2024-06-01T00:00:00Z'), {}),
    ];
    const g = groupAndSort(rows);
    expect(g.get('C-1')!.map((s) => s.rawRecordId)).toEqual(['rTs', 'rNull']);
  });
});

// --- buildContratoEventos ---------------------------------------------------

describe('buildContratoEventos', () => {
  it('un grupo de un solo snapshot no produce eventos', () => {
    const groups = [[snap('r1', D('2024-01-01T00:00:00Z'), D('2024-01-01T00:00:00Z'), { valor: '1000' })]];
    expect(buildContratoEventos(groups, counter())).toEqual([]);
  });

  it('adicion + prorroga en la misma transición comparten correlation_id', () => {
    const groups = [[
      snap('r1', D('2024-01-01T00:00:00Z'), D('2024-01-01T00:00:00Z'), { valor: '1000', fechaFin: '2024-12-31' }),
      snap('r2', D('2024-02-01T00:00:00Z'), D('2024-02-01T00:00:00Z'), { valor: '1500', fechaFin: '2025-06-30' }),
    ]];
    const out = buildContratoEventos(groups, counter());
    expect(out.map((e) => e.tipoEvento).sort()).toEqual(['adicion', 'prorroga']);
    expect(new Set(out.map((e) => e.correlationId)).size).toBe(1);
    expect(out[0].correlationId).toBe('corr-0');
  });

  it('propaga source_observed_at y raw_record_id del snapshot `next`', () => {
    const groups = [[
      snap('r1', D('2024-01-01T00:00:00Z'), D('2024-01-01T00:00:00Z'), { valor: '1000' }),
      snap('r2', D('2024-02-01T00:00:00Z'), D('2024-02-01T00:00:00Z'), { valor: '1500' }),
    ]];
    const [ev] = buildContratoEventos(groups, counter());
    expect(ev.rawRecordId).toBe('r2');
    expect(ev.sourceObservedAt).toEqual(D('2024-02-01T00:00:00Z'));
    expect(ev.valorAnterior).toBe(1000);
    expect(ev.valorNuevo).toBe(1500);
  });

  it('detecta cesión con los documentos de proveedor crudos', () => {
    const groups = [[
      snap('r1', D('2024-01-01T00:00:00Z'), D('2024-01-01T00:00:00Z'), { doc: '900123456', tipoDoc: 'NIT' }),
      snap('r2', D('2024-02-01T00:00:00Z'), D('2024-02-01T00:00:00Z'), { doc: '800111222', tipoDoc: 'NIT' }),
    ]];
    const out = buildContratoEventos(groups, counter());
    expect(out).toHaveLength(1);
    expect(out[0].tipoEvento).toBe('cesion');
    expect(out[0].docProveedorAnterior).toBe('900123456');
    expect(out[0].docProveedorNuevo).toBe('800111222');
  });

  it('suspensión y terminación en transiciones distintas usan correlation_id distintos', () => {
    const groups = [[
      snap('r1', D('2024-01-01T00:00:00Z'), D('2024-01-01T00:00:00Z'), { estado: 'En ejecución' }),
      snap('r2', D('2024-02-01T00:00:00Z'), D('2024-02-01T00:00:00Z'), { estado: 'Suspendido' }),
      snap('r3', D('2024-03-01T00:00:00Z'), D('2024-03-01T00:00:00Z'), { estado: 'Terminado' }),
    ]];
    const out = buildContratoEventos(groups, counter());
    expect(out.map((e) => e.tipoEvento)).toEqual(['suspension', 'terminacion']);
    expect(out[0].correlationId).toBe('corr-0');
    expect(out[1].correlationId).toBe('corr-1');
  });

  it('una transición sin cambios sustantivos no produce eventos', () => {
    const groups = [[
      snap('r1', D('2024-01-01T00:00:00Z'), D('2024-01-01T00:00:00Z'), { valor: '1000', estado: 'En ejecución' }),
      snap('r2', D('2024-02-01T00:00:00Z'), D('2024-02-01T00:00:00Z'), { valor: '1000', estado: 'En ejecución' }),
    ]];
    expect(buildContratoEventos(groups, counter())).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/transform/eventWriter.test.ts`
Expected: FAIL — `Failed to resolve import "@/src/lib/transform/eventWriter"` (el módulo no existe).

- [ ] **Step 3: Write the pure core**

Crear `src/lib/transform/eventWriter.ts` (SOLO la parte pura por ahora; el IO entra en Task 2):

```ts
/**
 * Materializador de eventos contractuales (D-007).
 *
 * Dos capas:
 *   · Núcleo PURO (este bloque): grupos de snapshots ORDENADOS → filas de
 *     evento. Sin BD, sin FKs. Toda la lógica testeable vive aquí.
 *   · Adaptador IO (Task 2): lee de raw_record, resuelve FKs, persiste.
 *
 * La detección campo-a-campo la hace `diffContrato` (events.ts, ya probada);
 * aquí solo se encadenan snapshots, se agrupan eventos por transición bajo un
 * `correlation_id` común (otrosí que adiciona y prorroga a la vez) y se ordena.
 */

import { randomUUID } from 'node:crypto';
import {
  contratoSnapshotFromRow,
  diffContrato,
  type TipoEvento,
} from './events';

/** Un snapshot de contrato leído de raw_record, listo para diffear. */
export interface ContratoSnapshotRow {
  rawRecordId: string;
  sourceRecordId: string;
  sourceUpdatedAt: Date | null; // timestamp fuente; null en ~43% de contratos
  ingestedAt: Date; // siempre presente (defaultNow en ingesta)
  payload: Record<string, unknown>;
}

/** Fila de evento lista para persistir SALVO las FKs de contrato/proveedor. */
export interface BuiltEventRow {
  sourceRecordId: string; // para resolver contrato_id en el IO
  tipoEvento: TipoEvento;
  correlationId: string;
  sourceObservedAt: Date | null;
  rawRecordId: string; // snapshot `next` que reveló el cambio
  valorAnterior: number | null;
  valorNuevo: number | null;
  fechaAnterior: string | null;
  fechaNueva: string | null;
  estadoAnterior: string | null;
  estadoNuevo: string | null;
  docProveedorAnterior: string | null; // NIT crudo; el IO resuelve la FK
  docProveedorNuevo: string | null;
}

/**
 * Orden cronológico (E-2): `source_updated_at` asc con NULLS LAST; desempate por
 * `ingested_at` asc; desempate final estable por `raw_record_id`.
 */
function compareSnapshots(a: ContratoSnapshotRow, b: ContratoSnapshotRow): number {
  const at = a.sourceUpdatedAt?.getTime() ?? null;
  const bt = b.sourceUpdatedAt?.getTime() ?? null;
  if (at !== bt) {
    if (at === null) return 1; // NULLS LAST
    if (bt === null) return -1;
    return at - bt;
  }
  const ai = a.ingestedAt.getTime();
  const bi = b.ingestedAt.getTime();
  if (ai !== bi) return ai - bi;
  return a.rawRecordId < b.rawRecordId ? -1 : a.rawRecordId > b.rawRecordId ? 1 : 0;
}

/** Agrupa snapshots por source_record_id y ordena cada grupo cronológicamente. */
export function groupAndSort(rows: ContratoSnapshotRow[]): Map<string, ContratoSnapshotRow[]> {
  const groups = new Map<string, ContratoSnapshotRow[]>();
  for (const r of rows) {
    const g = groups.get(r.sourceRecordId);
    if (g) g.push(r);
    else groups.set(r.sourceRecordId, [r]);
  }
  for (const g of groups.values()) g.sort(compareSnapshots);
  return groups;
}

/**
 * Núcleo puro: grupos de snapshots ORDENADOS → filas de evento. Recorre pares
 * consecutivos `(prev, next)` por grupo; los eventos de una misma transición
 * comparten `correlation_id`. `newCorrelationId` es inyectable para tests.
 */
export function buildContratoEventos(
  groups: ContratoSnapshotRow[][],
  newCorrelationId: () => string = randomUUID,
): BuiltEventRow[] {
  const out: BuiltEventRow[] = [];
  for (const group of groups) {
    for (let i = 1; i < group.length; i++) {
      const prev = group[i - 1];
      const next = group[i];
      const detected = diffContrato(
        contratoSnapshotFromRow(prev.payload),
        contratoSnapshotFromRow(next.payload),
      );
      if (detected.length === 0) continue;
      const correlationId = newCorrelationId();
      for (const ev of detected) {
        out.push({
          sourceRecordId: next.sourceRecordId,
          tipoEvento: ev.tipoEvento,
          correlationId,
          sourceObservedAt: next.sourceUpdatedAt,
          rawRecordId: next.rawRecordId,
          valorAnterior: ev.valorAnterior ?? null,
          valorNuevo: ev.valorNuevo ?? null,
          fechaAnterior: ev.fechaAnterior ?? null,
          fechaNueva: ev.fechaNueva ?? null,
          estadoAnterior: ev.estadoAnterior ?? null,
          estadoNuevo: ev.estadoNuevo ?? null,
          docProveedorAnterior: ev.docProveedorAnterior ?? null,
          docProveedorNuevo: ev.docProveedorNuevo ?? null,
        });
      }
    }
  }
  return out;
}
```

> Nota: `TipoEvento` ya se exporta desde `events.ts` (línea 21). No se redefine.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/transform/eventWriter.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/transform/eventWriter.ts src/__tests__/transform/eventWriter.test.ts
git commit -m "feat(eventos): núcleo puro buildContratoEventos + groupAndSort (D-007)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Adaptador IO — `rebuildContratoEventos`

**Files:**
- Modify: `src/lib/transform/eventWriter.ts` (append; no nuevo test — es IO, se valida por typecheck + E2E manual)

- [ ] **Step 1: Append the IO adapter**

Añadir al **inicio** de `src/lib/transform/eventWriter.ts`, junto a los imports existentes:

```ts
import { eq } from 'drizzle-orm';
import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
import { contrato, contratoEvento, proveedor, rawRecord } from '@/src/lib/db/schema';
import type * as schema from '@/src/lib/db/schema';
import { cleanText } from './normalize';
```

Y añadir al **final** del archivo:

```ts
// ===========================================================================
// Adaptador IO — lee raw_record, resuelve FKs, persiste (rebuild idempotente).
// ===========================================================================

type Db = NeonDatabase<typeof schema>;

const SOURCE_CONTRATOS = 'secop_ii_contratos';

export interface EventMetrics {
  gruposTotal: number; // source_record_ids distintos de contratos
  gruposMultiSnapshot: number; // grupos con ≥2 snapshots (pueden producir eventos)
  eventosInsertados: number;
  porTipo: Record<TipoEvento, number>;
  cesionesSinProveedorFk: number;
  gruposSinContrato: number; // grupos ≥2 snapshots sin contrato canónico
  gruposConError: number; // grupos saltados por payload corrupto
}

export function emptyEventMetrics(): EventMetrics {
  return {
    gruposTotal: 0,
    gruposMultiSnapshot: 0,
    eventosInsertados: 0,
    porTipo: { adicion: 0, prorroga: 0, suspension: 0, terminacion: 0, cesion: 0 },
    cesionesSinProveedorFk: 0,
    gruposSinContrato: 0,
    gruposConError: 0,
  };
}

/** Convierte una fila construida en fila de INSERT, resolviendo FKs de proveedor. */
function toInsertRow(
  b: BuiltEventRow,
  contratoId: string,
  proveedorByNit: Map<string, string>,
  m: EventMetrics,
): typeof contratoEvento.$inferInsert {
  let proveedorAnteriorId: string | null = null;
  let proveedorNuevoId: string | null = null;
  let delta: Record<string, unknown> | null = null;

  if (b.tipoEvento === 'cesion') {
    proveedorAnteriorId = b.docProveedorAnterior
      ? proveedorByNit.get(b.docProveedorAnterior) ?? null
      : null;
    proveedorNuevoId = b.docProveedorNuevo
      ? proveedorByNit.get(b.docProveedorNuevo) ?? null
      : null;
    if (proveedorAnteriorId === null || proveedorNuevoId === null) {
      m.cesionesSinProveedorFk++;
      delta = {
        docProveedorAnterior: b.docProveedorAnterior,
        docProveedorNuevo: b.docProveedorNuevo,
      };
    }
  }

  return {
    contratoId,
    tipoEvento: b.tipoEvento,
    correlationId: b.correlationId,
    sourceObservedAt: b.sourceObservedAt,
    valorAnterior: b.valorAnterior !== null ? String(b.valorAnterior) : null,
    valorNuevo: b.valorNuevo !== null ? String(b.valorNuevo) : null,
    fechaAnterior: b.fechaAnterior,
    fechaNueva: b.fechaNueva,
    estadoAnterior: b.estadoAnterior,
    estadoNuevo: b.estadoNuevo,
    proveedorAnteriorId,
    proveedorNuevoId,
    delta,
    rawRecordId: b.rawRecordId,
  };
}

/**
 * Materializa `contrato_evento` desde TODOS los snapshots de contratos en
 * `raw_record`. Rebuild completo idempotente: `DELETE` + `INSERT` transaccional
 * (E-1). Hoy, con 1 snapshot por contrato, produce 0 eventos — esperado.
 */
export async function rebuildContratoEventos(db: Db): Promise<EventMetrics> {
  const m = emptyEventMetrics();

  // 1. Mapa secop_contrato_id (normalizado con cleanText) → contrato.id.
  const contratoRows = await db
    .select({ id: contrato.id, secopId: contrato.secopContratoId })
    .from(contrato);
  const contratoBySecopId = new Map<string, string>();
  for (const r of contratoRows) {
    const key = cleanText(r.secopId);
    if (key) contratoBySecopId.set(key, r.id);
  }

  // 2. Mapa nit_canonico → proveedor.id (para resolver cesión).
  const provRows = await db
    .select({ id: proveedor.id, nit: proveedor.nitCanonico })
    .from(proveedor);
  const proveedorByNit = new Map(provRows.map((r) => [r.nit, r.id]));

  // 3. Todos los snapshots de contratos.
  const snaps = await db
    .select({
      rawRecordId: rawRecord.id,
      sourceRecordId: rawRecord.sourceRecordId,
      sourceUpdatedAt: rawRecord.sourceUpdatedAt,
      ingestedAt: rawRecord.ingestedAt,
      payload: rawRecord.payload,
    })
    .from(rawRecord)
    .where(eq(rawRecord.source, SOURCE_CONTRATOS));

  const rows: ContratoSnapshotRow[] = snaps.map((s) => ({
    rawRecordId: s.rawRecordId,
    sourceRecordId: s.sourceRecordId,
    sourceUpdatedAt: s.sourceUpdatedAt,
    ingestedAt: s.ingestedAt,
    payload: s.payload as Record<string, unknown>,
  }));

  // 4. Agrupar + ordenar.
  const grouped = groupAndSort(rows);
  m.gruposTotal = grouped.size;

  // 5. Construir filas (puro, aislando errores por grupo) y resolver FKs.
  const inserts: (typeof contratoEvento.$inferInsert)[] = [];
  for (const [srcId, group] of grouped) {
    if (group.length >= 2) m.gruposMultiSnapshot++;

    const contratoId = contratoBySecopId.get(cleanText(srcId) ?? '');
    if (!contratoId) {
      if (group.length >= 2) m.gruposSinContrato++;
      continue;
    }

    let built: BuiltEventRow[];
    try {
      built = buildContratoEventos([group]);
    } catch {
      m.gruposConError++;
      continue;
    }

    for (const b of built) {
      m.porTipo[b.tipoEvento]++;
      inserts.push(toInsertRow(b, contratoId, proveedorByNit, m));
    }
  }
  m.eventosInsertados = inserts.length;

  // 6. Persistir: rebuild completo atómico.
  await db.transaction(async (tx) => {
    await tx.delete(contratoEvento);
    if (inserts.length > 0) await tx.insert(contratoEvento).values(inserts);
  });

  return m;
}
```

- [ ] **Step 2: Verify the pure tests still pass**

Run: `npx vitest run src/__tests__/transform/eventWriter.test.ts`
Expected: PASS (8 tests) — el IO no afecta la parte pura.

- [ ] **Step 3: Typecheck the whole project**

Run: `npx tsc --noEmit`
Expected: sin errores. (Captura errores de tipo del IO, que no tiene test unitario.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/transform/eventWriter.ts
git commit -m "feat(eventos): adaptador IO rebuildContratoEventos + EventMetrics (D-007)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Cablear en el orchestrator

**Files:**
- Modify: `src/lib/transform/orchestrator.ts`
- Modify: `src/lib/transform/index.ts`

- [ ] **Step 1: Export the new module**

En `src/lib/transform/index.ts`, añadir la línea (orden alfabético junto a los demás export):

```ts
export * from './eventWriter';
```

- [ ] **Step 2: Wire `rebuildContratoEventos` into `runTransform`**

En `src/lib/transform/orchestrator.ts`:

(a) Añadir el import tras el bloque de imports de `./writers` (línea ~37):

```ts
import { rebuildContratoEventos, type EventMetrics } from './eventWriter';
```

(b) Extender `TransformSummary` (líneas 53-57) para incluir `eventos`:

```ts
export interface TransformSummary {
  batchId: string;
  procesos: SourceMetrics;
  contratos: SourceMetrics;
  eventos: EventMetrics;
}
```

(c) En `runTransform` (líneas 227-229), llamar al materializador DESPUÉS de contratos (necesita `contrato.id` y `proveedor.id` ya poblados) y devolverlo:

```ts
  const procesos = await transformProcesos(geo, batchId);
  const contratos = await transformContratos(geo, batchId);
  const eventos = await rebuildContratoEventos(db);
  return { batchId, procesos, contratos, eventos };
```

- [ ] **Step 3: Verify the full test suite stays green**

Run: `npm test`
Expected: PASS — todos los tests existentes + los 8 nuevos. Ningún test asume la forma anterior de `TransformSummary` (no hay test de orchestrator que toque BD).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/lib/transform/orchestrator.ts src/lib/transform/index.ts
git commit -m "feat(eventos): cablear rebuildContratoEventos en runTransform (D-007)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Imprimir métricas en los CLIs + actualizar graphify

**Files:**
- Modify: `scripts/run-transform.ts`
- Modify: `scripts/run-ingest.ts`

- [ ] **Step 1: Add event output to `run-transform.ts`**

En `scripts/run-transform.ts`:

(a) Extender los imports (línea 18). `EventMetrics` se importa directo de `eventWriter` (no del orchestrator), así no hace falta re-exportarlo:

```ts
import { runTransform, type SourceMetrics } from '@/src/lib/transform/orchestrator';
import type { EventMetrics } from '@/src/lib/transform/eventWriter';
```

(b) Añadir esta función tras `fmt` (después de la línea 44):

```ts
function fmtEventos(m: EventMetrics): string {
  return [
    'eventos (contrato_evento):',
    `  grupos total:               ${m.gruposTotal}`,
    `  grupos multi-snapshot:      ${m.gruposMultiSnapshot}`,
    `  eventos insertados:         ${m.eventosInsertados}`,
    `    adicion:                  ${m.porTipo.adicion}`,
    `    prorroga:                 ${m.porTipo.prorroga}`,
    `    suspension:               ${m.porTipo.suspension}`,
    `    terminacion:              ${m.porTipo.terminacion}`,
    `    cesion:                   ${m.porTipo.cesion}`,
    `  cesiones sin proveedor FK:  ${m.cesionesSinProveedorFk}`,
    `  grupos sin contrato:        ${m.gruposSinContrato}`,
    `  grupos con error:           ${m.gruposConError}`,
  ].join('\n');
}
```

(c) Imprimir el bloque antes del "terminado" (entre líneas 56 y 57):

```ts
  process.stdout.write(`${fmt('contratos (secop_ii_contratos)', summary.contratos)}\n\n`);
  process.stdout.write(`${fmtEventos(summary.eventos)}\n\n`);
  process.stdout.write(`transform terminado en ${ms}ms\n`);
```

- [ ] **Step 2: Add event output to `run-ingest.ts`**

En `scripts/run-ingest.ts`, extender `fmtTransform` (líneas 161-172) para añadir una línea de resumen de eventos al final del array:

```ts
function fmtTransform(t: TransformSummary): string {
  return [
    `transform (batch ${t.batchId.slice(0, 8)}):`,
    `  procesos:  ${t.procesos.procesosUpsert} upsert · ${t.procesos.entidadesUpsert} entidades · ` +
      `geo ${t.procesos.geografiaResuelta}/${t.procesos.geografiaResuelta + t.procesos.geografiaNoResuelta} · ` +
      `cuarentena ${t.procesos.cuarentena}`,
    `  contratos: ${t.contratos.contratosUpsert} upsert · ${t.contratos.proveedoresUpsert} proveedores · ` +
      `geo ${t.contratos.geografiaResuelta}/${t.contratos.geografiaResuelta + t.contratos.geografiaNoResuelta} · ` +
      `centinela ${t.contratos.proveedorCentinela} · sin-proc ${t.contratos.procesoNoEncontrado} · ` +
      `cuarentena ${t.contratos.cuarentena}`,
    `  eventos:   ${t.eventos.eventosInsertados} insertados · ` +
      `${t.eventos.gruposMultiSnapshot} grupos multi-snapshot · ` +
      `adic ${t.eventos.porTipo.adicion} · pror ${t.eventos.porTipo.prorroga} · ` +
      `susp ${t.eventos.porTipo.suspension} · term ${t.eventos.porTipo.terminacion} · ` +
      `ces ${t.eventos.porTipo.cesion}`,
  ].join('\n');
}
```

- [ ] **Step 3: Typecheck both scripts**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Full verification**

Run: `npm test`
Expected: PASS (toda la suite). Confirmar a ojo el conteo: los 8 nuevos de `eventWriter.test.ts` están incluidos.

- [ ] **Step 5: Update graphify**

Run: `graphify update .`
Expected: el grafo se actualiza (AST-only, sin costo de API). Per `CLAUDE.md`.

- [ ] **Step 6: Commit**

```bash
git add scripts/run-transform.ts scripts/run-ingest.ts graphify-out/
git commit -m "feat(eventos): imprimir métricas de eventos en CLIs + graphify (D-007)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Verification final (checklist de cierre)

- [ ] `npm test` verde, incluye los 8 tests de `eventWriter.test.ts`.
- [ ] `npx tsc --noEmit` sin errores.
- [ ] `events.ts` y `hechos.ts` sin cambios (verificar con `git diff --stat main`).
- [ ] (Cuando haya datos) corrida E2E manual: `npm run db:transform` imprime el bloque de eventos sin lanzar; con la muestra actual (1 snapshot/contrato) → `eventos insertados: 0`, `grupos multi-snapshot: 0`. Eso es correcto, no un fallo.

---

## Self-Review (cobertura del spec)

| Requisito del spec | Task |
|---|---|
| §4 núcleo puro `buildContratoEventos` | Task 1 |
| §4 adaptador IO `rebuildContratoEventos` | Task 2 |
| §5.1 join con `cleanText` en ambos lados | Task 2 (paso 1, mapa contrato) |
| §5.3 orden source_updated_at NULLS LAST → ingested_at | Task 1 (`compareSnapshots`) + test |
| §5.5 resolución FK proveedor; null + `delta` si no resuelve | Task 2 (`toInsertRow`) |
| §5 procedencia source_observed_at / raw_record_id = `next` | Task 1 + test |
| §6 transacción DELETE+INSERT | Task 2 (paso 6) |
| §6 payload corrupto → cuenta y sigue | Task 2 (try/catch por grupo) |
| §6 grupo sin contrato → omite y cuenta | Task 2 |
| §7 `EventMetrics` con todos los campos | Task 2 + impresión Task 4 |
| §8 test puro, casos 1-7 | Task 1 (8 tests) |
| §8 inyección de `correlation_id` para determinismo | Task 1 (`newCorrelationId` param) |
| §9 cableado orchestrator + index export | Task 3 |
