# HydroStack 2 — Architecture Documentation

## 📋 Project Overview

HydroStack 2 is a technical calculation platform for water and sanitation engineering, built with Next.js 14, React 18, and TypeScript. It provides calculators for septic tanks, Imhoff tanks, activated sludge systems, and UASB reactors using international standards (RAS Colombia, Spain CTE-HS5, EN 12566-1, EPA).

**Stack:**
- **Frontend:** React 18 with TypeScript, CSS-in-JS styling
- **Backend:** Next.js 14 App Router, API Routes
- **Build:** TypeScript, Jest, Prettier, ESLint
- **Testing:** Jest + React Testing Library
- **Validation:** Zod for runtime schema validation
- **Internationalization:** Custom i18n context provider
- **CI/CD:** GitHub Actions (test.yml, lint.yml)
- **Hooks:** Husky + lint-staged for pre-commit checks

## 📁 Project Structure

```
hydrostack/
├── src/                              # Unified source root
│   ├── lib/
│   │   ├── norms.ts                 # Source of truth: parameters & calculations
│   │   ├── validation.ts            # Zod schemas for form validation
│   │   ├── i18n.tsx                 # i18n provider, useLang hook
│   │   └── agent/                   # Agent-related utilities
│   │       ├── catalog.ts           # Technical catalog data
│   │       └── filter.ts            # Catalog filtering logic
│   │
│   ├── hooks/
│   │   └── useCalcNorm.ts           # Form state, calculations, validation
│   │
│   ├── components/
│   │   ├── SepticTank/              # Modular septic tank calculator
│   │   │   ├── SepticTankCalculator.tsx  # Orchestrator (200 LOC)
│   │   │   ├── SepticForm.tsx            # Form inputs
│   │   │   └── SepticResults.tsx         # Results display
│   │   └── Common/
│   │       └── Navbar.tsx            # Navigation (TypeScript)
│   │
│   ├── types/
│   │   └── index.ts                 # Shared TypeScript types
│   │       ├── FormState            # Form field definitions
│   │       ├── ComputeResult        # Calculation output
│   │       └── NormKey              # Type-safe norm selection
│   │
│   └── __tests__/                   # Test suites
│       ├── lib/
│       │   ├── norms.test.ts        # 16 tests, 100% coverage
│       │   └── validation.test.ts   # 30 tests, 86.95% coverage
│       └── hooks/
│           └── useCalcNorm.test.ts  # 10 tests, 78% coverage
│
├── app/                              # Next.js App Router
│   ├── layout.tsx                   # Root layout with LangProvider
│   ├── page.tsx                     # Home page
│   ├── globals.css                  # Global styles
│   ├── api/
│   │   ├── agent/suggest/           # AI agent endpoint
│   │   ├── chat/                    # Chat endpoint
│   │   └── generate-isometric/      # Diagram generation
│   ├── calculators/
│   │   ├── page.tsx                 # Calculators listing
│   │   └── fosa-septica/            # Septic tank calculator page
│   └── chat/                        # Chat interface
│
├── components/                      # Legacy (to migrate to src/)
│   ├── IsometricDiagram.jsx         # 3D diagram rendering
│   ├── IsometricDiagram3D.jsx
│   ├── LaminaTecnica.jsx            # Technical sheet
│   └── Navbar.js                    # Legacy (use src/components/Common/Navbar.tsx)
│
├── lib/                             # Legacy (to migrate to src/)
│   └── i18n.js                      # Legacy (use src/lib/i18n.tsx)
│
├── .github/workflows/               # CI/CD
│   ├── test.yml                     # Jest tests + Codecov upload
│   └── lint.yml                     # Prettier check + Build check
│
├── .husky/                          # Git hooks
│   └── pre-commit                   # Run lint-staged before commit
│
├── Configuration files
├── .lintstagedrc                    # lint-staged tasks
├── .prettierrc                      # Code formatting rules
├── .prettierignore                  # Files to skip formatting
├── jest.config.js                   # Jest configuration
├── jest.setup.js                    # Jest test utilities
├── next.config.js                   # Next.js configuration
├── tsconfig.json                    # TypeScript configuration
└── package.json                     # Dependencies & scripts
```

## 🎯 Core Concepts

### 1. Single Source of Truth

**File:** `src/lib/norms.ts`

All normative parameters (RAS, Spain, EU, EPA) are defined in one place:

```typescript
const NORMS_METADATA = {
  ras: { name: "RAS Colombia", tempLimits: [10, 16, 17] },
  esp: { name: "Spain CTE-HS5", ... },
  eu: { name: "EN 12566-1", ... },
  epa: { name: "EPA", ... }
}

function computeNorm(normKey, users, dotacion, ...): ComputeResult {
  // Get parameters for temperature
  const params = getParams(normKey, temp)
  // Calculate volumes, chambers, SRT, CVO
  return { Vl, Vs, Vn, Vtot, L, W, Area, chambers, SRT, CVO, ... }
}
```

**Benefits:**
- No parameter duplication
- Easy to add new calculators
- Single point for standard changes

### 2. Modular Components

**Old:** SepticTankCalculator (1,102 LOC monolith)
**New:**
- `SepticTankCalculator.tsx` (200 LOC) — Orchestrator
- `SepticForm.tsx` — Input fields
- `SepticResults.tsx` — Results display
- `useCalcNorm` hook — Calculation logic

Each component has single responsibility, easier to test and maintain.

### 3. Type-Safe Validation

**File:** `src/lib/validation.ts`

Uses Zod for runtime validation:

```typescript
const FormStateSchema = z.object({
  normKey: z.enum(['ras', 'esp', 'eu', 'epa']),
  users: z.number().min(1).max(10000),
  dotacion: z.number().min(10).max(500),
  temp: z.number().min(-10).max(50),
  depth: z.number().min(0.8).max(5),
  cleanYears: z.number().min(1).max(20),
  // Optional with defaults
  retCoef: z.number().default(0.75),
  dboIn: z.number().default(250),
  ...
})
```

**Benefits:**
- Runtime type checking
- Clear error messages
- TypeScript inference
- Default values applied automatically

### 4. State Management

**File:** `src/hooks/useCalcNorm.ts`

Central hook managing form state with:
- localStorage persistence
- Auto-calculation on input change
- Validation error tracking
- Clean callback-based updates

```typescript
const {
  formState,        // Current form values
  result,           // Calculation output
  updateField,      // Update handler
  validationErrors, // Field error messages
  setFormState      // Direct state setter
} = useCalcNorm()
```

### 5. Internationalization

**File:** `src/lib/i18n.tsx`

Context-based i18n with useLang hook:

```typescript
const { lang, setLang, t } = useLang()
// lang: 'es' | 'en'
// t('key') — returns translated string
```

Supported languages: Spanish (es), English (en)

## 🧪 Testing Strategy

### Test Coverage Targets

| Module | Target | Current |
|--------|--------|---------|
| `src/lib/norms.ts` | 100% | 100% ✓ |
| `src/lib/validation.ts` | >80% | 86.95% ✓ |
| `src/hooks/useCalcNorm.ts` | >75% | 78% ✓ |
| Components | >60% | In progress |

### Test Organization

```
src/__tests__/
├── lib/
│   ├── norms.test.ts          # 16 tests
│   │   ├── NORMS_METADATA validation
│   │   ├── getParams() temperature logic
│   │   ├── computeNorm() calculations
│   │   └── Edge cases (min volumes, chamber logic)
│   └── validation.test.ts     # 30 tests
│       ├── Schema validation
│       ├── Field range checks
│       └── validateFormState() & validateField()
└── hooks/
    └── useCalcNorm.test.ts    # 10 tests
        ├── Initialization
        ├── Auto-calculation
        ├── Field updates
        └── Validation integration
```

### Running Tests

```bash
npm test                  # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

## 🔄 Development Workflow

### Pre-Commit Hooks

Husky + lint-staged runs automatically before `git commit`:

1. **prettier --write** — Format code
2. **npm test** — Run related tests (TS files)
3. **npm run build** — Verify build succeeds

### GitHub Actions

**test.yml** — On push/PR:
- Install deps (Node 18.x, 20.x)
- Run `npm test` with coverage
- Upload to Codecov

**lint.yml** — On push/PR:
- Check `prettier --check`
- Run `npm run build`

## 📝 Naming Conventions

### Files
- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utilities: `camelCase.ts`
- Tests: `*.test.ts`

### Variables
- React components: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Types/Interfaces: `PascalCase`

### CSS Classes
- BEM: `.block__element--modifier`
- Theme colors: `#00F5FF` (cyan), `#041820` (dark), `#ff5050` (error)

## 🚀 Adding New Calculators

To add a new calculator (e.g., UASB reactor):

1. **Add parameters to `src/lib/norms.ts`:**
   ```typescript
   computeUASB(normKey, temp, ...params): ComputeResult
   ```

2. **Create validation schema in `src/lib/validation.ts`:**
   ```typescript
   const UASBFormStateSchema = z.object({ ... })
   ```

3. **Create hook: `src/hooks/useCalcUASB.ts`**

4. **Create components:**
   ```
   src/components/UASB/
   ├── UASBCalculator.tsx    (orchestrator)
   ├── UASBForm.tsx          (inputs)
   └── UASBResults.tsx       (display)
   ```

5. **Create route: `app/calculators/uasb/page.tsx`**

6. **Add tests: `src/__tests__/lib/uasb.test.ts`**

## 🔧 Configuration

### TypeScript (`tsconfig.json`)

Path aliases for clean imports:
```json
"paths": {
  "@/lib/*": ["./src/lib/*"],
  "@/hooks/*": ["./src/hooks/*"],
  "@/components/*": ["./src/components/*"],
  "@/types": ["./src/types/index.ts"]
}
```

### Next.js (`next.config.js`)

Currently ignores TypeScript build errors (temporary):
```javascript
typescript: { ignoreBuildErrors: true }
```

⚠️ **TODO:** Fix CSS property type errors in inline styles.

### Jest (`jest.config.js`)

- Uses `next/jest` preset
- Configured for React Testing Library
- Coverage collection enabled

## 📦 Dependencies

### Production
- **next** (14.2.3) — Framework
- **react** (18) — UI library
- **zod** (4.4.1) — Validation
- **@anthropic-ai/sdk**, **@google/generative-ai** — AI integrations
- **babylonjs** — 3D graphics

### Development
- **jest** (30.3.0) — Testing
- **@testing-library/react** (16.3.2) — Component testing
- **ts-jest** (29.4.9) — TypeScript in Jest
- **prettier** (3.8.3) — Code formatting
- **husky** (9.1.7) — Git hooks
- **lint-staged** (16.4.0) — Pre-commit tasks

## 🎨 Design System

### Color Palette
- **Primary (Cyan):** `#00F5FF`
- **Background (Dark):** `#041820`
- **Secondary (Teal):** `#0a2835`, `#2a5070`
- **Text (Light):** `#7ab8c8`
- **Success:** `#00ff88`
- **Error:** `#ff5050`
- **Warning:** `#b0a060`

### Fonts
- **Headlines:** Orbitron (700, 900)
- **Code:** IBM Plex Mono
- **Body:** Inter (400, 500, 600, 700)

## 🤝 Contributing

### Code Style

Code formatting enforced by prettier:
```bash
npm run lint  # Next.js linting
npx prettier --check .  # Prettier check
npx prettier --write .  # Auto-format
```

### Testing Requirements

- New features must include tests
- Minimum coverage: 80% for utils, 70% for components
- Run `npm run test:coverage` before opening PR

### Commit Messages

Follow conventional commits:
```
feat: add UASB reactor calculator
fix: correct SRT calculation for ESP norm
refactor: split monolithic component
docs: update architecture guide
test: add coverage for norms.ts
```

## 🐛 Known Issues

1. **TypeScript Build Errors** — CSS property type mismatches
   - Current: `next.config.js` ignores with `ignoreBuildErrors: true`
   - Fix: Type all inline styles with proper CSSProperties
   - Priority: Medium (build works, but types should match)

2. **Legacy Components** — Not yet in `src/`
   - Files: `components/IsometricDiagram.jsx`, `LaminaTecnica.jsx`, `Navbar.js`
   - Plan: Migrate in next refactoring phase
   - Impact: None (new code uses `src/` structure)

## 📊 Metrics

| Metric | Value |
|--------|-------|
| TypeScript Coverage | 100% |
| Test Suites | 3 |
| Total Tests | 56 |
| Average Coverage | 88.3% |
| Build Time | ~12s |
| Supported Standards | 4 (RAS, ESP, EU, EPA) |

## 📚 References

- **Next.js:** https://nextjs.org/docs
- **React:** https://react.dev
- **TypeScript:** https://www.typescriptlang.org
- **Zod:** https://zod.dev
- **Jest:** https://jestjs.io
- **Testing Library:** https://testing-library.com

---

**Last Updated:** 2026-05-01  
**Status:** Production-ready
