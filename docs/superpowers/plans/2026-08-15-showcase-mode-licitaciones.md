> **SUPERSEDED (2026-08-15):** el alcance cambió — el usuario necesita el flujo
> interactivo completo (registro → perfil → coincidencias) funcionando, no solo
> una vitrina de solo lectura. Ver
> `docs/superpowers/plans/2026-08-15-migracion-supabase-modo-concierge.md`.
> No ejecutar este plan.

# Modo Showcase (snapshot local) para Licitaciones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mientras el proyecto de Neon está bloqueado (cuota de transferencia de datos excedida — la conexión se rechaza por completo), permitir que la URL desplegada en Vercel muestre procesos SECOP "ya digeridos" (ingesta + transform propios) en las páginas públicas de solo lectura (`/licitaciones` y `/licitaciones/explorar`), sirviéndolos desde un snapshot JSON estático generado localmente contra un Postgres propio, en vez de Neon.

**Architecture:** Toda la lectura pública de procesos ya pasa por dos únicos puntos (`src/lib/secop/recientes.ts:fromDb` y `src/lib/secop/db-search.ts:searchProcesosDb`/`countProcesosDb`), ambos ya envueltos en fallback (`fromDb→fromLive`, `db→Socrata live`) y ambos devolviendo el mismo DTO `SecopProceso`/`ProcesoResumen`. Se añade una **tercera fuente aditiva**: un motor de búsqueda en memoria (`snapshot-source.ts`) sobre un JSON commiteado al repo (`data/showcase/procesos.snapshot.json`), cargado vía import estático (bundleado en build, sin IO en runtime) y activado solo cuando `SHOWCASE_MODE=true`. Cuando el snapshot está vacío o el flag está apagado, el comportamiento actual (Neon → Socrata live) no cambia ni una línea. Un script nuevo (`scripts/export-showcase-snapshot.ts`), corrido localmente contra un Postgres propio (usando el driver `DB_DRIVER=node` que ya existe en `src/lib/db/client.ts`), regenera ese JSON.

**Explícitamente fuera de alcance:** login, perfil de oferente, `/mis-coincidencias`, alertas — todo lo que requiere escritura en vivo sigue dependiendo de una base alcanzable (Neon reactivado, upgrade, o migración). Este plan solo restaura la vitrina pública de solo lectura.

**Tech Stack:** Next.js 14 App Router (Server Components + Route Handler), TypeScript, Vitest, Drizzle (sin tocar el schema).

---

## File Structure

- Create: `src/lib/secop/snapshot-source.ts` — filtro/orden/paginación puros en memoria sobre `SecopProceso[]` (misma semántica que `db-search.ts:prepare`).
- Create: `src/__tests__/secop/snapshot-source.test.ts`
- Create: `src/lib/secop/snapshot-loader.ts` — carga el JSON commiteado (import estático) + `isShowcaseMode()`.
- Create: `src/__tests__/secop/snapshot-loader.test.ts`
- Create: `data/showcase/procesos.snapshot.json` — placeholder vacío inicial, commiteado.
- Create: `scripts/export-showcase-snapshot.ts` — corre localmente, escribe el JSON de arriba.
- Modify: `src/lib/secop/recientes.ts` — rama `fromSnapshot`, `ProcesosRecientesResult.fuente` incluye `"snapshot"`.
- Modify: `src/__tests__/secop/recientes.test.ts` — cubre la nueva rama.
- Modify: `app/api/secop/route.ts` — rama snapshot en `searchProcesosConFallback`, `fuente` en la respuesta JSON.
- Modify: `src/__tests__/api/secop-route.test.ts` — cubre la nueva rama.
- Modify: `src/components/secop/ProcesosRecientes.tsx` — banner "datos de muestra" cuando `fuente === "snapshot"`.
- Modify: `app/licitaciones/page.js` — pasa `fuente`/`generatedAt` al componente.
- Modify: `package.json` — script `showcase:export`.
- Modify: `.env.example` — documenta `SHOWCASE_MODE`.

---

### Task 1: Motor de búsqueda en memoria sobre el snapshot

**Files:**
- Create: `src/lib/secop/snapshot-source.ts`
- Test: `src/__tests__/secop/snapshot-source.test.ts`

- [ ] **Step 1: Escribe el test que falla**

```typescript
// src/__tests__/secop/snapshot-source.test.ts
import { describe, it, expect } from "vitest";
import {
  filterProcesos,
  sortProcesos,
  paginate,
  mostRecent,
  searchProcesosSnapshot,
  countProcesosSnapshot,
} from "@/src/lib/secop/snapshot-source";
import type { SecopProceso } from "@/src/lib/secop/types";

function proceso(overrides: Partial<SecopProceso>): SecopProceso {
  return {
    id: "CO1.REQ.1",
    referencia: "R1",
    nombre: "Optimización acueducto rural",
    descripcion: "Obra de acueducto veredal",
    entidad: "Acuavalle",
    departamento: "Valle del Cauca",
    ciudad: "Cali",
    estado: "Publicado",
    fase: "",
    modalidad: "Licitación pública",
    tipoContrato: "Obra",
    fechaPublicacion: "2026-08-01",
    precioBase: 200_000_000,
    adjudicado: false,
    valorAdjudicacion: null,
    adjudicatario: null,
    unspsc: null,
    url: null,
    estadoApertura: "Abierto",
    documentAccess: "UNKNOWN",
    accessMessage: "",
    ...overrides,
  };
}

const agua = proceso({ id: "A" });
const noAgua = proceso({
  id: "B",
  nombre: "Suministro de papelería",
  descripcion: "Compra de insumos de oficina",
});
const otroDepto = proceso({ id: "C", departamento: "Cauca", fechaPublicacion: "2026-07-01" });
const adjudicadoCerrado = proceso({
  id: "D",
  estado: "Adjudicado",
  estadoApertura: "Cerrado",
  precioBase: 900_000_000,
  fechaPublicacion: "2026-07-15",
});
const sinFecha = proceso({ id: "E", fechaPublicacion: null, precioBase: null });

const items = [agua, noAgua, otroDepto, adjudicadoCerrado, sinFecha];

describe("filterProcesos", () => {
  it("soloAgua (default true) descarta procesos sin keyword de agua/saneamiento", () => {
    const r = filterProcesos(items, {});
    expect(r.map((p) => p.id)).not.toContain("B");
  });

  it("soloAgua: false no filtra por palabra clave", () => {
    const r = filterProcesos(items, { soloAgua: false });
    expect(r.map((p) => p.id)).toContain("B");
  });

  it("departamento filtra case-insensitive por substring", () => {
    const r = filterProcesos(items, { soloAgua: false, departamento: "cauca" });
    expect(r.map((p) => p.id).sort()).toEqual(["C"]);
  });

  it("estado filtra por match exacto", () => {
    const r = filterProcesos(items, { soloAgua: false, estado: "Adjudicado" });
    expect(r.map((p) => p.id)).toEqual(["D"]);
  });

  it("valorMin descarta precioBase menor (y null)", () => {
    const r = filterProcesos(items, { soloAgua: false, valorMin: 500_000_000 });
    expect(r.map((p) => p.id)).toEqual(["D"]);
  });

  it("desde descarta fechaPublicacion anterior (y null)", () => {
    const r = filterProcesos(items, { soloAgua: false, desde: "2026-07-10" });
    expect(r.map((p) => p.id).sort()).toEqual(["A", "D"]);
  });

  it("apertura filtra por estadoApertura exacto", () => {
    const r = filterProcesos(items, { soloAgua: false, apertura: "Cerrado" });
    expect(r.map((p) => p.id)).toEqual(["D"]);
  });

  it("q busca en nombre o entidad, case-insensitive", () => {
    const r = filterProcesos(items, { soloAgua: false, q: "papelería" });
    expect(r.map((p) => p.id)).toEqual(["B"]);
  });
});

describe("sortProcesos", () => {
  it("orden fecha (default): desc, nulls al final", () => {
    const r = sortProcesos(items, "fecha");
    expect(r.map((p) => p.id)).toEqual(["A", "D", "C", "B", "E"]);
  });

  it("orden valor: desc, nulls al final", () => {
    const r = sortProcesos(items, "valor");
    expect(r[0].id).toBe("D");
    expect(r[r.length - 1].id).toBe("E");
  });
});

describe("paginate", () => {
  it("recorta por page/pageSize, page < 1 se trata como 1", () => {
    expect(paginate([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4]);
    expect(paginate([1, 2, 3], 0, 2)).toEqual([1, 2]);
  });
});

describe("mostRecent", () => {
  it("ordena por fecha desc y limita", () => {
    const r = mostRecent(items, 2);
    expect(r.map((p) => p.id)).toEqual(["A", "D"]);
  });
});

describe("searchProcesosSnapshot / countProcesosSnapshot", () => {
  it("combina filtro + orden + paginación, clamps pageSize al máximo", () => {
    const result = searchProcesosSnapshot(items, { soloAgua: false, pageSize: 999 });
    expect(result.pageSize).toBe(100);
    expect(result.page).toBe(1);
    expect(result.items.map((p) => p.id)).toEqual(["A", "D", "C", "B", "E"]);
  });

  it("countProcesosSnapshot cuenta post-filtro, no post-paginación", () => {
    expect(countProcesosSnapshot(items, { soloAgua: false, pageSize: 1 })).toBe(5);
  });
});
```

- [ ] **Step 2: Corre el test para confirmar que falla**

Run: `npx vitest run src/__tests__/secop/snapshot-source.test.ts`
Expected: FAIL — `Cannot find module '@/src/lib/secop/snapshot-source'`

- [ ] **Step 3: Implementa**

```typescript
// src/lib/secop/snapshot-source.ts
/**
 * Motor de búsqueda en memoria sobre un snapshot estático de SecopProceso[]
 * (modo showcase: Neon inalcanzable, se sirve un JSON congelado exportado
 * localmente con scripts/export-showcase-snapshot.ts). Replica la semántica
 * de filtro/orden/paginación de searchProcesosDb/countProcesosDb
 * (db-search.ts) pero sin Postgres — mismo SecopQuery, mismo SecopResult.
 */

import { KEYWORDS_AGUA, PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX } from "./config";
import type { SecopProceso, SecopQuery, SecopResult } from "./types";

function includesCI(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function matchesSoloAgua(p: SecopProceso): boolean {
  return KEYWORDS_AGUA.some((kw) => includesCI(p.nombre, kw) || includesCI(p.descripcion, kw));
}

export function filterProcesos(items: SecopProceso[], query: SecopQuery): SecopProceso[] {
  return items.filter((p) => {
    if (query.soloAgua !== false && !matchesSoloAgua(p)) return false;
    if (query.departamento && !includesCI(p.departamento, query.departamento)) return false;
    if (query.estado && p.estado !== query.estado) return false;
    if (query.valorMin != null && (p.precioBase ?? -Infinity) < query.valorMin) return false;
    if (query.desde && (!p.fechaPublicacion || p.fechaPublicacion < query.desde)) return false;
    if (query.apertura && p.estadoApertura !== query.apertura) return false;
    if (query.q && !includesCI(p.nombre, query.q) && !includesCI(p.entidad, query.q)) return false;
    return true;
  });
}

export function sortProcesos(items: SecopProceso[], orden: SecopQuery["orden"]): SecopProceso[] {
  const key: "precioBase" | "fechaPublicacion" = orden === "valor" ? "precioBase" : "fechaPublicacion";
  return [...items].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1; // nulls al final
    if (bv == null) return -1;
    return av < bv ? 1 : av > bv ? -1 : 0; // desc
  });
}

export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

/** Para recientes.ts: los N más nuevos por fecha, sin filtro de agua (el snapshot ya está pre-filtrado por el export). */
export function mostRecent(items: SecopProceso[], limit: number): SecopProceso[] {
  return sortProcesos(items, "fecha").slice(0, limit);
}

export function searchProcesosSnapshot(
  items: SecopProceso[],
  query: SecopQuery = {}
): SecopResult<SecopProceso> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(query.pageSize ?? PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX);
  const filtered = sortProcesos(filterProcesos(items, query), query.orden);
  return { items: paginate(filtered, page, pageSize), page, pageSize };
}

export function countProcesosSnapshot(items: SecopProceso[], query: SecopQuery = {}): number {
  return filterProcesos(items, query).length;
}
```

- [ ] **Step 4: Corre el test para confirmar que pasa**

Run: `npx vitest run src/__tests__/secop/snapshot-source.test.ts`
Expected: PASS (14 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/secop/snapshot-source.ts src/__tests__/secop/snapshot-source.test.ts
git commit -m "feat(secop): motor de búsqueda en memoria para snapshot showcase"
```

---

### Task 2: Loader del snapshot + flag de modo showcase

**Files:**
- Create: `src/lib/secop/snapshot-loader.ts`
- Create: `data/showcase/procesos.snapshot.json`
- Test: `src/__tests__/secop/snapshot-loader.test.ts`

- [ ] **Step 1: Crea el placeholder vacío (necesario para que el import estático compile)**

```json
{
  "generatedAt": null,
  "items": []
}
```

Guárdalo en `data/showcase/procesos.snapshot.json`.

- [ ] **Step 2: Escribe el test que falla**

```typescript
// src/__tests__/secop/snapshot-loader.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadShowcaseSnapshot, isShowcaseMode } from "@/src/lib/secop/snapshot-loader";

describe("loadShowcaseSnapshot", () => {
  it("devuelve la forma { generatedAt, items[] } del JSON commiteado", () => {
    const snap = loadShowcaseSnapshot();
    expect(Array.isArray(snap.items)).toBe(true);
    expect("generatedAt" in snap).toBe(true);
  });
});

describe("isShowcaseMode", () => {
  const original = process.env.SHOWCASE_MODE;
  beforeEach(() => vi.unstubAllEnvs());
  afterEach(() => {
    if (original === undefined) delete process.env.SHOWCASE_MODE;
    else process.env.SHOWCASE_MODE = original;
  });

  it("true solo cuando SHOWCASE_MODE es exactamente 'true'", () => {
    vi.stubEnv("SHOWCASE_MODE", "true");
    expect(isShowcaseMode()).toBe(true);
  });

  it("false si no está seteada o tiene otro valor", () => {
    vi.stubEnv("SHOWCASE_MODE", "");
    expect(isShowcaseMode()).toBe(false);
    vi.stubEnv("SHOWCASE_MODE", "1");
    expect(isShowcaseMode()).toBe(false);
  });
});
```

- [ ] **Step 3: Corre el test para confirmar que falla**

Run: `npx vitest run src/__tests__/secop/snapshot-loader.test.ts`
Expected: FAIL — `Cannot find module '@/src/lib/secop/snapshot-loader'`

- [ ] **Step 4: Implementa**

```typescript
// src/lib/secop/snapshot-loader.ts
/**
 * Carga el snapshot estático (data/showcase/procesos.snapshot.json),
 * commiteado al repo y regenerado localmente con `npm run showcase:export`.
 * Import estático (no fetch, no fs en runtime): Next.js lo bundlea en build,
 * así que funciona igual en Server Components y en route handlers, sin IO.
 */
import snapshot from "@/data/showcase/procesos.snapshot.json";
import type { SecopProceso } from "./types";

export interface ShowcaseSnapshot {
  generatedAt: string | null;
  items: SecopProceso[];
}

export function loadShowcaseSnapshot(): ShowcaseSnapshot {
  return snapshot as ShowcaseSnapshot;
}

/** Gate explícito: nunca se activa solo. Se enciende con SHOWCASE_MODE=true en el env de Vercel. */
export function isShowcaseMode(): boolean {
  return process.env.SHOWCASE_MODE === "true";
}
```

- [ ] **Step 5: Corre el test para confirmar que pasa**

Run: `npx vitest run src/__tests__/secop/snapshot-loader.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/secop/snapshot-loader.ts data/showcase/procesos.snapshot.json src/__tests__/secop/snapshot-loader.test.ts
git commit -m "feat(secop): loader del snapshot showcase + flag SHOWCASE_MODE"
```

---

### Task 3: Rama snapshot en `recientes.ts`

**Files:**
- Modify: `src/lib/secop/recientes.ts`
- Modify: `src/__tests__/secop/recientes.test.ts`

- [ ] **Step 1: Escribe el test que falla**

Añade al final de `src/__tests__/secop/recientes.test.ts`:

```typescript
describe("getProcesosRecientes — modo showcase", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("SHOWCASE_MODE=true con snapshot no vacío: usa snapshot, no toca fromDb/fromLive", async () => {
    vi.stubEnv("SHOWCASE_MODE", "true");
    vi.doMock("@/src/lib/secop/snapshot-loader", () => ({
      isShowcaseMode: () => true,
      loadShowcaseSnapshot: () => ({
        generatedAt: "2026-08-15T00:00:00.000Z",
        items: [
          {
            id: "CO1.REQ.900",
            referencia: "R900",
            nombre: "PTAR municipal",
            descripcion: "",
            entidad: "ESP Showcase",
            departamento: "Nariño",
            ciudad: "Pasto",
            estado: "Publicado",
            fase: "",
            modalidad: "Licitación pública",
            tipoContrato: "Obra",
            fechaPublicacion: "2026-08-10",
            precioBase: 500_000_000,
            adjudicado: false,
            valorAdjudicacion: null,
            adjudicatario: null,
            unspsc: null,
            url: null,
            estadoApertura: "Abierto",
            documentAccess: "UNKNOWN",
            accessMessage: "",
          },
        ],
      }),
    }));
    const { getProcesosRecientes } = await import("@/src/lib/secop/recientes");
    const result = await getProcesosRecientes();
    expect(result.fuente).toBe("snapshot");
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("CO1.REQ.900");
  });

  it("SHOWCASE_MODE=true pero snapshot vacío: cae al camino normal (fromDb/fromLive)", async () => {
    vi.stubEnv("SHOWCASE_MODE", "true");
    vi.doMock("@/src/lib/secop/snapshot-loader", () => ({
      isShowcaseMode: () => true,
      loadShowcaseSnapshot: () => ({ generatedAt: null, items: [] }),
    }));
    const { getProcesosRecientes } = await import("@/src/lib/secop/recientes");
    const result = await getProcesosRecientes();
    expect(result.fuente).not.toBe("snapshot");
  });
});
```

Y agrega el import que falta arriba del archivo (junto a los demás imports de vitest):

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
```

(reemplaza la línea `import { describe, it, expect } from "vitest";` existente en la línea 1).

- [ ] **Step 2: Corre el test para confirmar que falla**

Run: `npx vitest run src/__tests__/secop/recientes.test.ts`
Expected: FAIL — `result.fuente` es `"db"` o `"live"`, nunca `"snapshot"` (la rama no existe todavía)

- [ ] **Step 3: Implementa**

En `src/lib/secop/recientes.ts`, añade el import (junto a los demás, después de la línea 12):

```typescript
import { mostRecent } from "./snapshot-source";
import { isShowcaseMode, loadShowcaseSnapshot } from "./snapshot-loader";
```

Cambia la interfaz de resultado (línea 31-34):

```typescript
export interface ProcesosRecientesResult {
  items: ProcesoResumen[];
  fuente: "db" | "live" | "snapshot";
}
```

Añade la función `fromSnapshot`, justo antes de `fromDb` (antes de la línea 94):

```typescript
function fromSnapshot(): ProcesoResumen[] {
  const { items } = loadShowcaseSnapshot();
  return mostRecent(items, RECIENTES_LIMIT).map(mapLiveToResumen);
}
```

Y reemplaza `getProcesosRecientes` (líneas 140-153):

```typescript
/** Últimos 25 procesos: snapshot showcase (si está activo) → base propia → Socrata como red de seguridad. */
export async function getProcesosRecientes(): Promise<ProcesosRecientesResult> {
  if (isShowcaseMode()) {
    const items = fromSnapshot();
    if (items.length > 0) return { items, fuente: "snapshot" };
  }
  try {
    const items = await fromDb();
    if (items.length > 0) return { items, fuente: "db" };
  } catch {
    // base no disponible → live
  }
  try {
    return { items: await fromLive(), fuente: "live" };
  } catch {
    return { items: [], fuente: "live" };
  }
}
```

- [ ] **Step 4: Corre el test para confirmar que pasa**

Run: `npx vitest run src/__tests__/secop/recientes.test.ts`
Expected: PASS (todos los tests, incluidos los 2 nuevos)

- [ ] **Step 5: Commit**

```bash
git add src/lib/secop/recientes.ts src/__tests__/secop/recientes.test.ts
git commit -m "feat(secop): getProcesosRecientes sirve desde snapshot en modo showcase"
```

---

### Task 4: Rama snapshot en `/api/secop` (explorador)

**Files:**
- Modify: `app/api/secop/route.ts`
- Modify: `src/__tests__/api/secop-route.test.ts`

- [ ] **Step 1: Escribe el test que falla**

Añade al final de `src/__tests__/api/secop-route.test.ts` (respeta el patrón de mocks ya usado en el archivo):

```typescript
describe("GET /api/secop — modo showcase", () => {
  const originalEnv = process.env.SHOWCASE_MODE;
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.SHOWCASE_MODE;
    else process.env.SHOWCASE_MODE = originalEnv;
  });

  it("SHOWCASE_MODE=true con snapshot no vacío: responde desde snapshot, no toca DB ni Socrata", async () => {
    process.env.SHOWCASE_MODE = "true";
    vi.doMock("@/src/lib/secop/snapshot-loader", () => ({
      isShowcaseMode: () => true,
      loadShowcaseSnapshot: () => ({ generatedAt: "2026-08-15T00:00:00.000Z", items: [sampleProceso] }),
    }));
    vi.resetModules();
    const { GET: showcaseGET } = await import("@/app/api/secop/route");
    const res = await showcaseGET(req());
    const body = await res.json();
    expect(body.fuente).toBe("snapshot");
    expect(body.items[0].id).toBe("CO1.REQ.42");
    expect(mockedSearchDb).not.toHaveBeenCalled();
    expect(mockedSearch).not.toHaveBeenCalled();
  });
});
```

Agrega `afterEach` al import de vitest en la primera línea del archivo si no está: `import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";`

- [ ] **Step 2: Corre el test para confirmar que falla**

Run: `npx vitest run src/__tests__/api/secop-route.test.ts`
Expected: FAIL — `body.fuente` es `undefined`

- [ ] **Step 3: Implementa**

En `app/api/secop/route.ts`, añade el import (después de la línea 29):

```typescript
import { isShowcaseMode, loadShowcaseSnapshot } from "@/src/lib/secop/snapshot-loader";
import { searchProcesosSnapshot, countProcesosSnapshot } from "@/src/lib/secop/snapshot-source";
```

Reemplaza `searchProcesosConFallback` (líneas 40-53):

```typescript
async function searchProcesosConFallback(
  query: SecopQuery
): Promise<{ result: SecopResult<SecopProceso>; total: number | undefined; fuente: "db" | "live" | "snapshot" }> {
  if (isShowcaseMode()) {
    const { items } = loadShowcaseSnapshot();
    if (items.length > 0) {
      return {
        result: searchProcesosSnapshot(items, query),
        total: countProcesosSnapshot(items, query),
        fuente: "snapshot",
      };
    }
  }
  try {
    const [result, total] = await Promise.all([
      searchProcesosDbCached(query),
      countProcesosDbCached(query),
    ]);
    return { result, total, fuente: "db" };
  } catch {
    const [result, total] = await Promise.all([searchProcesos(query), countProcesos(query)]);
    return { result, total, fuente: "live" };
  }
}
```

Y en `GET`, reemplaza la línea `const { result, total } = await searchProcesosConFallback(query);` / `return NextResponse.json({ ...result, total });` (líneas 64-65) por:

```typescript
    const { result, total, fuente } = await searchProcesosConFallback(query);
    return NextResponse.json({ ...result, total, fuente });
```

- [ ] **Step 4: Corre el test para confirmar que pasa**

Run: `npx vitest run src/__tests__/api/secop-route.test.ts`
Expected: PASS (todos los tests, incluido el nuevo)

- [ ] **Step 5: Corre la suite completa para descartar regresiones**

Run: `npx vitest run`
Expected: PASS — todos los tests del repo en verde

- [ ] **Step 6: Commit**

```bash
git add app/api/secop/route.ts src/__tests__/api/secop-route.test.ts
git commit -m "feat(secop): /api/secop sirve desde snapshot en modo showcase"
```

---

### Task 5: Banner "datos de muestra" en la UI

**Files:**
- Modify: `src/components/secop/ProcesosRecientes.tsx`
- Modify: `app/licitaciones/page.js`

- [ ] **Step 1: Pasa `fuente`/`generatedAt` desde la página**

En `app/licitaciones/page.js`, reemplaza:

```javascript
export default async function LicitacionesPage() {
  const { items } = await getProcesosRecientes();
  return <ProcesosRecientes items={items} />;
}
```

por:

```javascript
export default async function LicitacionesPage() {
  const { items, fuente } = await getProcesosRecientes();
  return <ProcesosRecientes items={items} fuente={fuente} />;
}
```

- [ ] **Step 2: Muestra el banner en el componente**

En `src/components/secop/ProcesosRecientes.tsx`, cambia la firma (línea 20):

```typescript
export default function ProcesosRecientes({
  items,
  fuente,
}: {
  items: ProcesoResumen[];
  fuente?: "db" | "live" | "snapshot";
}) {
```

E inmediatamente después de `<LicitacionesTabs />` (línea 26), añade:

```jsx
        {fuente === "snapshot" && (
          <div className="clr-rc-showcase-banner" role="status">
            Datos de muestra — esta es una beta de prueba, estos procesos no se actualizan en vivo.
          </div>
        )}
```

Añade el estilo correspondiente al bloque `CSS` del mismo archivo (busca la constante `CSS` al final del archivo y agrega esta regla):

```css
.clr-rc-showcase-banner {
  background: #FEF3C7;
  border: 1px solid #FDE68A;
  color: #92400E;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 0.85rem;
  margin-bottom: 16px;
}
```

- [ ] **Step 3: Verifica manualmente**

Run: `npm run dev`, con `SHOWCASE_MODE=true` en `.env.local` y un snapshot no vacío (ver Task 7) → abre `http://localhost:3000/licitaciones` y confirma que aparece el banner ámbar.

- [ ] **Step 4: Commit**

```bash
git add app/licitaciones/page.js src/components/secop/ProcesosRecientes.tsx
git commit -m "feat(licitaciones): banner de datos de muestra en modo showcase"
```

---

### Task 6: Script de exportación del snapshot

**Files:**
- Create: `scripts/export-showcase-snapshot.ts`
- Modify: `package.json`
- Modify: `.env.example`

- [ ] **Step 1: Escribe el script**

```typescript
// scripts/export-showcase-snapshot.ts
/**
 * Exporta un snapshot de PROCESOS ya digeridos (ingesta + transform) desde la
 * base configurada en DATABASE_URL hacia data/showcase/procesos.snapshot.json,
 * commiteado al repo y servido por el modo showcase (SHOWCASE_MODE=true)
 * cuando Neon no está alcanzable.
 *
 * Uso típico — con Postgres local (0.3 §1, sin depender de Neon):
 *   DB_DRIVER=node DATABASE_URL=postgresql://localhost:5432/hydrostack \
 *     npm run db:migrate
 *   DB_DRIVER=node DATABASE_URL=... npm run db:seed-geografia
 *   DB_DRIVER=node DATABASE_URL=... npm run db:ingest
 *   DB_DRIVER=node DATABASE_URL=... npm run db:transform
 *   DB_DRIVER=node DATABASE_URL=... npm run showcase:export
 *
 * Luego: revisar el diff de data/showcase/procesos.snapshot.json, commitear,
 * hacer push. Con SHOWCASE_MODE=true en el env de Vercel, el próximo deploy
 * sirve estos datos sin tocar Neon.
 */
import "./_env";
import { pool } from "@/src/lib/db/client";
import { searchProcesosDb } from "@/src/lib/secop/db-search";
import { PAGE_SIZE_MAX } from "@/src/lib/secop/config";
import type { SecopProceso } from "@/src/lib/secop/types";
import { writeFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import path from "node:path";

const SHOWCASE_EXPORT_LIMIT = 500;
const OUT_PATH = path.join(process.cwd(), "data/showcase/procesos.snapshot.json");

async function fetchAll(): Promise<SecopProceso[]> {
  const all: SecopProceso[] = [];
  const totalPages = Math.ceil(SHOWCASE_EXPORT_LIMIT / PAGE_SIZE_MAX);
  for (let page = 1; page <= totalPages; page++) {
    const { items } = await searchProcesosDb({
      soloAgua: false,
      orden: "fecha",
      page,
      pageSize: PAGE_SIZE_MAX,
    });
    all.push(...items);
    if (items.length < PAGE_SIZE_MAX) break;
  }
  return all.slice(0, SHOWCASE_EXPORT_LIMIT);
}

async function main() {
  const items = await fetchAll();
  const snapshot = { generatedAt: new Date().toISOString(), items };
  mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(snapshot, null, 2) + "\n", "utf-8");
  console.log(`Snapshot exportado: ${items.length} procesos → ${OUT_PATH}`);
}

main()
  .catch((err) => {
    console.error("Fallo exportando snapshot:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
```

- [ ] **Step 2: Registra el script en `package.json`**

En la sección `"scripts"`, junto a los demás `db:*`, añade:

```json
    "showcase:export": "tsx scripts/export-showcase-snapshot.ts",
```

- [ ] **Step 3: Documenta el flag en `.env.example`**

Junto al bloque de `DB_DRIVER` (línea 39-41 de `.env.example`), añade:

```bash
# Modo showcase (2026-08-15): sirve /licitaciones y /licitaciones/explorar
# desde data/showcase/procesos.snapshot.json en vez de Neon. Activar SOLO
# mientras Neon esté inalcanzable (ver DB_DRIVER arriba para regenerar el
# snapshot con un Postgres local). No afecta login/perfil/alertas — esas
# rutas siguen necesitando una base viva.
SHOWCASE_MODE=
```

- [ ] **Step 4: Verifica el script contra un Postgres local**

Requiere Postgres local corriendo con el schema migrado y algo de data ingestada (ver docstring del script, Task 7 Step 1). Con eso listo:

Run: `DB_DRIVER=node DATABASE_URL=postgresql://localhost:5432/hydrostack npm run showcase:export`
Expected: `Snapshot exportado: N procesos → .../data/showcase/procesos.snapshot.json` y el archivo tiene `items` no vacío.

- [ ] **Step 5: Commit**

```bash
git add scripts/export-showcase-snapshot.ts package.json .env.example
git commit -m "feat(showcase): script de exportación del snapshot desde Postgres local"
```

---

## Cómo activarlo en producción (no es un paso de este plan — es la operación manual posterior)

1. Correr el pipeline local (Task 7, Step 4) contra un Postgres propio para generar `data/showcase/procesos.snapshot.json` con datos reales.
2. Commitear el JSON y hacer push a `main`.
3. En Vercel: `vercel env add SHOWCASE_MODE production` → valor `true` (y en `preview` si aplica).
4. Redeploy. `/licitaciones` y `/licitaciones/explorar` quedan sirviendo el snapshot con el banner ámbar visible.
5. Cuando Neon vuelva a estar alcanzable: `vercel env rm SHOWCASE_MODE production` (o setearla a cualquier valor distinto de `"true"`) y redeploy — el código vuelve a su comportamiento original sin más cambios.
