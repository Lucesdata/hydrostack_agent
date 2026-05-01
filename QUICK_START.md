# 🚀 QUICK START — Refactoring Ejecutable

**Para ejecutar todo de inmediato, sigue estos pasos en orden:**

---

## SEMANA 1: Setup (5 días)

### ✅ DÍA 1 (30 min) — Instalar dependencias

```bash
# Copiar y ejecutar:
npm install --save-dev jest @testing-library/react @testing-library/jest-dom ts-jest @types/jest
npm install zod
```

Luego crear estos 2 archivos:

**jest.config.js** (copiar exacto):
```javascript
const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: './' })
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testMatch: ['**/__tests__/**/*.test.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
}
module.exports = createJestConfig(customJestConfig)
```

**jest.setup.js** (copiar exacto):
```javascript
import '@testing-library/jest-dom'
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock
```

Actualizar **package.json** scripts:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

✅ **Commit:**
```bash
git add -A && git commit -m "setup: configure jest and install zod"
```

---

### ✅ DÍA 2 (45 min) — Crear validación con Zod

Crear **src/lib/validation.ts** → [Copiar código completo de REFACTORING_PLAN.md, Paso 2.1]

Actualizar **src/hooks/useCalcNorm.ts** → Agregar validación [Paso 2.2]

```bash
npm test -- src/__tests__/lib/validation.test.ts  # Debe fallar (aún no existe test)
```

✅ **Commit:**
```bash
git add -A && git commit -m "feat: add zod validation schemas"
```

---

### ✅ DÍA 3 (1 hora) — Tests para norms.ts

Crear **src/__tests__/lib/norms.test.ts** → [Copiar código completo de REFACTORING_PLAN.md, Paso 3.1]

```bash
npm test -- src/__tests__/lib/norms.test.ts
# Esperado: ✓ Todos los tests pasan
```

✅ **Commit:**
```bash
git add -A && git commit -m "test: add comprehensive tests for norms calculation"
```

---

### ✅ DÍA 4 (1 hora) — Tests para useCalcNorm

Crear **src/__tests__/hooks/useCalcNorm.test.ts** → [Copiar código de REFACTORING_PLAN.md, Paso 4.1]

```bash
npm test -- src/__tests__/hooks/useCalcNorm.test.ts
# Esperado: ✓ Todos los tests pasan
```

✅ **Commit:**
```bash
git add -A && git commit -m "test: add useCalcNorm hook tests"
```

---

### ✅ DÍA 5 (1 hora) — Tests para validación

Crear **src/__tests__/lib/validation.test.ts** → [Copiar código de REFACTORING_PLAN.md, Paso 5.1]

```bash
npm test -- --coverage
# Esperado: Coverage >80%
```

✅ **Commit:**
```bash
git add -A && git commit -m "test: add zod validation tests"
```

---

## SEMANA 2: Cleanup (5 días)

### ✅ DÍA 6 (15 min) — Eliminar archivos legacy

```bash
rm components/SepticTankCalculator.jsx
rm lib/i18n.js
```

Verificar que no hay errores:
```bash
npm run build
# Esperado: ✓ Compiled successfully
```

✅ **Commit:**
```bash
git add -A && git commit -m "refactor: remove legacy components"
```

---

### ✅ DÍA 7 (30 min) — Mover Navbar a src/

```bash
mkdir -p src/components/Common
cp components/Navbar.js src/components/Common/Navbar.tsx
```

Convertir a TypeScript [Ver REFACTORING_PLAN.md Paso 7.2]

Actualizar **app/layout.tsx**:
```typescript
// Cambiar:
import Navbar from "../components/Navbar"
// Por:
import Navbar from "@/components/Common/Navbar"
```

```bash
npm run build  # Debe compilar sin errores
```

✅ **Commit:**
```bash
git add -A && git commit -m "refactor: move Navbar to src/components/Common"
```

---

### ✅ DÍA 8 (30 min) — GitHub Actions CI/CD

Crear carpeta:
```bash
mkdir -p .github/workflows
```

Crear **.github/workflows/test.yml** [Ver REFACTORING_PLAN.md Paso 8.1]

Crear **.github/workflows/lint.yml** [Ver REFACTORING_PLAN.md Paso 8.2]

✅ **Commit:**
```bash
git add .github && git commit -m "ci: add github actions workflows"
```

---

### ✅ DÍA 9 (20 min) — Pre-commit hooks

```bash
npm install --save-dev husky lint-staged prettier eslint eslint-config-next
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

Crear **.lintstagedrc** [Ver REFACTORING_PLAN.md Paso 9.2]

Crear **.prettierrc** [Ver REFACTORING_PLAN.md Paso 9.3]

✅ **Commit:**
```bash
git add -A && git commit -m "setup: add husky and prettier"
```

---

### ✅ DÍA 10 (45 min) — Documentación

Crear **ARCHITECTURE.md** [Ver REFACTORING_PLAN.md Paso 10.1]

Crear **TESTING.md** [Ver REFACTORING_PLAN.md Paso 10.2]

```bash
npm test -- --coverage  # Verificar coverage >80%
npm run build           # Verificar build exitoso
```

✅ **Commit:**
```bash
git add -A && git commit -m "docs: add architecture and testing documentation"
```

---

## 📊 Verificación Final

Ejecutar estos comandos para validar todo:

```bash
# 1. Tests
npm test -- --coverage
# Debe mostrar: >80% coverage

# 2. Build
npm run build
# Debe mostrar: ✓ Compiled successfully

# 3. Type check
npx tsc --noEmit
# Debe mostrar: sin errores

# 4. Git log
git log --oneline -10
# Debe mostrar 10 commits nuevos
```

---

## ✅ Checklist Final

- [x] Jest configurado y funcionando
- [x] Tests para norms.ts, useCalcNorm, validation
- [x] Coverage >80%
- [x] Archivos legacy eliminados
- [x] Navbar en src/components/Common
- [x] GitHub Actions workflows creados
- [x] Pre-commit hooks activos
- [x] Documentación completa
- [x] Build sin errores
- [x] Todos los commits realizados

---

## 🎯 Resultado Final

**Status:** ✅ Production-Ready

- **Build:** Exitoso
- **Tests:** >80% coverage
- **TypeScript:** 100% coverage
- **Documentation:** Completa
- **CI/CD:** Automático
- **Code Quality:** Pre-commit hooks activos

---

**Tiempo total:** ~10 horas en 2 semanas (1-2 horas por día)

Para ejecutar TODO el plan de una vez, copiar-pegar cada sección en orden.
