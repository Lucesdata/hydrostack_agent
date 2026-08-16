# Perfil RUP y Semáforo de Elegibilidad (Nivel 2 — Habilitación) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar la 5ª compuerta del veredicto (`habilitacionGate`, hoy un stub que siempre devuelve `UNKNOWN`) para que compare el perfil RUP ampliado del oferente contra los requisitos habilitantes cuantificados extraídos del pliego, y exponer ese resultado como un semáforo con brechas exactas (`[✓] OK` / `[✗] BRECHA` / `[!] VERIFICAR`) en el listado y detalle de `/licitaciones`.

**Architecture:** Este plan es una **auditoría + extensión** de infraestructura que ya existe y que fue diseñada explícitamente para llegar a este punto (ver `docs/fase-a/nivel-0-perfil-y-veredicto.md`, sección "Diferido a Nivel 2"). No se crean sistemas paralelos:

- El **perfil** sigue siendo `OferenteProfile` / tabla `oferente_perfil` (Drizzle, Neon, jsonb) — se le añaden campos **opcionales** nuevos (experiencia aportable + indicadores financieros que faltaban), nunca una tabla `rup_profiles` separada.
- El **wizard** sigue siendo `OferenteWizard.tsx` (4 pasos, gates Nivel 0: identidad/sectores/cobertura/cuantía) — se añade un componente hermano `RupWizard.tsx` (2 pasos, saltables) para los datos que solo necesita Habilitación (Nivel 2): experiencia e indicadores financieros. Juntos cubren los 3 "temas" del prompt original (clasificación ya la cubre el paso "sectores" de `OferenteWizard`; experiencia y capacidad financiera los cubre `RupWizard`).
- La **extracción de pliegos** sigue siendo `extractPliegoHybrid.ts` (Gemini, único extractor cableado a `/api/pliego/extract` — CLAUDE.md §2). Se añade un **segundo paso de estructuración** (`src/lib/eligibility/`) que toma la salida YA extraída (`PliegoExtraction.requisitos_habilitantes`, hoy texto libre) y la convierte a JSON cuantificado con una llamada de texto a Gemini — no un extractor ni un endpoint paralelo con otro proveedor.
- El **semáforo** sigue siendo `buildVerdict()` / `verdict.ts` — no se persiste el veredicto (invariante D18 ya documentada: es recomputable). Por tanto **no se crea `eligibility_checks`**: la única persistencia nueva es la caché de requisitos extraídos del pliego (`process_requirements`), que es insumo del cálculo, no su resultado. Esta es una desviación deliberada del prompt original (que pedía persistir cada evaluación); se documenta aquí para que quede visible antes de implementar.
- Las **señales de intención** reusan `recordUserSignal(usuarioId, 'oferente')` (ya existe, tabla `senal_usuario`) — no se crea `user_signals`.
- No hay RLS de Postgres en este proyecto (CLAUDE.md §4) — todas las tablas nuevas se filtran por `usuarioId`/`procesoId` en código de aplicación, igual que el resto del repo.

**Tech Stack:** Next.js 14 (App Router) · Drizzle ORM sobre Neon Postgres · Supabase Auth (`getSessionUser`) · Gemini (`@google/generative-ai`, ya usado en `extractPliegoGemini.ts`) · Vitest.

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/lib/config/smmlv.ts` | Crear | Constante `SMMLV_2026`, un solo lugar para actualizar cada año |
| `src/lib/oferente/types.ts` | Modificar | Añade `ExperienciaContrato`, campos opcionales a `CapacidadFinancieraRUP`, `experiencia?` a `OferenteProfile` |
| `src/lib/oferente/unspsc-catalog.ts` | Crear | Catálogo local UNSPSC (segmentos 40/41/72/77/81/83) con buscador simple, para el paso "Clasificación" |
| `src/components/secop/RupWizard.tsx` | Crear | Wizard de 2 pasos (Experiencia, Capacidad financiera), saltable, estilo `clr-wiz-*` existente |
| `app/perfil/page.tsx` | Crear | Ruta protegida, redirige a `/login?next=/perfil` sin sesión |
| `src/components/perfil/PerfilForm.tsx` | Crear | Edición completa del perfil (todos los campos, no wizard) |
| `src/components/Navbar.js` | Modificar | Añade link "Mi perfil RUP" al `UserMenu` |
| `src/lib/eligibility/schema.ts` | Crear | Tipos + JSON Schema + parser de `RequisitosHabilitantesEstructurados` |
| `src/lib/eligibility/extract-requirements.ts` | Crear | Estructura `PliegoExtraction.requisitos_habilitantes` vía Gemini (texto) |
| `src/lib/db/schema/eligibility.ts` | Crear | Tabla Drizzle `process_requirements` |
| `src/lib/db/schema/index.ts` | Modificar | Exporta el nuevo schema |
| `app/api/eligibility/extract/route.ts` | Crear | `POST` — estructura y cachea requisitos por proceso |
| `app/pliego/page.tsx` | Modificar | Botón "Vincular a un proceso" tras extraer un pliego |
| `src/lib/secop/verdict.ts` | Modificar | `habilitacionGate` real; `VerdictProcessInput.requisitosHabilitantes?` |
| `app/api/secop/verdict/route.ts` | Modificar | Lee `process_requirements` cacheados; registra señal `oferente` |
| `src/components/secop/ProcessDetail.tsx` | Modificar | Desglose cuantificado de Habilitación + nota de consorcio |
| `src/components/secop/ProcessList.tsx` | Modificar | Indicador de habilitación en la fila |
| `src/components/secop/SecopExplorer.tsx` | Modificar | Abre `RupWizard` cuando falta experiencia/indicadores |
| `app/page.js` | Modificar | Link "[ Evalúa tu propio RUP → ]" bajo la tarjeta de muestra |
| Tests | Crear/Modificar | Uno por módulo nuevo + casos nuevos (aditivos) en `verdict.test.ts` y `secop-verdict-route.test.ts` |

---

### Task 1: Constante SMMLV

**Files:**
- Create: `src/lib/config/smmlv.ts`
- Test: `src/__tests__/config/smmlv.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/config/smmlv.test.ts
import { describe, it, expect } from 'vitest';
import { SMMLV_2026 } from '@/src/lib/config/smmlv';

describe('SMMLV_2026', () => {
  it('es un número positivo en pesos colombianos', () => {
    expect(typeof SMMLV_2026).toBe('number');
    expect(SMMLV_2026).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/config/smmlv.test.ts`
Expected: FAIL con "Cannot find module '@/src/lib/config/smmlv'"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/config/smmlv.ts
/**
 * Salario Mínimo Mensual Legal Vigente (Colombia), en COP.
 *
 * ⚠️ Valor del decreto 2025 usado como placeholder — el decreto del SMMLV
 * 2026 se expide por el Gobierno a finales de diciembre; confirma el valor
 * oficial antes de usar esta constante para calcular brechas reales de
 * habilitación en producción. Actualízala una vez al año, aquí y en
 * ningún otro sitio (todo el código que compara SMMLV importa esto).
 */
export const SMMLV_2026 = 1_423_500;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/config/smmlv.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/config/smmlv.ts src/__tests__/config/smmlv.test.ts
git commit -m "feat(eligibility): añade constante SMMLV_2026"
```

---

### Task 2: Extender `OferenteProfile` con experiencia e indicadores RUP faltantes

**Files:**
- Modify: `src/lib/oferente/types.ts`
- Test: `src/__tests__/oferente/types.test.ts`

Todos los campos nuevos son **opcionales** — `OferenteProfile` se construye como literal en 6 archivos existentes (`wizard.ts`, `pilot.ts`, y 4 archivos de test); si se marcaran requeridos, los 6 dejarían de tipar. Un perfil sin estos campos simplemente hace que `habilitacionGate` (Task 11) reporte `VERIFICAR` en vez de comparar.

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/oferente/types.test.ts
import { describe, it, expect } from 'vitest';
import type { OferenteProfile, ExperienciaContrato } from '@/src/lib/oferente/types';

describe('OferenteProfile — campos RUP ampliados (Nivel 2)', () => {
  it('acepta un perfil sin experiencia ni indicadores ampliados (compatibilidad)', () => {
    const minimo: OferenteProfile = {
      id: 'x',
      tipoPersona: 'juridica',
      sectoresUnspsc: ['83101'],
      capacidadFinanciera: {
        capitalTrabajoCop: 0,
        indiceLiquidez: 0,
        indiceEndeudamiento: 0,
        razonCoberturaIntereses: 0,
        fuente: 'manual',
        vigenciaHasta: null,
      },
      kCapacidadResidualCop: null,
      cobertura: { departamentos: [], municipios: [] },
      cuantiaObjetivo: { minCop: 0, maxCop: 0 },
    };
    expect(minimo.experiencia).toBeUndefined();
  });

  it('acepta un perfil con experiencia e indicadores ampliados', () => {
    const contrato: ExperienciaContrato = {
      objeto: 'Optimización PTAP municipal',
      valorSmmlv: 1200,
      unspscCodigos: ['83101500'],
      anioTerminacion: 2024,
    };
    const completo: OferenteProfile = {
      id: 'x',
      tipoPersona: 'juridica',
      sectoresUnspsc: ['83101'],
      capacidadFinanciera: {
        capitalTrabajoCop: 0,
        indiceLiquidez: 1.5,
        indiceEndeudamiento: 0.4,
        razonCoberturaIntereses: 3,
        fuente: 'manual',
        vigenciaHasta: null,
        rentabilidadPatrimonio: 0.12,
        rentabilidadActivo: 0.08,
        patrimonioSmmlv: 5000,
        capitalTrabajoSmmlv: 3000,
      },
      kCapacidadResidualCop: null,
      cobertura: { departamentos: [], municipios: [] },
      cuantiaObjetivo: { minCop: 0, maxCop: 0 },
      experiencia: [contrato],
    };
    expect(completo.experiencia?.[0].valorSmmlv).toBe(1200);
    expect(completo.capacidadFinanciera.patrimonioSmmlv).toBe(5000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/oferente/types.test.ts`
Expected: FAIL — TS error, `rentabilidadPatrimonio`/`patrimonioSmmlv`/`capitalTrabajoSmmlv`/`experiencia` no existen en los tipos todavía.

- [ ] **Step 3: Write minimal implementation**

Edita `src/lib/oferente/types.ts` — añade al final de `CapacidadFinancieraRUP` (antes del cierre `}`) y añade el nuevo tipo + campo:

```ts
/** Indicadores RUP de capacidad financiera. // traza: indicadores RUP */
export interface CapacidadFinancieraRUP {
  /** Capital de trabajo en COP. */
  capitalTrabajoCop: number;
  /** Índice de liquidez (veces). */
  indiceLiquidez: number;
  /** Índice de endeudamiento (proporción 0–1). */
  indiceEndeudamiento: number;
  /** Razón de cobertura de intereses (veces). */
  razonCoberturaIntereses: number;
  /** D4 — de dónde salen estos números. */
  fuente: FuenteRUP;
  /**
   * ISO. Vigencia del RUP: un RUP vencido reprueba habilitación, así que importa
   * incluso en modo manual. `null` si no se declaró.
   */
  vigenciaHasta: string | null;
  /**
   * Nivel 2 — indicadores que exige habilitacionGate cuando el pliego los pide.
   * Opcionales: un perfil sin estos valores hace que esas comparaciones
   * concretas caigan en VERIFICAR en vez de romper el tipo.
   */
  rentabilidadPatrimonio?: number; // proporción 0–1
  rentabilidadActivo?: number; // proporción 0–1
  patrimonioSmmlv?: number;
  /** Duplica capitalTrabajoCop en SMMLV — así lo exigen la mayoría de pliegos. */
  capitalTrabajoSmmlv?: number;
}

/** Un contrato terminado que el oferente puede aportar como experiencia (Nivel 2). */
export interface ExperienciaContrato {
  objeto: string;
  valorSmmlv: number;
  unspscCodigos: UnspscCodigo[];
  anioTerminacion: number;
}
```

Y en `OferenteProfile`, añade el campo al final:

```ts
export interface OferenteProfile {
  id: string;
  tipoPersona: TipoPersona;
  sectoresUnspsc: UnspscCodigo[];
  capacidadFinanciera: CapacidadFinancieraRUP;
  kCapacidadResidualCop: number | null;
  cobertura: CoberturaGeografica;
  cuantiaObjetivo: CuantiaObjetivo;
  /** Nivel 2 — contratos aportables para la compuerta Habilitación. */
  experiencia?: ExperienciaContrato[];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/oferente/types.test.ts`
Expected: PASS

- [ ] **Step 5: Run the full suite to confirm nothing else broke**

Run: `npx vitest run`
Expected: PASS (los 6 literales existentes de `OferenteProfile` siguen tipando porque todo lo nuevo es opcional)

- [ ] **Step 6: Commit**

```bash
git add src/lib/oferente/types.ts src/__tests__/oferente/types.test.ts
git commit -m "feat(oferente): añade experiencia e indicadores RUP opcionales a OferenteProfile"
```

---

### Task 3: Catálogo UNSPSC de clasificación (paso "¿En qué trabajas?")

**Files:**
- Create: `src/lib/oferente/unspsc-catalog.ts`
- Test: `src/__tests__/oferente/unspsc-catalog.test.ts`

Extiende (no reemplaza) `SECTOR_OPTIONS` de `wizard.ts`: ese array sigue siendo el usado por `OferenteWizard` (4 familias). Este catálogo es más fino (clase, 8 dígitos) y lo usa `RupWizard`/`PerfilForm` para que el buscador de "Clasificación" tenga granularidad real.

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/oferente/unspsc-catalog.test.ts
import { describe, it, expect } from 'vitest';
import { UNSPSC_CATALOG, searchUnspsc } from '@/src/lib/oferente/unspsc-catalog';

describe('UNSPSC_CATALOG', () => {
  it('cubre los segmentos del sector agua/saneamiento/obra civil', () => {
    const segmentos = new Set(UNSPSC_CATALOG.map((c) => c.codigo.slice(0, 2)));
    for (const seg of ['40', '41', '72', '77', '81', '83']) {
      expect(segmentos.has(seg)).toBe(true);
    }
  });

  it('cada entrada tiene código de 8 dígitos y etiqueta', () => {
    for (const c of UNSPSC_CATALOG) {
      expect(c.codigo).toMatch(/^\d{8}$/);
      expect(c.label.length).toBeGreaterThan(0);
    }
  });
});

describe('searchUnspsc', () => {
  it('filtra por texto en la etiqueta, sin distinguir mayúsculas/tildes', () => {
    const r = searchUnspsc('acueducto');
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((c) => c.label.toLowerCase().includes('acueducto'))).toBe(true);
  });

  it('filtra por prefijo de código', () => {
    const r = searchUnspsc('831015');
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((c) => c.codigo.startsWith('831015'))).toBe(true);
  });

  it('cadena vacía devuelve todo el catálogo', () => {
    expect(searchUnspsc('')).toHaveLength(UNSPSC_CATALOG.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/oferente/unspsc-catalog.test.ts`
Expected: FAIL con "Cannot find module '@/src/lib/oferente/unspsc-catalog'"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/oferente/unspsc-catalog.ts
/**
 * Catálogo local de códigos UNSPSC (clase, 8 dígitos) para el sector agua,
 * saneamiento y obra civil — insumo del paso "Clasificación" del perfil RUP.
 * Semilla curada a mano; no pretende ser exhaustivo (UNSPSC completo son
 * decenas de miles de clases). Mismo formato normalizado que
 * `matchesSectorNet`/`sectorialGate` (sin prefijo "V1.").
 */

export interface UnspscCatalogEntry {
  codigo: string; // 8 dígitos
  label: string;
}

export const UNSPSC_CATALOG: UnspscCatalogEntry[] = [
  // Segmento 83 — Servicios públicos y relacionados con el sector público
  { codigo: '83101500', label: 'Acueducto y distribución de agua potable' },
  { codigo: '83101600', label: 'Alcantarillado y aguas residuales' },
  { codigo: '83101700', label: 'Tratamiento y potabilización de agua' },
  { codigo: '83101800', label: 'Gestión de residuos sólidos' },
  // Segmento 72 — Servicios de edificación, construcción y mantenimiento
  { codigo: '72141100', label: 'Construcción de redes de acueducto' },
  { codigo: '72141200', label: 'Construcción de redes de alcantarillado' },
  { codigo: '72141300', label: 'Obra civil — construcción general' },
  { codigo: '72102900', label: 'Mantenimiento de infraestructura hidráulica' },
  // Segmento 81 — Servicios basados en ingeniería, investigación y tecnología
  { codigo: '81101500', label: 'Interventoría de obras civiles' },
  { codigo: '81101700', label: 'Diseño y consultoría en ingeniería hidráulica' },
  { codigo: '81101800', label: 'Estudios y diseños de plantas de tratamiento' },
  // Segmento 77 — Servicios ambientales
  { codigo: '77101500', label: 'Gestión y monitoreo ambiental' },
  { codigo: '77101600', label: 'Servicios de saneamiento ambiental' },
  // Segmento 40 — Componentes y suministros de distribución de materiales
  { codigo: '40141600', label: 'Bombas y equipos de bombeo hidráulico' },
  { codigo: '40142200', label: 'Válvulas y accesorios para tubería' },
  // Segmento 41 — Equipo de laboratorio, medición y observación
  { codigo: '41103400', label: 'Equipos de medición y calidad de agua' },
];

/** Normaliza texto para comparar sin distinguir mayúsculas ni tildes. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Busca por texto libre en la etiqueta o por prefijo del código. Vacío = todo. */
export function searchUnspsc(query: string): UnspscCatalogEntry[] {
  const q = normalize(query.trim());
  if (!q) return UNSPSC_CATALOG;
  return UNSPSC_CATALOG.filter(
    (c) => normalize(c.label).includes(q) || c.codigo.startsWith(query.trim()),
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/oferente/unspsc-catalog.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/oferente/unspsc-catalog.ts src/__tests__/oferente/unspsc-catalog.test.ts
git commit -m "feat(oferente): catálogo UNSPSC de clasificación para el perfil RUP"
```

---

### Task 4: `RupWizard` — pasos Experiencia y Capacidad financiera

**Files:**
- Create: `src/components/secop/RupWizard.tsx`

Componente de UI puro (sin test, igual que `OferenteWizard.tsx` — este repo no testea componentes de wizard, solo la lógica que consumen). Recibe un `OferenteProfile` ya existente (creado por `OferenteWizard`) y devuelve uno ampliado con `experiencia` y los indicadores nuevos. Cada paso es saltable ("Completar después").

- [ ] **Step 1: Write the component**

```tsx
// src/components/secop/RupWizard.tsx
"use client";

/**
 * Segundo wizard, específico de Nivel 2 (Habilitación) — se abre sobre un
 * OferenteProfile que YA existe (creado por OferenteWizard: identidad,
 * sectores, cobertura, cuantía). Pide solo lo que sectorialGate/cuantiaGate/
 * ubicacionGate NO leen: experiencia aportable e indicadores financieros
 * ampliados. Cada paso es saltable — completar después es válido, y
 * habilitacionGate reporta VERIFICAR en los campos ausentes en vez de fallar.
 */

import { useState } from "react";
import type { OferenteProfile, ExperienciaContrato } from "@/src/lib/oferente/types";
import { searchUnspsc } from "@/src/lib/oferente/unspsc-catalog";

const STEPS = ["experiencia", "financiera"] as const;
type Step = (typeof STEPS)[number];

const STEP_TITLE: Record<Step, string> = {
  experiencia: "Experiencia aportable (RUP)",
  financiera: "Capacidad financiera y organizacional",
};

interface Props {
  perfil: OferenteProfile;
  onComplete: (perfil: OferenteProfile) => void;
  onSkip: () => void;
}

function emptyContrato(): ExperienciaContrato {
  return { objeto: "", valorSmmlv: 0, unspscCodigos: [], anioTerminacion: new Date().getFullYear() };
}

export default function RupWizard({ perfil, onComplete, onSkip }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [experiencia, setExperiencia] = useState<ExperienciaContrato[]>(perfil.experiencia ?? []);
  const [query, setQuery] = useState("");
  const [indiceLiquidez, setIndiceLiquidez] = useState(String(perfil.capacidadFinanciera.indiceLiquidez || ""));
  const [indiceEndeudamiento, setIndiceEndeudamiento] = useState(String(perfil.capacidadFinanciera.indiceEndeudamiento || ""));
  const [razonCoberturaIntereses, setRazonCoberturaIntereses] = useState(String(perfil.capacidadFinanciera.razonCoberturaIntereses || ""));
  const [rentabilidadPatrimonio, setRentabilidadPatrimonio] = useState(String(perfil.capacidadFinanciera.rentabilidadPatrimonio ?? ""));
  const [rentabilidadActivo, setRentabilidadActivo] = useState(String(perfil.capacidadFinanciera.rentabilidadActivo ?? ""));
  const [patrimonioSmmlv, setPatrimonioSmmlv] = useState(String(perfil.capacidadFinanciera.patrimonioSmmlv ?? ""));
  const [capitalTrabajoSmmlv, setCapitalTrabajoSmmlv] = useState(String(perfil.capacidadFinanciera.capitalTrabajoSmmlv ?? ""));

  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;
  const opciones = searchUnspsc(query).slice(0, 8);

  function updateContrato(i: number, patch: Partial<ExperienciaContrato>) {
    setExperiencia((list) => list.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function finish() {
    const num = (s: string) => (s.trim() === "" ? undefined : Number(s));
    onComplete({
      ...perfil,
      experiencia,
      capacidadFinanciera: {
        ...perfil.capacidadFinanciera,
        indiceLiquidez: Number(indiceLiquidez) || 0,
        indiceEndeudamiento: Number(indiceEndeudamiento) || 0,
        razonCoberturaIntereses: Number(razonCoberturaIntereses) || 0,
        rentabilidadPatrimonio: num(rentabilidadPatrimonio),
        rentabilidadActivo: num(rentabilidadActivo),
        patrimonioSmmlv: num(patrimonioSmmlv),
        capitalTrabajoSmmlv: num(capitalTrabajoSmmlv),
      },
    });
  }

  function next() {
    if (!isLast) {
      setStepIdx((i) => i + 1);
      return;
    }
    finish();
  }

  function back() {
    if (stepIdx > 0) setStepIdx((i) => i - 1);
    else onSkip();
  }

  return (
    <div className="clr-wiz-card">
      <header className="clr-wiz-head">
        <span className="clr-wiz-step">Paso {stepIdx + 1} de {STEPS.length} · perfil RUP</span>
        <h3 className="clr-wiz-title">{STEP_TITLE[step]}</h3>
      </header>

      {step === "experiencia" && (
        <div className="clr-wiz-options">
          {experiencia.map((c, i) => (
            <div key={i} className="clr-rup-contrato">
              <input
                className="clr-input"
                placeholder="Objeto del contrato"
                value={c.objeto}
                onChange={(e) => updateContrato(i, { objeto: e.target.value })}
              />
              <input
                className="clr-input"
                type="number"
                min={0}
                placeholder="Valor (SMMLV)"
                value={c.valorSmmlv || ""}
                onChange={(e) => updateContrato(i, { valorSmmlv: Number(e.target.value) })}
              />
              <input
                className="clr-input"
                type="number"
                placeholder="Año de terminación"
                value={c.anioTerminacion || ""}
                onChange={(e) => updateContrato(i, { anioTerminacion: Number(e.target.value) })}
              />
              <input
                className="clr-input"
                placeholder="Buscar código UNSPSC…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <div className="clr-wiz-scroll">
                  {opciones.map((o) => (
                    <label key={o.codigo} className="clr-wiz-check">
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
                      />
                      {o.codigo} — {o.label}
                    </label>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="clr-wiz-back"
                onClick={() => setExperiencia((list) => list.filter((_, idx) => idx !== i))}
              >
                Quitar
              </button>
            </div>
          ))}
          <button
            type="button"
            className="clr-wiz-next"
            onClick={() => setExperiencia((list) => [...list, emptyContrato()])}
          >
            + Añadir contrato
          </button>
        </div>
      )}

      {step === "financiera" && (
        <div className="clr-wiz-cuantia">
          <label className="clr-wiz-field">
            Índice de liquidez (veces)
            <input className="clr-input" type="number" step="0.01" value={indiceLiquidez} onChange={(e) => setIndiceLiquidez(e.target.value)} />
          </label>
          <label className="clr-wiz-field">
            Índice de endeudamiento (0–1)
            <input className="clr-input" type="number" step="0.01" value={indiceEndeudamiento} onChange={(e) => setIndiceEndeudamiento(e.target.value)} />
          </label>
          <label className="clr-wiz-field">
            Razón de cobertura de intereses (veces)
            <input className="clr-input" type="number" step="0.01" value={razonCoberturaIntereses} onChange={(e) => setRazonCoberturaIntereses(e.target.value)} />
          </label>
          <label className="clr-wiz-field">
            Rentabilidad del patrimonio (0–1)
            <input className="clr-input" type="number" step="0.01" value={rentabilidadPatrimonio} onChange={(e) => setRentabilidadPatrimonio(e.target.value)} />
          </label>
          <label className="clr-wiz-field">
            Rentabilidad del activo (0–1)
            <input className="clr-input" type="number" step="0.01" value={rentabilidadActivo} onChange={(e) => setRentabilidadActivo(e.target.value)} />
          </label>
          <label className="clr-wiz-field">
            Patrimonio (SMMLV)
            <input className="clr-input" type="number" value={patrimonioSmmlv} onChange={(e) => setPatrimonioSmmlv(e.target.value)} />
          </label>
          <label className="clr-wiz-field">
            Capital de trabajo (SMMLV)
            <input className="clr-input" type="number" value={capitalTrabajoSmmlv} onChange={(e) => setCapitalTrabajoSmmlv(e.target.value)} />
          </label>
        </div>
      )}

      <footer className="clr-wiz-foot">
        <button type="button" className="clr-wiz-back" onClick={back}>
          {stepIdx === 0 ? "Completar después" : "← Atrás"}
        </button>
        <button type="button" className="clr-wiz-next" onClick={next}>
          {isLast ? "Ver mi habilitación →" : "Siguiente →"}
        </button>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos en `RupWizard.tsx`

- [ ] **Step 3: Commit**

```bash
git add src/components/secop/RupWizard.tsx
git commit -m "feat(oferente): añade RupWizard (experiencia + capacidad financiera, saltable)"
```

---

### Task 5: Ruta `/perfil` (edición completa, protegida)

**Files:**
- Create: `app/perfil/page.tsx`
- Create: `src/components/perfil/PerfilForm.tsx`
- Modify: `src/components/Navbar.js`

- [ ] **Step 1: Server component protegido**

```tsx
// app/perfil/page.tsx
import { redirect } from "next/navigation";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { getPerfilDb } from "@/src/lib/oferente/perfil-store";
import PerfilForm from "@/src/components/perfil/PerfilForm";

export default async function PerfilPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/perfil");

  const perfil = await getPerfilDb(user.id);
  return (
    <div className="clr-page">
      <div className="clr-container" style={{ maxWidth: 720, padding: "40px 20px" }}>
        <h1 className="clr-h1">Mi perfil RUP</h1>
        <p className="clr-sub">
          Estos datos se usan para calcular tu elegibilidad en cada proceso — nunca se
          publican ni se comparten.
        </p>
        <PerfilForm perfilInicial={perfil} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Formulario de edición (todos los campos en una página)**

```tsx
// src/components/perfil/PerfilForm.tsx
"use client";

import { useState } from "react";
import type { OferenteProfile, ExperienciaContrato } from "@/src/lib/oferente/types";
import { OFERENTE_LOCAL_ID, SECTOR_OPTIONS } from "@/src/lib/oferente/wizard";
import { DEPARTAMENTOS } from "@/data/dane/divipola";

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
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function guardar() {
    setStatus("saving");
    try {
      const res = await fetch("/api/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(perfil),
      });
      setStatus(res.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
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
        <h3>Experiencia (contratos aportables)</h3>
        {(perfil.experiencia ?? []).map((c, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input placeholder="Objeto" value={c.objeto} onChange={(e) => updateContrato(i, { objeto: e.target.value })} />
            <input
              type="number"
              placeholder="Valor (SMMLV)"
              value={c.valorSmmlv || ""}
              onChange={(e) => updateContrato(i, { valorSmmlv: Number(e.target.value) })}
            />
            <input
              type="number"
              placeholder="Año"
              value={c.anioTerminacion || ""}
              onChange={(e) => updateContrato(i, { anioTerminacion: Number(e.target.value) })}
            />
            <button type="button" onClick={() => removeContrato(i)}>Quitar</button>
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
      </section>

      <button type="button" onClick={guardar} disabled={status === "saving"}>
        {status === "saving" ? "Guardando…" : "Guardar perfil"}
      </button>
      {status === "saved" && <span>Guardado ✓</span>}
      {status === "error" && <span>Error al guardar — intenta de nuevo.</span>}
    </div>
  );
}
```

- [ ] **Step 3: Link en el menú de usuario del Navbar**

En `src/components/Navbar.js`, dentro de `UserMenu` (función en la línea ~119), reemplaza:

```jsx
          {/* Sin onSubmit: el submit navega fuera de la página (redirect a /),
              cerrar el dropdown acá desmontaría el <form> a mitad del envío
              ("Form submission canceled because the form is not connected"). */}
          <form action="/logout" method="POST">
            <button type="submit">Cerrar sesión</button>
          </form>
```

por:

```jsx
          <Link href="/perfil" onClick={() => setOpen(false)}>
            Mi perfil RUP
          </Link>
          {/* Sin onSubmit: el submit navega fuera de la página (redirect a /),
              cerrar el dropdown acá desmontaría el <form> a mitad del envío
              ("Form submission canceled because the form is not connected"). */}
          <form action="/logout" method="POST">
            <button type="submit">Cerrar sesión</button>
          </form>
```

(`Link` ya está importado al inicio del archivo — línea 2, `import Link from "next/link";`.)

- [ ] **Step 4: Verificar manualmente**

Run: `npm run dev`, navega a `/perfil` sin sesión → debe redirigir a `/login?next=/perfil`. Con sesión, debe cargar el formulario y `Guardar perfil` debe hacer `PUT /api/perfil` (endpoint ya existente, sin cambios).

- [ ] **Step 5: Commit**

```bash
git add app/perfil/page.tsx src/components/perfil/PerfilForm.tsx src/components/Navbar.js
git commit -m "feat(perfil): añade ruta /perfil protegida con formulario de edición completo"
```

---

### Task 6: Esquema de requisitos habilitantes estructurados

**Files:**
- Create: `src/lib/eligibility/schema.ts`
- Test: `src/__tests__/eligibility/schema.test.ts`

Mismo patrón que `src/lib/pliego/schema.ts`: tipos + JSON Schema (para `output_config`/`responseSchema`) + parser puro de runtime. `verificar_manual: true` + `cita_textual` es el equivalente de `NO_ENCONTRADO` en este dominio — nunca se inventa un número.

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/eligibility/schema.test.ts
import { describe, it, expect } from 'vitest';
import { parseRequisitosEstructurados } from '@/src/lib/eligibility/schema';

describe('parseRequisitosEstructurados', () => {
  const valido = {
    experiencia: {
      valor_min_smmlv: 3000,
      unspsc_exigidos: ['83101500'],
      max_contratos_aportables: 3,
      verificar_manual: false,
      cita_textual: 'experiencia específica mínima de 3.000 SMMLV',
    },
    indicadores_financieros: [
      {
        indicador: 'indice_liquidez',
        operador: 'gte',
        valor: 1.5,
        verificar_manual: false,
        cita_textual: 'índice de liquidez mayor o igual a 1.5',
      },
    ],
  };

  it('parsea una estructura válida', () => {
    const r = parseRequisitosEstructurados(valido);
    expect(r.experiencia.valor_min_smmlv).toBe(3000);
    expect(r.indicadores_financieros).toHaveLength(1);
  });

  it('lanza si experiencia falta', () => {
    expect(() => parseRequisitosEstructurados({ indicadores_financieros: [] })).toThrow();
  });

  it('lanza si un indicador tiene operador inválido', () => {
    const invalido = {
      ...valido,
      indicadores_financieros: [{ ...valido.indicadores_financieros[0], operador: 'igual' }],
    };
    expect(() => parseRequisitosEstructurados(invalido)).toThrow();
  });

  it('acepta verificar_manual=true sin valores numéricos', () => {
    const r = parseRequisitosEstructurados({
      experiencia: {
        valor_min_smmlv: null,
        unspsc_exigidos: [],
        max_contratos_aportables: null,
        verificar_manual: true,
        cita_textual: 'el pliego remite a un anexo no incluido',
      },
      indicadores_financieros: [],
    });
    expect(r.experiencia.verificar_manual).toBe(true);
    expect(r.experiencia.valor_min_smmlv).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/eligibility/schema.test.ts`
Expected: FAIL con "Cannot find module '@/src/lib/eligibility/schema'"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/eligibility/schema.ts
/**
 * Requisitos habilitantes CUANTIFICADOS de un proceso — segundo paso sobre
 * `PliegoExtraction.requisitos_habilitantes` (texto libre, ya extraído por
 * extractPliegoHybrid). Este módulo NO extrae del PDF: estructura texto que
 * ya salió del extractor único (CLAUDE.md §2). `verificar_manual` + `cita_textual`
 * es el mismo contrato de grounding que `NO_ENCONTRADO` en pliego/schema.ts —
 * nunca se inventa un número si el pliego no lo declara con claridad.
 */

export type IndicadorFinancieroCodigo =
  | 'indice_liquidez'
  | 'indice_endeudamiento'
  | 'razon_cobertura_intereses'
  | 'rentabilidad_patrimonio'
  | 'rentabilidad_activo'
  | 'patrimonio_smmlv'
  | 'capital_trabajo_smmlv';

export type Operador = 'gte' | 'lte';

export interface IndicadorFinancieroExigido {
  indicador: IndicadorFinancieroCodigo;
  operador: Operador;
  valor: number;
  verificar_manual: boolean;
  cita_textual: string;
}

export interface ExperienciaExigida {
  valor_min_smmlv: number | null;
  unspsc_exigidos: string[];
  max_contratos_aportables: number | null;
  verificar_manual: boolean;
  cita_textual: string;
}

export interface RequisitosHabilitantesEstructurados {
  experiencia: ExperienciaExigida;
  indicadores_financieros: IndicadorFinancieroExigido[];
}

const INDICADORES_VALIDOS: IndicadorFinancieroCodigo[] = [
  'indice_liquidez',
  'indice_endeudamiento',
  'razon_cobertura_intereses',
  'rentabilidad_patrimonio',
  'rentabilidad_activo',
  'patrimonio_smmlv',
  'capital_trabajo_smmlv',
];

export const REQUISITOS_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    experiencia: {
      type: 'object',
      additionalProperties: false,
      properties: {
        valor_min_smmlv: { type: ['number', 'null'] },
        unspsc_exigidos: { type: 'array', items: { type: 'string' } },
        max_contratos_aportables: { type: ['number', 'null'] },
        verificar_manual: { type: 'boolean' },
        cita_textual: { type: 'string' },
      },
      required: ['valor_min_smmlv', 'unspsc_exigidos', 'max_contratos_aportables', 'verificar_manual', 'cita_textual'],
    },
    indicadores_financieros: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          indicador: { type: 'string', enum: INDICADORES_VALIDOS },
          operador: { type: 'string', enum: ['gte', 'lte'] },
          valor: { type: 'number' },
          verificar_manual: { type: 'boolean' },
          cita_textual: { type: 'string' },
        },
        required: ['indicador', 'operador', 'valor', 'verificar_manual', 'cita_textual'],
      },
    },
  },
  required: ['experiencia', 'indicadores_financieros'],
} as const;

function asString(v: unknown, field: string): string {
  if (typeof v !== 'string') throw new Error(`campo ${field} debe ser string`);
  return v;
}
function asBoolean(v: unknown, field: string): boolean {
  if (typeof v !== 'boolean') throw new Error(`campo ${field} debe ser boolean`);
  return v;
}
function asNumberOrNull(v: unknown, field: string): number | null {
  if (v === null) return null;
  if (typeof v !== 'number' || Number.isNaN(v)) throw new Error(`campo ${field} debe ser número o null`);
  return v;
}

export function parseRequisitosEstructurados(raw: unknown): RequisitosHabilitantesEstructurados {
  if (typeof raw !== 'object' || raw === null) throw new Error('requisitos estructurados: no es un objeto');
  const o = raw as Record<string, unknown>;

  if (typeof o.experiencia !== 'object' || o.experiencia === null) {
    throw new Error('experiencia es requerida');
  }
  const e = o.experiencia as Record<string, unknown>;
  if (!Array.isArray(e.unspsc_exigidos)) throw new Error('experiencia.unspsc_exigidos debe ser un array');
  const experiencia: ExperienciaExigida = {
    valor_min_smmlv: asNumberOrNull(e.valor_min_smmlv, 'experiencia.valor_min_smmlv'),
    unspsc_exigidos: e.unspsc_exigidos.map((c, i) => asString(c, `experiencia.unspsc_exigidos[${i}]`)),
    max_contratos_aportables: asNumberOrNull(e.max_contratos_aportables, 'experiencia.max_contratos_aportables'),
    verificar_manual: asBoolean(e.verificar_manual, 'experiencia.verificar_manual'),
    cita_textual: asString(e.cita_textual, 'experiencia.cita_textual'),
  };

  if (!Array.isArray(o.indicadores_financieros)) {
    throw new Error('indicadores_financieros debe ser un array');
  }
  const indicadores_financieros: IndicadorFinancieroExigido[] = o.indicadores_financieros.map((it, i) => {
    if (typeof it !== 'object' || it === null) throw new Error(`indicadores_financieros[${i}] inválido`);
    const ii = it as Record<string, unknown>;
    const indicador = asString(ii.indicador, `indicadores_financieros[${i}].indicador`);
    if (!INDICADORES_VALIDOS.includes(indicador as IndicadorFinancieroCodigo)) {
      throw new Error(`indicadores_financieros[${i}].indicador inválido: ${indicador}`);
    }
    const operador = asString(ii.operador, `indicadores_financieros[${i}].operador`);
    if (operador !== 'gte' && operador !== 'lte') {
      throw new Error(`indicadores_financieros[${i}].operador debe ser gte|lte`);
    }
    return {
      indicador: indicador as IndicadorFinancieroCodigo,
      operador,
      valor: typeof ii.valor === 'number' ? ii.valor : (() => { throw new Error(`indicadores_financieros[${i}].valor debe ser número`); })(),
      verificar_manual: asBoolean(ii.verificar_manual, `indicadores_financieros[${i}].verificar_manual`),
      cita_textual: asString(ii.cita_textual, `indicadores_financieros[${i}].cita_textual`),
    };
  });

  return { experiencia, indicadores_financieros };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/eligibility/schema.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/eligibility/schema.ts src/__tests__/eligibility/schema.test.ts
git commit -m "feat(eligibility): esquema de requisitos habilitantes estructurados"
```

---

### Task 7: Estructurador (Gemini, texto) sobre la extracción ya hecha

**Files:**
- Create: `src/lib/eligibility/extract-requirements.ts`
- Test: `src/__tests__/eligibility/extract-requirements.test.ts`

No vuelve a mandar el PDF — toma `PliegoExtraction.requisitos_habilitantes` (texto libre, ya extraído por `extractPliegoHybrid`) y lo estructura con una sola llamada de texto a Gemini. Esto es lo que hace posible cumplir "extender el extractor existente" sin duplicar el pipeline de PDF.

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/eligibility/extract-requirements.test.ts
import { describe, it, expect, vi } from 'vitest';
import type { RequisitosHabilitantes } from '@/src/lib/pliego/schema';

const mockGenerateContent = vi.fn();
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return { generateContent: mockGenerateContent };
    }
  },
}));

import { extractStructuredRequirements } from '@/src/lib/eligibility/extract-requirements';

const requisitos: RequisitosHabilitantes = {
  experiencia_especifica: 'Experiencia específica mínima de 3.000 SMMLV en construcción de redes de acueducto (UNSPSC 83101500), máximo 3 contratos.',
  capacidad_financiera: 'Índice de liquidez mayor o igual a 1.5.',
  capacidad_organizacional: 'NO_ENCONTRADO',
};

function mockResponse(json: unknown) {
  mockGenerateContent.mockResolvedValue({
    response: { candidates: [{ finishReason: 'STOP' }], text: () => JSON.stringify(json) },
  });
}

describe('extractStructuredRequirements', () => {
  it('lanza si no hay GEMINI_API_KEY', async () => {
    await expect(
      extractStructuredRequirements(requisitos, { apiKey: undefined }),
    ).rejects.toThrow(/GEMINI_API_KEY/);
  });

  it('estructura el texto libre en requisitos cuantificados', async () => {
    mockResponse({
      experiencia: {
        valor_min_smmlv: 3000,
        unspsc_exigidos: ['83101500'],
        max_contratos_aportables: 3,
        verificar_manual: false,
        cita_textual: 'Experiencia específica mínima de 3.000 SMMLV',
      },
      indicadores_financieros: [
        {
          indicador: 'indice_liquidez',
          operador: 'gte',
          valor: 1.5,
          verificar_manual: false,
          cita_textual: 'Índice de liquidez mayor o igual a 1.5',
        },
      ],
    });
    const r = await extractStructuredRequirements(requisitos, { apiKey: 'k' });
    expect(r.experiencia.valor_min_smmlv).toBe(3000);
    expect(r.indicadores_financieros[0].indicador).toBe('indice_liquidez');
  });

  it('propaga error si la salida no es JSON válido', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { candidates: [{ finishReason: 'STOP' }], text: () => 'no es json' },
    });
    await expect(extractStructuredRequirements(requisitos, { apiKey: 'k' })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/eligibility/extract-requirements.test.ts`
Expected: FAIL con "Cannot find module '@/src/lib/eligibility/extract-requirements'"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/eligibility/extract-requirements.ts
/**
 * Segundo paso, texto-a-texto: convierte `requisitos_habilitantes` (texto
 * libre, ya extraído por extractPliegoHybrid) en JSON cuantificado. Nunca
 * recibe el PDF — el único extractor de documentos sigue siendo
 * extractPliegoHybrid.ts (CLAUDE.md §2). Mismo modelo (Gemini) y mismo
 * criterio de grounding: si el texto no da un número claro, verificar_manual.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { RequisitosHabilitantes } from '@/src/lib/pliego/schema';
import { REQUISITOS_JSON_SCHEMA, parseRequisitosEstructurados, type RequisitosHabilitantesEstructurados } from './schema';

const MODEL = 'gemini-flash-lite-latest';

export interface ExtractRequirementsOptions {
  apiKey?: string;
}

function buildPrompt(req: RequisitosHabilitantes): string {
  return `Convierte estos requisitos habilitantes (texto libre de un pliego colombiano) en el JSON cuantificado pedido.

Reglas estrictas:
- Si un valor numérico no aparece explícito o es ambiguo, pon verificar_manual=true y deja el campo numérico en null (experiencia) — NUNCA inventes un número.
- cita_textual es la frase exacta (máx. ~20 palabras) del texto de origen que sustenta el valor.
- Los códigos UNSPSC van sin el prefijo "V1.", solo dígitos.
- Si no se exige ningún indicador financiero, indicadores_financieros es un array vacío.

Experiencia específica: "${req.experiencia_especifica}"
Capacidad financiera: "${req.capacidad_financiera}"
Capacidad organizacional: "${req.capacidad_organizacional}"`;
}

export async function extractStructuredRequirements(
  requisitos: RequisitosHabilitantes,
  opts: ExtractRequirementsOptions = {},
): Promise<RequisitosHabilitantesEstructurados> {
  const apiKey = opts.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no definida. Configúrala en .env.local.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: REQUISITOS_JSON_SCHEMA as unknown as object,
      temperature: 0,
    },
  });

  const result = await model.generateContent([{ text: buildPrompt(requisitos) }]);
  const response = result.response;
  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason === 'MAX_TOKENS') {
    throw new Error('Estructuración truncada (maxOutputTokens).');
  }

  const text = response.text();
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('La salida de Gemini no es JSON válido.');
  }
  return parseRequisitosEstructurados(raw);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/eligibility/extract-requirements.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/eligibility/extract-requirements.ts src/__tests__/eligibility/extract-requirements.test.ts
git commit -m "feat(eligibility): estructura requisitos_habilitantes vía Gemini (texto)"
```

---

### Task 8: Tabla `requisitos_proceso` (caché de requisitos estructurados)

**Files:**
- Create: `src/lib/db/schema/eligibility.ts`
- Modify: `src/lib/db/schema/index.ts`

Nombre en español (`requisitos_proceso`, columnas `proceso_id`/`requisitos`/`extraido_en`) — el repo corrigió explícitamente este mismo punto para `senal_usuario` (commit `fix(signals): usa nomenclatura en español para tabla/columnas de señales`); toda tabla nueva sigue esa convención, no la del prompt original (`process_requirements`).

- [ ] **Step 1: Definir la tabla Drizzle**

```ts
// src/lib/db/schema/eligibility.ts
/**
 * Caché de requisitos habilitantes ya estructurados, por proceso. Insumo del
 * cálculo de habilitacionGate — NO es el resultado de una evaluación (esa
 * sigue sin persistirse, invariante D18 de verdict.ts). Sin RLS (CLAUDE.md
 * §4): compartida entre todos los usuarios porque describe el PROCESO, no
 * una cuenta — cualquier oferente que consulte el mismo proceso reusa la
 * misma extracción.
 */
import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const requisitosProceso = pgTable('requisitos_proceso', {
  procesoId: text('proceso_id').primaryKey(),
  requisitos: jsonb('requisitos').notNull(),
  extraidoEn: timestamp('extraido_en', { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 2: Exportar desde el índice de schema**

Lee `src/lib/db/schema/index.ts` y añade `export * from './eligibility';` junto a las demás exportaciones (mismo patrón que `catalogos.ts`/`cuentas.ts`/`hechos.ts`).

- [ ] **Step 3: Generar la migración**

Run: `npm run db:generate`
Expected: crea un nuevo archivo `drizzle/00XX_<nombre>.sql` con `CREATE TABLE "process_requirements" (...)`.

- [ ] **Step 4: Aplicar la migración (solo si hay una base de desarrollo conectada)**

Run: `npm run db:migrate`
Expected: la tabla `process_requirements` existe en la base de datos de desarrollo.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/schema/eligibility.ts src/lib/db/schema/index.ts drizzle/
git commit -m "feat(eligibility): tabla process_requirements para cachear requisitos estructurados"
```

---

### Task 9: `POST /api/eligibility/extract`

**Files:**
- Create: `app/api/eligibility/extract/route.ts`
- Test: `src/__tests__/api/eligibility-extract-route.test.ts`

Body: `{ procesoId: string, extraction: PliegoExtraction }` — el cliente ya tiene `extraction` porque acaba de correr `/api/pliego/extract` (Task 10 lo conecta). Esta ruta NO toca PDFs ni Gemini con documentos — solo estructura y cachea.

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/api/eligibility-extract-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { PliegoExtraction } from '@/src/lib/pliego/schema';

const mockOnConflict = vi.fn();
vi.mock('@/src/lib/db/client', () => ({
  db: {
    insert: () => ({ values: () => ({ onConflictDoUpdate: mockOnConflict }) }),
  },
}));

const mockExtract = vi.fn();
vi.mock('@/src/lib/eligibility/extract-requirements', () => ({
  extractStructuredRequirements: (...args: unknown[]) => mockExtract(...args),
}));

import { POST } from '@/app/api/eligibility/extract/route';

const extraction = {
  requisitos_habilitantes: {
    experiencia_especifica: 'mínimo 3.000 SMMLV',
    capacidad_financiera: 'liquidez >= 1.5',
    capacidad_organizacional: 'NO_ENCONTRADO',
  },
} as unknown as PliegoExtraction;

const postReq = (body: unknown) =>
  new NextRequest('http://localhost/api/eligibility/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('POST /api/eligibility/extract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('400 si falta procesoId', async () => {
    const res = await POST(postReq({ extraction }));
    expect(res.status).toBe(400);
  });

  it('400 si falta extraction', async () => {
    const res = await POST(postReq({ procesoId: 'CO1.REQ.1' }));
    expect(res.status).toBe(400);
  });

  it('estructura, cachea y devuelve los requisitos', async () => {
    mockExtract.mockResolvedValue({
      experiencia: { valor_min_smmlv: 3000, unspsc_exigidos: [], max_contratos_aportables: null, verificar_manual: false, cita_textual: 'x' },
      indicadores_financieros: [],
    });
    mockOnConflict.mockResolvedValue(undefined);
    const res = await POST(postReq({ procesoId: 'CO1.REQ.1', extraction }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.requisitos.experiencia.valor_min_smmlv).toBe(3000);
    expect(mockExtract).toHaveBeenCalledWith(extraction.requisitos_habilitantes);
  });

  it('502 si la estructuración falla', async () => {
    mockExtract.mockRejectedValue(new Error('GEMINI_API_KEY no definida'));
    const res = await POST(postReq({ procesoId: 'CO1.REQ.1', extraction }));
    expect(res.status).toBe(502);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/api/eligibility-extract-route.test.ts`
Expected: FAIL con "Cannot find module '@/app/api/eligibility/extract/route'"

- [ ] **Step 3: Write minimal implementation**

```ts
// app/api/eligibility/extract/route.ts
/**
 * Route handler: POST /api/eligibility/extract
 *
 * Estructura los requisitos_habilitantes de una extracción de pliego YA
 * hecha (por /api/pliego/extract — único extractor, CLAUDE.md §2) y los
 * cachea por proceso en `process_requirements`. No abre PDFs ni llama a
 * Gemini con documentos: recibe la extracción como body.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/db/client";
import { requisitosProceso } from "@/src/lib/db/schema/eligibility";
import { extractStructuredRequirements } from "@/src/lib/eligibility/extract-requirements";
import type { PliegoExtraction } from "@/src/lib/pliego/schema";

export const runtime = "nodejs";

interface Body {
  procesoId?: string;
  extraction?: PliegoExtraction;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.procesoId || typeof body.procesoId !== "string") {
    return NextResponse.json({ error: "Falta procesoId" }, { status: 400 });
  }
  if (!body.extraction?.requisitos_habilitantes) {
    return NextResponse.json({ error: "Falta extraction.requisitos_habilitantes" }, { status: 400 });
  }

  try {
    const requisitos = await extractStructuredRequirements(body.extraction.requisitos_habilitantes);
    await db
      .insert(requisitosProceso)
      .values({ procesoId: body.procesoId, requisitos })
      .onConflictDoUpdate({
        target: requisitosProceso.procesoId,
        set: { requisitos, extraidoEn: new Date() },
      });
    return NextResponse.json({ requisitos });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Estructuración falló: ${message}` }, { status: 502 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/api/eligibility-extract-route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/eligibility/extract/route.ts src/__tests__/api/eligibility-extract-route.test.ts
git commit -m "feat(eligibility): endpoint que estructura y cachea requisitos por proceso"
```

---

### Task 10: `/pliego` — vincular una extracción a un proceso

**Files:**
- Modify: `app/pliego/page.tsx`

Tras extraer un pliego (`result` ya poblado, línea ~35), añade un campo para el ID del proceso SECOP y un botón que llama a `/api/eligibility/extract`. Cierra el bucle: sin esto, `process_requirements` nunca se llena.

- [ ] **Step 1: Añadir estado y handler**

En `app/pliego/page.tsx`, dentro de `PliegoPage()`, junto a los demás `useState` (línea ~32-36):

```tsx
const [procesoId, setProcesoId] = useState("");
const [linkStatus, setLinkStatus] = useState<"idle" | "linking" | "linked" | "error">("idle");

async function handleLinkToProcess() {
  if (!result || !procesoId.trim()) return;
  setLinkStatus("linking");
  try {
    const res = await fetch("/api/eligibility/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ procesoId: procesoId.trim(), extraction: result.extraction }),
    });
    setLinkStatus(res.ok ? "linked" : "error");
  } catch {
    setLinkStatus("error");
  }
}
```

- [ ] **Step 2: Añadir el bloque de UI**

Dentro del render, donde se muestra `<PliegoResult data={result} />` (buscar esa línea), añade justo antes o después:

```tsx
{result && (
  <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
    <input
      placeholder="ID del proceso SECOP (ej. CO1.REQ.123456)"
      value={procesoId}
      onChange={(e) => setProcesoId(e.target.value)}
    />
    <button type="button" onClick={handleLinkToProcess} disabled={!procesoId.trim() || linkStatus === "linking"}>
      {linkStatus === "linking" ? "Vinculando…" : "Vincular a este proceso"}
    </button>
    {linkStatus === "linked" && <span>Vinculado ✓ — ya se puede verificar habilitación en /licitaciones</span>}
    {linkStatus === "error" && <span>No se pudo vincular — intenta de nuevo.</span>}
  </div>
)}
```

- [ ] **Step 3: Verificar manualmente**

Run: `npm run dev`, sube un pliego de prueba en `/pliego`, escribe un `procesoId`, pulsa "Vincular a este proceso" → debe responder 200 (verificar en la pestaña Network).

- [ ] **Step 4: Commit**

```bash
git add app/pliego/page.tsx
git commit -m "feat(pliego): permite vincular una extracción a un proceso para habilitación"
```

---

### Task 11: `habilitacionGate` real

**Files:**
- Modify: `src/lib/secop/verdict.ts`
- Modify: `src/__tests__/secop/verdict.test.ts` (aditivo — no se toca ningún `it` existente)

`proc.requisitosHabilitantes` es `undefined` en TODOS los tests y llamadas existentes hoy, así que el comportamiento actual (`siempre UNKNOWN` cuando no hay requisitos) se preserva exactamente — los tests existentes en líneas 172-178 y 236-237 de `verdict.test.ts` siguen pasando sin modificarlos. Esta tarea solo AÑADE la rama que se activa cuando sí hay requisitos.

- [ ] **Step 1: Write the failing tests (añadir al final de `verdict.test.ts`, antes del cierre del archivo)**

```ts
describe('habilitacionGate (L2 — con requisitos estructurados)', () => {
  const perfilConRup: OferenteProfile = {
    ...profile,
    experiencia: [
      { objeto: 'PTAP municipal', valorSmmlv: 3500, unspscCodigos: ['83101500'], anioTerminacion: 2023 },
    ],
    capacidadFinanciera: { ...profile.capacidadFinanciera, indiceLiquidez: 1.1 },
  };

  it('experiencia suficiente + indicador cumple → PASS', () => {
    const p = proc({
      requisitosHabilitantes: {
        experiencia: { valor_min_smmlv: 3000, unspsc_exigidos: ['83101500'], max_contratos_aportables: null, verificar_manual: false, cita_textual: 'x' },
        indicadores_financieros: [
          { indicador: 'indice_liquidez', operador: 'gte', valor: 1, verificar_manual: false, cita_textual: 'y' },
        ],
      },
    });
    const r = habilitacionGate(perfilConRup, p);
    expect(r.status).toBe('PASS');
    expect(r.requiredLevel).toBe(2);
  });

  it('brecha de experiencia cuantificada exacta', () => {
    const p = proc({
      requisitosHabilitantes: {
        experiencia: { valor_min_smmlv: 5000, unspsc_exigidos: ['83101500'], max_contratos_aportables: null, verificar_manual: false, cita_textual: 'x' },
        indicadores_financieros: [],
      },
    });
    const r = habilitacionGate(perfilConRup, p);
    expect(r.status).toBe('FAIL');
    expect(r.reason).toMatch(/1500/); // 5000 exigido - 3500 aportado
  });

  it('brecha de indicador financiero cuantificada exacta', () => {
    const p = proc({
      requisitosHabilitantes: {
        experiencia: { valor_min_smmlv: 1000, unspsc_exigidos: [], max_contratos_aportables: null, verificar_manual: false, cita_textual: 'x' },
        indicadores_financieros: [
          { indicador: 'indice_liquidez', operador: 'gte', valor: 1.5, verificar_manual: false, cita_textual: 'y' },
        ],
      },
    });
    const r = habilitacionGate(perfilConRup, p);
    expect(r.status).toBe('FAIL');
    expect(r.reason).toMatch(/1[.,]1/); // el perfil declara 1.1
    expect(r.reason).toMatch(/1[.,]5/); // exigen 1.5
  });

  it('verificar_manual=true en un requisito → VERIFICAR (mapeado a WARN) con la cita', () => {
    const p = proc({
      requisitosHabilitantes: {
        experiencia: { valor_min_smmlv: null, unspsc_exigidos: [], max_contratos_aportables: null, verificar_manual: true, cita_textual: 'remite al anexo 3' },
        indicadores_financieros: [],
      },
    });
    const r = habilitacionGate(perfilConRup, p);
    expect(r.status).toBe('WARN');
    expect(r.reason).toContain('remite al anexo 3');
  });

  it('perfil sin experiencia declarada + requisito de experiencia → FAIL con el faltante completo', () => {
    const p = proc({
      requisitosHabilitantes: {
        experiencia: { valor_min_smmlv: 2000, unspsc_exigidos: [], max_contratos_aportables: null, verificar_manual: false, cita_textual: 'x' },
        indicadores_financieros: [],
      },
    });
    const r = habilitacionGate(profile, p); // `profile` no tiene `experiencia`
    expect(r.status).toBe('FAIL');
    expect(r.reason).toMatch(/2000/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/secop/verdict.test.ts`
Expected: FAIL — TS error (`requisitosHabilitantes` no existe en `VerdictProcessInput`) y aserciones de negocio no cumplidas.

- [ ] **Step 3: Write minimal implementation**

En `src/lib/secop/verdict.ts`:

1. Importa el tipo nuevo y añade el campo a `VerdictProcessInput`:

```ts
import type { OferenteProfile } from '@/src/lib/oferente/types';
import type { RequisitosHabilitantesEstructurados } from '@/src/lib/eligibility/schema';
import type { SecopProceso } from './types';
```

```ts
export interface VerdictProcessInput extends SecopProceso {
  fechaCierre: string | null;
  sectorAgua: boolean | null;
  categoriaUnspscOrigen?: 'proceso' | 'contrato';
  /**
   * Nivel 2 — requisitos cuantificados ya estructurados (Task 6/7), leídos
   * de `process_requirements` por el caller (la ruta API, no este módulo:
   * verdict.ts sigue sin I/O). `undefined`/`null` = sin pliego vinculado
   * todavía → habilitacionGate se comporta exactamente igual que antes
   * (siempre UNKNOWN).
   */
  requisitosHabilitantes?: RequisitosHabilitantesEstructurados | null;
}
```

2. Reemplaza el cuerpo de `habilitacionGate` (la función que hoy siempre devuelve UNKNOWN):

```ts
/** Etiqueta legible de cada indicador financiero, para mensajes de brecha. */
const INDICADOR_LABEL: Record<string, string> = {
  indice_liquidez: 'índice de liquidez',
  indice_endeudamiento: 'índice de endeudamiento',
  razon_cobertura_intereses: 'razón de cobertura de intereses',
  rentabilidad_patrimonio: 'rentabilidad del patrimonio',
  rentabilidad_activo: 'rentabilidad del activo',
  patrimonio_smmlv: 'patrimonio (SMMLV)',
  capital_trabajo_smmlv: 'capital de trabajo (SMMLV)',
};

/** Lee el valor del perfil correspondiente a un código de indicador financiero. */
function valorPerfilIndicador(p: OferenteProfile, indicador: string): number | undefined {
  const cf = p.capacidadFinanciera;
  switch (indicador) {
    case 'indice_liquidez': return cf.indiceLiquidez;
    case 'indice_endeudamiento': return cf.indiceEndeudamiento;
    case 'razon_cobertura_intereses': return cf.razonCoberturaIntereses;
    case 'rentabilidad_patrimonio': return cf.rentabilidadPatrimonio;
    case 'rentabilidad_activo': return cf.rentabilidadActivo;
    case 'patrimonio_smmlv': return cf.patrimonioSmmlv;
    case 'capital_trabajo_smmlv': return cf.capitalTrabajoSmmlv;
    default: return undefined;
  }
}

/**
 * Habilitación (L2): compara el perfil RUP ampliado contra los requisitos
 * cuantificados del pliego (Task 6/7). Sin requisitos vinculados todavía →
 * UNKNOWN (mismo comportamiento que el stub original, protege el probing
 * lazy). Con requisitos: worst-of sobre experiencia + cada indicador
 * financiero, con brechas cuantificadas exactas en `reason`.
 */
export const habilitacionGate: HabilitacionGate = (p, proc) => {
  const req = proc.requisitosHabilitantes;
  if (!req) {
    return {
      status: 'UNKNOWN',
      reason: 'requiere pliego: los indicadores RUP/jurídicos exigidos están en el pliego de condiciones',
      resolvedBy: 'document',
      requiredLevel: 2,
    };
  }

  const razones: { status: GateStatus; texto: string }[] = [];

  // Experiencia
  if (req.experiencia.verificar_manual) {
    razones.push({ status: 'WARN', texto: `experiencia: verificar manualmente — "${req.experiencia.cita_textual}"` });
  } else if (req.experiencia.valor_min_smmlv != null) {
    const aportado = (p.experiencia ?? [])
      .filter((c) =>
        req.experiencia.unspsc_exigidos.length === 0 ||
        c.unspscCodigos.some((code) => req.experiencia.unspsc_exigidos.includes(code)),
      )
      .reduce((sum, c) => sum + c.valorSmmlv, 0);
    const exigido = req.experiencia.valor_min_smmlv;
    if (aportado >= exigido) {
      razones.push({ status: 'PASS', texto: `experiencia: aportas ${aportado} SMMLV, exigen ${exigido}` });
    } else {
      razones.push({ status: 'FAIL', texto: `experiencia: te faltan ${exigido - aportado} SMMLV (aportas ${aportado} de ${exigido} exigidos)` });
    }
  }

  // Indicadores financieros
  for (const ind of req.indicadores_financieros) {
    const label = INDICADOR_LABEL[ind.indicador] ?? ind.indicador;
    if (ind.verificar_manual) {
      razones.push({ status: 'WARN', texto: `${label}: verificar manualmente — "${ind.cita_textual}"` });
      continue;
    }
    const valorPerfil = valorPerfilIndicador(p, ind.indicador);
    if (valorPerfil == null) {
      razones.push({ status: 'WARN', texto: `${label}: no declaraste este dato en tu perfil (exigen ${ind.operador === 'gte' ? '≥' : '≤'} ${ind.valor})` });
      continue;
    }
    const cumple = ind.operador === 'gte' ? valorPerfil >= ind.valor : valorPerfil <= ind.valor;
    if (cumple) {
      razones.push({ status: 'PASS', texto: `${label}: tu valor es ${valorPerfil}, exigen ${ind.operador === 'gte' ? '≥' : '≤'} ${ind.valor}` });
    } else {
      razones.push({ status: 'FAIL', texto: `${label}: tu ${label} es ${valorPerfil} y exigen ${ind.operador === 'gte' ? '≥' : '≤'} ${ind.valor}` });
    }
  }

  if (razones.length === 0) {
    return {
      status: 'UNKNOWN',
      reason: 'el pliego no declara requisitos habilitantes cuantificables',
      resolvedBy: 'document',
      requiredLevel: 2,
    };
  }

  const overall: GateStatus = razones.some((r) => r.status === 'FAIL')
    ? 'FAIL'
    : razones.some((r) => r.status === 'WARN')
      ? 'WARN'
      : 'PASS';

  return {
    status: overall,
    reason: razones.map((r) => r.texto).join(' · '),
    resolvedBy: 'document',
    requiredLevel: 2,
  };
};
```

3. Actualiza `toVerdictInput` para aceptar el extra:

```ts
export function toVerdictInput(
  proceso: SecopProceso,
  extra: {
    sectorAgua?: boolean | null;
    fechaCierre?: string | null;
    categoriaUnspscOrigen?: 'proceso' | 'contrato';
    requisitosHabilitantes?: RequisitosHabilitantesEstructurados | null;
  } = {},
): VerdictProcessInput {
  return {
    ...proceso,
    sectorAgua: extra.sectorAgua ?? null,
    fechaCierre: extra.fechaCierre ?? null,
    categoriaUnspscOrigen: extra.categoriaUnspscOrigen,
    requisitosHabilitantes: extra.requisitosHabilitantes ?? null,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/secop/verdict.test.ts`
Expected: PASS (todos los `it` viejos y nuevos)

- [ ] **Step 5: Commit**

```bash
git add src/lib/secop/verdict.ts src/__tests__/secop/verdict.test.ts
git commit -m "feat(verdict): implementa habilitacionGate con brechas cuantificadas exactas"
```

---

### Task 12: `/api/secop/verdict` lee `process_requirements` y registra la señal `oferente`

**Files:**
- Modify: `app/api/secop/verdict/route.ts`
- Modify: `src/__tests__/api/secop-verdict-route.test.ts` (solo añade el mock de DB — la aserción existente `toBe('UNKNOWN')` sigue siendo correcta porque el mock devuelve "sin fila cacheada")

- [ ] **Step 1: Actualizar el test existente (añadir mocks, sin tocar aserciones)**

Al inicio de `src/__tests__/api/secop-verdict-route.test.ts`, antes del `import { POST }`:

```ts
import { vi, beforeEach } from 'vitest';

const mockLimit = vi.fn();
vi.mock('@/src/lib/db/client', () => ({
  db: { select: () => ({ from: () => ({ where: () => ({ limit: mockLimit }) }) }) },
}));

const mockAuth = vi.fn();
vi.mock('@/src/lib/supabase/get-session-user', () => ({ getSessionUser: () => mockAuth() }));

const mockSignal = vi.fn();
vi.mock('@/src/lib/signals/record-signal', () => ({ recordUserSignal: (...a: unknown[]) => mockSignal(...a) }));
```

Y dentro de `describe(...)`, añade al inicio:

```ts
beforeEach(() => {
  vi.clearAllMocks();
  mockLimit.mockResolvedValue([]); // sin requisitos cacheados por defecto
  mockAuth.mockResolvedValue(null); // sin sesión por defecto
});
```

Añade un test nuevo al final del `describe`:

```ts
it('registra la señal oferente cuando hay sesión', async () => {
  mockAuth.mockResolvedValue({ id: 'u1', email: 'u1@example.com' });
  await POST(postReq({ proceso, perfil }));
  expect(mockSignal).toHaveBeenCalledWith('u1', 'oferente');
});

it('no registra señal sin sesión', async () => {
  await POST(postReq({ proceso, perfil }));
  expect(mockSignal).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/api/secop-verdict-route.test.ts`
Expected: FAIL — los dos tests nuevos fallan (la ruta no llama `recordUserSignal` todavía); los viejos deberían seguir en PASS incluso antes de tocar la ruta (mock de DB devuelve `[]`, no cambia el comportamiento).

- [ ] **Step 3: Write minimal implementation**

```ts
// app/api/secop/verdict/route.ts
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { buildVerdict, toVerdictInput } from "@/src/lib/secop/verdict";
import { db } from "@/src/lib/db/client";
import { requisitosProceso } from "@/src/lib/db/schema/eligibility";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { recordUserSignal } from "@/src/lib/signals/record-signal";
import type { RequisitosHabilitantesEstructurados } from "@/src/lib/eligibility/schema";
import type { SecopProceso } from "@/src/lib/secop/types";
import type { OferenteProfile } from "@/src/lib/oferente/types";

export const runtime = "nodejs";

interface VerdictRequestBody {
  proceso?: SecopProceso;
  perfil?: OferenteProfile;
}

function isValidProceso(p: unknown): p is SecopProceso {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.referencia === "string";
}

function isValidPerfil(p: unknown): p is OferenteProfile {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    Array.isArray(o.sectoresUnspsc) &&
    !!o.cobertura &&
    !!o.cuantiaObjetivo
  );
}

export async function POST(req: NextRequest) {
  let body: VerdictRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!isValidProceso(body.proceso)) {
    return NextResponse.json({ error: "Falta el proceso o es inválido" }, { status: 400 });
  }
  if (!isValidPerfil(body.perfil)) {
    return NextResponse.json({ error: "Falta el perfil de oferente o es inválido" }, { status: 400 });
  }

  const [cached] = await db
    .select()
    .from(requisitosProceso)
    .where(eq(requisitosProceso.procesoId, body.proceso.id))
    .limit(1);
  const requisitosHabilitantes = (cached?.requisitos as RequisitosHabilitantesEstructurados | undefined) ?? null;

  const verdict = buildVerdict(body.perfil, toVerdictInput(body.proceso, { requisitosHabilitantes }));

  const user = await getSessionUser();
  if (user) {
    await recordUserSignal(user.id, "oferente");
  }

  return NextResponse.json({ verdict });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/api/secop-verdict-route.test.ts`
Expected: PASS — incluida la aserción original `gates.habilitacion.status).toBe('UNKNOWN')` (el mock de `db.select` devuelve `[]`, así que `requisitosHabilitantes` es `null` y el gate se comporta igual que antes).

- [ ] **Step 5: Commit**

```bash
git add app/api/secop/verdict/route.ts src/__tests__/api/secop-verdict-route.test.ts
git commit -m "feat(verdict): la ruta lee process_requirements cacheados y registra señal oferente"
```

---

### Task 13: UI — desglose de habilitación, `[ ¿Califico? ]` en el listado, nota de consorcio

**Files:**
- Modify: `src/components/secop/ProcessDetail.tsx`
- Modify: `src/components/secop/ProcessList.tsx`
- Modify: `src/components/secop/SecopExplorer.tsx`

`ProcessDetail` ya renderiza el veredicto completo (línea 137-165) con un `<li>` por compuerta incluyendo `habilitacion` — su `reason` ya mostrará las brechas cuantificadas de la Task 11 sin cambios de código (es texto libre). Esta tarea añade: (a) el desglose línea-por-línea cuando `habilitacion.reason` trae varias razones concatenadas con " · ", (b) la nota de consorcio cuando hay brecha, y (c) el indicador compacto en `ProcessList`.

- [ ] **Step 1: Desglose y nota de consorcio en `ProcessDetail.tsx`**

Reemplaza el bloque `<ul className="clr-elig-gates">` (líneas 148-163) por:

```tsx
<ul className="clr-elig-gates">
  {GATE_LABEL.map(([key, label]) => {
    const g = v.gates[key];
    const s = STATUS[g.status];
    const esHabilitacion = key === "habilitacion";
    const partes = esHabilitacion ? g.reason.split(" · ") : [g.reason];
    return (
      <li key={key} className="clr-elig-gate">
        <span className={`clr-elig-glyph clr-elig-glyph--${s.cls}`}>{s.glyph}</span>
        <span className="clr-elig-name">{label}</span>
        <span className="clr-elig-reason">
          {partes.length > 1 ? (
            <ul className="clr-elig-subgates">
              {partes.map((parte, i) => (
                <li key={i}>{parte}</li>
              ))}
            </ul>
          ) : (
            <>
              {g.reason}
              {g.requiredLevel === 2 && key !== "habilitacion" ? " · requiere revisar pliego (nivel 2)" : ""}
            </>
          )}
        </span>
      </li>
    );
  })}
</ul>
{v.gates.habilitacion.status === "FAIL" && (
  <p className="clr-elig-nota">
    Una brecha se puede cerrar en consorcio o unión temporal.
  </p>
)}
```

- [ ] **Step 2: Indicador compacto en `ProcessList.tsx`**

En el `<span className="clr-prow-foot">` (líneas 67-77), añade junto al score existente:

```tsx
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
  {p.verdict?.gates.habilitacion.status === "FAIL" && (
    <span className="clr-prow-score clr-prow-score--fail">[✗] Habilitación</span>
  )}
  {p.verdict?.gates.habilitacion.status === "PASS" && (
    <span className="clr-prow-score clr-prow-score--pass">[✓] Habilitación</span>
  )}
</span>
```

- [ ] **Step 3: Abrir `RupWizard` desde `SecopExplorer` cuando falta experiencia**

En `src/components/secop/SecopExplorer.tsx`, añade el import junto a `OferenteWizard` (línea ~24):

```tsx
import RupWizard from "./RupWizard";
```

Añade un estado hermano de `wizardOpen` (línea ~64):

```tsx
const [rupWizardOpen, setRupWizardOpen] = useState(false);
```

Añade un handler junto a `handlePerfilCompleto` (después de su cierre, línea ~229):

```tsx
function handleRupCompleto(nuevoPerfil: OferenteProfile) {
  saveOferentePerfil(nuevoPerfil);
  setPerfil(nuevoPerfil);
  setRupWizardOpen(false);
  if (hasSession) {
    fetch("/api/perfil", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevoPerfil),
    }).catch(() => {});
  }
  if (selected) {
    verdictAttempted.current.delete(selected.id); // fuerza recalcular con los nuevos datos RUP
    fetchVerdict(selected, nuevoPerfil);
  }
}
```

Reemplaza el bloque `{wizardOpen ? (...) : selected && access ? (...)}` (líneas 356-382) por:

```tsx
{wizardOpen ? (
  <OferenteWizard onComplete={handlePerfilCompleto} onCancel={() => setWizardOpen(false)} />
) : rupWizardOpen && perfil ? (
  <RupWizard perfil={perfil} onComplete={handleRupCompleto} onSkip={() => setRupWizardOpen(false)} />
) : selected && access ? (
  <ProcessDetail
    key={selected.id}
    proceso={selected}
    access={access}
    probing={!!probing[selected.id]}
    onBack={() => setDetailOpen(false)}
    verdict={verdicts[selected.id]}
    verdictLoading={!!verdictLoading[selected.id]}
    hasPerfil={!!perfil}
    onRequestPerfil={() => {
      if (!hasSession) {
        router.push("/login?next=/licitaciones");
        return;
      }
      if (!perfil) {
        setWizardOpen(true);
        return;
      }
      if (!perfil.experiencia?.length) {
        setRupWizardOpen(true);
        return;
      }
    }}
  />
) : (
  !loading && (
    <div className="clr-secop-empty">
      Selecciona un proceso para ver el detalle.
    </div>
  )
)}
```

Nota: `onRequestPerfil` ahora cubre 3 casos (sin sesión → login, sin perfil base → `OferenteWizard`, perfil sin experiencia → `RupWizard`) en vez de solo abrir `OferenteWizard` — es la extensión natural del wiring existente, sin romper el caso original.

- [ ] **Step 4: Verificar manualmente en el navegador**

Run: `npm run dev`, abre `/licitaciones`, completa el wizard con un perfil que tenga experiencia y un proceso con requisitos vinculados (Task 10) → el detalle debe mostrar el desglose cuantificado y, si hay FAIL, la nota de consorcio.

- [ ] **Step 5: Commit**

```bash
git add src/components/secop/ProcessDetail.tsx src/components/secop/ProcessList.tsx src/components/secop/SecopExplorer.tsx
git commit -m "feat(licitaciones): desglose cuantificado de habilitación y nota de consorcio"
```

---

### Task 14: Enlace en el hero de la home

**Files:**
- Modify: `app/page.js`

- [ ] **Step 1: Añadir el link bajo la tarjeta de muestra**

En `app/page.js`, dentro del `<div>` de la tarjeta de muestra (después de la línea 307, antes del cierre `</div>` de la línea 308):

```jsx
<div style={{ marginTop: 14 }}>
  <Link
    href="/licitaciones"
    style={{ font: "11px var(--font-jetbrains-mono),monospace", color: "#0369A1", letterSpacing: ".04em" }}
  >
    [ Evalúa tu propio RUP → ]
  </Link>
</div>
```

- [ ] **Step 2: Verificar manualmente**

Run: `npm run dev`, abre `/` → el link debe aparecer bajo "Evaluación — muestra 001" y llevar a `/licitaciones`.

- [ ] **Step 3: Commit**

```bash
git add app/page.js
git commit -m "feat(home): enlaza la tarjeta de muestra del hero a /licitaciones"
```

---

### Task 15: Verificación final

- [ ] **Step 1: Suite completa**

Run: `npm run test`
Expected: todos los tests en PASS (viejos + nuevos)

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: `next build` sin errores de tipos ni de compilación

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: sin errores nuevos

- [ ] **Step 4: Commit final si hubo ajustes**

```bash
git add -A
git commit -m "chore: ajustes de verificación final (build/lint)"
```

---

## Fuera de alcance (deliberado)

- **`eligibility_checks`**: el veredicto sigue sin persistirse (invariante D18). Si más adelante se necesita historial de evaluaciones, es una tabla nueva y una decisión aparte — no se coló aquí.
- **Fetch automático del pliego desde SECOP**: hoy el usuario debe subir manualmente el PDF en `/pliego` y vincularlo a un `procesoId` (Task 10). Traer el documento automáticamente desde la URL del proceso es un proyecto de "probing" propio (ver `document-access.ts`) fuera del alcance de este plan.
- **SMMLV_2026 real**: el valor en `src/lib/config/smmlv.ts` es un placeholder (Task 1) — debe confirmarse contra el decreto oficial antes de usarse para decisiones reales de habilitación.
