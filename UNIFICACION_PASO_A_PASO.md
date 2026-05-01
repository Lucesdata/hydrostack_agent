# Unificación del Proyecto — Ejecución Paso a Paso

**Objetivo:** Unificar estructura fragmentada en `src/` coherente  
**Duración:** ~13 horas (2 días intensivos)  
**Risk:** Bajo (cambios de estructura, funcionalidad igual)

---

## PASO 1: Preparar Estructura (15 min)

### 1.1 Crear directorios

```bash
cd "/Users/giovannyguevaraduque/Desktop/claude_trabajo/hydrostack 2/.claude/worktrees/compassionate-cray-fec098"

# Crear carpeta src/ con estructura
mkdir -p src/{lib,hooks,components,types,utils,__tests__/{lib,hooks,utils}}

# Listar para confirmar
find src -type d
```

### 1.2 Verifica estructura

```bash
tree src -L 2
# Debe mostrar:
# src/
# ├── lib/
# ├── hooks/
# ├── components/
# ├── types/
# ├── utils/
# └── __tests__/
```

---

## PASO 2: Mover i18n (10 min)

### 2.1 Copiar y convertir

```bash
# Copiar archivo
cp lib/i18n.js src/lib/i18n.js

# Renombrar a TypeScript
mv src/lib/i18n.js src/lib/i18n.ts
```

### 2.2 Actualizar imports en tsconfig.json

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### 2.3 Verificar que app/layout.js importa correctamente

```bash
# Buscar imports de i18n
grep -n "from.*i18n" app/layout.js app/page.js
# Debe funcionar con: import { LangProvider } from "@/lib/i18n"
```

---

## PASO 3: Crear `src/lib/norms.ts` (45 min)

### 3.1 Extraer de SepticTankCalculator.jsx

Copiar desde `components/SepticTankCalculator.jsx` líneas 6-71:

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

// [Copiar getParams() aquí]

export function getParams(
  norm: "ras" | "esp" | "eu" | "epa",
  temp: number
): NormParams {
  if (norm === "ras") {
    if (temp >= 20) return {trhDays:1.5,sludgeRate:40,scumFactor:0.30,minVolume:1.0,minDepth:1.2,minWidth:0.6, minLength:1.5,tempLabel:"T ≥ 20°C"};
    if (temp >= 10) return {trhDays:2.0,sludgeRate:50,scumFactor:0.30,minVolume:1.0,minDepth:1.2,minWidth:0.6, minLength:1.5,tempLabel:"T 10–19°C"};
    return {trhDays:2.5,sludgeRate:60,scumFactor:0.30,minVolume:1.0,minDepth:1.2,minWidth:0.6, minLength:1.5,tempLabel:"T < 10°C"};
  }
  // ... resto de normas
}

// [Copiar computeNorm() aquí]

export interface ComputeResult {
  Vl: number;
  Vs: number;
  Vn: number;
  Vtot: number;
  L: number;
  W: number;
  SRT: number;
  minA: boolean;
  trhDays: number;
  chambers: number;
  tempLabel: string;
  Qd?: number;
  Gs?: number;
  Area?: number;
  [key: string]: any;
}

export function computeNorm(
  normKey: "ras" | "esp" | "eu" | "epa",
  users: number,
  dotacion: number,
  retCoef: number,
  temp: number,
  cleanYears: number,
  depth: number
): ComputeResult {
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
  };
}
```

### 3.2 Verificar compilación

```bash
npx tsc --noEmit
# Debe compilar sin errores
```

---

## PASO 4: Crear `src/types/` (20 min)

### 4.1 Crear tipos

```typescript
// src/types/index.ts

export type { NormParams, NormMetadata, ComputeResult } from '@/lib/norms';

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
```

---

## PASO 5: Crear `src/hooks/useCalcNorm.ts` (1 hora)

Copiar la lógica de estado de `SepticTankCalculator.jsx` pero en un hook:

```typescript
// src/hooks/useCalcNorm.ts

import { useState, useCallback, useEffect } from "react";
import { computeNorm, type ComputeResult } from "@/lib/norms";
import type { FormState } from "@/types";

export function useCalcNorm(initialState?: FormState) {
  const [formState, setFormState] = useState<FormState>(initialState ?? {});
  const [result, setResult] = useState<ComputeResult | null>(null);

  // Cargar desde localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("hydrostack_formstate");
      if (stored) setFormState(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  // Guardar en localStorage
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
      chkCVO: 
        (computed.Qd! * 1000 * (formState.dboIn ?? 250)) / computed.Vtot <= 0.3,
      chkSRT: computed.SRT >= 20,
    });

    setFormState(prev => ({ ...prev, calculated: true }));
  }, [formState.users, formState.dotacion, formState.temp, formState.depth, formState.cleanYears, formState.normKey, formState.dboIn]);

  const updateField = useCallback(
    (field: keyof FormState, value: any) => {
      setFormState(prev => ({ ...prev, [field]: value }));
    },
    []
  );

  return { formState, result, updateField, setFormState };
}
```

---

## PASO 6: Refactorizar `components/` (2 horas)

### 6.1 Crear estructura de carpetas

```bash
mkdir -p src/components/SepticTank src/components/Diagrams src/components/Common

# Mover diagrama
mv components/IsometricDiagram.jsx src/components/Diagrams/IsometricDiagram.jsx
mv components/IsometricDiagram3D.jsx src/components/Diagrams/IsometricDiagram3D.jsx
mv components/LaminaTecnica.jsx src/components/SepticTank/LaminaTecnica.jsx
mv components/Navbar.js src/components/Common/Navbar.jsx
```

### 6.2 Crear `src/components/SepticTank/SepticForm.tsx`

```typescript
// src/components/SepticTank/SepticForm.tsx

"use client";

import { NORMS_METADATA } from "@/lib/norms";
import type { FormState } from "@/types";

interface SepticFormProps {
  formState: FormState;
  onUpdate: (field: keyof FormState, value: any) => void;
}

export function SepticForm({ formState, onUpdate }: SepticFormProps) {
  return (
    <form>
      <div>
        <label>Normativa</label>
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

      <div>
        <label>Usuarios</label>
        <input
          type="number"
          value={formState.users ?? ""}
          onChange={(e) => onUpdate("users", Number(e.target.value))}
        />
      </div>

      <div>
        <label>Temperatura (°C)</label>
        <input
          type="number"
          value={formState.temp ?? ""}
          onChange={(e) => onUpdate("temp", Number(e.target.value))}
        />
      </div>

      <div>
        <label>Profundidad (m)</label>
        <input
          type="number"
          value={formState.depth ?? ""}
          onChange={(e) => onUpdate("depth", Number(e.target.value))}
        />
      </div>

      {/* Agregar más campos... */}
    </form>
  );
}
```

### 6.3 Crear `src/components/SepticTank/SepticResults.tsx`

```typescript
// src/components/SepticTank/SepticResults.tsx

"use client";

import type { ComputeResult } from "@/types";

interface SepticResultsProps {
  result: ComputeResult | null;
}

export function SepticResults({ result }: SepticResultsProps) {
  if (!result) return <p>Ingresa datos para calcular</p>;

  return (
    <div>
      <h2>Resultados</h2>

      <div>
        <p>Volumen total: <strong>{result.Vtot.toFixed(2)} m³</strong></p>
        <p>Largo: <strong>{result.L.toFixed(2)} m</strong></p>
        <p>Ancho: <strong>{result.W.toFixed(2)} m</strong></p>
        <p>Cámaras: <strong>{result.chambers}</strong></p>
      </div>

      {result.minA && (
        <div style={{ color: 'orange' }}>
          ⚠️ Se aplicó mínimo normativo
        </div>
      )}

      {!result.chkSRT && (
        <div style={{ color: 'red' }}>
          ❌ SRT &lt; 20 días (crítico)
        </div>
      )}
    </div>
  );
}
```

### 6.4 Simplificar `src/components/SepticTank/SepticTankCalculator.tsx`

```typescript
// src/components/SepticTank/SepticTankCalculator.tsx

"use client";

import { useCalcNorm } from "@/hooks/useCalcNorm";
import { SepticForm } from "./SepticForm";
import { SepticResults } from "./SepticResults";
import { SepticDiagrams } from "./SepticDiagrams";

export function SepticTankCalculator() {
  const { formState, result, updateField } = useCalcNorm();
  const [showDiagram, setShowDiagram] = useState(false);

  return (
    <div>
      <SepticForm formState={formState} onUpdate={updateField} />
      <SepticResults result={result} />
      {result && showDiagram && <SepticDiagrams result={result} />}
    </div>
  );
}
```

---

## PASO 7: Convertir a TypeScript (45 min)

```bash
# Renombrar archivos app/
mv app/page.js app/page.tsx
mv app/layout.js app/layout.tsx
mv app/chat/page.js app/chat/page.tsx
mv app/calculators/page.js app/calculators/page.tsx
```

### Agregar tipos en `app/layout.tsx`

```typescript
// app/layout.tsx

import type { Metadata } from 'next';
import { LangProvider } from '@/lib/i18n';
import Navbar from '@/components/Common/Navbar';
import './globals.css';

export const metadata: Metadata = {
  title: 'HydroStack',
  // ...
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <LangProvider>
          <Navbar />
          <main>{children}</main>
        </LangProvider>
      </body>
    </html>
  );
}
```

---

## PASO 8: Setup Testing (30 min)

### 8.1 Instalar dependencias

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom @types/jest
```

### 8.2 Crear `jest.config.js`

```javascript
// jest.config.js

export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
  ],
};
```

### 8.3 Crear `jest.setup.js`

```javascript
// jest.setup.js

import '@testing-library/jest-dom';
```

### 8.4 Actualizar `package.json`

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

---

## PASO 9: Crear Tests Mínimos (1 hora)

### 9.1 Test de norms

```typescript
// src/__tests__/lib/norms.test.ts

import { computeNorm, getParams } from '@/lib/norms';

describe('norms', () => {
  describe('getParams', () => {
    it('should return RAS params for temp ≥ 20°C', () => {
      const params = getParams('ras', 25);
      expect(params.trhDays).toBe(1.5);
      expect(params.tempLabel).toBe('T ≥ 20°C');
    });
  });

  describe('computeNorm', () => {
    it('should compute RAS septic tank correctly', () => {
      const result = computeNorm('ras', 5, 120, 0.75, 20, 3, 1.5);
      expect(result.Qd).toBeCloseTo(0.45, 2);
      expect(result.Vtot).toBe(1.0); // applied minimum
    });
  });
});
```

### 9.2 Test de hook

```typescript
// src/__tests__/hooks/useCalcNorm.test.ts

import { renderHook, act } from '@testing-library/react';
import { useCalcNorm } from '@/hooks/useCalcNorm';

describe('useCalcNorm', () => {
  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useCalcNorm());
    expect(result.current.formState).toEqual({});
    expect(result.current.result).toBeNull();
  });

  it('should update field and recalculate', () => {
    const { result } = renderHook(() => useCalcNorm());

    act(() => {
      result.current.updateField('users', 5);
      result.current.updateField('dotacion', 120);
      result.current.updateField('temp', 20);
      result.current.updateField('depth', 1.5);
      result.current.updateField('cleanYears', 3);
      result.current.updateField('normKey', 'ras');
    });

    expect(result.current.result).not.toBeNull();
    expect(result.current.result?.Vtot).toBe(1.0);
  });
});
```

---

## PASO 10: Verificación (30 min)

### 10.1 Compilar sin errores

```bash
npx tsc --noEmit
# ✅ Debe pasar sin errores
```

### 10.2 Tests pasan

```bash
npm test
# ✅ Todos los tests deben pasar
```

### 10.3 App funciona

```bash
npm run dev
# → http://localhost:3000
# → Navega a /calculators/fosa-septica
# → Ingresa datos → debe calcular
```

### 10.4 Build funciona

```bash
npm run build
# ✅ Debe compilar exitosamente
```

### 10.5 Limpieza (opcional)

```bash
# Si todo funciona, puede eliminar viejos archivos
rm -rf lib/         # (backup en src/lib/)
rm -rf components/  # (backup en src/components/)
```

---

## Checklist Final

```
ESTRUCTURA
□ mkdir src/{lib,hooks,components,types,utils,__tests__}
□ cp lib/i18n.js → src/lib/i18n.ts
□ cp -r src/lib/agent → src/lib/agent/

LOGIC
□ Crear src/lib/norms.ts ← de SepticTankCalculator
□ Crear src/types/index.ts
□ Crear src/hooks/useCalcNorm.ts

COMPONENTS
□ mkdir src/components/{SepticTank,Diagrams,Common}
□ Extraer SepticForm.tsx
□ Extraer SepticResults.tsx
□ Simplificar SepticTankCalculator.tsx

TYPESCRIPT
□ Renombrar app/*.js → app/*.tsx
□ Agregar tipos en archivos

TESTING
□ npm install jest @testing-library/react
□ Crear jest.config.js
□ Crear src/__tests__/lib/norms.test.ts
□ Crear src/__tests__/hooks/useCalcNorm.test.ts

VALIDACIÓN
□ npx tsc --noEmit ✅
□ npm test ✅
□ npm run dev ✅
□ npm run build ✅

LIMPIEZA
□ Backup viejos archivos
□ rm -rf lib/ components/
```

---

## Resultado Esperado

**Antes:**
```
hydrostack-2/
├── app/
├── components/
├── lib/
├── src/
└── docs/
```

**Después:**
```
hydrostack-2/
├── src/
│  ├── lib/          ← Toda la lógica
│  ├── hooks/        ← Hooks reutilizables
│  ├── components/   ← UI components
│  ├── types/        ← TypeScript types
│  ├── utils/        ← Helper functions
│  └── __tests__/    ← Test files
│
├── app/             ← Next.js App Router (pages + API)
├── docs/
├── public/
└── [configs]
```

✅ **Proyecto unificado, escalable, testeable**

