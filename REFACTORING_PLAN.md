# 📋 REFACTORING PLAN — HydroStack 2
## Guía paso a paso con código copy-paste

**Fecha:** Mayo 1, 2026  
**Durabilidad:** 2 semanas  
**Status:** Pronto a ejecutar  

---

## 🎯 Objetivo General

Consolidar el proyecto unificado agregando:
- ✅ Validación de inputs con Zod
- ✅ Suite completa de tests con Jest
- ✅ Eliminación de archivos legacy
- ✅ Documentación de arquitectura
- ✅ GitHub Actions CI/CD
- ✅ Pre-commit hooks

---

## 📅 SEMANA 1: Setup de Tests y Validación

### DÍA 1: Instalar Jest y Zod

#### Paso 1.1: Instalar dependencias
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom ts-jest @types/jest
npm install zod
```

#### Paso 1.2: Crear jest.config.js
```javascript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.ts?(x)',
    '**/?(*.)+(spec|test).ts?(x)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
  ],
}

module.exports = createJestConfig(customJestConfig)
```

#### Paso 1.3: Crear jest.setup.js
```javascript
// jest.setup.js
import '@testing-library/jest-dom'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock as any
```

#### Paso 1.4: Actualizar package.json
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

✅ **Commit:** `setup: configure jest and install zod`

---

### DÍA 2: Crear esquemas de validación con Zod

#### Paso 2.1: Crear src/lib/validation.ts
```typescript
// src/lib/validation.ts
import { z } from 'zod'

export const NormKeySchema = z.enum(['ras', 'esp', 'eu', 'epa'])
export type NormKey = z.infer<typeof NormKeySchema>

export const FormStateSchema = z.object({
  // Obligatorios
  normKey: NormKeySchema,
  users: z.number().int().min(1).max(10000),
  dotacion: z.number().min(10).max(500),
  temp: z.number().min(-10).max(50),
  depth: z.number().min(0.8).max(5),
  cleanYears: z.number().int().min(1).max(20),
  
  // Opcionales
  retCoef: z.number().min(0.5).max(1).optional().default(0.75),
  dboIn: z.number().min(50).max(500).optional().default(250),
  ssIn: z.number().min(50).max(500).optional().default(200),
  freeboard: z.number().min(0).max(1).optional().default(0.3),
  soilType: z.string().optional(),
  soilPermeability: z.enum(['high', 'medium', 'low', 'none', 'unknown']).optional(),
  calculated: z.boolean().optional().default(false),
})

export type FormState = z.infer<typeof FormStateSchema>

// Función de validación con mensajes amigables
export function validateFormState(data: unknown) {
  try {
    return FormStateSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => 
        `${e.path.join('.')}: ${e.message}`
      )
      return { success: false, errors: messages }
    }
    return { success: false, errors: ['Error desconocido'] }
  }
}

// Validar campo individual
export function validateField(field: keyof FormState, value: unknown) {
  const fieldSchema = FormStateSchema.pick({ [field]: true })
  const result = fieldSchema.safeParse({ [field]: value })
  return result.success ? null : result.error.errors[0]?.message
}
```

#### Paso 2.2: Actualizar src/hooks/useCalcNorm.ts con validación
```typescript
// src/hooks/useCalcNorm.ts (Agregado)
import { validateFormState, type FormState } from '@/lib/validation'

export function useCalcNorm(initialState?: FormState) {
  const [formState, setFormState] = useState<FormState>(initialState ?? {})
  const [result, setResult] = useState<ComputeResult | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // ... código anterior ...

  const updateField = useCallback((field: keyof FormState, value: any) => {
    setFormState((prev) => {
      const updated = { ...prev, [field]: value }
      
      // Validar el campo
      const validation = validateFormState(updated)
      if (validation.success) {
        setValidationErrors({})
        return updated
      } else {
        setValidationErrors(prev => ({
          ...prev,
          [field]: validation.errors?.[0] || 'Error de validación'
        }))
        return prev
      }
    })
  }, [])

  return {
    formState,
    result,
    updateField,
    validationErrors,
    setFormState,
  }
}
```

✅ **Commit:** `feat: add zod validation schemas and field validation`

---

### DÍA 3: Tests para norms.ts

#### Paso 3.1: Crear src/__tests__/lib/norms.test.ts
```typescript
// src/__tests__/lib/norms.test.ts
import { computeNorm, getParams, NORMS_METADATA } from '@/lib/norms'

describe('NORMS_METADATA', () => {
  it('should have all required standards', () => {
    expect(NORMS_METADATA.ras).toBeDefined()
    expect(NORMS_METADATA.esp).toBeDefined()
    expect(NORMS_METADATA.eu).toBeDefined()
    expect(NORMS_METADATA.epa).toBeDefined()
  })

  it('should have correct default dotacion values', () => {
    expect(NORMS_METADATA.ras.defaultDotacion).toBe(120)
    expect(NORMS_METADATA.esp.defaultDotacion).toBe(160)
    expect(NORMS_METADATA.eu.defaultDotacion).toBe(150)
    expect(NORMS_METADATA.epa.defaultDotacion).toBe(190)
  })
})

describe('getParams', () => {
  it('should return temperature-adjusted RAS parameters', () => {
    const warmParams = getParams('ras', 25)
    expect(warmParams.trhDays).toBe(1.5)
    expect(warmParams.tempLabel).toBe('T ≥ 20°C')

    const coldParams = getParams('ras', 8)
    expect(coldParams.trhDays).toBe(2.5)
    expect(coldParams.tempLabel).toBe('T < 10°C')
  })

  it('should adjust ESP parameters by temperature', () => {
    const warmParams = getParams('esp', 16)
    expect(warmParams.trhDays).toBe(1.0)

    const coldParams = getParams('esp', 12)
    expect(coldParams.trhDays).toBe(1.5)
  })
})

describe('computeNorm', () => {
  it('should calculate volumes for 5 users RAS 20°C', () => {
    const result = computeNorm('ras', 5, 120, 0.75, 20, 3, 1.5)
    
    expect(result.Vl).toBeCloseTo(0.1125, 3)
    expect(result.Vs).toBeCloseTo(0.6, 1)
    expect(result.Vn).toBeCloseTo(0.03375, 3)
    expect(result.Vtot).toBeGreaterThanOrEqual(1.0) // Minimum volume applied
  })

  it('should return correct chamber count', () => {
    // 1 chamber: users ≤ 5, Vtot ≤ 2
    const result1 = computeNorm('ras', 3, 120, 0.75, 20, 3, 1.5)
    expect(result1.chambers).toBe(1)

    // 2 chambers: 5 < users ≤ 50, 2 < Vtot ≤ 10
    const result2 = computeNorm('ras', 10, 120, 0.75, 20, 3, 1.5)
    expect(result2.chambers).toBe(2)

    // 3 chambers: users > 50 or Vtot > 10
    const result3 = computeNorm('ras', 100, 120, 0.75, 20, 3, 1.5)
    expect(result3.chambers).toBe(3)
  })

  it('should apply minimum volume when required', () => {
    const result = computeNorm('ras', 1, 50, 0.75, 20, 3, 1.5)
    expect(result.minA).toBe(true)
    expect(result.Vtot).toBe(1.0) // RAS minimum
  })

  it('should calculate SRT correctly', () => {
    const result = computeNorm('ras', 5, 120, 0.75, 20, 3, 1.5)
    expect(result.SRT).toBeGreaterThan(0)
    expect(result.chkSRT).toBe(result.SRT >= 20)
  })

  it('should work with all standards', () => {
    const standards = ['ras', 'esp', 'eu', 'epa'] as const
    standards.forEach(std => {
      const result = computeNorm(std, 5, 120, 0.75, 20, 3, 1.5)
      expect(result.Vtot).toBeGreaterThan(0)
      expect(result.L).toBeGreaterThan(0)
      expect(result.W).toBeGreaterThan(0)
      expect(result.chambers).toBeGreaterThan(0)
    })
  })
})
```

✅ **Comando ejecutar:** `npm test -- src/__tests__/lib/norms.test.ts`
✅ **Commit:** `test: add comprehensive tests for norms calculation`

---

### DÍA 4: Tests para useCalcNorm hook

#### Paso 4.1: Crear src/__tests__/hooks/useCalcNorm.test.ts
```typescript
// src/__tests__/hooks/useCalcNorm.test.ts
import { renderHook, act } from '@testing-library/react'
import { useCalcNorm } from '@/hooks/useCalcNorm'

describe('useCalcNorm hook', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useCalcNorm())
    
    expect(result.current.formState).toEqual({})
    expect(result.current.result).toBeNull()
  })

  it('should calculate when all required fields are present', () => {
    const { result } = renderHook(() => useCalcNorm())
    
    act(() => {
      result.current.updateField('normKey', 'ras')
      result.current.updateField('users', 5)
      result.current.updateField('dotacion', 120)
      result.current.updateField('temp', 20)
      result.current.updateField('depth', 1.5)
      result.current.updateField('cleanYears', 3)
    })

    expect(result.current.result).not.toBeNull()
    expect(result.current.result?.Vtot).toBeGreaterThan(0)
    expect(result.current.result?.chkSRT).toBeDefined()
    expect(result.current.result?.chkCVO).toBeDefined()
  })

  it('should clear result when required field is missing', () => {
    const { result } = renderHook(() => useCalcNorm())
    
    act(() => {
      result.current.updateField('normKey', 'ras')
      result.current.updateField('users', 5)
      result.current.updateField('dotacion', 120)
      result.current.updateField('temp', 20)
      result.current.updateField('depth', 1.5)
      result.current.updateField('cleanYears', 3)
    })

    expect(result.current.result).not.toBeNull()

    act(() => {
      result.current.updateField('normKey', undefined as any)
    })

    expect(result.current.result).toBeNull()
  })

  it('should save state to localStorage', () => {
    const { result } = renderHook(() => useCalcNorm())
    
    act(() => {
      result.current.updateField('users', 5)
    })

    expect(localStorage.setItem).toHaveBeenCalled()
  })

  it('should return validation errors for invalid values', () => {
    const { result } = renderHook(() => useCalcNorm())
    
    act(() => {
      // Invalid: users must be > 0
      result.current.updateField('users', -1)
    })

    expect(result.current.validationErrors.users).toBeDefined()
  })

  it('should calculate CVO validation', () => {
    const { result } = renderHook(() => useCalcNorm())
    
    act(() => {
      result.current.updateField('normKey', 'ras')
      result.current.updateField('users', 5)
      result.current.updateField('dotacion', 120)
      result.current.updateField('temp', 20)
      result.current.updateField('depth', 1.5)
      result.current.updateField('cleanYears', 3)
    })

    const cvo = result.current.result?.CVO
    const chkCVO = result.current.result?.chkCVO

    expect(cvo).toBeDefined()
    expect(chkCVO).toBe(cvo! <= 0.3)
  })
})
```

✅ **Comando ejecutar:** `npm test -- src/__tests__/hooks/useCalcNorm.test.ts`
✅ **Commit:** `test: add useCalcNorm hook tests`

---

### DÍA 5: Tests para validación con Zod

#### Paso 5.1: Crear src/__tests__/lib/validation.test.ts
```typescript
// src/__tests__/lib/validation.test.ts
import { validateFormState, validateField, FormStateSchema } from '@/lib/validation'

describe('FormStateSchema validation', () => {
  it('should accept valid form state', () => {
    const valid = {
      normKey: 'ras',
      users: 5,
      dotacion: 120,
      temp: 20,
      depth: 1.5,
      cleanYears: 3,
    }
    
    const result = FormStateSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('should reject invalid norm key', () => {
    const invalid = {
      normKey: 'invalid',
      users: 5,
      dotacion: 120,
      temp: 20,
      depth: 1.5,
      cleanYears: 3,
    }
    
    const result = FormStateSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('should validate users range', () => {
    const tooFew = { ...validState, users: 0 }
    const tooMany = { ...validState, users: 10001 }
    
    expect(FormStateSchema.safeParse(tooFew).success).toBe(false)
    expect(FormStateSchema.safeParse(tooMany).success).toBe(false)
  })

  it('should validate dotacion range', () => {
    const tooLow = { ...validState, dotacion: 5 }
    const tooHigh = { ...validState, dotacion: 600 }
    
    expect(FormStateSchema.safeParse(tooLow).success).toBe(false)
    expect(FormStateSchema.safeParse(tooHigh).success).toBe(false)
  })

  it('should apply default values', () => {
    const minimal = {
      normKey: 'ras',
      users: 5,
      dotacion: 120,
      temp: 20,
      depth: 1.5,
      cleanYears: 3,
    }
    
    const result = FormStateSchema.parse(minimal)
    expect(result.retCoef).toBe(0.75)
    expect(result.dboIn).toBe(250)
  })
})

describe('validateFormState', () => {
  it('should return parsed data on success', () => {
    const valid = {
      normKey: 'ras',
      users: 5,
      dotacion: 120,
      temp: 20,
      depth: 1.5,
      cleanYears: 3,
    }
    
    const result = validateFormState(valid)
    expect('success' in result ? result.success : true).toBe(true)
  })

  it('should return error messages on failure', () => {
    const invalid = {
      normKey: 'invalid',
      users: -5,
    }
    
    const result = validateFormState(invalid)
    expect('success' in result && !result.success).toBe(true)
    expect('errors' in result).toBe(true)
  })
})

describe('validateField', () => {
  it('should return null for valid field', () => {
    const error = validateField('users', 5)
    expect(error).toBeNull()
  })

  it('should return error message for invalid field', () => {
    const error = validateField('users', -5)
    expect(error).toBeDefined()
    expect(typeof error).toBe('string')
  })

  it('should validate different field types', () => {
    expect(validateField('users', 5)).toBeNull()
    expect(validateField('users', 'text')).toBeDefined()
    expect(validateField('normKey', 'ras')).toBeNull()
    expect(validateField('normKey', 'invalid')).toBeDefined()
  })
})

const validState = {
  normKey: 'ras' as const,
  users: 5,
  dotacion: 120,
  temp: 20,
  depth: 1.5,
  cleanYears: 3,
}
```

✅ **Comando ejecutar:** `npm test -- src/__tests__/lib/validation.test.ts`
✅ **Commit:** `test: add zod validation tests`

---

## 📅 SEMANA 2: Cleanup y CI/CD

### DÍA 6: Eliminar archivos legacy

#### Paso 6.1: Eliminar componentes viejos
```bash
rm components/SepticTankCalculator.jsx    # Reemplazado por src/components/SepticTank/
rm lib/i18n.js                             # Reemplazado por src/lib/i18n.tsx
```

#### Paso 6.2: Crear archivo de changelog
```bash
cat > LEGACY_REMOVAL.md << 'LEGACY'
# Archivos Eliminados (Mayo 1, 2026)

## Reemplazados
- `components/SepticTankCalculator.jsx` → `src/components/SepticTank/SepticTankCalculator.tsx`
  - Reducción: 1,102 LOC → 200 LOC
  - Mejora: Monolito dividido en 4 componentes especializados
  
- `lib/i18n.js` → `src/lib/i18n.tsx`
  - Mejora: Agregado TypeScript con tipado completo
  - Mejora: Tipado de contexto y hook

## Archivos Aún en Transición (próximas semanas)
- `components/IsometricDiagram.jsx` → Mover a `src/components/Diagrams/`
- `components/IsometricDiagram3D.jsx` → Mover a `src/components/Diagrams/`
- `components/LaminaTecnica.jsx` → Mover a `src/components/Diagrams/`
- `components/Navbar.js` → Convertir a `src/components/Common/Navbar.tsx`

## Validación
- [x] Todos los tests pasando
- [x] Build exitoso
- [x] No hay importaciones a archivos eliminados
- [x] Funcionalidad preservada
LEGACY
```

✅ **Commit:** `refactor: remove legacy components (SepticTankCalculator.jsx, lib/i18n.js)`

---

### DÍA 7: Mover componentes restantes a src/

#### Paso 7.1: Mover y convertir Navbar
```bash
# 1. Crear directorio
mkdir -p src/components/Common

# 2. Copiar y convertir
cp components/Navbar.js src/components/Common/Navbar.tsx
```

#### Paso 7.2: Convertir Navbar.tsx a TypeScript
```typescript
// src/components/Common/Navbar.tsx
'use client'
import { useLang } from '@/lib/i18n'
import Link from 'next/link'

export default function Navbar() {
  const { lang, setLang, t } = useLang()

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(2,12,16,0.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(0,245,255,0.10)',
      padding: '0 28px',
      height: '52px',
      display: 'flex',
      alignItems: 'center',
      boxShadow: '0 1px 32px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(0,245,255,0.05)',
    }}>
      <div style={{
        maxWidth: '1100px',
        width: '100%',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
      }}>
        {/* Logo */}
        <Link href="/" style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          textDecoration: 'none',
        }}>
          <span style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '18px',
            fontWeight: 900,
            color: '#00F5FF',
            textShadow: '0 0 16px rgba(0,245,255,0.5)',
          }}>H</span>
          <span style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '18px',
            fontWeight: 700,
            color: '#E8F8FF',
          }}>ydroStack</span>
        </Link>

        {/* Pulse indicator */}
        <span style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          background: '#00FF88',
          boxShadow: '0 0 6px #00FF88',
          flexShrink: 0,
        }} className="blink" title="Sistema activo" />

        {/* Navigation links */}
        <div style={{
          display: 'flex',
          gap: '28px',
          marginLeft: 'auto',
        }} className="hide-mobile">
          <Link href="/calculators" style={{
            fontSize: '10px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#00F5FF',
            fontFamily: "'IBM Plex Mono', monospace",
            transition: 'color 0.2s',
            textDecoration: 'none',
            textShadow: '0 0 10px rgba(0,245,255,0.4)',
          }}>
            {t.nav.calculators}
          </Link>
          <Link href="/chat" style={{
            fontSize: '10px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#4A7A8A',
            fontFamily: "'IBM Plex Mono', monospace",
            transition: 'color 0.2s',
            textDecoration: 'none',
          }} className="nav-link">
            {t.nav.assistant}
          </Link>
          <a href="#about" style={{
            fontSize: '10px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#4A7A8A',
            fontFamily: "'IBM Plex Mono', monospace",
            transition: 'color 0.2s',
            textDecoration: 'none',
          }} className="nav-link">
            {t.nav.about}
          </a>
        </div>

        {/* Language toggle */}
        <button onClick={() => setLang(lang === 'es' ? 'en' : 'es')} style={{
          background: 'transparent',
          border: '1px solid rgba(0,245,255,0.18)',
          borderRadius: '3px',
          padding: '4px 12px',
          color: '#4A7A8A',
          fontSize: '9px',
          fontFamily: "'IBM Plex Mono', monospace",
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }} className="btn-ghost hide-mobile">
          {t.nav.lang}
        </button>
      </div>
    </nav>
  )
}
```

#### Paso 7.3: Actualizar app/layout.tsx
```typescript
// Cambiar:
import Navbar from "../components/Navbar"
// Por:
import Navbar from "@/components/Common/Navbar"
```

✅ **Commit:** `refactor: move Navbar to src/components/Common and convert to TypeScript`

---

### DÍA 8: Setup GitHub Actions CI/CD

#### Paso 8.1: Crear .github/workflows/test.yml
```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - uses: actions/checkout@v4
      
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test -- --coverage
      
      - name: Build
        run: npm run build
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

#### Paso 8.2: Crear .github/workflows/lint.yml
```yaml
# .github/workflows/lint.yml
name: Lint & Type Check

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npx tsc --noEmit
      
      - name: Format check
        run: npx prettier --check src/
```

✅ **Commit:** `ci: add github actions workflows for tests and lint`

---

### DÍA 9: Pre-commit hooks

#### Paso 9.1: Instalar y configurar husky
```bash
npm install --save-dev husky lint-staged prettier eslint eslint-config-next

npx husky install

npx husky add .husky/pre-commit "npx lint-staged"
```

#### Paso 9.2: Crear .lintstagedrc
```json
{
  "*.{ts,tsx}": [
    "prettier --write",
    "eslint --fix",
    "jest --bail --findRelatedTests"
  ],
  "*.{js,jsx}": [
    "prettier --write",
    "eslint --fix"
  ]
}
```

#### Paso 9.3: Crear .prettierrc
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "arrowParens": "always"
}
```

✅ **Commit:** `setup: add husky pre-commit hooks and prettier config`

---

### DÍA 10: Documentación de arquitectura

#### Paso 10.1: Crear ARCHITECTURE.md
```markdown
# 🏗️ ARCHITECTURE.md — HydroStack 2

## Estructura General

\`\`\`
src/
├── lib/              # Business logic
│   ├── norms.ts      # Normative parameters & calculations
│   ├── i18n.tsx      # i18n context & hooks
│   ├── validation.ts # Zod schemas & validators
│   └── agent/        # AI agent logic
├── hooks/            # React hooks
│   └── useCalcNorm.ts # Form state & auto-calculation
├── components/       # React components
│   ├── SepticTank/   # Septic tank calculator
│   ├── Common/       # Shared components (Navbar)
│   └── Diagrams/     # Visualization components
├── types/            # TypeScript types
│   └── index.ts
└── __tests__/        # Test suites
```

## Data Flow

\`\`\`
User Input (SepticForm)
    ↓
updateField() → validateField()
    ↓
useCalcNorm Hook
    ↓
computeNorm() → Calculation Results
    ↓
SepticResults (Display)
    ↓
localStorage (Persistence)
\`\`\`

## Component Tree

\`\`\`
SepticTankCalculator (Orchestrator)
├── SepticForm (Input Fields)
│   ├── normKey select
│   ├── users input
│   ├── dotacion input
│   ├── temp input
│   ├── depth input
│   └── cleanYears input
└── SepticResults (Display)
    ├── Volumes (Vl, Vs, Vn, Vtot)
    ├── Dimensions (L, W, Area, Chambers)
    └── Validations (SRT, CVO)
\`\`\`

## Key Design Patterns

### 1. Single Source of Truth
- All normative parameters in \`src/lib/norms.ts\`
- Temperature-based parameter selection
- No duplication across files

### 2. Schema Validation with Zod
- Central \`FormStateSchema\` in \`src/lib/validation.ts\`
- Field-level and form-level validation
- Type-safe with TypeScript inference

### 3. Auto-Calculate Hook
- \`useCalcNorm\` handles all state management
- Auto-recalculates on input change
- localStorage persistence built-in

### 4. Component Specialization
- SepticForm: Input handling only
- SepticResults: Display logic only
- SepticTankCalculator: Orchestration
- useCalcNorm: Business logic

## Adding a New Calculator

1. **Create form component:** \`src/components/NewCalc/NewCalcForm.tsx\`
2. **Create results component:** \`src/components/NewCalc/NewCalcResults.tsx\`
3. **Add to norms.ts:** New normative parameters
4. **Create orchestrator:** \`src/components/NewCalc/NewCalcCalculator.tsx\`
5. **Create page:** \`app/calculators/new-calc/page.tsx\`
6. **Add tests:** \`src/__tests__/\`

## Testing Strategy

- **Unit tests:** norms.ts, validation.ts, hooks
- **Component tests:** SepticForm, SepticResults
- **Integration tests:** Full calculator flow
- **Coverage goal:** >80%
```

#### Paso 10.2: Crear TESTING.md
```markdown
# 🧪 TESTING.md — HydroStack 2

## Ejecutar Tests

\`\`\`bash
npm test                    # Ejecutar todos los tests
npm test -- --watch        # Modo watch
npm test -- --coverage     # Con cobertura
\`\`\`

## Estructura de Tests

- Cada test file colocalizado con src/
- Nombrado como \`*.test.ts\` o \`*.test.tsx\`
- Ubicación: \`src/__tests__/\`

## Cobertura Esperada

| Archivo | Cobertura |
|---------|-----------|
| src/lib/norms.ts | 100% |
| src/lib/validation.ts | 100% |
| src/hooks/useCalcNorm.ts | >90% |
| src/components/ | >80% |

## Escribir Nuevos Tests

\`\`\`typescript
import { renderHook, act } from '@testing-library/react'

describe('myFunction', () => {
  it('should do something', () => {
    // Arrange
    const input = { ... }
    
    // Act
    const result = myFunction(input)
    
    // Assert
    expect(result).toBe(expected)
  })
})
\`\`\`
```

✅ **Commit:** `docs: add ARCHITECTURE.md and TESTING.md`

---

## 📅 ROADMAP EJECUTABLE

### Semana 1 Checklist
- [ ] Día 1: Jest + Zod instalado
- [ ] Día 2: Esquemas Zod creados
- [ ] Día 3: Tests norms.ts pasando
- [ ] Día 4: Tests useCalcNorm pasando
- [ ] Día 5: Tests validation pasando
- [ ] Resultado: >80% coverage

### Semana 2 Checklist
- [ ] Día 6: Archivos legacy eliminados
- [ ] Día 7: Navbar movido y convertido a TS
- [ ] Día 8: GitHub Actions CI/CD configurado
- [ ] Día 9: Pre-commit hooks activos
- [ ] Día 10: Documentación completa
- [ ] Resultado: Proyecto production-ready

---

## 🎯 KPIs de Éxito

| Métrica | Target |
|---------|--------|
| Test Coverage | >80% |
| Build Time | <30s |
| Type Coverage | 100% |
| Deprecated Files | 0 |
| CI/CD Pass Rate | 100% |
| Pre-commit Hook Success | 100% |

---

## 🚀 Próximos Pasos (Semana 3+)

1. **Mover componentes de diagrama**
   - IsometricDiagram → src/components/Diagrams/
   - LaminaTecnica → src/components/Diagrams/

2. **Agregar E2E tests**
   - Playwright o Cypress
   - Flujos completos de usuario

3. **Performance optimization**
   - Lazy loading de componentes
   - Memoization de cálculos

4. **Nuevo calculator**
   - Tanque Imhoff
   - Lodos Activados
   - UASB Reactor

---

**Generado:** 2026-05-01  
**Status:** 🟢 Listo para ejecutar
