# Plan Refactoring Detallado — HydroStack 2

---

## PRIORIDAD 1: Centralizar Parámetros Normativos

### Problema
Parámetros de normativa duplicados en 3+ lugares.

### Solución: Crear `src/lib/norms.ts`

```typescript
// src/lib/norms.ts

export interface NormParams {
  trhDays: number;
  sludgeRate: number;
  scumFactor: number;
  minVolume: number;
  minDepth: number;
  minWidth: number;
  minLength: number;
  tempLabel: string;
}

export interface NormMetadata {
  key: "ras" | "esp" | "eu" | "epa";
  name: string;
  flag: string;
  ref: string;
  defaultDotacion: number;
}

export const NORMS_METADATA: Record<string, NormMetadata> = {
  ras: {
    key: "ras",
    name: "RAS Colombia",
    flag: "🇨🇴",
    ref: "Título J — RAS 2017",
    defaultDotacion: 120,
  },
  esp: {
    key: "esp",
    name: "España",
    flag: "🇪🇸",
    ref: "NTE-ISD / CTE DB-HS5",
    defaultDotacion: 160,
  },
  eu: {
    key: "eu",
    name: "Europa",
    flag: "🇪🇺",
    ref: "EN 12566-1",
    defaultDotacion: 150,
  },
  epa: {
    key: "epa",
    name: "EE.UU.",
    flag: "🇺🇸",
    ref: "EPA Onsite Wastewater",
    defaultDotacion: 190,
  },
};

const RAS_PARAMS = {
  tempGte20: {
    trhDays: 1.5,
    sludgeRate: 40,
    scumFactor: 0.3,
    minVolume: 1.0,
    minDepth: 1.2,
    minWidth: 0.6,
    minLength: 1.5,
    tempLabel: "T ≥ 20°C",
  },
  temp10to19: {
    trhDays: 2.0,
    sludgeRate: 50,
    scumFactor: 0.3,
    minVolume: 1.0,
    minDepth: 1.2,
    minWidth: 0.6,
    minLength: 1.5,
    tempLabel: "T 10–19°C",
  },
  tempLt10: {
    trhDays: 2.5,
    sludgeRate: 60,
    scumFactor: 0.3,
    minVolume: 1.0,
    minDepth: 1.2,
    minWidth: 0.6,
    minLength: 1.5,
    tempLabel: "T < 10°C",
  },
};

// Similar para ESP, EU, EPA...

export function getParams(
  normKey: "ras" | "esp" | "eu" | "epa",
  temp: number
): NormParams {
  switch (normKey) {
    case "ras":
      if (temp >= 20) return RAS_PARAMS.tempGte20;
      if (temp >= 10) return RAS_PARAMS.temp10to19;
      return RAS_PARAMS.tempLt10;
    case "esp":
      if (temp >= 15) return ESP_PARAMS.tempGte15;
      return ESP_PARAMS.tempLt15;
    // ... otros casos
    default:
      return RAS_PARAMS.tempGte20;
  }
}

/**
 * Calcula dimensiones de fosa séptica según parámetros normativos
 */
export function computeNorm(
  normKey: "ras" | "esp" | "eu" | "epa",
  users: number,
  dotacion: number,
  retCoef: number,
  temp: number,
  cleanYears: number,
  depth: number
) {
  const p = getParams(normKey, temp);
  const Qd = (users * dotacion * retCoef) / 1000;
  const Vl = Qd * p.trhDays;
  const Vs = (users * p.sludgeRate * cleanYears) / 1000;
  const Vn = p.scumFactor * Vl;
  
  let Vtot = Vl + Vs + Vn;
  const minA = Vtot < p.minVolume;
  if (minA) Vtot = p.minVolume;

  const Area = Vtot / depth;
  const W = Math.sqrt(Area / 2);
  const L = 2 * W;
  
  const Gs = (users * p.sludgeRate) / 365 / 1000;
  const SRT = Gs > 0 ? Vs / Gs : 0;
  
  const chambers = users > 50 || Vtot > 10 ? 3 : users > 5 || Vtot > 2 ? 2 : 1;

  return {
    Vl,
    Vs,
    Vn,
    Vtot,
    L,
    W,
    SRT,
    minA,
    trhDays: p.trhDays,
    chambers,
    tempLabel: p.tempLabel,
    Qd,
    Gs,
    Area,
    // Add other computed values...
  };
}

export type ComputeResult = ReturnType<typeof computeNorm>;
```

### Resultado
- ✅ Source of truth único para parámetros
- ✅ Fácil actualizar: un change, 3 files arreglados automáticamente
- ✅ Testeable aisladamente

---

## PRIORIDAD 2: Extraer Lógica de Cálculo a Hook

### Problema
SepticTankCalculator tiene 1,102 líneas con lógica de cálculo + render mezcladas.

### Solución: Crear `hooks/useCalcNorm.ts`

```typescript
// hooks/useCalcNorm.ts

import { useState, useCallback, useEffect } from "react";
import { computeNorm, type ComputeResult } from "@/lib/norms";

export interface FormState {
  users?: number;
  dotacion?: number;
  retCoef?: number;
  temp?: number;
  depth?: number;
  freeboard?: number;
  cleanYears?: number;
  dboIn?: number;
  ssIn?: number;
  soilType?: string;
  soilPermeability?: "high" | "medium" | "low" | "none" | "unknown";
  normKey?: "ras" | "esp" | "eu" | "epa";
  calculated?: boolean;
}

export function useCalcNorm(initialState?: FormState) {
  const [formState, setFormState] = useState<FormState>(initialState ?? {});
  const [result, setResult] = useState<ComputeResult | null>(null);

  // Cargar desde localStorage en mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("hydrostack_formstate");
      if (stored) {
        const parsed = JSON.parse(stored);
        setFormState(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  // Guardar en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem("hydrostack_formstate", JSON.stringify(formState));
  }, [formState]);

  // Recalcular cuando cambien inputs
  useEffect(() => {
    if (
      !formState.users ||
      !formState.dotacion ||
      !formState.temp ||
      !formState.depth ||
      !formState.cleanYears ||
      !formState.normKey
    ) {
      setResult(null);
      return;
    }

    const computed = computeNorm(
      formState.normKey,
      formState.users,
      formState.dotacion,
      formState.retCoef ?? 0.75,
      formState.temp,
      formState.cleanYears,
      formState.depth
    );

    setResult({
      ...computed,
      // Add validations
      chkCVO: (computed.Qd * 1000 * (formState.dboIn ?? 250)) / computed.Vtot <= 0.3,
      chkSRT: computed.SRT >= 20,
    });

    // Mark as calculated
    setFormState(prev => ({ ...prev, calculated: true }));
  }, [formState.users, formState.dotacion, formState.temp, ...]);

  const updateField = useCallback(
    (field: keyof FormState, value: any) => {
      setFormState(prev => ({ ...prev, [field]: value }));
    },
    []
  );

  return {
    formState,
    result,
    updateField,
    setFormState,
  };
}
```

### Uso en Componente

```javascript
// components/SepticForm.jsx

export function SepticForm() {
  const { formState, result, updateField } = useCalcNorm();

  return (
    <div>
      <h2>Parámetros de Entrada</h2>
      <input
        type="number"
        value={formState.users ?? ""}
        onChange={(e) => updateField("users", Number(e.target.value))}
      />
      {/* ... more inputs ... */}
    </div>
  );
}
```

### Resultado
- ✅ Lógica aislable y testeable
- ✅ Reutilizable en múltiples componentes
- ✅ localStorage sync centralizado
- ✅ Cálculos independientes de render

---

## PRIORIDAD 3: Refactorizar SepticTankCalculator en 4 Componentes

### Antes
```
SepticTankCalculator.jsx (1,102 líneas)
├─ Form inputs
├─ Render state logic
├─ Calculations
├─ Diagrams (SVG + 3D)
└─ PDF Export
```

### Después
```
SepticTankCalculator.jsx (200 líneas)
├─ useCalcNorm()
├─ <SepticForm /> (form inputs)
├─ <SepticResults /> (alerts + summary)
├─ <SepticDiagrams /> (SVG + 3D wrapper)
└─ <SepticExport /> (PDF button)
```

### Ejemplo: `components/SepticForm.jsx`

```jsx
// components/SepticForm.jsx

"use client";

import { NORMS_METADATA } from "@/lib/norms";
import type { FormState } from "@/hooks/useCalcNorm";

interface SepticFormProps {
  formState: FormState;
  onUpdate: (field: keyof FormState, value: any) => void;
}

export function SepticForm({ formState, onUpdate }: SepticFormProps) {
  return (
    <section>
      <h2>Entrada de Datos</h2>

      {/* Norm selector */}
      <div>
        <label>Normativa aplicable</label>
        <select
          value={formState.normKey ?? ""}
          onChange={(e) => onUpdate("normKey", e.target.value)}
        >
          {Object.values(NORMS_METADATA).map((norm) => (
            <option key={norm.key} value={norm.key}>
              {norm.flag} {norm.name}
            </option>
          ))}
        </select>
      </div>

      {/* Users input */}
      <div>
        <label>Usuarios equivalentes</label>
        <input
          type="number"
          min="1"
          value={formState.users ?? ""}
          onChange={(e) => onUpdate("users", Number(e.target.value))}
        />
      </div>

      {/* Temp input */}
      <div>
        <label>Temperatura media (°C)</label>
        <input
          type="number"
          min="-10"
          max="40"
          value={formState.temp ?? ""}
          onChange={(e) => onUpdate("temp", Number(e.target.value))}
        />
      </div>

      {/* More fields... */}
    </section>
  );
}
```

---

## PRIORIDAD 4: Validación en APIs

### Problema
FormState no se valida, permitiendo valores inválidos.

### Solución: Usar Zod para validación

```bash
npm install zod
```

```typescript
// src/lib/schemas.ts

import { z } from "zod";

export const FormStateSchema = z.object({
  users: z.number().int().positive().optional(),
  dotacion: z.number().positive().optional(),
  retCoef: z.number().min(0.7).max(0.85).optional(),
  temp: z.number().min(-10).max(50).optional(),
  depth: z.number().positive().optional(),
  freeboard: z.number().nonnegative().optional(),
  cleanYears: z.number().int().positive().optional(),
  dboIn: z.number().nonnegative().optional(),
  ssIn: z.number().nonnegative().optional(),
  soilType: z.string().optional(),
  soilPermeability: z.enum(["high", "medium", "low", "none", "unknown"]).optional(),
  normKey: z.enum(["ras", "esp", "eu", "epa"]).optional(),
  calculated: z.boolean().optional(),
});

export type FormState = z.infer<typeof FormStateSchema>;
```

### Uso en API

```typescript
// app/api/agent/suggest/route.ts

import { FormStateSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validar con Zod
    const { formState } = FormStateSchema.parse(body);

    if (!formState) {
      return new Response(
        JSON.stringify({ error: "formState is required" }),
        { status: 400 }
      );
    }

    const suggestions = suggestNextQuestions(formState);

    return new Response(JSON.stringify({ suggestions }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: "Validation error",
          details: error.errors,
        }),
        { status: 400 }
      );
    }
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
}
```

---

## PRIORIDAD 5: Agregar Tests Mínimos

### Crear `__tests__/lib/norms.test.ts`

```typescript
import { computeNorm, getParams } from "@/lib/norms";

describe("norms", () => {
  describe("getParams", () => {
    it("should return RAS params for temp ≥ 20°C", () => {
      const params = getParams("ras", 25);
      expect(params.trhDays).toBe(1.5);
      expect(params.tempLabel).toBe("T ≥ 20°C");
    });

    it("should return RAS params for temp < 10°C", () => {
      const params = getParams("ras", 5);
      expect(params.trhDays).toBe(2.5);
      expect(params.tempLabel).toBe("T < 10°C");
    });
  });

  describe("computeNorm", () => {
    it("should compute RAS septic tank for typical household", () => {
      const result = computeNorm("ras", 5, 120, 0.75, 20, 3, 1.5);

      // 5 users × 120 L/day × 0.75 = 450 L/day = 0.45 m³/day
      expect(result.Qd).toBeCloseTo(0.45, 2);

      // Vl = 0.45 × 1.5 = 0.675 m³
      expect(result.Vl).toBeCloseTo(0.675, 2);

      // Should apply minimum volume (RAS = 1.0 m³)
      expect(result.Vtot).toBe(1.0);
      expect(result.minA).toBe(true);
    });

    it("should calculate chambers correctly", () => {
      // Small household → 1 chamber
      const small = computeNorm("ras", 3, 120, 0.75, 20, 3, 1.5);
      expect(small.chambers).toBe(1);

      // Medium → 2 chambers
      const medium = computeNorm("ras", 8, 120, 0.75, 20, 3, 1.5);
      expect(medium.chambers).toBe(2);

      // Large → 3 chambers
      const large = computeNorm("ras", 100, 120, 0.75, 20, 3, 1.5);
      expect(large.chambers).toBe(3);
    });
  });
});
```

### Setup Jest

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

```javascript
// jest.config.js
export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
```

```bash
# package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

---

## PRIORIDAD 6: Optimización de Componentes Pesados

### Refactorizar IsometricDiagram

```jsx
// components/IsometricDiagram.jsx (antes)

function IsometricDiagram({ r, freeboard }) {
  const Area = r.Vtot / r.depth;
  const hNata = r.Vn / Area;
  // ... renders SVG
  return <svg>...</svg>;
}

export default IsometricDiagram;

// Problema: re-renderiza en cada keystroke
```

```jsx
// components/IsometricDiagram.jsx (después)

const IsometricDiagram = React.memo(
  function IsometricDiagram({ r, freeboard }) {
    return useMemo(() => {
      const Area = r.Vtot / r.depth;
      const hNata = r.Vn / Area;
      // ... geometry calculations
      return <svg>...</svg>;
    }, [r.Vtot, r.depth, r.Vn, freeboard]);
  },
  // Custom comparison
  (prevProps, nextProps) => {
    return (
      prevProps.r.Vtot === nextProps.r.Vtot &&
      prevProps.r.depth === nextProps.r.depth &&
      prevProps.freeboard === nextProps.freeboard
    );
  }
);

export default IsometricDiagram;
```

### Dynamic Import para Babylon.js

```jsx
// components/SepticDiagrams.jsx

import dynamic from "next/dynamic";
import { Suspense } from "react";

const IsometricDiagram3D = dynamic(
  () => import("./IsometricDiagram3D"),
  {
    ssr: false,
    loading: () => <div>Cargando diagrama 3D...</div>,
  }
);

export function SepticDiagrams({ r, freeboard, showDiagram3D }) {
  return (
    <div>
      <IsometricDiagram r={r} freeboard={freeboard} />

      {showDiagram3D && (
        <Suspense fallback={<div>Cargando...</div>}>
          <IsometricDiagram3D r={r} freeboard={freeboard} />
        </Suspense>
      )}
    </div>
  );
}
```

---

## Roadmap Ejecución

### Semana 1
- [ ] Crear `src/lib/norms.ts`
- [ ] Crear `hooks/useCalcNorm.ts`
- [ ] Crear `src/lib/schemas.ts` (Zod validation)
- [ ] Reemplazar imports en SepticTankCalculator

### Semana 2
- [ ] Extraer `components/SepticForm.jsx`
- [ ] Extraer `components/SepticResults.jsx`
- [ ] Extraer `components/SepticDiagrams.jsx`
- [ ] Refactorizar SepticTankCalculator.jsx principal

### Semana 3
- [ ] Agregar `__tests__/lib/norms.test.ts`
- [ ] Agregar `__tests__/hooks/useCalcNorm.test.ts`
- [ ] Validar APIs con Zod

### Semana 4
- [ ] React.memo en IsometricDiagram
- [ ] Dynamic import para IsometricDiagram3D
- [ ] Profiling con Vercel Analytics

---

## Commit Message Template

```bash
git commit -m "refactor: extract norms to src/lib/norms.ts

- Move NORMS_METADATA, NormParams types from SepticTankCalculator.jsx
- Extract getParams() and computeNorm() logic
- Centralize source of truth for all normative parameters
- Closes technical debt issue #5"
```

