# HydroStack 2 — Unificación de Estructura

---

## ❌ ESTADO ACTUAL (Fragmentado)

```
hydrostack-2/
├── app/                         ✅ App Router (correcto)
│   ├── api/
│   │   ├── chat/route.ts       ✅ TS
│   │   ├── agent/suggest/route.ts  ✅ TS
│   │   └── generate-isometric/route.js
│   ├── calculators/
│   ├── chat/
│   └── page.js, layout.js       ❌ JS (debería ser .ts?)
│
├── components/                  ⚠️ Incompleto
│   ├── SepticTankCalculator.jsx
│   ├── IsometricDiagram.jsx
│   └── *.jsx
│
├── lib/                         🔴 CONFLICTO
│   └── i18n.js
│
├── src/                         🔴 CONFLICTO
│   └── lib/
│       └── agent/
│           ├── filter.ts       ✅ TS
│           └── catalog.ts      ✅ TS
│
└── docs/
    └── normativa/

PROBLEMAS:
🔴 DOS CARPETAS "lib" (lib/ vs src/lib/)
🔴 TypeScript parcial (mix .ts y .js)
🔴 Falta: hooks/, utils/, types/, __tests__/
🔴 Lógica separada: API usan src/lib, pero components usan lib/
```

---

## ✅ ESTRUCTURA OBJETIVO (Unificada)

```
hydrostack-2/
│
├─ src/                         ← Punto entrada UNIFICADO
│  │
│  ├─ lib/                      ← Business logic (shared)
│  │  ├─ norms.ts              (NEW) Source of truth: params
│  │  ├─ location.ts           (NEW) Detect location
│  │  ├─ normativa.ts          (NEW) Load & cache regs
│  │  ├─ schemas.ts            (NEW) Zod validation
│  │  ├─ i18n.ts               (MOVED from lib/i18n.js)
│  │  └─ agent/
│  │     ├─ filter.ts          ✅ (existing)
│  │     ├─ catalog.ts         ✅ (existing)
│  │     ├─ groq-client.ts     (NEW) Groq API
│  │     └─ system-prompt.ts   (NEW) Prompt assembly
│  │
│  ├─ hooks/                    ← React hooks (reusable)
│  │  ├─ useCalcNorm.ts        (NEW) Calc + state
│  │  ├─ useFormState.ts       (NEW) Form state
│  │  └─ useSepticDiagram.ts   (NEW) Diagram geometry
│  │
│  ├─ components/              ← Presentational (UI only)
│  │  ├─ SepticTank/
│  │  │  ├─ SepticTankCalculator.tsx    (REFACTORED - orchestrator)
│  │  │  ├─ SepticForm.tsx              (NEW)
│  │  │  ├─ SepticResults.tsx           (NEW)
│  │  │  ├─ SepticDiagrams.tsx          (NEW)
│  │  │  └─ SepticExport.tsx            (NEW)
│  │  │
│  │  ├─ Diagrams/
│  │  │  ├─ IsometricDiagram.tsx        (REFACTORED - memo'd)
│  │  │  ├─ IsometricDiagram3D.tsx      (REFACTORED - lazy load)
│  │  │  └─ LaminaTecnica.tsx           (MOVED from root)
│  │  │
│  │  └─ Common/
│  │     ├─ Navbar.tsx                  (MOVED from root)
│  │     └─ ErrorBoundary.tsx           (NEW)
│  │
│  ├─ types/                    ← TypeScript types (shared)
│  │  ├─ index.ts              (NEW) Exports all types
│  │  ├─ norms.ts              (NEW) NormParams, ComputeResult
│  │  └─ forms.ts              (NEW) FormState, ValidationError
│  │
│  ├─ utils/                    ← Helper functions (pure)
│  │  ├─ format.ts             (NEW) Number formatting
│  │  ├─ math.ts               (NEW) Calculations
│  │  └─ validators.ts         (NEW) Validation helpers
│  │
│  └─ __tests__/               ← Test files (mirrored structure)
│     ├─ lib/
│     │  ├─ norms.test.ts
│     │  ├─ location.test.ts
│     │  ├─ schemas.test.ts
│     │  └─ agent/
│     │     └─ groq-client.test.ts
│     │
│     ├─ hooks/
│     │  ├─ useCalcNorm.test.ts
│     │  └─ useFormState.test.ts
│     │
│     └─ utils/
│        └─ format.test.ts
│
├─ app/                         ← Next.js App Router
│  ├─ api/
│  │  ├─ chat/route.ts          (REFACTORED - modular)
│  │  ├─ agent/
│  │  │  └─ suggest/route.ts    (REFACTORED - validated)
│  │  └─ generate-isometric/route.ts
│  │
│  ├─ calculators/
│  │  ├─ page.tsx               (CONVERTED to TypeScript)
│  │  ├─ fosa-septica/
│  │  │  └─ page.tsx
│  │  └─ imhoff/
│  │     └─ page.tsx            (NEW - ready to add)
│  │
│  ├─ chat/
│  │  └─ page.tsx               (CONVERTED to TypeScript)
│  │
│  ├─ layout.tsx                (CONVERTED to TypeScript)
│  ├─ page.tsx                  (CONVERTED to TypeScript)
│  └─ globals.css
│
├─ docs/
│  ├─ normativa/
│  │  ├─ cte-hs5.md
│  │  ├─ epa-onsite.md
│  │  └─ ras-2000.md
│  │
│  ├─ ARCHITECTURE.md           (NEW)
│  ├─ API.md                    (NEW)
│  └─ COMPONENTS.md             (NEW)
│
├─ public/
│  └─ favicon.ico
│
├─ .env.example                 (NEW)
├─ jest.config.js              (NEW)
├─ jest.setup.js               (NEW)
├─ tsconfig.json               (UPDATED)
├─ next.config.js
├─ package.json                (UPDATED with new scripts)
└─ README.md
```

---

## Cambios Específicos

### 1. CREAR: `src/lib/norms.ts`
**De:** Código inline en `components/SepticTankCalculator.jsx`  
**Para:** Centralizar parámetros normativos

```typescript
// src/lib/norms.ts
export interface NormParams { /* ... */ }
export function getParams(norm: string, temp: number) { /* ... */ }
export function computeNorm(...) { /* ... */ }
```

### 2. CREAR: `src/hooks/useCalcNorm.ts`
**De:** State management inline en SepticTankCalculator  
**Para:** Lógica reutilizable

```typescript
// src/hooks/useCalcNorm.ts
export function useCalcNorm(initialState?: FormState) { /* ... */ }
```

### 3. REFACTORIZAR: `components/SepticTank/`
**De:** `SepticTankCalculator.jsx` (1,102 LOC monolito)  
**Para:** 5 componentes especializados

```
SepticTank/
├─ SepticTankCalculator.tsx    ← Orchestrator (200 LOC)
├─ SepticForm.tsx              ← Form input (150 LOC)
├─ SepticResults.tsx           ← Output (100 LOC)
├─ SepticDiagrams.tsx          ← Diagrams wrapper (80 LOC)
└─ SepticExport.tsx            ← PDF export (80 LOC)
```

### 4. MOVER: `lib/i18n.js` → `src/lib/i18n.ts`
**Conversión:** JavaScript → TypeScript

```typescript
// src/lib/i18n.ts (was lib/i18n.js)
import { createContext, useContext, useState } from 'react';

export const LangProvider = ({ children }) => { /* ... */ };
export function useLang() { /* ... */ }
```

### 5. MOVER: `src/lib/agent/*` → `src/lib/agent/*` (sin cambios)
**Pero agregar:**
```typescript
// src/lib/agent/groq-client.ts (NEW)
// src/lib/agent/system-prompt.ts (NEW)
```

### 6. CREAR: `src/types/`
**Para:** Centralizar tipos TypeScript

```typescript
// src/types/norms.ts
export interface NormParams { /* ... */ }
export interface ComputeResult { /* ... */ }

// src/types/forms.ts
export interface FormState { /* ... */ }
export interface ValidationError { /* ... */ }
```

### 7. CREAR: `src/utils/`
**Para:** Funciones puras (sin estado)

```typescript
// src/utils/format.ts
export function formatNumber(value: number, decimals: number) { /* ... */ }

// src/utils/math.ts
export function calculateArea(volume: number, depth: number) { /* ... */ }
```

### 8. CREAR: `src/__tests__/`
**Para:** Pruebas unitarias

```
__tests__/
├─ lib/
│  ├─ norms.test.ts
│  └─ agent/groq-client.test.ts
├─ hooks/
│  └─ useCalcNorm.test.ts
└─ utils/
   └─ format.test.ts
```

### 9. CONVERTER: `.js` → `.ts` en `app/`

```bash
# Antes
app/page.js
app/layout.js
app/chat/page.js
app/calculators/page.js

# Después
app/page.tsx
app/layout.tsx
app/chat/page.tsx
app/calculators/page.tsx
```

### 10. CREAR: `.env.example`
**Para:** Documentar variables de entorno

```bash
# .env.example
GROQ_API_KEY=sk_live_xxxxx
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 11. CREAR: `jest.config.js` + `jest.setup.js`
**Para:** Testing infrastructure

```javascript
// jest.config.js
export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

---

## Plan de Migración Paso a Paso

### PASO 1: Preparar (30 min)
```bash
# 1. Crear carpeta src/ (si no existe)
mkdir -p src/{lib,hooks,components,types,utils,__tests__}

# 2. Copiar archivos a src/
cp lib/i18n.js src/lib/i18n.ts
cp -r src/lib/agent src/lib/
cp -r components src/
```

### PASO 2: Crear norms.ts (1 hora)
```bash
# src/lib/norms.ts ← copiado de SepticTankCalculator.jsx
# Limpiar, agregar tipos TypeScript
```

### PASO 3: Crear hooks (2 horas)
```bash
# src/hooks/useCalcNorm.ts
# src/hooks/useFormState.ts
# (basados en lógica de SepticTankCalculator)
```

### PASO 4: Refactorizar componentes (4 horas)
```bash
# Extractar de SepticTankCalculator.jsx:
src/components/SepticTank/SepticForm.tsx
src/components/SepticTank/SepticResults.tsx
src/components/SepticTank/SepticDiagrams.tsx
src/components/SepticTank/SepticExport.tsx
```

### PASO 5: Convertir a TypeScript (2 horas)
```bash
# Cambiar extensiones y agregar tipos
app/page.tsx
app/layout.tsx
app/chat/page.tsx
app/calculators/page.tsx
```

### PASO 6: Setup testing (1 hora)
```bash
npm install --save-dev jest @testing-library/react
# jest.config.js + jest.setup.js
```

### PASO 7: Agregar tests mínimos (3 horas)
```bash
src/__tests__/lib/norms.test.ts
src/__tests__/hooks/useCalcNorm.test.ts
```

**TOTAL:** ~13 horas (2 días intensivos o 1 semana sin rush)

---

## Verificación Post-Migración

```bash
# 1. ¿Corre la app?
npm run dev
# → Debe abrir http://localhost:3000 sin errores

# 2. ¿Calculadora funciona?
# → Navegar a /calculators/fosa-septica
# → Ingresar datos → calcular

# 3. ¿Tests pasan?
npm test
# → Todos los tests en src/__tests__/ deben pasar

# 4. ¿Build funciona?
npm run build
# → Sin errores de TypeScript

# 5. ¿Imports resuelven?
grep -r "from '@/lib" src/ app/
# → Todos deben apuntar a src/lib/
```

---

## Beneficios Inmediatos

✅ **Claridad:** Estructura única `src/` para toda la lógica  
✅ **Type Safety:** 100% TypeScript (no mezcla .js/.ts)  
✅ **Mantenibilidad:** Fácil encontrar code (norms.ts, hooks/, components/)  
✅ **Testing:** Estructura lista para tests (src/__tests__/)  
✅ **Escalabilidad:** Agregar nueva calculadora = copiar patrón SepticTank

---

## Checklist de Migración

```
FASE 1: ESTRUCTURA
□ Crear carpeta src/ con subdirectorios
□ Copiar lib/i18n.js → src/lib/i18n.ts
□ Verificar imports en app/ (usan @/lib, @/components)

FASE 2: UTILITIES
□ Crear src/lib/norms.ts (copy de SepticTankCalculator)
□ Crear src/types/index.ts (centralize types)
□ Crear src/utils/format.ts (helper functions)

FASE 3: HOOKS
□ Crear src/hooks/useCalcNorm.ts
□ Crear src/hooks/useFormState.ts
□ Test con: const { formState, result } = useCalcNorm()

FASE 4: COMPONENTES
□ Crear src/components/SepticTank/SepticForm.tsx
□ Crear src/components/SepticTank/SepticResults.tsx
□ Crear src/components/SepticTank/SepticDiagrams.tsx
□ Refactorizar SepticTankCalculator.tsx (200 LOC)

FASE 5: TYPESCRIPT
□ Convertir app/page.js → app/page.tsx
□ Convertir app/layout.js → app/layout.tsx
□ Convertir app/chat/page.js → app/chat/page.tsx
□ Agregar tipos a components/

FASE 6: TESTING
□ npm install jest @testing-library/react
□ Crear jest.config.js
□ Crear src/__tests__/lib/norms.test.ts
□ Crear src/__tests__/hooks/useCalcNorm.test.ts
□ npm test → ✅ pass

FASE 7: VALIDACIÓN
□ npm run dev → no errors
□ Navegar /calculators/fosa-septica → funciona
□ npm run build → success
□ npm test → all pass
```

---

## Resumen: Antes vs Después

| Aspecto | ANTES | DESPUÉS |
|---------|-------|---------|
| **Carpeta principal** | Mezcla (app, lib, src, components) | Unificada en `src/` |
| **Lenguaje** | Mezcla JS/JSX/TS | 100% TypeScript |
| **Lógica** | Monolito SepticTankCalculator | Distribuida (lib, hooks, utils) |
| **Estructura** | Ad-hoc | Estándar (src/{lib,hooks,components,types,utils,__tests__}) |
| **Tests** | ❌ 0 | ✅ Infraestructura lista |
| **Onboarding** | "¿Dónde está X?" | "Busca en src/" |

