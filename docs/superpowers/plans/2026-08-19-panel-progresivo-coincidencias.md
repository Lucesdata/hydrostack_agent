# Panel de coincidencias progresivo en /perfil Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mientras el usuario llena `/perfil`, mostrar un panel que consulta en vivo (con debounce) cuántos procesos coinciden con el borrador del perfil, sin esperar a guardar ni navegar a `/mis-coincidencias`.

**Architecture:** Un endpoint nuevo de solo lectura (`POST /api/perfil/preview`) reusa `getMatchesForPerfil` tal cual existe hoy contra el `OferenteProfile` recibido en el body (sin persistirlo). Un componente client (`PerfilResultadosPanel`) debounced+abortable lo consulta cada vez que cambia el estado `perfil` que ya vive en `PerfilForm`. Se suma también el campo `cuantiaObjetivo` que faltaba en el formulario — sin él, el panel siempre mostraría 0.

**Tech Stack:** Next.js 14 App Router (route handlers), React 18 (client component, `useState`/`useEffect`/`useRef`), vitest para las rutas API.

Spec de referencia: `docs/superpowers/specs/2026-08-19-panel-progresivo-coincidencias-design.md`.

---

### Task 1: Extraer validación compartida de `OferenteProfile`

**Files:**
- Create: `src/lib/oferente/validate.ts`
- Test: `src/__tests__/oferente/validate.test.ts`
- Modify: `app/api/perfil/route.ts:26-35` (elimina la función local, importa la nueva)

`app/api/perfil/route.ts` ya valida el shape del `OferenteProfile` recibido con una función local `isValidPerfil` (líneas 26-35). El endpoint nuevo del Task 2 necesita exactamente la misma validación — en vez de copiarla, se extrae a un módulo compartido primero.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/__tests__/oferente/validate.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isValidPerfil } from "@/src/lib/oferente/validate";

const perfilValido = {
  id: "oferente-1",
  sectoresUnspsc: ["83101"],
  cobertura: { departamentos: ["76"], municipios: [] },
  cuantiaObjetivo: { minCop: 0, maxCop: 0 },
};

describe("isValidPerfil", () => {
  it("acepta un perfil con el shape mínimo esperado", () => {
    expect(isValidPerfil(perfilValido)).toBe(true);
  });

  it("rechaza null", () => {
    expect(isValidPerfil(null)).toBe(false);
  });

  it("rechaza un objeto sin id", () => {
    const { id, ...sinId } = perfilValido;
    expect(isValidPerfil(sinId)).toBe(false);
  });

  it("rechaza sectoresUnspsc que no sea array", () => {
    expect(isValidPerfil({ ...perfilValido, sectoresUnspsc: "83101" })).toBe(false);
  });

  it("rechaza un objeto sin cobertura", () => {
    const { cobertura, ...sinCobertura } = perfilValido;
    expect(isValidPerfil(sinCobertura)).toBe(false);
  });

  it("rechaza un objeto sin cuantiaObjetivo", () => {
    const { cuantiaObjetivo, ...sinCuantia } = perfilValido;
    expect(isValidPerfil(sinCuantia)).toBe(false);
  });
});
```

- [ ] **Step 2: Correr el test y confirmar que falla**

Run: `npx vitest run src/__tests__/oferente/validate.test.ts`
Expected: FAIL — `Cannot find module '@/src/lib/oferente/validate'`

- [ ] **Step 3: Crear el módulo compartido**

Crear `src/lib/oferente/validate.ts`:

```ts
/**
 * Validación mínima del shape de `OferenteProfile` recibido por red — usada
 * por `PUT /api/perfil` (guardar) y `POST /api/perfil/preview` (consultar
 * sin guardar). Misma forma exacta que antes vivía duplicada en la route de
 * guardado.
 */
import type { OferenteProfile } from "./types";

export function isValidPerfil(p: unknown): p is OferenteProfile {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    Array.isArray(o.sectoresUnspsc) &&
    !!o.cobertura &&
    !!o.cuantiaObjetivo
  );
}
```

- [ ] **Step 4: Correr el test y confirmar que pasa**

Run: `npx vitest run src/__tests__/oferente/validate.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Actualizar `app/api/perfil/route.ts` para usar el módulo compartido**

En `app/api/perfil/route.ts`, reemplazar el import y eliminar la función local (líneas 16-35):

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { db } from "@/src/lib/db/client";
import { oferentePerfil } from "@/src/lib/db/schema/cuentas";
import { getPerfilDb } from "@/src/lib/oferente/perfil-store";
import { isPerfilCompleto } from "@/src/lib/oferente/perfil-minimo";
import { isValidPerfil } from "@/src/lib/oferente/validate";
import type { OferenteProfile } from "@/src/lib/oferente/types";

export const runtime = "nodejs";
```

(El resto del archivo —`GET`, `PUT`— queda igual; solo cambia de dónde viene `isValidPerfil`.)

- [ ] **Step 6: Confirmar que las pruebas existentes de la ruta siguen pasando**

Run: `npx vitest run src/__tests__/api/perfil-route.test.ts`
Expected: PASS (10 tests, sin cambios de comportamiento)

- [ ] **Step 7: Commit**

```bash
git add src/lib/oferente/validate.ts src/__tests__/oferente/validate.test.ts app/api/perfil/route.ts
git commit -m "refactor(perfil): extrae isValidPerfil a módulo compartido"
```

---

### Task 2: Endpoint `POST /api/perfil/preview`

**Files:**
- Create: `app/api/perfil/preview/route.ts`
- Test: `src/__tests__/api/perfil-preview-route.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/__tests__/api/perfil-preview-route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { OferenteProfile } from "@/src/lib/oferente/types";
import type { Match } from "@/src/lib/matching/match";
import type { SecopProceso } from "@/src/lib/secop/types";

const mockAuth = vi.fn();
vi.mock("@/src/lib/supabase/get-session-user", () => ({
  getSessionUser: () => mockAuth(),
}));

const mockGetMatches = vi.fn();
vi.mock("@/src/lib/matching/get-matches-for-perfil", () => ({
  getMatchesForPerfil: (...args: unknown[]) => mockGetMatches(...args),
}));

import { POST } from "@/app/api/perfil/preview/route";

const perfil: OferenteProfile = {
  id: "oferente-1",
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
  cobertura: { departamentos: ["76"], municipios: ["76001"] },
  cuantiaObjetivo: { minCop: 100_000_000, maxCop: 1_000_000_000 },
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
    adjudicado: false,
    valorAdjudicacion: null,
    adjudicatario: null,
    unspsc: "V1.83101500",
    url: null,
    estadoApertura: "Abierto",
    documentAccess: "UNKNOWN",
    accessMessage: "",
    ...over,
  };
}

function match(over: Partial<SecopProceso> = {}): Match {
  const p = proceso(over);
  return {
    proceso: p,
    verdict: {
      procesoId: p.id,
      overall: "PASS",
      gates: {
        sectorial: { status: "PASS", reason: "", resolvedBy: "metadata", requiredLevel: 0 },
        cuantia: { status: "PASS", reason: "", resolvedBy: "metadata", requiredLevel: 0 },
        plazo: { status: "PASS", reason: "", resolvedBy: "metadata", requiredLevel: 0 },
        ubicacion: { status: "PASS", reason: "", resolvedBy: "metadata", requiredLevel: 0 },
        habilitacion: { status: "UNKNOWN", reason: "", resolvedBy: "document", requiredLevel: 2 },
      },
      level: 0,
      evaluatedAt: "2026-06-27T00:00:00Z",
    },
  };
}

const postReq = (body: unknown) =>
  new NextRequest("http://localhost/api/perfil/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("POST /api/perfil/preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(postReq(perfil));
    expect(res.status).toBe(401);
  });

  it("400 con JSON inválido", async () => {
    mockAuth.mockResolvedValue({ id: "u1", email: "u1@example.com" });
    const res = await POST(postReq("no-es-json"));
    expect(res.status).toBe(400);
  });

  it("400 con perfil inválido", async () => {
    mockAuth.mockResolvedValue({ id: "u1", email: "u1@example.com" });
    const res = await POST(postReq({ id: "x" }));
    expect(res.status).toBe(400);
  });

  it("200 con count y hasta 3 ejemplos, valor con fallback precioBase→valorAdjudicacion", async () => {
    mockAuth.mockResolvedValue({ id: "u1", email: "u1@example.com" });
    mockGetMatches.mockResolvedValue([
      match({ id: "A", nombre: "Proceso A", entidad: "Entidad A", precioBase: 100, valorAdjudicacion: null }),
      match({ id: "B", nombre: "Proceso B", entidad: "Entidad B", precioBase: null, valorAdjudicacion: 200 }),
      match({ id: "C", nombre: "Proceso C", entidad: "Entidad C" }),
      match({ id: "D", nombre: "Proceso D", entidad: "Entidad D" }),
    ]);
    const res = await POST(postReq(perfil));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(4);
    expect(body.ejemplos).toHaveLength(3);
    expect(body.ejemplos[0]).toEqual({ nombre: "Proceso A", entidad: "Entidad A", valor: 100 });
    expect(body.ejemplos[1]).toEqual({ nombre: "Proceso B", entidad: "Entidad B", valor: 200 });
  });

  it("503 si getMatchesForPerfil lanza (base inalcanzable)", async () => {
    mockAuth.mockResolvedValue({ id: "u1", email: "u1@example.com" });
    mockGetMatches.mockRejectedValue(new Error("connection refused"));
    const res = await POST(postReq(perfil));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("DB_UNAVAILABLE");
  });
});
```

- [ ] **Step 2: Correr el test y confirmar que falla**

Run: `npx vitest run src/__tests__/api/perfil-preview-route.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/perfil/preview/route'`

- [ ] **Step 3: Crear el endpoint**

Crear `app/api/perfil/preview/route.ts`:

```ts
/**
 * Route handler: POST /api/perfil/preview
 *
 * Coincidencias en vivo para un `OferenteProfile` que el usuario todavía
 * está editando en `/perfil` — nunca escribe en `oferente_perfil`. Reusa
 * `getMatchesForPerfil` tal cual (mismo prefiltro SQL, mismo motor de
 * veredicto) sobre el perfil recibido en el body en vez del guardado en BD.
 * Ver docs/superpowers/specs/2026-08-19-panel-progresivo-coincidencias-design.md.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { getMatchesForPerfil } from "@/src/lib/matching/get-matches-for-perfil";
import { isValidPerfil } from "@/src/lib/oferente/validate";

export const runtime = "nodejs";

interface PreviewEjemplo {
  nombre: string;
  entidad: string;
  valor: number | null;
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: "No hay sesión activa" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!isValidPerfil(body)) {
    return NextResponse.json({ error: "Perfil inválido" }, { status: 400 });
  }

  try {
    const matches = await getMatchesForPerfil(body);
    const ejemplos: PreviewEjemplo[] = matches.slice(0, 3).map((m) => ({
      nombre: m.proceso.nombre,
      entidad: m.proceso.entidad,
      valor: m.proceso.precioBase ?? m.proceso.valorAdjudicacion,
    }));
    return NextResponse.json({ count: matches.length, ejemplos });
  } catch {
    return NextResponse.json({ error: "DB_UNAVAILABLE" }, { status: 503 });
  }
}
```

- [ ] **Step 4: Correr el test y confirmar que pasa**

Run: `npx vitest run src/__tests__/api/perfil-preview-route.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/perfil/preview/route.ts src/__tests__/api/perfil-preview-route.test.ts
git commit -m "feat(perfil): endpoint POST /api/perfil/preview para coincidencias en vivo"
```

---

### Task 3: Componente `PerfilResultadosPanel`

**Files:**
- Create: `src/components/perfil/PerfilResultadosPanel.tsx`

Sin test automatizado — el repo no tiene ninguna prueba de componente React (`.test.tsx`, testing-library) en ningún lado; se sigue esa convención (ver spec, sección Testing). La verificación es manual, en el Task 4, una vez el panel está montado dentro de `/perfil`.

- [ ] **Step 1: Crear el componente**

Crear `src/components/perfil/PerfilResultadosPanel.tsx`:

```tsx
"use client";

/**
 * Panel de coincidencias en vivo para /perfil — consulta
 * POST /api/perfil/preview con debounce mientras el usuario edita el
 * borrador del perfil, sin que eso lo guarde. Ver
 * docs/superpowers/specs/2026-08-19-panel-progresivo-coincidencias-design.md.
 */
import { useEffect, useRef, useState } from "react";
import type { OferenteProfile } from "@/src/lib/oferente/types";

interface PreviewEjemplo {
  nombre: string;
  entidad: string;
  valor: number | null;
}

type PanelStatus = "idle" | "loading" | "ready" | "error";

const DEBOUNCE_MS = 600;

function formatCop(valor: number | null): string {
  if (valor == null) return "valor no informado";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}

export function PerfilResultadosPanel({
  perfil,
  guardadoOk,
}: {
  perfil: OferenteProfile;
  guardadoOk: boolean;
}) {
  const [status, setStatus] = useState<PanelStatus>("idle");
  const [count, setCount] = useState(0);
  const [ejemplos, setEjemplos] = useState<PreviewEjemplo[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);
  const perfilJson = JSON.stringify(perfil);

  useEffect(() => {
    async function consultar() {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const requestId = ++requestIdRef.current;

      setStatus("loading");
      try {
        const res = await fetch("/api/perfil/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: perfilJson,
          signal: controller.signal,
        });
        if (requestId !== requestIdRef.current) return;
        if (!res.ok) {
          setStatus("error");
          return;
        }
        const data = (await res.json()) as { count: number; ejemplos: PreviewEjemplo[] };
        if (requestId !== requestIdRef.current) return;
        setCount(data.count);
        setEjemplos(data.ejemplos);
        setStatus("ready");
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (requestId !== requestIdRef.current) return;
        setStatus("error");
      }
    }

    if (!mountedRef.current) {
      mountedRef.current = true;
      consultar();
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(consultar, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfilJson]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return (
    <aside style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Coincidencias con tu perfil</h3>

      {status === "loading" && <p>Calculando…</p>}
      {status === "error" && <p>No pudimos calcular coincidencias ahora mismo.</p>}

      {(status === "ready" || status === "idle") && (
        <>
          <p>
            <strong>{count}</strong> proceso{count === 1 ? "" : "s"} coincide
            {count === 1 ? "" : "n"} con tu perfil.
          </p>
          {ejemplos.length > 0 && (
            <ul style={{ paddingLeft: 18 }}>
              {ejemplos.map((e, i) => (
                <li key={i}>
                  {e.nombre} — {e.entidad} — {formatCop(e.valor)}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {guardadoOk ? (
        <a href="/mis-coincidencias">Ver todas en Mis coincidencias →</a>
      ) : (
        <span
          title="Guarda tu perfil para verlas aquí"
          style={{ color: "#888", cursor: "not-allowed" }}
        >
          Ver todas en Mis coincidencias →
        </span>
      )}
    </aside>
  );
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos relacionados a `PerfilResultadosPanel.tsx` (el archivo aún no se importa desde ningún lado, así que no debe haber errores de tipo en este componente en particular)

- [ ] **Step 3: Commit**

```bash
git add src/components/perfil/PerfilResultadosPanel.tsx
git commit -m "feat(perfil): componente PerfilResultadosPanel (debounce + abort)"
```

---

### Task 4: Integrar el panel y el campo de cuantía en `PerfilForm`

**Files:**
- Modify: `src/components/perfil/PerfilForm.tsx` (reescritura completa del archivo)

- [ ] **Step 1: Reemplazar el contenido completo de `PerfilForm.tsx`**

Reemplazar todo el contenido de `src/components/perfil/PerfilForm.tsx` por:

```tsx
"use client";

import { useState } from "react";
import type { OferenteProfile, ExperienciaContrato } from "@/src/lib/oferente/types";
import { OFERENTE_LOCAL_ID, SECTOR_OPTIONS } from "@/src/lib/oferente/wizard";
import { DEPARTAMENTOS } from "@/data/dane/divipola";
import { searchUnspsc } from "@/src/lib/oferente/unspsc-catalog";
import { PerfilResultadosPanel } from "./PerfilResultadosPanel";

const LAYOUT_STYLE = `
  .clr-pf-layout{ display: flex; flex-direction: column; gap: 24px; }
  .clr-pf-panel{ order: -1; }
  @media (min-width: 860px){
    .clr-pf-layout{ display: grid; grid-template-columns: minmax(0, 1fr) 300px; align-items: start; gap: 32px; }
    .clr-pf-panel{ order: 0; position: sticky; top: 24px; }
  }
`;

function defaultPerfil(): OferenteProfile {
  return {
    id: OFERENTE_LOCAL_ID,
    tipoPersona: "juridica",
    sectoresUnspsc: [],
    capacidadFinanciera: {
      capitalTrabajoCop: 0,
      indiceLiquidez: 0,
      indiceEndeudamiento: 0,
      razonCoberturaIntereses: 0,
      fuente: "manual",
      vigenciaHasta: null,
    },
    kCapacidadResidualCop: null,
    cobertura: { departamentos: [], municipios: [] },
    cuantiaObjetivo: { minCop: 0, maxCop: 0 },
    experiencia: [],
  };
}

export default function PerfilForm({ perfilInicial }: { perfilInicial: OferenteProfile | null }) {
  const [perfil, setPerfil] = useState<OferenteProfile>(perfilInicial ?? defaultPerfil());
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error" | "concierge">("idle");
  const [unspscQuery, setUnspscQuery] = useState("");
  const unspscOpciones = searchUnspsc(unspscQuery).slice(0, 8);

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

  function toggleSector(codigo: string) {
    setPerfil((p) => ({
      ...p,
      sectoresUnspsc: p.sectoresUnspsc.includes(codigo)
        ? p.sectoresUnspsc.filter((c) => c !== codigo)
        : [...p.sectoresUnspsc, codigo],
    }));
  }

  function addContrato() {
    setPerfil((p) => ({
      ...p,
      experiencia: [
        ...(p.experiencia ?? []),
        { objeto: "", valorSmmlv: 0, unspscCodigos: [], anioTerminacion: new Date().getFullYear() },
      ],
    }));
  }

  function updateContrato(i: number, patch: Partial<ExperienciaContrato>) {
    setPerfil((p) => ({
      ...p,
      experiencia: (p.experiencia ?? []).map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    }));
  }

  function removeContrato(i: number) {
    setPerfil((p) => ({ ...p, experiencia: (p.experiencia ?? []).filter((_, idx) => idx !== i) }));
  }

  return (
    <div className="clr-pf-layout">
      <style dangerouslySetInnerHTML={{ __html: LAYOUT_STYLE }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 24 }}>
        <section>
          <h3>Clasificación (UNSPSC)</h3>
          {SECTOR_OPTIONS.map((o) => (
            <label key={o.codigo} style={{ display: "block" }}>
              <input
                type="checkbox"
                checked={perfil.sectoresUnspsc.includes(o.codigo)}
                onChange={() => toggleSector(o.codigo)}
              />{" "}
              {o.label}
            </label>
          ))}
        </section>

        <section>
          <h3>Cobertura</h3>
          <select
            multiple
            value={perfil.cobertura.departamentos}
            onChange={(e) =>
              setPerfil((p) => ({
                ...p,
                cobertura: {
                  ...p.cobertura,
                  departamentos: Array.from(e.target.selectedOptions).map((o) => o.value),
                },
              }))
            }
          >
            {DEPARTAMENTOS.map((d) => (
              <option key={d.departamentoCodigo} value={d.departamentoCodigo}>
                {d.departamentoNombre}
              </option>
            ))}
          </select>
        </section>

        <section>
          <h3>¿Qué rango de contrato buscas?</h3>
          <label>
            Valor mínimo (COP)
            <input
              type="number"
              min={0}
              value={perfil.cuantiaObjetivo.minCop}
              onChange={(e) =>
                setPerfil((p) => ({
                  ...p,
                  cuantiaObjetivo: { ...p.cuantiaObjetivo, minCop: Number(e.target.value) },
                }))
              }
            />
          </label>
          <label>
            Valor máximo (COP)
            <input
              type="number"
              min={0}
              value={perfil.cuantiaObjetivo.maxCop}
              onChange={(e) =>
                setPerfil((p) => ({
                  ...p,
                  cuantiaObjetivo: { ...p.cuantiaObjetivo, maxCop: Number(e.target.value) },
                }))
              }
            />
          </label>
        </section>

        <section>
          <h3>Experiencia (contratos aportables)</h3>
          {(perfil.experiencia ?? []).map((c, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input placeholder="Objeto" value={c.objeto} onChange={(e) => updateContrato(i, { objeto: e.target.value })} />
                <input
                  type="number"
                  placeholder="Valor (SMMLV)"
                  value={c.valorSmmlv ?? ""}
                  onChange={(e) => updateContrato(i, { valorSmmlv: Number(e.target.value) })}
                />
                <input
                  type="number"
                  placeholder="Año"
                  value={c.anioTerminacion ?? ""}
                  onChange={(e) => updateContrato(i, { anioTerminacion: Number(e.target.value) })}
                />
                <button type="button" onClick={() => removeContrato(i)}>Quitar</button>
              </div>
              <div>
                <label>
                  Códigos UNSPSC del contrato
                  <input
                    placeholder="Buscar código UNSPSC…"
                    value={unspscQuery}
                    onChange={(e) => setUnspscQuery(e.target.value)}
                  />
                </label>
                {unspscQuery && (
                  <div>
                    {unspscOpciones.map((o) => (
                      <label key={o.codigo} style={{ display: "block" }}>
                        <input
                          type="checkbox"
                          checked={c.unspscCodigos.includes(o.codigo)}
                          onChange={() =>
                            updateContrato(i, {
                              unspscCodigos: c.unspscCodigos.includes(o.codigo)
                                ? c.unspscCodigos.filter((x) => x !== o.codigo)
                                : [...c.unspscCodigos, o.codigo],
                            })
                          }
                        />{" "}
                        {o.codigo} — {o.label}
                      </label>
                    ))}
                  </div>
                )}
                {c.unspscCodigos.length > 0 && (
                  <div>Seleccionados: {c.unspscCodigos.join(", ")}</div>
                )}
              </div>
            </div>
          ))}
          <button type="button" onClick={addContrato}>+ Añadir contrato</button>
        </section>

        <section>
          <h3>Capacidad financiera y organizacional</h3>
          <label>
            Índice de liquidez
            <input
              type="number"
              step="0.01"
              value={perfil.capacidadFinanciera.indiceLiquidez}
              onChange={(e) =>
                setPerfil((p) => ({ ...p, capacidadFinanciera: { ...p.capacidadFinanciera, indiceLiquidez: Number(e.target.value) } }))
              }
            />
          </label>
          <label>
            Índice de endeudamiento (0–1)
            <input
              type="number"
              step="0.01"
              value={perfil.capacidadFinanciera.indiceEndeudamiento}
              onChange={(e) =>
                setPerfil((p) => ({ ...p, capacidadFinanciera: { ...p.capacidadFinanciera, indiceEndeudamiento: Number(e.target.value) } }))
              }
            />
          </label>
          <label>
            Patrimonio (SMMLV)
            <input
              type="number"
              value={perfil.capacidadFinanciera.patrimonioSmmlv ?? ""}
              onChange={(e) =>
                setPerfil((p) => ({ ...p, capacidadFinanciera: { ...p.capacidadFinanciera, patrimonioSmmlv: Number(e.target.value) } }))
              }
            />
          </label>
          <label>
            Razón de cobertura de intereses (veces)
            <input
              type="number"
              step="0.01"
              value={perfil.capacidadFinanciera.razonCoberturaIntereses}
              onChange={(e) =>
                setPerfil((p) => ({ ...p, capacidadFinanciera: { ...p.capacidadFinanciera, razonCoberturaIntereses: Number(e.target.value) } }))
              }
            />
          </label>
          <label>
            Rentabilidad del patrimonio (0–1)
            <input
              type="number"
              step="0.01"
              value={perfil.capacidadFinanciera.rentabilidadPatrimonio ?? ""}
              onChange={(e) =>
                setPerfil((p) => ({
                  ...p,
                  capacidadFinanciera: {
                    ...p.capacidadFinanciera,
                    rentabilidadPatrimonio: e.target.value === "" ? undefined : Number(e.target.value),
                  },
                }))
              }
            />
          </label>
          <label>
            Rentabilidad del activo (0–1)
            <input
              type="number"
              step="0.01"
              value={perfil.capacidadFinanciera.rentabilidadActivo ?? ""}
              onChange={(e) =>
                setPerfil((p) => ({
                  ...p,
                  capacidadFinanciera: {
                    ...p.capacidadFinanciera,
                    rentabilidadActivo: e.target.value === "" ? undefined : Number(e.target.value),
                  },
                }))
              }
            />
          </label>
          <label>
            Capital de trabajo (SMMLV)
            <input
              type="number"
              value={perfil.capacidadFinanciera.capitalTrabajoSmmlv ?? ""}
              onChange={(e) =>
                setPerfil((p) => ({
                  ...p,
                  capacidadFinanciera: {
                    ...p.capacidadFinanciera,
                    capitalTrabajoSmmlv: e.target.value === "" ? undefined : Number(e.target.value),
                  },
                }))
              }
            />
          </label>
        </section>

        <button type="button" onClick={guardar} disabled={status === "saving"}>
          {status === "saving" ? "Guardando…" : "Guardar perfil"}
        </button>
        {status === "saved" && <span>Guardado ✓</span>}
        {status === "error" && <span>Error al guardar — intenta de nuevo.</span>}
        {status === "concierge" && (
          <div className="clr-perfil-concierge" role="alert">
            <p>
              No pudimos guardar tu perfil automáticamente. Envíanoslo por correo y lo registramos
              nosotros mientras tanto — ya viene listo para copiar y pegar.
            </p>
            <a href={mailtoConcierge()}>Enviar mi perfil por correo →</a>
          </div>
        )}
      </div>

      <div className="clr-pf-panel">
        <PerfilResultadosPanel perfil={perfil} guardadoOk={status === "saved"} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Correr toda la suite de vitest**

Run: `npm run test`
Expected: PASS — todos los tests existentes siguen verdes, incluidos los nuevos de `validate.test.ts` y `perfil-preview-route.test.ts`.

- [ ] **Step 3: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Verificación manual en navegador**

Levantar el servidor de desarrollo (usar el tool de preview del proyecto, no `npm run dev` directo en Bash) y:

1. Ir a `/perfil` (requiere sesión — usar una cuenta ya verificada; si no hay ninguna disponible, avisar antes de continuar en vez de crear una nueva cuenta sin confirmar).
2. Marcar un sector, seleccionar un departamento en Cobertura, y llenar Valor mínimo/máximo en la sección nueva.
3. Confirmar en la pestaña Red del navegador que `POST /api/perfil/preview` se dispara ~600ms después de la última interacción, no en cada tecla.
4. Cambiar varios campos rápido seguido y confirmar que solo la última petición resuelve contra el estado del panel (no hay parpadeo con un conteo viejo pisando al nuevo).
5. Confirmar que el conteo y los ejemplos mostrados tienen sentido para los criterios elegidos.
6. Antes de guardar, confirmar que el link "Ver todas en Mis coincidencias" aparece deshabilitado (gris, con tooltip). Hacer click en "Guardar perfil" y confirmar que el link pasa a estar habilitado.
7. Tomar una captura de pantalla del panel con datos para dejar evidencia.

- [ ] **Step 5: Commit**

```bash
git add src/components/perfil/PerfilForm.tsx
git commit -m "feat(perfil): integra PerfilResultadosPanel y campo de cuantía en PerfilForm"
```

---

## Self-Review

**Cobertura de la spec:**
- Endpoint sin persistencia → Task 2. ✓
- Debounce + AbortController + descarte de respuestas obsoletas → Task 3 (`timerRef`, `abortRef`, `requestIdRef`). ✓
- Conteo + hasta 3 ejemplos, sin semáforo completo → Task 2 (proyección `PreviewEjemplo`) + Task 3 (render). ✓
- Consulta inmediata al montar, debounce en cambios subsiguientes → Task 3 (`mountedRef`). ✓
- Campo `cuantiaObjetivo` agregado al formulario → Task 4. ✓
- Link a "Mis coincidencias" deshabilitado hasta guardar → Task 3 (prop `guardadoOk`) + Task 4 (`status === "saved"`) + verificación manual paso 6. ✓
- Manejo de errores (abort silencioso, error visible, 503 sin patrón concierge) → Task 2 (503 simple) + Task 3 (distinción `AbortError` vs error real). ✓
- Testing: rutas API con vitest, sin test de componente → Tasks 1, 2 (tests) y Task 3 (nota explícita de por qué no hay test). ✓
- DRY: `isValidPerfil` compartido entre `PUT /api/perfil` y `POST /api/perfil/preview` → Task 1. ✓

**Placeholders:** ninguno — cada paso trae código completo o comando exacto con salida esperada.

**Consistencia de tipos:** `PreviewEjemplo` se define igual en el endpoint (Task 2) y se consume con la misma forma en el componente (Task 3) — `{ nombre: string; entidad: string; valor: number | null }` en ambos lados. `isValidPerfil` se define una sola vez (Task 1) y se importa igual en ambas rutas.
