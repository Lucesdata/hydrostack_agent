# HydroStack 2 — Testing Guidelines

## 📋 Overview

HydroStack 2 uses Jest + React Testing Library for comprehensive test coverage. Our goal is >80% coverage for utility functions and >70% for React components.

**Current Status:**
- Total Tests: 56
- Total Coverage: 88.3%
- Passing: ✓ All 56 tests pass

## 🧪 Test Organization

```
src/__tests__/
├── lib/
│   ├── norms.test.ts              # 16 tests — 100% coverage
│   ├── validation.test.ts         # 30 tests — 86.95% coverage
│   └── (future) agent.test.ts
│
├── hooks/
│   └── useCalcNorm.test.ts        # 10 tests — 78% coverage
│
└── components/                     # (in progress)
    └── SepticTank/
```

## 🏃 Running Tests

### Run All Tests
```bash
npm test
```

### Watch Mode (Reruns on file change)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

Output location: `coverage/`

### Run Specific Test File
```bash
npm test -- norms.test.ts
npm test -- hooks/useCalcNorm.test.ts
```

### Run Tests Matching Pattern
```bash
npm test -- --testNamePattern="computeNorm"
npm test -- --testNamePattern="validation"
```

## 📊 Coverage Goals

| Module | Type | Target | Current | Status |
|--------|------|--------|---------|--------|
| `src/lib/norms.ts` | Utility | 100% | 100% | ✓ |
| `src/lib/validation.ts` | Utility | >85% | 86.95% | ✓ |
| `src/hooks/useCalcNorm.ts` | Hook | >75% | 78% | ✓ |
| Components | UI | >60% | TBD | 🟡 |
| **Overall** | **Mixed** | **>80%** | **88.3%** | **✓** |

## 🧩 Test Structure

### 1. Utility Tests (`src/lib/`)

**Purpose:** Test pure functions with multiple inputs/outputs

**Pattern:**
```typescript
describe('functionName', () => {
  it('should do X when Y', () => {
    const input = { /* ... */ }
    const result = functionUnderTest(input)
    expect(result).toEqual(expected)
  })
})
```

**Example:** `norms.test.ts`
```typescript
describe('computeNorm', () => {
  it('should calculate volume correctly for RAS norm', () => {
    const result = computeNorm('ras', 100, 150, 0.75, 20, 5, 1.5)
    expect(result.Vtot).toBe(expectedValue)
    expect(result.SRT).toBeGreaterThanOrEqual(20)
  })
})
```

### 2. Hook Tests (`src/hooks/`)

**Purpose:** Test React state, effects, and callbacks

**Pattern:**
```typescript
import { renderHook, act } from '@testing-library/react'

describe('useCalcNorm', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useCalcNorm())
    expect(result.current.formState).toEqual({})
  })

  it('should update field and recalculate', () => {
    const { result } = renderHook(() => useCalcNorm())
    act(() => {
      result.current.updateField('normKey', 'ras')
    })
    expect(result.current.formState.normKey).toBe('ras')
  })
})
```

### 3. Component Tests (`src/components/`)

**Purpose:** Test UI rendering and interactions

**Pattern:**
```typescript
import { render, screen } from '@testing-library/react'

describe('SepticResults', () => {
  it('should display no data message when result is null', () => {
    render(<SepticResults result={null} />)
    expect(screen.getByText(/completa todos los/i)).toBeInTheDocument()
  })

  it('should display volume when result exists', () => {
    const mockResult = { Vtot: 5.25, /* ... */ }
    render(<SepticResults result={mockResult} />)
    expect(screen.getByText('5.25')).toBeInTheDocument()
  })
})
```

## 🔍 What to Test

### ✅ Always Test

1. **Valid Inputs** — Normal use cases
   ```typescript
   it('should calculate correctly with valid inputs', () => {
     const result = computeNorm('ras', 50, 150, ...)
     expect(result.Vtot).toBeDefined()
   })
   ```

2. **Edge Cases** — Boundary values
   ```typescript
   it('should handle minimum user count', () => {
     const result = computeNorm('ras', 1, 150, ...)  // users = 1 (minimum)
     expect(result.Vtot).toBeGreaterThan(0)
   })

   it('should handle maximum depth', () => {
     const result = computeNorm('ras', 100, 150, ..., 5)  // depth = 5 (max)
     expect(result.Vtot).toBeDefined()
   })
   ```

3. **Invalid Inputs** — Validation errors
   ```typescript
   it('should return error for invalid norm key', () => {
     const validation = validateFormState({ normKey: 'invalid' })
     expect(validation.success).toBe(false)
   })
   ```

4. **State Changes** — Updates and side effects
   ```typescript
   it('should persist state to localStorage', () => {
     const { result } = renderHook(() => useCalcNorm())
     act(() => {
       result.current.updateField('normKey', 'esp')
     })
     expect(localStorage.getItem('hydrostack_formstate')).toContain('esp')
   })
   ```

### ❌ Don't Test

1. **Third-party libraries** (React, Next.js internals)
2. **Implementation details** (unless they're part of contract)
3. **Constants/enums** (unless they affect calculations)
4. **Comments and documentation**

## 📝 Writing Tests

### Test File Template

```typescript
import { functionToTest } from '@/lib/module'
import { validateFormState } from '@/lib/validation'

describe('functionToTest', () => {
  describe('with valid inputs', () => {
    it('should return expected result', () => {
      const input = { /* test data */ }
      const expected = { /* expected output */ }
      expect(functionToTest(input)).toEqual(expected)
    })
  })

  describe('with edge cases', () => {
    it('should handle minimum value', () => {
      expect(functionToTest(1)).toBeDefined()
    })

    it('should handle maximum value', () => {
      expect(functionToTest(10000)).toBeDefined()
    })
  })

  describe('with invalid inputs', () => {
    it('should throw or return error', () => {
      expect(() => functionToTest(null)).toThrow()
    })
  })
})
```

### Best Practices

1. **Descriptive Names**
   ```typescript
   ✓ Good
   it('should calculate correct volume for RAS norm with 100 users')
   
   ✗ Bad
   it('test volume')
   ```

2. **Arrange-Act-Assert Pattern**
   ```typescript
   it('should update field', () => {
     // Arrange
     const { result } = renderHook(() => useCalcNorm())
     
     // Act
     act(() => {
       result.current.updateField('normKey', 'ras')
     })
     
     // Assert
     expect(result.current.formState.normKey).toBe('ras')
   })
   ```

3. **Test One Thing Per Test**
   ```typescript
   ✓ Good
   it('should validate normKey field')
   it('should validate users field')
   
   ✗ Bad
   it('should validate all fields')
   ```

4. **Use `beforeEach` for Setup**
   ```typescript
   describe('useCalcNorm', () => {
     let mockLocalStorage: Record<string, string>

     beforeEach(() => {
       mockLocalStorage = {}
       Storage.prototype.getItem = jest.fn(
         (key) => mockLocalStorage[key] || null
       )
     })
   })
   ```

## 🔧 Jest Configuration

### jest.config.js

```javascript
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
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/.next/'],
}

module.exports = createJestConfig(customJestConfig)
```

### jest.setup.js

```javascript
import '@testing-library/jest-dom'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock
```

## 🚨 Common Issues

### 1. "Cannot find module '@/lib/norms'"
**Solution:** Ensure `jest.config.js` has correct `moduleNameMapper`

### 2. "localStorage is not defined"
**Solution:** Mock is in `jest.setup.js` — verify it's listed in `setupFilesAfterEnv`

### 3. "Error: Not wrapped in act(...)"
**Solution:** Wrap state updates with `act()`:
```typescript
import { act } from '@testing-library/react'

act(() => {
  result.current.updateField('field', 'value')
})
```

### 4. Hook not found in renderHook
**Solution:** Import from `@testing-library/react`:
```typescript
import { renderHook } from '@testing-library/react'
```

## 📈 Coverage Reports

### View HTML Report

```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

### Minimum Coverage Enforcement

Configure in `jest.config.js`:
```javascript
coverageThresholds: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
}
```

## 🔄 Pre-Commit Testing

Husky + lint-staged runs tests on changed files:

```bash
# Before committing, this runs automatically:
npm test -- --testPathPattern=src --bail --findRelatedTests
```

To skip (not recommended):
```bash
git commit --no-verify
```

## 📚 Resources

- **Jest Docs:** https://jestjs.io
- **Testing Library:** https://testing-library.com
- **React Testing Best Practices:** https://kentcdodds.com/blog/common-mistakes-with-react-testing-library
- **Zod Testing:** https://zod.dev/docs/testing

## ✅ Testing Checklist

Before committing:
- [ ] All tests pass: `npm test`
- [ ] Coverage >80%: `npm run test:coverage`
- [ ] No console errors
- [ ] No skipped tests (`xit`, `xdescribe`)

Before opening PR:
- [ ] New features have tests
- [ ] All existing tests pass
- [ ] Coverage hasn't decreased
- [ ] Code formatted: `npx prettier --check .`

---

**Last Updated:** 2026-05-01  
**Jest Version:** 30.3.0  
**Testing Library Version:** 16.3.2
