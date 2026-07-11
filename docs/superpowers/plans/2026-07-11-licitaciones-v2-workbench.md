# Licitaciones v2 — Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar `/licitaciones` como workbench master-detail (lista compacta + panel de detalle) con filtro de apertura por defecto, orden configurable y contador total de resultados.

**Architecture:** Backend: 2 params nuevos (`apertura`, `orden`) + consulta count paralela en el route handler — la construcción del `$where` se extrae a una función pura testeable. Frontend: `SecopExplorer.tsx` se divide en orquestador + `ProcessList` + `ProcessDetail` + utilidades puras de presentación (`format.ts`), manteniendo el clear theme `clr-*` y el patrón de CSS embebido.

**Tech Stack:** Next.js 15 App Router, React 18 client components, Vitest, SODA/SoQL (datos.gov.co).

**Spec:** `docs/superpowers/specs/2026-07-11-licitaciones-v2-workbench-design.md`

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/lib/secop/types.ts` (mod) | `SecopQuery` += `apertura`, `orden` |
| `src/lib/secop/client.ts` (mod) | `buildProcesosWhere()` exportada, `ORDER_SOQL`, `countProcesos()`, `$select` en `SodaParams` |
| `app/api/secop/route.ts` (mod) | Parseo de params nuevos, count paralelo, `total` en la respuesta |
| `src/components/secop/format.ts` (new) | Utilidades puras: `sentenceCaseTitle`, `formatCopCompact`, `formatCopFull`, `verdictScore` |
| `src/components/secop/ProcessList.tsx` (new) | Lista de filas compactas + skeleton + empty state |
| `src/components/secop/ProcessDetail.tsx` (new) | Panel de detalle: badges, datos, bloque de elegibilidad, descripción, CTA |
| `src/components/secop/SecopExplorer.tsx` (rewrite) | Orquestador: estado, fetch, auto-select, auto-probe, layout responsive, CSS |
| `src/__tests__/secop/client-query.test.ts` (new) | Tests de `buildProcesosWhere`, `ORDER_SOQL`, `countProcesos` |
| `src/__tests__/secop/route-parse.test.ts` (new) | Tests de `parseQuery` |
| `src/__tests__/secop/format.test.ts` (new) | Tests de las utilidades de presentación |

Nota de convención: tests en español con `describe`/`it` (ver `src/__tests__/secop/datasetResolver.test.ts`), imports con alias `@/`.

---

### Task 1: Query — params `apertura` y `orden` con builder puro

**Files:**
- Modify: `src/lib/secop/types.ts:60-73`
- Modify: `src/lib/secop/client.ts:140-165`
- Test: `src/__tests__/secop/client-query.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

```ts
// src/__tests__/secop/client-query.test.ts
import { describe, it, expect } from 'vitest';
import { buildProcesosWhere, ORDER_SOQL } from '@/src/lib/secop/client';
import { FIELDS_PROCESOS } from '@/src/lib/secop/config';

const F = FIELDS_PROCESOS;

describe('buildProcesosWhere', () => {
  it('sin filtros (y sin agua) devuelve cadena vacía', () => {
    expect(buildProcesosWhere({ soloAgua: false })).toBe('');
  });

  it('incluye la cláusula de apertura cuando se pide', () => {
    const w = buildProcesosWhere({ soloAgua: false, apertura: 'Abierto' });
    expect(w).toBe(`${F.estadoApertura} = 'Abierto'`);
  });

  it('combina apertura con otros filtros usando AND', () => {
    const w = buildProcesosWhere({
      soloAgua: false,
      departamento: 'CAUCA',
      apertura: 'Abierto',
    });
    expect(w).toContain(`upper(${F.departamento}) = 'CAUCA'`);
    expect(w).toContain(' AND ');
    expect(w).toContain(`${F.estadoApertura} = 'Abierto'`);
  });

  it('escapa comillas simples en filtros de texto', () => {
    const w = buildProcesosWhere({ soloAgua: false, estado: "O'Neil" });
    expect(w).toContain("O''Neil");
  });

  it('con soloAgua default incluye el OR de keywords del sector', () => {
    const w = buildProcesosWhere({});
    expect(w).toContain('like');
  });
});

describe('ORDER_SOQL', () => {
  it('mapea fecha y valor a las columnas SoQL correctas', () => {
    expect(ORDER_SOQL.fecha).toBe(`${F.fechaPublicacion} DESC`);
    expect(ORDER_SOQL.valor).toBe(`${F.precioBase} DESC`);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx vitest run src/__tests__/secop/client-query.test.ts`
Expected: FAIL — `buildProcesosWhere` no está exportada.

- [ ] **Step 3: Implementar tipos + builder**

En `src/lib/secop/types.ts`, dentro de `SecopQuery` (después de `desde`):

```ts
  /** Filtra por apertura del proceso (Abierto = aún recibe ofertas). */
  apertura?: EstadoApertura;
  /** Orden: fecha de publicación desc (default) o precio base desc. */
  orden?: 'fecha' | 'valor';
```

En `src/lib/secop/client.ts`, antes de `searchProcesos`:

```ts
/** Orden SoQL soportado, mapeado desde SecopQuery.orden. */
export const ORDER_SOQL = {
  fecha: `${F.fechaPublicacion} DESC`,
  valor: `${F.precioBase} DESC`,
} as const;

/**
 * Construye el $where de PROCESOS a partir del query normalizado.
 * Pura (sin red) para poder testearla; searchProcesos y countProcesos la comparten.
 */
export function buildProcesosWhere(query: SecopQuery): string {
  return andWhere(
    query.soloAgua !== false ? buildAguaWhere() : null, // por defecto, solo agua
    query.departamento
      ? `upper(${F.departamento}) = '${soqlEscape(query.departamento.toUpperCase())}'`
      : null,
    query.estado ? `${F.estado} = '${soqlEscape(query.estado)}'` : null,
    query.valorMin != null ? `${F.precioBase} >= ${query.valorMin}` : null,
    query.desde ? `${F.fechaPublicacion} >= '${soqlEscape(query.desde)}'` : null,
    query.apertura ? `${F.estadoApertura} = '${soqlEscape(query.apertura)}'` : null,
  );
}
```

Y en `searchProcesos`, reemplazar el bloque `const where = andWhere(...)` por:

```ts
  const where = buildProcesosWhere(query);
```

y la línea `$order` por:

```ts
    $order: ORDER_SOQL[query.orden ?? 'fecha'],
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npx vitest run src/__tests__/secop/client-query.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Suite completa + commit**

Run: `npx vitest run` → Expected: PASS sin regresiones.

```bash
git add src/lib/secop/types.ts src/lib/secop/client.ts src/__tests__/secop/client-query.test.ts
git commit -m "feat(secop): params apertura y orden con builder de \$where puro"
```

---

### Task 2: `countProcesos` — contador total (patrón PLACE)

**Files:**
- Modify: `src/lib/secop/client.ts:68-74` (SodaParams) y nueva función
- Test: `src/__tests__/secop/client-query.test.ts` (append)

- [ ] **Step 1: Escribir los tests que fallan**

Append a `src/__tests__/secop/client-query.test.ts` (y agregar `vi`, `beforeEach`, `afterEach` al import de vitest):

```ts
import { countProcesos } from '@/src/lib/secop/client';

vi.mock('@/src/lib/secop/datasetResolver', () => ({
  resolveDatasetId: vi.fn().mockResolvedValue('p6dx-8zbt'),
}));

describe('countProcesos', () => {
  const okResponse = (body: unknown) =>
    ({ ok: true, json: async () => body }) as Response;

  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('devuelve el count numérico de la respuesta SODA', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse([{ count: '2208' }]));
    expect(await countProcesos({ soloAgua: false })).toBe(2208);
  });

  it('pide $select=count(*) con el mismo $where', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse([{ count: '1' }]));
    await countProcesos({ soloAgua: false, apertura: 'Abierto' });
    const url = new URL(vi.mocked(fetch).mock.calls[0][0] as string);
    expect(url.searchParams.get('$select')).toBe('count(*) as count');
    expect(url.searchParams.get('$where')).toContain("= 'Abierto'");
  });

  it('devuelve undefined si la consulta falla (nunca bloquea resultados)', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('boom'));
    expect(await countProcesos({ soloAgua: false })).toBeUndefined();
  });

  it('devuelve undefined si el count no es numérico', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse([{ count: 'NaN?' }]));
    expect(await countProcesos({ soloAgua: false })).toBeUndefined();
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx vitest run src/__tests__/secop/client-query.test.ts`
Expected: FAIL — `countProcesos` no existe.

- [ ] **Step 3: Implementar**

En `SodaParams` agregar:

```ts
  $select?: string;
```

Después de `buildProcesosWhere` en `client.ts`:

```ts
/**
 * Total de PROCESOS que matchean el query (para "Página X de Y" y el contador).
 * Best-effort: si SODA falla, devuelve undefined y la UI degrada sin total.
 */
export async function countProcesos(query: SecopQuery = {}): Promise<number | undefined> {
  try {
    const where = buildProcesosWhere(query);
    const rows = await sodaFetch<{ count?: string }>(await resolveDatasetId('procesos'), {
      $select: 'count(*) as count',
      $where: where || undefined,
      $q: query.q ? soqlEscape(query.q) : undefined,
      $limit: 1,
      $offset: 0,
    });
    const n = Number(rows[0]?.count);
    return Number.isFinite(n) ? n : undefined;
  } catch {
    return undefined;
  }
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npx vitest run src/__tests__/secop/client-query.test.ts` → PASS.
Run: `npx vitest run` → PASS (el mock de datasetResolver es local al archivo).

- [ ] **Step 5: Commit**

```bash
git add src/lib/secop/client.ts src/__tests__/secop/client-query.test.ts
git commit -m "feat(secop): countProcesos para contador total de resultados"
```

---

### Task 3: Route handler — params nuevos + `total`

> **Ajuste durante ejecución:** Next.js App Router no permite exports arbitrarios
> en archivos de ruta (`"parseQuery" is not a valid Route export field`), así que
> `parseQuery` vive en `src/lib/secop/parse-query.ts` (nuevo módulo) y el test
> importa de ahí. El route handler solo exporta `GET` y `runtime`.

**Files:**
- Create: `src/lib/secop/parse-query.ts` (parseQuery movida desde route.ts)
- Modify: `app/api/secop/route.ts:26-61`
- Test: `src/__tests__/secop/route-parse.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

```ts
// src/__tests__/secop/route-parse.test.ts
import { describe, it, expect } from 'vitest';
import { parseQuery } from '@/app/api/secop/route';

describe('parseQuery', () => {
  it('acepta apertura Abierto/Cerrado y rechaza otros valores', () => {
    expect(parseQuery(new URLSearchParams('apertura=Abierto')).apertura).toBe('Abierto');
    expect(parseQuery(new URLSearchParams('apertura=Cerrado')).apertura).toBe('Cerrado');
    expect(parseQuery(new URLSearchParams('apertura=hack')).apertura).toBeUndefined();
    expect(parseQuery(new URLSearchParams()).apertura).toBeUndefined();
  });

  it('acepta orden fecha/valor y rechaza otros valores', () => {
    expect(parseQuery(new URLSearchParams('orden=valor')).orden).toBe('valor');
    expect(parseQuery(new URLSearchParams('orden=fecha')).orden).toBe('fecha');
    expect(parseQuery(new URLSearchParams('orden=xxx')).orden).toBeUndefined();
  });

  it('mantiene el parseo existente (q, valorMin, soloAgua)', () => {
    const q = parseQuery(new URLSearchParams('q=ptar&valorMin=1000&soloAgua=false'));
    expect(q.q).toBe('ptar');
    expect(q.valorMin).toBe(1000);
    expect(q.soloAgua).toBe(false);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx vitest run src/__tests__/secop/route-parse.test.ts`
Expected: FAIL — `parseQuery` no está exportada.

- [ ] **Step 3: Implementar**

En `app/api/secop/route.ts`:

1. Import: agregar `countProcesos` al import de client y `EstadoApertura` al de types:

```ts
import { searchProcesos, searchContratos, countProcesos } from "@/src/lib/secop/client";
import type { SecopQuery, EstadoApertura } from "@/src/lib/secop/types";
```

2. `function parseQuery` → `export function parseQuery`, y dentro del objeto retornado agregar:

```ts
    apertura: (["Abierto", "Cerrado"] as const).includes(
      sp.get("apertura") as EstadoApertura,
    )
      ? (sp.get("apertura") as EstadoApertura)
      : undefined,
    orden:
      sp.get("orden") === "valor" ? "valor"
      : sp.get("orden") === "fecha" ? "fecha"
      : undefined,
```

3. En el `GET`, reemplazar el bloque de procesos por count en paralelo:

```ts
    // Procesos: veredicto Nivel 0 por ítem + total (count SODA en paralelo,
    // best-effort — si falla, total queda undefined y la UI degrada).
    const [result, total] = await Promise.all([
      searchProcesos(query),
      countProcesos(query),
    ]);
    const items = result.items.map((p) => ({
      ...p,
      verdict: buildVerdict(OFERENTE_PILOTO, toVerdictInput(p)),
    }));
    return NextResponse.json({ ...result, total, items });
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npx vitest run` → PASS.

- [ ] **Step 5: Verificación manual del endpoint**

Run: `npm run dev` (en background) y luego:
`curl -s "http://localhost:3000/api/secop?apertura=Abierto&orden=valor" | head -c 400`
Expected: JSON con `"total":` numérico e items con `estadoApertura: "Abierto"`. Detener el dev server.

- [ ] **Step 6: Commit**

```bash
git add app/api/secop/route.ts src/__tests__/secop/route-parse.test.ts
git commit -m "feat(api/secop): params apertura/orden y total en la respuesta"
```

---

### Task 4: Utilidades de presentación (`format.ts`)

**Files:**
- Create: `src/components/secop/format.ts`
- Test: `src/__tests__/secop/format.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

```ts
// src/__tests__/secop/format.test.ts
import { describe, it, expect } from 'vitest';
import {
  sentenceCaseTitle,
  formatCopCompact,
  formatCopFull,
  formatShortDate,
  verdictScore,
} from '@/src/components/secop/format';
import type { Verdict, GateResult, GateStatus } from '@/src/lib/secop/verdict';

function gate(status: GateStatus, requiredLevel: 0 | 2 = 0): GateResult {
  return { status, reason: 'test', resolvedBy: 'metadata', requiredLevel };
}

function makeVerdict(
  s: [GateStatus, GateStatus, GateStatus, GateStatus, GateStatus],
): Verdict {
  return {
    overall: 'WARN',
    gates: {
      sectorial: gate(s[0]),
      cuantia: gate(s[1]),
      plazo: gate(s[2]),
      ubicacion: gate(s[3]),
      habilitacion: gate(s[4], 2),
    },
  } as Verdict;
}

describe('sentenceCaseTitle', () => {
  it('convierte títulos EN MAYÚSCULAS a sentence case', () => {
    expect(sentenceCaseTitle('CONSTRUCCION DEL ALCANTARILLADO PLUVIAL')).toBe(
      'Construccion del alcantarillado pluvial',
    );
  });

  it('preserva siglas conocidas del sector', () => {
    expect(sentenceCaseTitle('OPTIMIZACIÓN DE LA PTAP MUNICIPAL')).toBe(
      'Optimización de la PTAP municipal',
    );
  });

  it('no toca títulos que ya vienen en caso mixto', () => {
    expect(sentenceCaseTitle('Interventoría acueducto La Cumbre')).toBe(
      'Interventoría acueducto La Cumbre',
    );
  });
});

describe('formatCopCompact', () => {
  it('abrevia millones con separador es-CO', () => {
    expect(formatCopCompact(2_450_000_000)).toBe('$2.450 M');
  });
  it('muestra valores pequeños completos', () => {
    expect(formatCopCompact(850_000)).toContain('850.000');
  });
  it('null → guion', () => {
    expect(formatCopCompact(null)).toBe('—');
    expect(formatCopFull(null)).toBe('—');
  });
});

describe('formatShortDate', () => {
  it('formatea ISO a día + mes corto', () => {
    expect(formatShortDate('2026-07-02T00:00:00.000')).toBe('2 jul');
  });
  it('null o inválida → cadena vacía', () => {
    expect(formatShortDate(null)).toBe('');
    expect(formatShortDate('no-es-fecha')).toBe('');
  });
});

describe('verdictScore', () => {
  it('cuenta PASS y asigna tono success con 4+', () => {
    expect(verdictScore(makeVerdict(['PASS', 'PASS', 'PASS', 'PASS', 'UNKNOWN'])))
      .toEqual({ pass: 4, total: 5, tone: 'success' });
  });
  it('tono warn con 2-3 PASS', () => {
    expect(verdictScore(makeVerdict(['PASS', 'PASS', 'FAIL', 'FAIL', 'UNKNOWN'])).tone)
      .toBe('warn');
  });
  it('tono fail con 0-1 PASS (y no todo UNKNOWN)', () => {
    expect(verdictScore(makeVerdict(['FAIL', 'FAIL', 'PASS', 'FAIL', 'UNKNOWN'])).tone)
      .toBe('fail');
  });
  it('tono neutral cuando todo es UNKNOWN', () => {
    expect(
      verdictScore(makeVerdict(['UNKNOWN', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN'])).tone,
    ).toBe('neutral');
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx vitest run src/__tests__/secop/format.test.ts`
Expected: FAIL — módulo no existe.

- [ ] **Step 3: Implementar**

```ts
// src/components/secop/format.ts
/**
 * Utilidades puras de presentación para la sección Licitaciones.
 * Sin React ni red: testeables de forma aislada.
 */

import type { Verdict } from '@/src/lib/secop/verdict';

/** Siglas del sector que deben conservarse en mayúsculas al normalizar títulos. */
const ACRONYMS = ['PTAP', 'PTAR', 'PTAT', 'ESP', 'SENA', 'INVIAS', 'PDA', 'SGP'];

/**
 * SECOP publica títulos EN MAYÚSCULAS. Los baja a sentence case preservando
 * siglas conocidas. Los títulos que ya vienen en caso mixto no se tocan.
 */
export function sentenceCaseTitle(raw: string): string {
  const s = raw.trim();
  if (!s) return s;
  const letters = s.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g, '');
  const isShouting = letters.length > 0 && letters === letters.toUpperCase();
  if (!isShouting) return s;
  const lower = s.toLowerCase();
  let out = lower.charAt(0).toUpperCase() + lower.slice(1);
  for (const a of ACRONYMS) {
    out = out.replace(new RegExp(`\\b${a.toLowerCase()}\\b`, 'g'), a);
  }
  return out;
}

const COP_FULL = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** Valor COP completo ("$ 2.450.000.000") o guion si es null. */
export function formatCopFull(value: number | null): string {
  return value == null ? '—' : COP_FULL.format(value);
}

/** Valor COP abreviado en millones ("$2.450 M") para la lista compacta. */
export function formatCopCompact(value: number | null): string {
  if (value == null) return '—';
  if (value < 1_000_000) return COP_FULL.format(value);
  const millones = Math.round(value / 1_000_000);
  return `$${millones.toLocaleString('es-CO')} M`;
}

/** Fecha corta para la fila de lista ("2 jul"). Vacía si null/ inválida. */
export function formatShortDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d
    .toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
    .replace(/\./g, '');
}

export type ScoreTone = 'success' | 'warn' | 'fail' | 'neutral';

export interface VerdictScore {
  pass: number;
  total: number;
  tone: ScoreTone;
}

/** Resume el veredicto como score n/5 con tono para el indicador de la lista. */
export function verdictScore(v: Verdict): VerdictScore {
  const statuses = Object.values(v.gates).map((g) => g.status);
  const total = statuses.length;
  const pass = statuses.filter((st) => st === 'PASS').length;
  if (statuses.every((st) => st === 'UNKNOWN')) return { pass, total, tone: 'neutral' };
  const tone: ScoreTone = pass >= 4 ? 'success' : pass >= 2 ? 'warn' : 'fail';
  return { pass, total, tone };
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npx vitest run src/__tests__/secop/format.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/secop/format.ts src/__tests__/secop/format.test.ts
git commit -m "feat(secop): utilidades de presentación (sentence case, COP compacto, score)"
```

---

### Task 5: `ProcessList` — filas compactas

**Files:**
- Create: `src/components/secop/ProcessList.tsx`

Sin test unitario de componente (el proyecto no tiene testing-library); se verifica con `npm run build` aquí y visualmente en Task 8.

- [ ] **Step 1: Implementar el componente**

```tsx
// src/components/secop/ProcessList.tsx
"use client";

/**
 * Lista compacta de procesos (columna izquierda del workbench).
 * Presentación pura: el estado (selección, datos) vive en SecopExplorer.
 */

import type { SecopProceso } from "@/src/lib/secop/types";
import type { Verdict } from "@/src/lib/secop/verdict";
import { sentenceCaseTitle, formatCopCompact, formatShortDate, verdictScore } from "./format";

/** Proceso con veredicto Nivel 0 adjunto por /api/secop. */
export type ProcesoVeredicto = SecopProceso & { verdict?: Verdict };

/** Estados del procedimiento que se consideran "no vivos" para la UI. */
const ESTADOS_CERRADOS = ["Cancelado", "Desierto"];

interface Props {
  items: ProcesoVeredicto[];
  selectedId: string | null;
  onSelect: (p: ProcesoVeredicto) => void;
  loading: boolean;
}

export default function ProcessList({ items, selectedId, onSelect, loading }: Props) {
  if (loading) {
    return (
      <div className="clr-plist" aria-busy="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="clr-prow clr-prow--skel" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <div className="clr-secop-empty">Sin resultados para estos filtros.</div>;
  }

  return (
    <div className="clr-plist" role="listbox" aria-label="Procesos de contratación">
      {items.map((p) => {
        const closed =
          p.estadoApertura === "Cerrado" || ESTADOS_CERRADOS.includes(p.estado);
        const score = p.verdict ? verdictScore(p.verdict) : null;
        return (
          <button
            key={p.id}
            type="button"
            role="option"
            aria-selected={p.id === selectedId}
            className={`clr-prow${p.id === selectedId ? " is-selected" : ""}${closed ? " is-closed" : ""}`}
            onClick={() => onSelect(p)}
          >
            {closed && p.estado && (
              <span className="clr-prow-state">{p.estado.toUpperCase()}</span>
            )}
            <span className="clr-prow-title">
              {sentenceCaseTitle(p.nombre || p.referencia)}
            </span>
            <span className="clr-prow-meta">
              {p.entidad}
              {p.departamento ? ` · ${p.departamento}` : ""}
              {formatShortDate(p.fechaPublicacion)
                ? ` · ${formatShortDate(p.fechaPublicacion)}`
                : ""}
            </span>
            <span className="clr-prow-foot">
              <span className="clr-prow-val">
                {formatCopCompact(p.valorAdjudicacion ?? p.precioBase)}
              </span>
              {score && (
                <span className={`clr-prow-score clr-prow-score--${score.tone}`}>
                  <span className="clr-prow-dot" />
                  {score.pass}/{score.total}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit 2>&1 | grep -i processlist` (o `npm run build` si el proyecto no tiene script de typecheck)
Expected: sin errores en el archivo nuevo.

- [ ] **Step 3: Commit**

```bash
git add src/components/secop/ProcessList.tsx
git commit -m "feat(secop): componente ProcessList — filas compactas con score"
```

---

### Task 6: `ProcessDetail` — panel de detalle con elegibilidad explicada

**Files:**
- Create: `src/components/secop/ProcessDetail.tsx`

- [ ] **Step 1: Implementar el componente**

```tsx
// src/components/secop/ProcessDetail.tsx
"use client";

/**
 * Panel de detalle del workbench: badges, datos clave, bloque de elegibilidad
 * (compuertas con razones visibles), descripción y CTA a SECOP II.
 * El padre lo monta con key={proceso.id} para resetear el estado interno.
 */

import { useState } from "react";
import type { DocumentAccess } from "@/src/lib/secop/document-access";
import type { Verdict, GateStatus } from "@/src/lib/secop/verdict";
import { formatCopFull, sentenceCaseTitle } from "./format";
import type { ProcesoVeredicto } from "./ProcessList";

const ACCESS_LABEL: Record<DocumentAccess, string> = {
  PUBLIC: "Documentos públicos",
  RESTRICTED: "Documentos restringidos",
  NOT_PUBLISHED: "Documentos sin publicar",
  UNKNOWN: "Acceso por confirmar",
};
const ACCESS_CLASS: Record<DocumentAccess, string> = {
  PUBLIC: "success",
  RESTRICTED: "warning",
  NOT_PUBLISHED: "warning",
  UNKNOWN: "neutral",
};

const STATUS: Record<GateStatus, { cls: string; glyph: string }> = {
  PASS: { cls: "pass", glyph: "✓" },
  WARN: { cls: "warn", glyph: "!" },
  FAIL: { cls: "fail", glyph: "✕" },
  UNKNOWN: { cls: "unknown", glyph: "?" },
};

const GATE_LABEL: Array<[keyof Verdict["gates"], string]> = [
  ["sectorial", "Sector"],
  ["cuantia", "Cuantía"],
  ["plazo", "Plazo"],
  ["ubicacion", "Zona"],
  ["habilitacion", "Habilitación"],
];

interface Props {
  proceso: ProcesoVeredicto;
  access: { state: DocumentAccess; message: string };
  probing: boolean;
  /** Solo móvil: cierra el overlay. */
  onBack: () => void;
}

export default function ProcessDetail({ proceso: p, access, probing, onBack }: Props) {
  const [expanded, setExpanded] = useState(false);
  const v = p.verdict;
  const passCount = v
    ? Object.values(v.gates).filter((g) => g.status === "PASS").length
    : 0;

  return (
    <article className="clr-pdetail-card">
      <button type="button" className="clr-pdetail-back" onClick={onBack}>
        ← Volver a resultados
      </button>

      <div className="clr-pdetail-badges">
        <span
          className={`clr-badge clr-badge--${p.estadoApertura === "Abierto" ? "accent" : "neutral"}`}
        >
          {(p.estadoApertura ?? p.estado ?? "—").toUpperCase()}
        </span>
        {p.modalidad && <span className="clr-badge clr-badge--neutral">{p.modalidad}</span>}
        {p.tipoContrato && (
          <span className="clr-badge clr-badge--neutral">{p.tipoContrato}</span>
        )}
      </div>

      <h2 className="clr-pdetail-title">{sentenceCaseTitle(p.nombre || p.referencia)}</h2>
      <p className="clr-secop-entity">{p.entidad}</p>

      <div className="clr-pdetail-facts">
        <div>
          <span className="clr-pdetail-label">Valor base</span>
          <span className="clr-pdetail-val">
            {formatCopFull(p.valorAdjudicacion ?? p.precioBase)}
          </span>
        </div>
        <div>
          <span className="clr-pdetail-label">Publicado</span>
          <span>
            {p.fechaPublicacion
              ? new Date(p.fechaPublicacion).toLocaleDateString("es-CO")
              : "—"}
          </span>
        </div>
        <div>
          <span className="clr-pdetail-label">Referencia</span>
          <span className="clr-pdetail-ref">{p.referencia || "—"}</span>
        </div>
        <div>
          <span className="clr-pdetail-label">Ubicación</span>
          <span>
            {p.departamento}
            {p.ciudad ? ` · ${p.ciudad}` : ""}
          </span>
        </div>
      </div>

      {v && (
        <section className="clr-elig" aria-label="Elegibilidad">
          <header className="clr-elig-head">
            <span>Elegibilidad · nivel 0</span>
            <span className="clr-elig-count">{passCount} de {GATE_LABEL.length} compuertas</span>
          </header>
          <div className="clr-elig-bar">
            {GATE_LABEL.map(([key]) => (
              <span key={key} className={`clr-elig-seg clr-elig-seg--${STATUS[v.gates[key].status].cls}`} />
            ))}
          </div>
          <ul className="clr-elig-gates">
            {GATE_LABEL.map(([key, label]) => {
              const g = v.gates[key];
              const s = STATUS[g.status];
              return (
                <li key={key} className="clr-elig-gate">
                  <span className={`clr-elig-glyph clr-elig-glyph--${s.cls}`}>{s.glyph}</span>
                  <span className="clr-elig-name">{label}</span>
                  <span className="clr-elig-reason">
                    {g.reason}
                    {g.requiredLevel === 2 ? " · requiere revisar pliego (nivel 2)" : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {p.descripcion && (
        <div className={`clr-pdetail-desc${expanded ? " is-expanded" : ""}`}>
          <p>{p.descripcion}</p>
          {p.descripcion.length > 320 && (
            <button
              type="button"
              className="clr-pdetail-more"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? "Ver menos" : "Ver más"}
            </button>
          )}
        </div>
      )}

      {p.adjudicatario && p.adjudicatario !== "No Adjudicado" && (
        <p className="clr-secop-adj">
          Adjudicatario: <strong>{p.adjudicatario}</strong>
        </p>
      )}

      <footer className="clr-pdetail-foot">
        <span className={`clr-badge clr-badge--${ACCESS_CLASS[access.state]}`}>
          {probing ? "Verificando acceso…" : ACCESS_LABEL[access.state]}
        </span>
        {p.url && (
          <a className="clr-pdetail-cta" href={p.url} target="_blank" rel="noreferrer">
            Abrir en SECOP II ↗
          </a>
        )}
      </footer>
    </article>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit 2>&1 | grep -i processdetail`
Expected: sin errores en el archivo nuevo.

- [ ] **Step 3: Commit**

```bash
git add src/components/secop/ProcessDetail.tsx
git commit -m "feat(secop): componente ProcessDetail — elegibilidad con razones visibles"
```

---

### Task 7: Reescritura de `SecopExplorer` — orquestador + layout + CSS

**Files:**
- Modify: `src/components/secop/SecopExplorer.tsx` (reescritura completa)

Comportamientos clave que implementa:
- `apertura=Abierto` por defecto; se omite si el toggle "Incluir cerrados y cancelados" está activo **o** hay filtro de estado explícito (evita combinaciones contradictorias como estado=Cancelado + apertura=Abierto).
- Auto-selección del primer resultado al cargar página (sin abrir el overlay móvil).
- Auto-probe al seleccionar (una sola vez por proceso, guard con `useRef<Set>`).
- Contador "N procesos abiertos", "Página X de Y", selector por página 10/25/50, orden Recientes/Mayor valor.
- Responsive: `<900px` lista completa + detalle como overlay (`.is-open`).

- [ ] **Step 1: Reescribir el componente**

```tsx
// src/components/secop/SecopExplorer.tsx
"use client";

/**
 * SecopExplorer · sección "Licitaciones" de HydroStack — workbench v2.
 *
 * Orquestador master-detail: lista compacta (ProcessList) + panel de detalle
 * (ProcessDetail). Llama a /api/secop (proxy server-side a SECOP II).
 * Clear theme compartido (clr-* / app/globals.css).
 *
 * Spec: docs/superpowers/specs/2026-07-11-licitaciones-v2-workbench-design.md
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { SecopResult } from "@/src/lib/secop/types";
import type { DocumentAccess } from "@/src/lib/secop/document-access";
import { ESTADOS_PROCESO } from "@/src/lib/secop/config";
import ProcessList, { type ProcesoVeredicto } from "./ProcessList";
import ProcessDetail from "./ProcessDetail";

const DEPARTAMENTOS = [
  "VALLE DEL CAUCA", "ANTIOQUIA", "CUNDINAMARCA", "BOGOTÁ", "ATLÁNTICO",
  "BOLÍVAR", "SANTANDER", "NARIÑO", "CAUCA", "CÓRDOBA", "MAGDALENA",
];

const PAGE_SIZES = [10, 25, 50];

interface Filters {
  q: string;
  departamento: string;
  estado: string;
  valorMin: string;
}

type ProbeState = { state: DocumentAccess; message: string };

export default function SecopExplorer() {
  const [filters, setFilters] = useState<Filters>({
    q: "", departamento: "", estado: "", valorMin: "",
  });
  const [incluirCerrados, setIncluirCerrados] = useState(false);
  const [orden, setOrden] = useState<"fecha" | "valor">("fecha");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SecopResult<ProcesoVeredicto> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false); // solo móvil
  const [probed, setProbed] = useState<Record<string, ProbeState>>({});
  const [probing, setProbing] = useState<Record<string, boolean>>({});
  const probeAttempted = useRef<Set<string>>(new Set());

  // Solo-abiertos aplica si el usuario no pidió cerrados ni un estado concreto.
  const soloAbiertos = !incluirCerrados && !filters.estado;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        tipo: "procesos",
        page: String(page),
        pageSize: String(pageSize),
        orden,
      });
      if (soloAbiertos) params.set("apertura", "Abierto");
      if (filters.q) params.set("q", filters.q);
      if (filters.departamento) params.set("departamento", filters.departamento);
      if (filters.estado) params.set("estado", filters.estado);
      if (filters.valorMin) params.set("valorMin", filters.valorMin);
      const res = await fetch(`/api/secop?${params}`);
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.detail ?? "Error de consulta");
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize, orden, soloAbiertos]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-selección: primer resultado de la página (sin abrir overlay móvil).
  useEffect(() => {
    if (!data) return;
    const stillThere = data.items.some((p) => p.id === selectedId);
    if (!stillThere) setSelectedId(data.items[0]?.id ?? null);
  }, [data, selectedId]);

  const selected = data?.items.find((p) => p.id === selectedId) ?? null;

  /** Probe on-demand (C1), ahora automático al seleccionar. */
  const probe = useCallback(async (p: ProcesoVeredicto) => {
    if (!p.url) return;
    setProbing((s) => ({ ...s, [p.id]: true }));
    try {
      const res = await fetch("/api/secop/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: p.url, secopProcesoId: p.id }),
      });
      const payload = await res.json();
      if (res.ok) {
        setProbed((s) => ({ ...s, [p.id]: { state: payload.state, message: payload.message } }));
      }
    } catch {
      /* chip preliminar se mantiene si el probe falla */
    } finally {
      setProbing((s) => ({ ...s, [p.id]: false }));
    }
  }, []);

  useEffect(() => {
    if (!selected?.url) return;
    if (selected.documentAccess === "PUBLIC") return;
    if (probeAttempted.current.has(selected.id)) return;
    probeAttempted.current.add(selected.id);
    probe(selected);
  }, [selected, probe]);

  const set =
    (k: keyof Filters) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setPage(1);
      setFilters((f) => ({ ...f, [k]: e.target.value }));
    };

  const totalPages =
    data?.total != null ? Math.max(1, Math.ceil(data.total / pageSize)) : null;

  const access = selected
    ? probed[selected.id] ?? { state: selected.documentAccess, message: selected.accessMessage }
    : null;

  return (
    <div className="clr-page">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="clr-container">
        <header className="clr-wb-header">
          <span className="clr-tag">SECOP II · Datos abiertos</span>
          <h1 className="clr-h1">Licitaciones · Agua y saneamiento</h1>
          <p className="clr-sub">
            Procesos de contratación pública del sector agua potable y saneamiento
            básico en Colombia.
          </p>
        </header>

        <div className="clr-wb-controls">
          <input
            className="clr-input clr-wb-search"
            placeholder="Buscar municipio, objeto, entidad…"
            value={filters.q}
            onChange={set("q")}
          />
          <select className="clr-select" value={filters.departamento} onChange={set("departamento")}>
            <option value="">Todos los departamentos</option>
            {DEPARTAMENTOS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="clr-select" value={filters.estado} onChange={set("estado")}>
            <option value="">Todos los estados</option>
            {ESTADOS_PROCESO.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <input
            className="clr-input"
            type="number"
            placeholder="Valor mín. (COP)"
            value={filters.valorMin}
            onChange={set("valorMin")}
          />
          <select
            className="clr-select"
            value={orden}
            onChange={(e) => { setPage(1); setOrden(e.target.value as "fecha" | "valor"); }}
            aria-label="Ordenar resultados"
          >
            <option value="fecha">Recientes primero</option>
            <option value="valor">Mayor valor primero</option>
          </select>
        </div>

        <div className="clr-wb-context">
          <span className="clr-wb-count">
            {data?.total != null ? (
              <>
                <strong>{data.total.toLocaleString("es-CO")}</strong>
                {" "}procesos{soloAbiertos ? " abiertos" : ""}
              </>
            ) : (
              "Procesos"
            )}
            {" "}· sector agua y saneamiento
          </span>
          <span className="clr-wb-context-right">
            <label className="clr-wb-toggle">
              <input
                type="checkbox"
                checked={incluirCerrados}
                onChange={(e) => { setPage(1); setIncluirCerrados(e.target.checked); }}
              />
              Incluir cerrados y cancelados
            </label>
            <select
              className="clr-select clr-wb-pagesize"
              value={pageSize}
              onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)); }}
              aria-label="Resultados por página"
            >
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} / pág.</option>)}
            </select>
          </span>
        </div>

        {error && <div className="clr-secop-error">⚠ {error}</div>}

        <div className="clr-wb-split">
          <div className="clr-wb-listcol">
            <ProcessList
              items={data?.items ?? []}
              selectedId={selectedId}
              loading={loading}
              onSelect={(p) => { setSelectedId(p.id); setDetailOpen(true); }}
            />
            <div className="clr-secop-pager">
              <button disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
                ← Anterior
              </button>
              <span>
                Página {page}{totalPages != null ? ` de ${totalPages.toLocaleString("es-CO")}` : ""}
              </span>
              <button
                disabled={
                  loading ||
                  (data?.items.length ?? 0) === 0 ||
                  (totalPages != null && page >= totalPages)
                }
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente →
              </button>
            </div>
          </div>

          <div className={`clr-wb-detailcol${detailOpen ? " is-open" : ""}`}>
            {selected && access ? (
              <ProcessDetail
                key={selected.id}
                proceso={selected}
                access={access}
                probing={!!probing[selected.id]}
                onBack={() => setDetailOpen(false)}
              />
            ) : (
              !loading && (
                <div className="clr-secop-empty">
                  Selecciona un proceso para ver el detalle.
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.clr-wb-header{ margin-bottom: 16px; }
.clr-wb-controls{
  display: grid;
  grid-template-columns: minmax(220px, 1.6fr) repeat(4, minmax(140px, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}
.clr-wb-context{
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 14px;
  font-size: 12px;
  color: var(--ink-600);
}
.clr-wb-count strong{ color: var(--ink-900); font-weight: 600; }
.clr-wb-context-right{ display: flex; align-items: center; gap: 14px; }
.clr-wb-toggle{
  display: flex; align-items: center; gap: 6px; cursor: pointer;
  font-size: 12px; color: var(--ink-600); user-select: none;
}
.clr-wb-toggle input{ accent-color: var(--accent); }
.clr-wb-pagesize{ padding: 4px 8px; font-size: 12px; }

.clr-wb-split{
  display: grid;
  grid-template-columns: minmax(280px, 42%) minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}
.clr-plist{ display: flex; flex-direction: column; gap: 8px; }
.clr-prow{
  display: flex; flex-direction: column; gap: 4px;
  text-align: left;
  background: var(--card, #fff);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: 11px 13px;
  cursor: pointer;
  font-family: var(--font-sans);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.clr-prow:hover{ border-color: var(--accent-soft); }
.clr-prow.is-selected{
  border: 1.5px solid var(--accent);
  box-shadow: 0 0 0 3px var(--accent-faint);
}
.clr-prow.is-closed{ opacity: 0.55; }
.clr-prow--skel{
  min-height: 84px;
  background: linear-gradient(90deg, var(--accent-faint), transparent 60%);
  cursor: default;
}
.clr-prow-state{
  align-self: flex-start;
  font-family: var(--font-mono); font-size: 10px;
  color: var(--warning);
  background: rgba(217,119,6,0.08);
  border-radius: var(--radius-sm);
  padding: 1px 6px;
}
.clr-prow-title{
  font-size: 13px; font-weight: 500; color: var(--ink-900); line-height: 1.35;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.clr-prow-meta{
  font-size: 11px; color: var(--ink-600);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.clr-prow-foot{
  display: flex; justify-content: space-between; align-items: center; margin-top: 2px;
}
.clr-prow-val{ font-family: var(--font-mono); font-size: 11.5px; color: var(--ink-900); }
.clr-prow-score{ display: flex; align-items: center; gap: 4px; font-size: 11px; }
.clr-prow-score--success{ color: var(--success); }
.clr-prow-score--warn{ color: var(--warning); }
.clr-prow-score--fail{ color: #DC2626; }
.clr-prow-score--neutral{ color: var(--ink-600); }
.clr-prow-dot{ width: 7px; height: 7px; border-radius: 50%; background: currentColor; }

.clr-pdetail-card{
  background: var(--card, #fff);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 18px 20px;
  display: flex; flex-direction: column; gap: 12px;
}
.clr-pdetail-back{ display: none; }
.clr-pdetail-badges{ display: flex; gap: 6px; flex-wrap: wrap; }
.clr-pdetail-title{
  font-size: 16px; font-weight: 600; color: var(--ink-900);
  line-height: 1.4; margin: 0;
}
.clr-pdetail-facts{
  display: flex; gap: 22px; flex-wrap: wrap;
}
.clr-pdetail-facts > div{ display: flex; flex-direction: column; gap: 2px; }
.clr-pdetail-label{ font-size: 10.5px; color: var(--ink-600); }
.clr-pdetail-val{ font-family: var(--font-mono); font-size: 14px; color: var(--ink-900); }
.clr-pdetail-ref{ font-family: var(--font-mono); font-size: 12.5px; }

.clr-elig{
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: 12px 14px;
}
.clr-elig-head{
  display: flex; justify-content: space-between; align-items: center;
  font-size: 12.5px; font-weight: 500; color: var(--ink-900); margin-bottom: 8px;
}
.clr-elig-count{ font-weight: 400; color: var(--ink-600); font-size: 11.5px; }
.clr-elig-bar{ display: flex; gap: 3px; margin-bottom: 10px; }
.clr-elig-seg{ flex: 1; height: 5px; border-radius: 2px; }
.clr-elig-seg--pass{ background: var(--success); }
.clr-elig-seg--warn{ background: var(--warning); }
.clr-elig-seg--fail{ background: #DC2626; }
.clr-elig-seg--unknown{ background: var(--line); }
.clr-elig-gates{ list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.clr-elig-gate{
  display: grid; grid-template-columns: 16px 78px 1fr; gap: 7px;
  font-size: 11.5px; align-items: baseline;
}
.clr-elig-glyph{ font-weight: 600; }
.clr-elig-glyph--pass{ color: var(--success); }
.clr-elig-glyph--warn{ color: var(--warning); }
.clr-elig-glyph--fail{ color: #DC2626; }
.clr-elig-glyph--unknown{ color: var(--ink-600); }
.clr-elig-name{ color: var(--ink-900); }
.clr-elig-reason{ color: var(--ink-600); line-height: 1.4; }

.clr-pdetail-desc p{
  font-size: 12px; color: var(--ink-600); line-height: 1.55; margin: 0;
  display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden;
}
.clr-pdetail-desc.is-expanded p{ -webkit-line-clamp: unset; }
.clr-pdetail-more{
  background: none; border: none; padding: 0; margin-top: 4px;
  color: var(--accent); font-size: 12px; cursor: pointer; font-family: var(--font-sans);
}
.clr-pdetail-foot{
  display: flex; justify-content: space-between; align-items: center;
  gap: 10px; flex-wrap: wrap;
  border-top: 1px solid var(--line); padding-top: 12px; margin-top: 2px;
}
.clr-pdetail-cta{
  background: var(--accent); color: #fff;
  font-size: 12.5px; font-weight: 500; text-decoration: none;
  padding: 8px 16px; border-radius: var(--radius-md);
  transition: opacity 0.15s;
}
.clr-pdetail-cta:hover{ opacity: 0.88; }

.clr-secop-error{
  border: 1px solid rgba(217,119,6,0.3);
  background: rgba(217,119,6,0.06);
  color: var(--warning);
  padding: 12px 16px;
  border-radius: var(--radius-md);
  margin-bottom: 16px;
  font-size: var(--fs-sm);
}
.clr-secop-empty{
  padding: 48px 24px;
  text-align: center;
  color: var(--ink-600);
  font-size: var(--fs-sm);
  border: 1px dashed var(--line);
  border-radius: var(--radius-lg);
}
.clr-secop-entity{ color: var(--accent); font-size: 12px; font-family: var(--font-mono); margin: 0; }
.clr-secop-adj{ font-size: 12px; color: var(--ink-600); margin: 0; }
.clr-secop-adj strong{ color: var(--ink-900); }
.clr-secop-pager{
  display: flex; align-items: center; justify-content: center;
  gap: 16px; margin-top: 16px;
  font-size: 12.5px; color: var(--ink-600);
}
.clr-secop-pager button{
  background: transparent;
  border: 1px solid var(--line);
  color: var(--ink-900);
  padding: 7px 14px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: 12.5px;
  transition: border-color 0.18s, color 0.18s;
}
.clr-secop-pager button:hover:not(:disabled){ border-color: var(--accent); color: var(--accent); }
.clr-secop-pager button:disabled{ opacity: 0.35; cursor: not-allowed; }

@media (max-width: 900px){
  .clr-wb-controls{ grid-template-columns: 1fr 1fr; }
  .clr-wb-search{ grid-column: 1 / -1; }
  .clr-wb-split{ grid-template-columns: 1fr; }
  .clr-wb-detailcol{
    display: none;
  }
  .clr-wb-detailcol.is-open{
    display: block;
    position: fixed;
    inset: 0;
    z-index: 50;
    background: var(--bg);
    overflow-y: auto;
    padding: 16px;
  }
  .clr-pdetail-back{
    display: inline-block;
    background: none; border: none; padding: 0;
    color: var(--accent); font-size: 13px; cursor: pointer;
    font-family: var(--font-sans);
  }
}
`;
```

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`
Expected: build OK, sin errores de tipos.

- [ ] **Step 3: Correr suite completa**

Run: `npx vitest run` → PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/secop/SecopExplorer.tsx
git commit -m "feat(secop): workbench v2 — master-detail, solo abiertos por defecto, contador y orden"
```

---

### Task 8: Verificación E2E + cierre

**Files:** ninguno nuevo (verificación).

- [ ] **Step 1: Levantar preview y verificar flujo completo**

Con las preview tools (o `npm run dev`):
1. Abrir `/licitaciones` → la lista debe mostrar solo procesos con apertura "Abierto", contador "N procesos abiertos", primer proceso auto-seleccionado con detalle visible.
2. Verificar consola del navegador sin errores y `/api/secop?...&apertura=Abierto` en la pestaña de red con `total` en la respuesta.
3. Activar toggle "Incluir cerrados y cancelados" → aparecen procesos cancelados atenuados.
4. Cambiar orden a "Mayor valor primero" → el primer resultado tiene el mayor precio base.
5. Seleccionar un proceso RESTRICTED/UNKNOWN → el probe corre solo (badge pasa a estado verificado sin clic manual).
6. Redimensionar a 375px → lista a ancho completo; tocar una fila abre el overlay; "← Volver a resultados" lo cierra.

- [ ] **Step 2: Screenshot de evidencia para el usuario**

Capturar desktop (1280px) y móvil (375px con overlay abierto).

- [ ] **Step 3: Actualizar knowledge graph y CLAUDE.md si aplica**

Run: `graphify update .`
CLAUDE.md no requiere cambios (el comportamiento conversacional no cambió); el spec ya documenta el roadmap.

- [ ] **Step 4: Commit final si quedaron ajustes de la verificación**

```bash
git add -A && git commit -m "fix(secop): ajustes de verificación e2e del workbench v2"
```

---

## Self-review (hecho al escribir el plan)

- **Cobertura del spec**: §3.1 layout → Task 7; §3.2 filas → Tasks 4-5; §3.3 detalle + auto-probe → Tasks 6-7; §3.4 backend → Tasks 1-3; §3.5 errores/skeleton → Tasks 5 y 7 (CSS `--skel`, degradación de total). Fuera de alcance respetado (sin auth, sin facetas).
- **Placeholders**: ninguno; todo el código está inline.
- **Consistencia de tipos**: `ProcesoVeredicto` se define una sola vez (ProcessList) y se importa; `GateResult` usa los 4 campos reales (`status`, `reason`, `resolvedBy`, `requiredLevel`); `SecopResult.total` ya existía como opcional en types.ts.
