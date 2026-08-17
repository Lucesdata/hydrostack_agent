# Refinamiento de /mis-coincidencias — perfil mínimo (sector + zona) — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bajar la fricción de `/mis-coincidencias` para un usuario sin perfil: en vez de redirigirlo al wizard completo de 4 pasos (`identidad` → `sectores` → `cobertura` → `cuantía`), ofrecerle un setup inline de 2 campos (sector + zona) que ya muestra coincidencias reales, sin inventar datos de capacidad financiera/RUP ni cuantía objetivo.

**Contexto (por qué este plan y no el original de 5 fases):**
- `/mis-coincidencias` **ya existe** ([app/mis-coincidencias/page.tsx](../../../app/mis-coincidencias/page.tsx)), con 3 estados reales contra el motor de matching real (`getMatchesForPerfil` → `buildVerdict`). No es huérfana: el Navbar ya enlaza aquí (`src/components/Navbar.js:161`, commit `915ecb4`).
- El perfil que usa hoy (`OferenteProfile`) exige `cuantiaObjetivo`, `capacidadFinanciera` y `tipoPersona` como campos obligatorios, y `getMatchesForPerfil` ya usa `cuantiaObjetivo.minCop` como filtro SQL real — no es solo un dato del semáforo de elegibilidad. Por eso el "perfil mínimo" no puede ser un objeto `OferenteProfile` a medio llenar: es un tipo nuevo, más chico, con su propia ruta de matching.
- Decisión ya tomada con el usuario: sin valores por defecto inventados para RUP/cuantía — mejor una ruta de matching liviana nueva, honesta, que solo cruza sector y zona.
- **Fuera de alcance deliberadamente** (no lo toca este plan): email digest y badge de "coincidencias no vistas" del Navbar para perfiles mínimos. `enviarDigestAhora`/`runDailyAlertas`/`recordCoincidencias` siguen exigiendo el perfil completo — un usuario con perfil mínimo ve sus coincidencias en la página, pero no recibe correo ni suma al badge hasta completar el wizard. Este plan lo deja explícito (Task 5) en vez de dejarlo romper en silencio.
- **Fuera de alcance:** cualquier cambio a `app/api/perfil/route.ts` GET o a `SecopExplorer.tsx` (no se verificó cómo ese componente consume la respuesta de ese GET — cambiar su contrato sin verificarlo es riesgoso). Si más adelante se detecta que también asume `OferenteProfile` completo, es un plan aparte.

**Architecture:** Un tipo nuevo `PerfilMinimo` (sector + zona, sin RUP) se guarda en la misma tabla `oferente_perfil` (columna `perfil` jsonb) que ya usa el perfil completo — **cero migración de Drizzle**. Se reusan `sectorialGate`/`ubicacionGate` de `src/lib/secop/verdict.ts` (ya son funciones puras exportadas que solo leen `sectoresUnspsc`/`cobertura`) angostando su firma de tipos, sin tocar su lógica. Una ruta de matching paralela y más liviana (`match-minimo.ts`) omite las otras 3 compuertas (cuantía, plazo, habilitación) que dependen de datos que el perfil mínimo no tiene.

**Tech Stack:** Next.js 14 App Router (server actions), Drizzle ORM sobre Postgres, Vitest.

---

### Task 1: Tipo `PerfilMinimo` + type guard

**Files:**
- Create: `src/lib/oferente/perfil-minimo.ts`
- Test: `src/__tests__/oferente/perfil-minimo.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/__tests__/oferente/perfil-minimo.test.ts
import { describe, it, expect } from "vitest";
import { isPerfilCompleto, type PerfilMinimo } from "@/src/lib/oferente/perfil-minimo";
import type { OferenteProfile } from "@/src/lib/oferente/types";

const minimo: PerfilMinimo = {
  id: "u1",
  sectoresUnspsc: ["83101"],
  cobertura: { departamentos: ["76"], municipios: [] },
};

const completo: OferenteProfile = {
  id: "u1",
  tipoPersona: "juridica",
  sectoresUnspsc: ["83101"],
  capacidadFinanciera: {
    capitalTrabajoCop: 0,
    indiceLiquidez: 0,
    indiceEndeudamiento: 0,
    razonCoberturaIntereses: 0,
    fuente: "manual",
    vigenciaHasta: null,
  },
  kCapacidadResidualCop: null,
  cobertura: { departamentos: ["76"], municipios: [] },
  cuantiaObjetivo: { minCop: 0, maxCop: 0 },
};

describe("isPerfilCompleto", () => {
  it("es false para un perfil mínimo (sin cuantiaObjetivo)", () => {
    expect(isPerfilCompleto(minimo)).toBe(false);
  });

  it("es true para un OferenteProfile completo", () => {
    expect(isPerfilCompleto(completo)).toBe(true);
  });
});
```

- [ ] **Step 2: Correr el test y confirmar que falla**

Run: `npx vitest run src/__tests__/oferente/perfil-minimo.test.ts`
Expected: FAIL con `Cannot find module '@/src/lib/oferente/perfil-minimo'`

- [ ] **Step 3: Implementar el tipo y el guard**

```ts
// src/lib/oferente/perfil-minimo.ts
/**
 * Perfil mínimo de matching (sector + zona) — setup inline de baja fricción
 * en /mis-coincidencias, alternativa al wizard completo de OferenteProfile.
 * Se guarda en la misma fila `oferente_perfil` (columna `perfil` jsonb): no
 * hay tabla ni columna nueva, solo una forma más chica del mismo campo.
 *
 * Deliberadamente sin `cuantiaObjetivo`/`capacidadFinanciera`/`tipoPersona`:
 * inventar esos valores contaminaría el semáforo de elegibilidad con datos
 * falsos. Un perfil mínimo solo alimenta sectorialGate/ubicacionGate — ver
 * `src/lib/matching/match-minimo.ts`.
 */

import type { OferenteProfile, CoberturaGeografica, UnspscCodigo } from "./types";

export interface PerfilMinimo {
  id: string;
  sectoresUnspsc: UnspscCodigo[];
  cobertura: CoberturaGeografica;
}

export type PerfilGuardado = OferenteProfile | PerfilMinimo;

/** Discrimina por presencia de `cuantiaObjetivo`, exclusivo del perfil completo. */
export function isPerfilCompleto(p: PerfilGuardado): p is OferenteProfile {
  return "cuantiaObjetivo" in p;
}
```

- [ ] **Step 4: Correr el test y confirmar que pasa**

Run: `npx vitest run src/__tests__/oferente/perfil-minimo.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/oferente/perfil-minimo.ts src/__tests__/oferente/perfil-minimo.test.ts
git commit -m "feat(oferente): agrega tipo PerfilMinimo (sector+zona) sin migración"
```

---

### Task 2: Angostar la firma de `sectorialGate`/`ubicacionGate`

**Files:**
- Modify: `src/lib/secop/verdict.ts:115` (tipo `SectorialGate`), `:135` (tipo `UbicacionGate`)
- Test: `src/__tests__/secop/verdict.test.ts` (ya existe — se agregan 2 casos, no se reescribe)

Estas dos funciones ya son puras y exportadas, y ya solo leen `p.sectoresUnspsc` / `p.cobertura` respectivamente — el único cambio es angostar el tipo del primer parámetro de `OferenteProfile` a un `Pick`, para que `PerfilMinimo` también los satisfaga sin necesitar un `OferenteProfile` completo falso. `OferenteProfile` sigue siendo estructuralmente compatible (todo objeto con esos dos campos lo es), así que `buildVerdict` no cambia.

- [ ] **Step 1: Escribir los 2 casos nuevos en el test existente (agregar al final del describe block que ya prueba `sectorialGate`/`ubicacionGate`)**

```ts
// src/__tests__/secop/verdict.test.ts — agregar dentro del describe existente
import { isPerfilCompleto, type PerfilMinimo } from "@/src/lib/oferente/perfil-minimo";
// (agregar este import junto a los demás imports del archivo)

it("sectorialGate acepta un PerfilMinimo (sin capacidadFinanciera/cuantiaObjetivo)", () => {
  const minimo: PerfilMinimo = {
    id: "u1",
    sectoresUnspsc: ["83101"],
    cobertura: { departamentos: ["76"], municipios: [] },
  };
  const r = sectorialGate(minimo, proc({ unspsc: "83101500" }));
  expect(r.status).toBe("PASS");
});

it("ubicacionGate acepta un PerfilMinimo", () => {
  const minimo: PerfilMinimo = {
    id: "u1",
    sectoresUnspsc: [],
    cobertura: { departamentos: ["76"], municipios: [] },
  };
  const r = ubicacionGate(minimo, proc({ departamento: "Valle del Cauca" }));
  expect(r.status).toBe("PASS");
});
```

- [ ] **Step 2: Correr el test y confirmar que falla (error de tipos, TS2345)**

Run: `npx vitest run src/__tests__/secop/verdict.test.ts`
Expected: FAIL — TypeScript rechaza pasar `PerfilMinimo` donde se espera `OferenteProfile` (falta `capacidadFinanciera`, `cuantiaObjetivo`, etc.)

- [ ] **Step 3: Angostar los tipos `SectorialGate`/`UbicacionGate`**

En `src/lib/secop/verdict.ts`, reemplazar:

```ts
// ANTES (línea 115)
export type SectorialGate = (p: OferenteProfile, proc: VerdictProcessInput) => GateResult; // L0
```

por:

```ts
// DESPUÉS
export type SectorialGate = (
  p: Pick<OferenteProfile, "sectoresUnspsc">,
  proc: VerdictProcessInput
) => GateResult; // L0
```

y reemplazar:

```ts
// ANTES (línea 135)
export type UbicacionGate = (p: OferenteProfile, proc: VerdictProcessInput) => GateResult; // L0
```

por:

```ts
// DESPUÉS
export type UbicacionGate = (
  p: Pick<OferenteProfile, "cobertura">,
  proc: VerdictProcessInput
) => GateResult; // L0
```

Los cuerpos de `sectorialGate`/`ubicacionGate` (líneas 224-265 y 370-410) no cambian — ya solo acceden a `p.sectoresUnspsc` y `p.cobertura`.

- [ ] **Step 4: Correr `tsc` y los tests para confirmar que todo sigue compilando y pasando**

Run: `npx tsc --noEmit && npx vitest run src/__tests__/secop/verdict.test.ts src/__tests__/matching/match.test.ts`
Expected: 0 errores de TS, todos los tests PASS (los preexistentes de `buildVerdict`/`matchProcesos` con `OferenteProfile` completo siguen funcionando igual — es un cambio de tipos, no de comportamiento)

- [ ] **Step 5: Commit**

```bash
git add src/lib/secop/verdict.ts src/__tests__/secop/verdict.test.ts
git commit -m "refactor(verdict): angosta sectorialGate/ubicacionGate a Pick<OferenteProfile> para reusarlas con PerfilMinimo"
```

---

### Task 3: Ruta de matching liviana para `PerfilMinimo`

**Files:**
- Create: `src/lib/matching/match-minimo.ts`
- Create: `src/lib/matching/get-matches-for-perfil-minimo.ts`
- Test: `src/__tests__/matching/match-minimo.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/__tests__/matching/match-minimo.test.ts
import { describe, it, expect } from "vitest";
import { matchProcesosMinimo, coincideEnLabel } from "@/src/lib/matching/match-minimo";
import type { PerfilMinimo } from "@/src/lib/oferente/perfil-minimo";
import type { SecopProceso } from "@/src/lib/secop/types";

const perfil: PerfilMinimo = {
  id: "u1",
  sectoresUnspsc: ["83101"],
  cobertura: { departamentos: ["76"], municipios: [] },
};

function proceso(over: Partial<SecopProceso> = {}): SecopProceso {
  return {
    id: "CO1.REQ.1",
    referencia: "REF-1",
    nombre: "Optimización del sistema de acueducto",
    descripcion: "Obras de acueducto",
    entidad: "Acuavalle",
    departamento: "Valle del Cauca",
    ciudad: "Cali",
    estado: "Publicado",
    fase: "",
    modalidad: "Licitación pública",
    tipoContrato: "Obra",
    fechaPublicacion: "2026-06-01",
    precioBase: 500_000_000,
    valorAdjudicacion: null,
    unspsc: "83101500",
    estadoApertura: "Abierto",
    documentAccess: { state: "resolved", reason: "ok", method: "metadata" },
    ...over,
  } as SecopProceso;
}

describe("matchProcesosMinimo", () => {
  it("PASS en sector y zona → overall PASS", () => {
    const [m] = matchProcesosMinimo(perfil, [proceso()]);
    expect(m.gates.sectorial.status).toBe("PASS");
    expect(m.gates.ubicacion.status).toBe("PASS");
    expect(m.overall).toBe("PASS");
  });

  it("fuera de cobertura → overall FAIL", () => {
    const [m] = matchProcesosMinimo(perfil, [proceso({ departamento: "Cundinamarca", ciudad: "Bogotá" })]);
    expect(m.overall).toBe("FAIL");
  });
});

describe("coincideEnLabel", () => {
  it("ambos PASS → 'Sector + Zona'", () => {
    const [m] = matchProcesosMinimo(perfil, [proceso()]);
    expect(coincideEnLabel(m)).toBe("Coincide en: Sector + Zona");
  });

  it("solo sector PASS → 'Sector'", () => {
    const [m] = matchProcesosMinimo(perfil, [proceso({ departamento: "Cundinamarca", ciudad: "Bogotá", unspsc: "83101500" })]);
    expect(coincideEnLabel(m)).toBe("Coincide en: Sector");
  });
});
```

- [ ] **Step 2: Correr el test y confirmar que falla**

Run: `npx vitest run src/__tests__/matching/match-minimo.test.ts`
Expected: FAIL — `Cannot find module '@/src/lib/matching/match-minimo'`

- [ ] **Step 3: Implementar `match-minimo.ts`**

```ts
// src/lib/matching/match-minimo.ts
/**
 * Matching liviano para PerfilMinimo (sector + zona) — hermano de match.ts
 * pero sin las 3 compuertas que dependen de datos que el perfil mínimo no
 * tiene (cuantía, plazo, habilitación). Reusa sectorialGate/ubicacionGate
 * sin duplicar su lógica (Task 2 las angostó a Pick<OferenteProfile>).
 */

import {
  sectorialGate,
  ubicacionGate,
  toVerdictInput,
  type GateResult,
  type GateStatus,
} from "@/src/lib/secop/verdict";
import type { PerfilMinimo } from "@/src/lib/oferente/perfil-minimo";
import type { SecopProceso } from "@/src/lib/secop/types";

export interface MatchMinimo {
  proceso: SecopProceso;
  gates: { sectorial: GateResult; ubicacion: GateResult };
  overall: GateStatus;
}

const RANK: Record<GateStatus, number> = { PASS: 0, WARN: 1, UNKNOWN: 2, FAIL: 3 };

function worstOf(a: GateStatus, b: GateStatus): GateStatus {
  return RANK[a] >= RANK[b] ? a : b;
}

export function matchProcesosMinimo(perfil: PerfilMinimo, procesos: SecopProceso[]): MatchMinimo[] {
  return procesos.map((proceso) => {
    const input = toVerdictInput(proceso);
    const sectorial = sectorialGate(perfil, input);
    const ubicacion = ubicacionGate(perfil, input);
    return {
      proceso,
      gates: { sectorial, ubicacion },
      overall: worstOf(sectorial.status, ubicacion.status),
    };
  });
}

/** Badge de presentación: qué compuertas dieron PASS. */
export function coincideEnLabel(m: MatchMinimo): string {
  const partes: string[] = [];
  if (m.gates.sectorial.status === "PASS") partes.push("Sector");
  if (m.gates.ubicacion.status === "PASS") partes.push("Zona");
  return partes.length > 0 ? `Coincide en: ${partes.join(" + ")}` : "Posible coincidencia";
}
```

- [ ] **Step 4: Correr el test y confirmar que pasa**

Run: `npx vitest run src/__tests__/matching/match-minimo.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Implementar `get-matches-for-perfil-minimo.ts` (prefiltro SQL, sin `valorMin` porque no hay `cuantiaObjetivo`)**

```ts
// src/lib/matching/get-matches-for-perfil-minimo.ts
/**
 * Prefiltro SQL + matching liviano para PerfilMinimo — hermano de
 * get-matches-for-perfil.ts. A diferencia de ese, NO pasa `valorMin` a
 * searchProcesosDb (PerfilMinimo no tiene cuantiaObjetivo) y usa
 * matchProcesosMinimo en vez de matchProcesos.
 */

import { searchProcesosDb } from "@/src/lib/secop/db-search";
import { matchProcesosMinimo, type MatchMinimo } from "./match-minimo";
import type { GateStatus } from "@/src/lib/secop/verdict";
import type { PerfilMinimo } from "@/src/lib/oferente/perfil-minimo";

const RANK: Record<GateStatus, number> = { PASS: 0, WARN: 1, UNKNOWN: 2, FAIL: 3 };

export async function getMatchesForPerfilMinimo(perfil: PerfilMinimo): Promise<MatchMinimo[]> {
  const { items } = await searchProcesosDb({
    apertura: "Abierto",
    soloAgua: true,
    orden: "fecha",
    page: 1,
    pageSize: 25,
  });

  return matchProcesosMinimo(perfil, items)
    .filter((m) => m.overall !== "FAIL")
    .sort((a, b) => RANK[a.overall] - RANK[b.overall]);
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/matching/match-minimo.ts src/lib/matching/get-matches-for-perfil-minimo.ts src/__tests__/matching/match-minimo.test.ts
git commit -m "feat(matching): ruta de matching liviana (sector+zona) para PerfilMinimo"
```

---

### Task 4: Guardar `PerfilMinimo` en `oferente_perfil` (sin migración)

**Files:**
- Modify: `src/lib/oferente/perfil-store.ts`
- Test: `src/__tests__/oferente/perfil-store.test.ts` (crear — hoy `perfil-store.ts` no tiene test propio)

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/__tests__/oferente/perfil-store.test.ts
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

import { savePerfilMinimoDb } from "@/src/lib/oferente/perfil-store";

describe("savePerfilMinimoDb", () => {
  it("hace upsert en oferente_perfil y devuelve ok:true", async () => {
    const perfil = { id: "u1", sectoresUnspsc: ["83101"], cobertura: { departamentos: ["76"], municipios: [] } };
    const r = await savePerfilMinimoDb("u1", perfil);
    expect(r).toEqual({ ok: true });
    expect(insertValuesMock).toHaveBeenCalledWith({ usuarioId: "u1", perfil });
  });

  it("devuelve ok:false DB_UNAVAILABLE si el insert lanza (modo concierge)", async () => {
    onConflictMock.mockRejectedValueOnce(new Error("connection refused"));
    const r = await savePerfilMinimoDb("u1", { id: "u1", sectoresUnspsc: [], cobertura: { departamentos: [], municipios: [] } });
    expect(r).toEqual({ ok: false, error: "DB_UNAVAILABLE" });
  });
});
```

- [ ] **Step 2: Correr el test y confirmar que falla**

Run: `npx vitest run src/__tests__/oferente/perfil-store.test.ts`
Expected: FAIL — `savePerfilMinimoDb` no existe

- [ ] **Step 3: Implementar `savePerfilMinimoDb` y actualizar el tipo de retorno de `getPerfilDb`**

Reemplazar el contenido completo de `src/lib/oferente/perfil-store.ts`:

```ts
// src/lib/oferente/perfil-store.ts
/**
 * Lectura/escritura del perfil de oferente en DB (Fase 1.1). Extraído porque
 * `GET /api/perfil`, `/mis-coincidencias` y las alertas necesitan exactamente
 * la misma consulta — un solo sitio que conoce la forma de la fila
 * `oferente_perfil`.
 *
 * Desde el perfil mínimo (sector+zona, ver perfil-minimo.ts), la columna
 * `perfil` (jsonb) puede contener un `OferenteProfile` completo o un
 * `PerfilMinimo` — mismo esquema de tabla, sin migración. Todo caller de
 * `getPerfilDb` debe chequear `isPerfilCompleto()` antes de asumir los
 * campos de RUP/cuantía (ver Task 5 de
 * docs/superpowers/plans/2026-08-17-mis-coincidencias-refinamiento.md).
 */

import { eq } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { oferentePerfil } from "@/src/lib/db/schema/cuentas";
import type { PerfilGuardado, PerfilMinimo } from "./perfil-minimo";

export async function getPerfilDb(usuarioId: string): Promise<PerfilGuardado | null> {
  const [row] = await db
    .select()
    .from(oferentePerfil)
    .where(eq(oferentePerfil.usuarioId, usuarioId))
    .limit(1);
  return row ? (row.perfil as PerfilGuardado) : null;
}

export async function savePerfilMinimoDb(
  usuarioId: string,
  perfil: PerfilMinimo
): Promise<{ ok: true } | { ok: false; error: "DB_UNAVAILABLE" }> {
  try {
    await db
      .insert(oferentePerfil)
      .values({ usuarioId, perfil })
      .onConflictDoUpdate({
        target: oferentePerfil.usuarioId,
        set: { perfil, actualizadoEn: new Date() },
      });
    return { ok: true };
  } catch {
    // Mismo patrón "modo concierge" de app/api/perfil/route.ts (bbfeaf1):
    // base no alcanzable (Neon bloqueado / migración a Supabase en curso).
    return { ok: false, error: "DB_UNAVAILABLE" };
  }
}
```

- [ ] **Step 4: Correr el test y confirmar que pasa**

Run: `npx vitest run src/__tests__/oferente/perfil-store.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Compilar y correr toda la suite para ver qué rompe el cambio de tipo de `getPerfilDb`**

Run: `npx tsc --noEmit`
Expected: errores de TS en los 3 callers que asumen `OferenteProfile` sin chequear — `app/perfil/page.tsx`, `src/lib/alertas/enviar-ahora.ts`, `src/lib/alertas/run-daily.ts`. Es esperado — Task 5 los arregla. Si `tsc` no marca error en alguno de los 3 (porque usan `as OferenteProfile` explícito, como `run-daily.ts`), anotarlo: ese caller compila pero puede fallar en runtime — Task 5 lo cubre igual.

- [ ] **Step 6: Commit**

```bash
git add src/lib/oferente/perfil-store.ts src/__tests__/oferente/perfil-store.test.ts
git commit -m "feat(oferente): savePerfilMinimoDb + getPerfilDb devuelve PerfilGuardado (union)"
```

---

### Task 5: Blindar los 3 callers existentes de `getPerfilDb` contra el tipo unión

**Files:**
- Modify: `app/perfil/page.tsx`
- Modify: `src/lib/alertas/enviar-ahora.ts`
- Modify: `src/lib/alertas/run-daily.ts`
- Test: `src/__tests__/alertas/enviar-ahora.test.ts` (si no existe, crear con el caso mínimo; si existe, agregar el caso)

- [ ] **Step 1: `app/perfil/page.tsx` — si el perfil guardado es mínimo, el wizard completo arranca vacío en vez de recibir un objeto incompleto**

```tsx
// app/perfil/page.tsx — reemplazar completo
import { redirect } from "next/navigation";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { getPerfilDb } from "@/src/lib/oferente/perfil-store";
import { isPerfilCompleto } from "@/src/lib/oferente/perfil-minimo";
import PerfilForm from "@/src/components/perfil/PerfilForm";

export default async function PerfilPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/perfil");

  const guardado = await getPerfilDb(user.id);
  const perfilCompleto = guardado && isPerfilCompleto(guardado) ? guardado : null;

  return (
    <div className="clr-page">
      <div className="clr-container" style={{ maxWidth: 720, padding: "40px 20px" }}>
        <h1 className="clr-h1">Mi perfil RUP</h1>
        <p className="clr-sub">
          Estos datos se usan para calcular tu elegibilidad en cada proceso — nunca se
          publican ni se comparten.
        </p>
        <PerfilForm perfilInicial={perfilCompleto} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `src/lib/alertas/enviar-ahora.ts` — devolver un error claro en vez de crashear si el perfil es mínimo**

```ts
// src/lib/alertas/enviar-ahora.ts — dentro de enviarDigestAhora, después de `if (!perfil) {...}`, agregar:
import { isPerfilCompleto } from "@/src/lib/oferente/perfil-minimo";
// (agregar junto a los demás imports)

export async function enviarDigestAhora(usuarioId: string): Promise<EnvioResultado> {
  const perfil = await getPerfilDb(usuarioId);
  if (!perfil) {
    return { estado: "error", matches: 0, error: "No tienes un perfil de oferente guardado." };
  }
  if (!isPerfilCompleto(perfil)) {
    return {
      estado: "error",
      matches: 0,
      error: "Completa tu perfil en /licitaciones/explorar para recibir alertas por correo.",
    };
  }

  const [u] = await db.select().from(usuario).where(eq(usuario.id, usuarioId)).limit(1);
  // ... resto sin cambios (perfil ya está afinado a OferenteProfile por el guard de arriba)
```

- [ ] **Step 3: Correr el test existente de `enviar-ahora` y agregar el caso nuevo**

Run: `find src/__tests__ -iname "*enviar-ahora*"` — si existe, agregar este `it` al describe existente; si no existe el archivo, es un caller sin cobertura previa y se documenta como hallazgo, no se bloquea esta tarea por crear un archivo de test nuevo desde cero para un módulo preexistente sin tests.

```ts
it("perfil mínimo (sin cuantiaObjetivo) devuelve error claro, no crashea", async () => {
  mockGetPerfilDb.mockResolvedValue({ id: "u1", sectoresUnspsc: ["83101"], cobertura: { departamentos: ["76"], municipios: [] } });
  const r = await enviarDigestAhora("u1");
  expect(r.estado).toBe("error");
  expect(r.error).toMatch(/licitaciones\/explorar/);
});
```

- [ ] **Step 4: `src/lib/alertas/run-daily.ts` — saltar cuentas con perfil mínimo explícitamente, en las 2 ramas que hoy castean `as OferenteProfile`**

```ts
// src/lib/alertas/run-daily.ts
import { isPerfilCompleto } from "@/src/lib/oferente/perfil-minimo";
// (agregar junto a los demás imports; ya no hace falta el import directo de `OferenteProfile` si no se usa en otro lado del archivo — verificar antes de quitarlo)
```

En la rama `cuenta.activo === false` (badge sin envío):

```ts
// ANTES
      try {
        const perfil = cuenta.perfil as OferenteProfile;
        const matches = await getMatchesForPerfil(perfil);
        await recordCoincidencias(cuenta.usuarioId, matches);
      } catch (e) {
```

```ts
// DESPUÉS
      const perfilGuardado = cuenta.perfil as PerfilGuardado;
      if (!isPerfilCompleto(perfilGuardado)) {
        // Perfil mínimo: fuera de alcance del badge/email hasta completar el wizard (D-refinamiento-2026-08-17).
        summary.saltados++;
        continue;
      }
      try {
        const matches = await getMatchesForPerfil(perfilGuardado);
        await recordCoincidencias(cuenta.usuarioId, matches);
      } catch (e) {
```

Y en la rama principal de envío (después de reservar el `envio_log`):

```ts
// ANTES
    try {
      const perfil = cuenta.perfil as OferenteProfile;
      const matches = await getMatchesForPerfil(perfil);
```

```ts
// DESPUÉS
    const perfilGuardado = cuenta.perfil as PerfilGuardado;
    if (!isPerfilCompleto(perfilGuardado)) {
      await db
        .update(envioLog)
        .set({ estado: "sin_coincidencias", matches: 0 })
        .where(eq(envioLog.id, reservado.id));
      summary.saltados++;
      continue;
    }
    try {
      const matches = await getMatchesForPerfil(perfilGuardado);
```

Agregar el import de `PerfilGuardado`:

```ts
import type { PerfilGuardado } from "@/src/lib/oferente/perfil-minimo";
```

Y quitar el import `import type { OferenteProfile } from "@/src/lib/oferente/types";` si ya no se usa en ningún otro punto del archivo (confirmar con `grep -n "OferenteProfile" src/lib/alertas/run-daily.ts` tras el cambio).

- [ ] **Step 5: Compilar y correr toda la suite de alertas**

Run: `npx tsc --noEmit && npx vitest run src/__tests__/alertas`
Expected: 0 errores de TS, todos los tests PASS

- [ ] **Step 6: Commit**

```bash
git add app/perfil/page.tsx src/lib/alertas/enviar-ahora.ts src/lib/alertas/run-daily.ts src/__tests__/alertas
git commit -m "fix(alertas): salta explícitamente cuentas con PerfilMinimo en vez de crashear/loguear error falso"
```

---

### Task 6: Server action para guardar el perfil mínimo

**Files:**
- Create: `src/lib/oferente/actions.ts`

- [ ] **Step 1: Implementar la acción (sin test unitario — es una server action con redirect, se verifica en Task 8 vía la página)**

```ts
// src/lib/oferente/actions.ts
"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { savePerfilMinimoDb } from "./perfil-store";

export async function saveMinimoPerfilAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user?.id) {
    redirect("/login?next=/mis-coincidencias");
  }

  const sectoresUnspsc = formData.getAll("sector").map(String);
  const departamentos = formData.getAll("departamento").map(String);

  if (sectoresUnspsc.length === 0 && departamentos.length === 0) {
    redirect("/mis-coincidencias?perfilError=vacio");
  }

  const resultado = await savePerfilMinimoDb(user.id, {
    id: user.id,
    sectoresUnspsc,
    cobertura: { departamentos, municipios: [] },
  });

  if (!resultado.ok) {
    redirect("/mis-coincidencias?perfilError=db_unavailable");
  }

  redirect("/mis-coincidencias");
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: 0 errores

- [ ] **Step 3: Commit**

```bash
git add src/lib/oferente/actions.ts
git commit -m "feat(oferente): server action para guardar perfil mínimo desde /mis-coincidencias"
```

---

### Task 7: Componente `SectorZonaSetup` (chips de sector + zona)

**Files:**
- Create: `src/components/oferente/SectorZonaSetup.tsx`

No usa `useState` de selección compleja — son checkboxes nativos con `name="sector"`/`name="departamento"` repetido, el propio `<form action={...}>` junta los valores marcados vía `FormData.getAll`. Reusa `SECTOR_OPTIONS` (4 familias, ya definidas en `wizard.ts`) y `DEPARTAMENTOS` (33 entradas DIVIPOLA, ya en `data/dane/divipola.ts`) — mismas fuentes de datos que ya usa `PerfilForm.tsx`, sin inventar catálogos nuevos.

- [ ] **Step 1: Implementar el componente**

```tsx
// src/components/oferente/SectorZonaSetup.tsx
import { SECTOR_OPTIONS } from "@/src/lib/oferente/wizard";
import { DEPARTAMENTOS } from "@/data/dane/divipola";
import { saveMinimoPerfilAction } from "@/src/lib/oferente/actions";

const STYLE = `
  .clr-szs{ display: flex; flex-direction: column; gap: 20px; }
  .clr-szs-group h3{ font-size: 13px; font-weight: 600; color: var(--ink-900); margin: 0 0 8px; }
  .clr-szs-chips{ display: flex; flex-wrap: wrap; gap: 8px; }
  .clr-szs-chip{ position: relative; }
  .clr-szs-chip input{ position: absolute; opacity: 0; inset: 0; cursor: pointer; margin: 0; }
  .clr-szs-chip span{
    display: inline-flex; align-items: center; padding: 6px 12px; border-radius: 999px;
    border: 1px solid var(--line); font-size: 12.5px; color: var(--ink-700, var(--ink-600));
    background: var(--card, #fff); user-select: none;
  }
  .clr-szs-chip input:checked + span{
    background: var(--accent); border-color: var(--accent); color: #fff;
  }
  .clr-szs-submit{
    align-self: flex-start; background: var(--accent); color: #fff; border: none;
    font-size: 12.5px; font-weight: 500; padding: 9px 16px; border-radius: var(--radius-md);
    cursor: pointer;
  }
  .clr-szs-submit:hover{ opacity: 0.9; }
`;

export function SectorZonaSetup() {
  return (
    <div className="clr-szs">
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <form action={saveMinimoPerfilAction} className="clr-szs">
        <div className="clr-szs-group">
          <h3>¿En qué sector trabajas?</h3>
          <div className="clr-szs-chips">
            {SECTOR_OPTIONS.map((o) => (
              <label key={o.codigo} className="clr-szs-chip">
                <input type="checkbox" name="sector" value={o.codigo} />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="clr-szs-group">
          <h3>¿En qué zona te interesa participar?</h3>
          <div className="clr-szs-chips">
            {DEPARTAMENTOS.map((d) => (
              <label key={d.departamentoCodigo} className="clr-szs-chip">
                <input type="checkbox" name="departamento" value={d.departamentoCodigo} />
                <span>{d.departamentoNombre}</span>
              </label>
            ))}
          </div>
        </div>
        <button type="submit" className="clr-szs-submit">
          Ver mis coincidencias
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: 0 errores

- [ ] **Step 3: Commit**

```bash
git add src/components/oferente/SectorZonaSetup.tsx
git commit -m "feat(oferente): componente SectorZonaSetup (chips sector+zona)"
```

---

### Task 8: Reescribir `/mis-coincidencias/page.tsx` con los 3 estados reales

**Files:**
- Modify: `app/mis-coincidencias/page.tsx`

- [ ] **Step 1: Reemplazar el archivo completo**

```tsx
// app/mis-coincidencias/page.tsx
/**
 * Mis coincidencias — dos calidades de perfil, ambas reales (sin mock):
 * - PerfilMinimo (sector+zona, setup inline): matchProcesosMinimo, sin
 *   semáforo de elegibilidad completo.
 * - OferenteProfile completo (wizard en /licitaciones/explorar): el veredicto
 *   Nivel 0 de siempre (src/lib/secop/verdict.ts vía src/lib/matching/match.ts).
 * Server component puro. Ver docs/superpowers/plans/2026-08-17-mis-coincidencias-refinamiento.md.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { getPerfilDb } from "@/src/lib/oferente/perfil-store";
import { isPerfilCompleto } from "@/src/lib/oferente/perfil-minimo";
import { getMatchesForPerfil } from "@/src/lib/matching/get-matches-for-perfil";
import { getMatchesForPerfilMinimo } from "@/src/lib/matching/get-matches-for-perfil-minimo";
import { coincideEnLabel, type MatchMinimo } from "@/src/lib/matching/match-minimo";
import type { Match } from "@/src/lib/matching/match";
import { markCoincidenciasVistas } from "@/src/lib/matching/record-coincidencias";
import { enviarDigestAhora, type EnvioEstado } from "@/src/lib/alertas/enviar-ahora";
import { recordUserSignal } from "@/src/lib/signals/record-signal";
import { getEnJuegoMes } from "@/src/lib/secop/landingStats";
import { SectorZonaSetup } from "@/src/components/oferente/SectorZonaSetup";
import {
  sentenceCaseTitle,
  formatCopCompact,
  formatShortDate,
  verdictScore,
} from "@/src/components/secop/format";

const BANNER: Record<EnvioEstado, string> = {
  enviado: "Correo enviado — revisa tu bandeja de entrada.",
  sin_coincidencias: "No hay coincidencias hoy — no se envió correo.",
  error:
    "No se pudo enviar el correo. Revisa la configuración de Resend (AUTH_RESEND_KEY / EMAIL_FROM).",
};

const PERFIL_ERROR: Record<string, string> = {
  vacio: "Marca al menos un sector o una zona antes de continuar.",
  db_unavailable: "No pudimos guardar tu perfil ahora mismo. Intenta de nuevo en unos minutos.",
};

const STYLE = `
  .clr-mc{
    min-height: 100vh; background: var(--bg); cursor: auto;
    padding-top: 48px;
  }
  .clr-mc-inner{ max-width: 860px; margin: 0 auto; padding: 0 20px 80px; font-family: var(--font-sans); }
  .clr-mc-title{ font-size: 20px; font-weight: 600; color: var(--ink-900); margin: 0 0 4px; }
  .clr-mc-sub{ font-size: 13px; color: var(--ink-600); margin: 0 0 24px; }
  .clr-mc-empty{
    background: var(--card, #fff); border: 1px solid var(--line); border-radius: var(--radius-lg);
    padding: 24px; font-size: 13px; color: var(--ink-600);
  }
  .clr-mc-empty a{ color: var(--accent); }
  .clr-mc-list{ display: flex; flex-direction: column; gap: 10px; }
  .clr-mc-card{
    background: var(--card, #fff); border: 1px solid var(--line); border-radius: var(--radius-lg);
    padding: 16px 18px; display: flex; flex-direction: column; gap: 6px;
  }
  .clr-mc-card-top{ display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
  .clr-mc-card-title{ font-size: 14px; font-weight: 600; color: var(--ink-900); margin: 0; }
  .clr-mc-card-meta{ font-size: 12px; color: var(--ink-600); }
  .clr-mc-card-foot{ display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }
  .clr-mc-val{ font-family: var(--font-mono); font-size: 13px; color: var(--ink-900); }
  .clr-mc-score{ display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-family: var(--font-mono); }
  .clr-mc-dot{ width: 7px; height: 7px; border-radius: 999px; }
  .clr-mc-score--success .clr-mc-dot{ background: #16a34a; }
  .clr-mc-score--warn .clr-mc-dot{ background: #d97706; }
  .clr-mc-score--fail .clr-mc-dot{ background: #dc2626; }
  .clr-mc-score--neutral .clr-mc-dot{ background: var(--ink-600); }
  .clr-mc-badge{
    font-size: 11.5px; font-family: var(--font-mono); color: var(--accent);
    background: var(--accent-faint); border: 1px solid var(--accent-soft);
    border-radius: 999px; padding: 3px 9px;
  }
  .clr-mc-link{ font-size: 12px; color: var(--accent); text-decoration: none; }
  .clr-mc-link:hover{ text-decoration: underline; }
  .clr-mc-actions{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .clr-mc-send-btn{
    background: var(--accent); color: #fff; border: none; font-size: 12.5px; font-weight: 500;
    padding: 8px 14px; border-radius: var(--radius-md); cursor: pointer;
  }
  .clr-mc-send-btn:hover{ opacity: 0.9; }
  .clr-mc-banner{
    font-size: 12.5px; color: var(--ink-900); background: var(--accent-faint);
    border: 1px solid var(--accent-soft); border-radius: var(--radius-md);
    padding: 10px 14px; margin-bottom: 16px;
  }
  .clr-mc-teaser{
    background: var(--card, #fff); border: 1px solid var(--line); border-radius: var(--radius-lg);
    padding: 28px 24px; text-align: center; filter: blur(0); position: relative;
  }
  .clr-mc-teaser-num{ font-size: 32px; font-weight: 700; color: var(--accent); font-family: var(--font-mono); }
  .clr-mc-teaser-sub{ font-size: 13px; color: var(--ink-600); margin: 6px 0 20px; }
  .clr-mc-cta{
    display: inline-flex; align-items: center; gap: 8px; background: var(--accent); color: #fff;
    text-decoration: none; font-size: 13px; font-weight: 500; padding: 10px 18px;
    border-radius: var(--radius-md);
  }
  .clr-mc-cta:hover{ opacity: 0.9; }
`;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="clr-mc">
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <div className="clr-mc-inner">{children}</div>
    </main>
  );
}

interface Props {
  searchParams: { resultado?: string; perfilError?: string };
}

export default async function MisCoincidenciasPage({ searchParams }: Props) {
  const user = await getSessionUser();
  const usuarioId = user?.id;
  const banner = BANNER[searchParams.resultado as EnvioEstado] ?? null;
  const perfilError = PERFIL_ERROR[searchParams.perfilError ?? ""] ?? null;

  if (!usuarioId) {
    const enJuego = await getEnJuegoMes().catch(() => ({ totalCop: null, procesos: null }));
    return (
      <Shell>
        <h1 className="clr-mc-title">Mis coincidencias</h1>
        <div className="clr-mc-teaser">
          <div className="clr-mc-teaser-num">
            {enJuego.procesos != null ? enJuego.procesos : "—"}
          </div>
          <p className="clr-mc-teaser-sub">
            procesos del sector agua abiertos este mes. Regístrate para ver cuáles calzan con tu
            sector y tu zona.
          </p>
          <Link href="/login?next=/mis-coincidencias" className="clr-mc-cta">
            Regístrate con Google →
          </Link>
        </div>
      </Shell>
    );
  }

  await recordUserSignal(usuarioId, "oferente");

  const perfilGuardado = await getPerfilDb(usuarioId);

  if (!perfilGuardado) {
    return (
      <Shell>
        <h1 className="clr-mc-title">Mis coincidencias</h1>
        <p className="clr-mc-sub">Cuéntanos en qué sector y zona trabajas para ver tus coincidencias.</p>
        {perfilError && <div className="clr-mc-banner">{perfilError}</div>}
        <SectorZonaSetup />
      </Shell>
    );
  }

  if (!isPerfilCompleto(perfilGuardado)) {
    const matches = await getMatchesForPerfilMinimo(perfilGuardado);
    return (
      <Shell>
        <h1 className="clr-mc-title">Mis coincidencias</h1>
        <p className="clr-mc-sub" style={{ margin: "0 0 24px" }}>
          {matches.length} proceso{matches.length === 1 ? "" : "s"} del sector agua que calzan con
          tu perfil.{" "}
          <Link href="/licitaciones/explorar">Completa tu perfil RUP</Link> para ver también tu
          semáforo de elegibilidad y recibir alertas por correo.
        </p>
        {matches.length === 0 ? (
          <div className="clr-mc-empty">
            Sin coincidencias por ahora. Revisa tu sector y zona en{" "}
            <Link href="/licitaciones/explorar">Licitaciones</Link>.
          </div>
        ) : (
          <div className="clr-mc-list">
            {matches.map((m: MatchMinimo) => (
              <div key={m.proceso.id} className="clr-mc-card">
                <div className="clr-mc-card-top">
                  <p className="clr-mc-card-title">
                    {sentenceCaseTitle(m.proceso.nombre || m.proceso.referencia)}
                  </p>
                  <span className="clr-mc-badge">{coincideEnLabel(m)}</span>
                </div>
                <span className="clr-mc-card-meta">
                  {m.proceso.entidad}
                  {m.proceso.departamento ? ` · ${m.proceso.departamento}` : ""}
                  {formatShortDate(m.proceso.fechaPublicacion) ? ` · ${formatShortDate(m.proceso.fechaPublicacion)}` : ""}
                </span>
                <div className="clr-mc-card-foot">
                  <span className="clr-mc-val">
                    {formatCopCompact(m.proceso.valorAdjudicacion ?? m.proceso.precioBase)}
                  </span>
                  {m.proceso.url && (
                    <a href={m.proceso.url} target="_blank" rel="noreferrer" className="clr-mc-link">
                      Ver en SECOP ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Shell>
    );
  }

  const matches = await getMatchesForPerfil(perfilGuardado);
  await markCoincidenciasVistas(usuarioId);

  async function handleEnviarAhora() {
    "use server";
    const s = await getSessionUser();
    if (!s?.id) return;
    const resultado = await enviarDigestAhora(s.id);
    redirect(`/mis-coincidencias?resultado=${resultado.estado}`);
  }

  return (
    <Shell>
      <div className="clr-mc-actions">
        <div>
          <h1 className="clr-mc-title">Mis coincidencias</h1>
          <p className="clr-mc-sub" style={{ margin: 0 }}>
            {matches.length} proceso{matches.length === 1 ? "" : "s"} abierto
            {matches.length === 1 ? "" : "s"} del sector agua que calzan con tu perfil.
          </p>
        </div>
        <form action={handleEnviarAhora}>
          <button type="submit" className="clr-mc-send-btn">
            Enviarme por correo ahora
          </button>
        </form>
      </div>
      {banner && <div className="clr-mc-banner">{banner}</div>}
      {matches.length === 0 ? (
        <div className="clr-mc-empty">
          Sin coincidencias por ahora con tu perfil actual. Revisa tu cobertura y sectores en{" "}
          <Link href="/licitaciones/explorar">Licitaciones</Link>.
        </div>
      ) : (
        <div className="clr-mc-list">
          {matches.map(({ proceso, verdict }: Match) => {
            const score = verdictScore(verdict);
            const fecha = formatShortDate(proceso.fechaPublicacion);
            return (
              <div key={proceso.id} className="clr-mc-card">
                <div className="clr-mc-card-top">
                  <p className="clr-mc-card-title">
                    {sentenceCaseTitle(proceso.nombre || proceso.referencia)}
                  </p>
                  <span className={`clr-mc-score clr-mc-score--${score.tone}`}>
                    <span className="clr-mc-dot" />
                    {score.pass}/{score.total}
                  </span>
                </div>
                <span className="clr-mc-card-meta">
                  {proceso.entidad}
                  {proceso.departamento ? ` · ${proceso.departamento}` : ""}
                  {fecha ? ` · ${fecha}` : ""}
                </span>
                <div className="clr-mc-card-foot">
                  <span className="clr-mc-val">
                    {formatCopCompact(proceso.valorAdjudicacion ?? proceso.precioBase)}
                  </span>
                  {proceso.url && (
                    <a href={proceso.url} target="_blank" rel="noreferrer" className="clr-mc-link">
                      Ver en SECOP ↗
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: 0 errores

- [ ] **Step 3: Verificación manual en dev — los 4 casos**

Run: `npm run dev`, luego en el navegador:
1. Sin sesión → `/mis-coincidencias` muestra el número real de `getEnJuegoMes()` + CTA de Google.
2. Con sesión, sin perfil → muestra `SectorZonaSetup`, marcar 1 sector + 1 zona, enviar → redirige a `/mis-coincidencias` ya con matches.
3. Recargar con perfil mínimo guardado → ve la lista con badges "Coincide en: Sector + Zona" (o parcial).
4. Un usuario con perfil completo (wizard de `/licitaciones/explorar`) sigue viendo el semáforo PASS/WARN/FAIL de siempre, sin cambios.

Expected: los 4 estados renderizan sin error de consola ni 500.

- [ ] **Step 4: Commit**

```bash
git add app/mis-coincidencias/page.tsx
git commit -m "feat(mis-coincidencias): setup inline sector+zona + teaser real para visitantes"
```

---

## Self-Review (spec coverage)

- **Visitante → preview + CTA Google**: Task 8 Step 1 (teaser con `getEnJuegoMes` real, sin datos inventados) + CTA existente a `/login` (Google ya es el único botón destacado de esa ruta — email/password sigue disponible en `/login` mismo, no se oculta).
- **Registrado sin perfil → setup 2 campos**: Tasks 6-7-8 (`SectorZonaSetup` + server action + rama `!perfilGuardado`).
- **Registrado con perfil → coincidencias reales + badge "Coincide en: X + Y"**: Tasks 1-3 (`PerfilMinimo`, gates angostadas, `matchProcesosMinimo`, `coincideEnLabel`) + Task 8 rama `!isPerfilCompleto`.
- **Perfil completo preexistente sigue funcionando igual**: Task 8 última rama, sin cambios de comportamiento.
- **Gate binario del plan original** ("sin sesión → navegar → registrarse con Google en 1 clic → sector/zona → ≥1 coincidencia real, sin salir de la página"): cubierto por Tasks 6-8, verificado en Task 8 Step 3.
- **Fase 2 del plan original (migración de esquema)**: no aplica — Task 1 y 4 confirman que no hace falta ninguna migración de Drizzle.
- **Fase 4 del plan original (retorno post-OAuth)**: ya estaba implementado antes de este plan (ver auditoría de Fase 1 en la conversación) — no repetido aquí.
- **Fase 5 (badge de coincidencia en `/licitaciones`)**: sigue fuera de alcance, como ya estaba en el plan original ("pendiente de boceto").

## Riesgo abierto no resuelto por este plan

El handoff `docs/superpowers/plans/2026-08-16-arreglar-la-raiz-handoff.md` reporta que Neon estaba bloqueado por cuota y que hay una migración a Supabase en curso. Si esa migración sigue sin cerrar cuando se ejecute este plan, `savePerfilMinimoDb`/`getMatchesForPerfilMinimo` van a degradar igual de mal que el resto de la app (modo concierge / 503) — este plan no lo arregla ni lo empeora, pero **el gate de verificación manual (Task 8 Step 3) puede fallar por esa causa, no por el código nuevo**. Confirmar el estado de la DB antes de dar por no-reproducible cualquier fallo ahí.
