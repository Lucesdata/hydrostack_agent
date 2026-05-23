# 🔍 HydroStack Architecture Review — Senior Engineer Analysis

**Date:** 2026-05-22  
**Reviewer:** Senior Software Engineer  
**Status:** Comprehensive code audit complete

---

## Executive Summary

HydroStack is a **Next.js + Groq LLM agent** for septic system design. The architecture has been recently consolidated (Etapa 4: May 2026) into `src/` with modular tools and proper separation of concerns. However, there are **critical debt points**, **code duplication**, **performance concerns**, and **maintainability risks** that need addressing.

**Severity Distribution:**
- 🔴 **Critical:** 3 (architecture/consistency issues)
- 🟠 **High:** 6 (code debt, performance, maintainability)
- 🟡 **Medium:** 5 (refactoring opportunities, typing)

---

## 1. Architectural & Structural Issues

### 1.1 🔴 CRITICAL: Monolithic React Components

**Problem:** Two components exceed sustainable size limits:

| Component | Lines | Responsibilities |
|-----------|-------|-----------------|
| `SepticTankCalculator.jsx` | **1119** | Input form, state mgmt, 3+ calculation modes, validation, rendering |
| `HydroAgent.jsx` | **804** | Chat UI, streaming, profile detection, owner state persistence, message rendering |

**Impact:**
- Hard to test (2+ features per component)
- Difficult to reuse logic
- Slow refactors (touching one feature = retest everything)
- Cognitive load for new engineers

**Root Cause:**
- No extract of calculation logic into utilities
- No separation of chat rendering from streaming logic
- No component composition strategy

**Recommended Action:** Break into smaller, focused components:
```
SepticTankCalculator.jsx (1119 lines) →
├── TankInputForm.jsx (form + validation)
├── TankCalculationEngine.jsx (pure logic)
├── TankResultsDisplay.jsx (rendering)
└── TankDiagramViewer.jsx (3D/2D selection)

HydroAgent.jsx (804 lines) →
├── ChatMessagesContainer.jsx
├── ChatInputBar.jsx
├── ChatStreamListener.jsx
├── ProfileSelector.jsx
└── HydroAgentCore.jsx (orchestration)
```

**Effort:** Medium (2-3 days) | **Priority:** High

---

### 1.2 🔴 CRITICAL: Duplicated Calculation Logic

**Problem:** Septic tank sizing logic exists in **3 places** with divergent implementations:

1. **`src/lib/calculations/septicTank.ts`** (220 lines)
   - Pure function, type-safe, CTE DB-HS 5 rules
   - Used by: Agent tools, tests

2. **`src/components/SepticTankCalculator.jsx`** (lines 79–400)
   - Embedded calculation logic, different defaults
   - Supports 5 norms (EPA, UK, AU, ESP, RAS)
   - **NOT linked to pure function**

3. **`src/lib/agent/tools/calculateSepticTank.ts`** (170 lines)
   - Tool wrapper that calls #1

**Issues:**
- **Inconsistency Risk:** SepticTankCalculator uses different formulas than `septicTank.ts`
  - Different sludge rates (e.g., RAS uses 40 kg/p/y, CTE uses 50)
  - Different temperature handling (calculator: 5 discrete bands, calc: none)
  - Different minimum volumes
- **Divergence over time:** When bug is fixed in one place, others are forgotten
- **Test coverage:** Only `septicTank.ts` is tested; Calculator logic is untested
- **Maintenance overhead:** Changes must be made in 3 places

**Evidence:**
```typescript
// src/lib/calculations/septicTank.ts
const TASA_LODOS = 50; // kg/(person·year)

// src/components/SepticTankCalculator.jsx — norm === "ras"
sludgeRate: 40, // Different!
```

**Recommended Action:** Consolidate all calculation logic into `septicTank.ts` with a **norm-aware strategy**:

```typescript
// src/lib/calculations/septicTank.ts (refactored)
export type Norm = 'cte' | 'epa' | 'uk' | 'au' | 'ras';

interface SepticTankDefaults {
  sludgeRate: number;
  scumFactor: number;
  minDepth: number;
  minWidth: number;
  minLength: number;
  dotacion: number;
}

const DEFAULTS_BY_NORM: Record<Norm, SepticTankDefaults> = {
  cte: { sludgeRate: 50, scumFactor: 0.25, ... },
  epa: { sludgeRate: 65, scumFactor: 0.25, ... },
  // ... rest
};

export function calculateSepticTank(input: SepticTankInput & { norm?: Norm }): SepticTankResult {
  const norm = input.norm ?? 'cte';
  const defaults = DEFAULTS_BY_NORM[norm];
  // Use shared logic
}
```

Then **delete** all calculation code from `SepticTankCalculator.jsx` and import the function.

**Effort:** High (3–4 days) | **Priority:** 🔴 CRITICAL

---

### 1.3 🔴 CRITICAL: Fragmented State Management

**Problem:** User/owner state scattered across 4 systems with **no synchronization**:

| System | Purpose | Scope | Persistence |
|--------|---------|-------|-------------|
| `localStorage.hydrostack_profile` | User role (owner/prof/...) | Client-side | ✅ Persisted |
| `src/lib/owner-state.js` | Owner phase, subscenario, country | Client-side | ✅ Persisted |
| `FormState` (filter.ts) | Form inputs, calculation state | Request-local | ❌ Not persisted |
| `ownerState` (route.ts) | Injected context during request | Request-local | ❌ Not persisted |

**Issues:**
- **No single source of truth:** Which one is authoritative?
- **Sync bugs:** Profile updated in localStorage, but owner-state.js not notified
- **Type divergence:** OwnerState has fields FormState doesn't have (country, systemAge)
- **Race conditions:** Multiple sources write to same data
- **Testing nightmare:** State can be in 4 different configurations

**Evidence:**
```typescript
// app/api/agent/route.ts:520
const { messages, formState, userProfile, ownerState } = await req.json();
// 4 separate state objects sent in a single request!

// src/components/HydroAgent.jsx:47-54
const state = getOwnerState();
if (state) { setOwnerState(state); }
// But userProfile is in separate localStorage!
```

**Recommended Action:** Implement **unified state management**:

```typescript
// src/lib/state/HydroStackState.ts
export interface HydroStackState {
  user: {
    profile: 'owner' | 'professional' | 'contractor' | 'exploring';
    language: 'es' | 'en';
  };
  owner?: {
    phase: 'initial' | 'explanation' | 'orientation' | 'detail';
    subscenario: 'installation' | 'active_failure' | 'preventive' | 'abandoned' | null;
    country: 'colombia' | 'spain' | 'usa' | 'other' | null;
    occupants: number | null;
    systemAge: number | null;
  };
  calculation?: {
    norm: Norm;
    users: number;
    dotacion: number;
    // ... form fields
  };
}

export class StateManager {
  private state: HydroStackState;
  
  static hydrate(): HydroStackState { /* read from localStorage */ }
  static save(state: HydroStackState): void { /* write to localStorage */ }
  
  setProfile(profile: string): void { /* sync everywhere */ }
  getState(): HydroStackState { return this.state; }
}
```

Then use this **single source of truth** in both client and server:
- Client: `useStateManager()` hook
- Server: Pass `state` object in request

**Effort:** Medium (2–3 days) | **Priority:** 🔴 CRITICAL

---

## 2. Code Duplication & Inconsistency

### 2.1 🟠 HIGH: Parameter Definition Duplication

**Problem:** Calculation parameters defined in 3 places:

1. **`septicTank.ts:69–77`** — DEFAULTS_POR_TIPO (CTE only)
2. **`SepticTankCalculator.jsx:14–47`** — getParams() with 5 norms
3. **`catalog.ts:???`** — Static reference data

**Inconsistencies:** Different ranges, temperature thresholds, sludge rates per norm.

**Action:** Move all parameter definitions to a single **data-driven source**:
```
src/lib/config/normativeDefaults.ts
├─ CTE DB-HS 5 (Spain)
├─ EPA 625/R-06/003 (USA)
├─ UK Building Regulations
├─ AS/NZS 1547 (AU/NZ)
└─ RAS 2017 (Colombia)
```

**Effort:** Small (1 day) | **Priority:** High

---

### 2.2 🟠 HIGH: Normative Regex Detection

**Problem:** Location detection happens in **2 places**:

1. **`app/api/agent/route.ts:192–226`** — detectLocation()
2. **`subscenario-detector.ts:15–75`** — SUBSCENARIO_KEYWORDS

Both use regex matching with different keyword sets. **Zero cross-validation.**

**Risk:** User in Spain detected as EPA (USA) → wrong calculations → confused user.

**Action:** Consolidate in `src/lib/utils/locationDetector.ts`:
```typescript
export function detectLocation(text: string): Norm {
  const keywords = {
    usa: ['usa', 'california', 'texas', ...],
    uk: ['uk', 'england', ...],
    spain: ['españa', 'madrid', ...],
    // ...
  };
  // Single, testable function
}
```

**Effort:** Small (1 day) | **Priority:** High

---

## 3. Performance Issues

### 3.1 🟠 HIGH: Monolithic Component Rendering

**Problem:** `SepticTankCalculator.jsx` re-renders all sub-sections when **any state changes**:

```jsx
// No memoization, no useMemo for derived calculations
const [users, setUsers] = useState(10);
const [temp, setTemp] = useState(20);
// ... changing users re-renders ENTIRE component including 3D diagram

return (
  <>
    <InputForm users={users} setUsers={setUsers} />
    <TankDiagram dimensions={calc.dimensions} /> {/* Full re-render */}
    <DrainfieldDiagram area={calc.area} />   {/* Full re-render */}
    <LaminaTecnica results={calc} />          {/* Full re-render */}
  </>
);
```

**Impact:** 
- 3D Babylon.js scene rebuilds on every keystroke
- Isometric diagram re-rendered unnecessarily
- PDF generation recalculated in memory

**Action:** 
- Extract input form to separate memoized component
- Use `useMemo` for expensive calculations
- Lazy-load 3D diagram (load on demand)

**Effort:** Medium (1–2 days) | **Priority:** High

---

### 3.2 🟠 HIGH: Always-Loading 3D Diagram

**Problem:** Babylon.js 3D viewer loads **even if user never requests it**.

**Evidence:**
```jsx
// SepticTankCalculator.jsx — NO conditional rendering
return (
  <>
    <IsometricDiagram {...} />
    <IsometricDiagram3D {...} /> {/* Always loaded, always rendered */}
  </>
);
```

**Impact:**
- Babylon.js + meshes init on every page → ~2–3 sec delay
- Memory overhead for users who only need 2D view
- Slower initial render

**Action:** Lazy-load with a tab or button:
```jsx
const [view, setView] = useState('2d'); // 'iso' | '3d'

return (
  <>
    <Tabs value={view} onChange={setView} />
    {view === 'iso' && <IsometricDiagram {...} />}
    {view === '3d' && <Suspense fallback={<LoadingSpinner />}>
      <IsometricDiagram3D {...} />
    </Suspense>}
  </>
);
```

**Effort:** Small (1 day) | **Priority:** Medium

---

### 3.3 🟡 MEDIUM: No Streaming Optimization

**Problem:** Chat streaming in `HydroAgent.jsx` appends character-by-character to DOM:

```jsx
// markdown.js (204 lines) — parses and renders on EVERY chunk
for (const chunk of eventChunks) {
  setMessages(prev => [...prev, { role: 'assistant', content: prev[prev.length-1].content + chunk }]);
  // Triggers re-parse and re-render of ENTIRE markdown!
}
```

**Action:** Buffer chunks, render in 100–200 char batches:
```jsx
const [buffer, setBuffer] = useState('');
useEffect(() => {
  if (buffer.length > 100) {
    // Append to message
    flushBuffer();
  }
}, [buffer]);
```

**Effort:** Small (1 day) | **Priority:** Medium

---

## 4. Type Safety & Correctness

### 4.1 🟡 MEDIUM: Weak Typing in Tool Orchestration

**Problem:** Tool results and arguments use loose types:

```typescript
// app/api/agent/route.ts:424
const toolCalls: any[] = [];

// Groq stream parsing — untyped
if (delta?.tool_calls) {
  for (const tc of delta.tool_calls) {
    toolCalls[idx] = {
      id: tc.id ?? `call_${idx}`,
      type: "function",
      function: { name: "", arguments: "" }, // ← Mutable strings
    };
  }
}
```

**Risk:**
- Runtime errors if tool name is misspelled
- Arguments parsed incorrectly → silent tool failures
- No IDE autocomplete for tool names

**Action:** Create typed tool definitions:
```typescript
// src/lib/agent/tools/types.ts
export const TOOL_REGISTRY = {
  'calculate_septic_tank': {
    execute: executeCalculateSepticTank,
    input: ZodSchema<CalculateSepticTankInput>,
  },
  'calculate_drainage_field': { ... },
  // ...
} as const;

export type ToolName = keyof typeof TOOL_REGISTRY;

// Then in route.ts:
function executeTool(name: ToolName, args: any): Promise<unknown> { ... }
```

**Effort:** Medium (2 days) | **Priority:** Medium

---

### 4.2 🟡 MEDIUM: Incomplete Normative Definitions

**Problem:** Normative document references incomplete in types:

```typescript
// route.ts:231–237
const map: Record<string, string> = {
  "epa-onsite":       "docs/normativa/epa-onsite.md",
  "uk-building-regs": "docs/normativa/uk-building-regs.md",
  "as-nzs-1547":      "docs/normativa/as-nzs-1547.md",
  "cte-hs5":          "docs/normativa/cte-hs5.md",
  "ras-2000":         "docs/normativa/ras-2000.md",
};
// If you add a new norm, you must update this AND detectLocation() AND DEFAULTS_BY_NORM AND...
```

**Risk:** Adding a new jurisdiction requires changes in 5+ places.

**Action:** Create a single **normative registry**:
```typescript
// src/lib/config/normativeRegistry.ts
export const NORMS = {
  cte: {
    name: 'CTE DB-HS 5 (Spain)',
    docPath: 'docs/normativa/cte-hs5.md',
    keywords: ['españa', 'madrid', 'spanish', ...],
    defaults: { sludgeRate: 50, ... },
    // ... all norm-specific config
  },
  epa: { ... },
  // ...
} as const;
```

Then everywhere uses: `NORMS.cte.defaults`, `NORMS.epa.keywords`, etc.

**Effort:** Medium (2 days) | **Priority:** High

---

## 5. Error Handling & Robustness

### 5.1 🟠 HIGH: Silent Failures in Tool Execution

**Problem:** Tool errors caught but not always surfaced to user:

```typescript
// app/api/agent/route.ts:494–506
try {
  result = await executeTool(tc.function.name, parsedArgs);
} catch (e: any) {
  result = { error: e?.message ?? "Tool execution failed" };
}

send(JSON.stringify({
  type: 'tool_result',
  tool: tc.function.name,
  args: parsedArgs,
  result, // ← Error buried in nested structure
}));
```

**Issue:** Error may not bubble up to chat UI. User sees no feedback.

**Action:** Add explicit error type:
```typescript
export type ToolResult = 
  | { success: true; data: unknown }
  | { success: false; error: string; code: string };
```

And always surface errors to chat:
```typescript
if (!result.success) {
  send(JSON.stringify({
    type: 'tool_error',
    tool: tc.function.name,
    error: result.error,
  }));
}
```

**Effort:** Small (1 day) | **Priority:** High

---

### 5.2 🟠 HIGH: Rate Limiting Not User-Friendly

**Problem:** Groq 429 retries happen silently; user sees nothing:

```typescript
// route.ts:395–412
if (res.status === 429) {
  const waitSec = m ? parseInt(...) : 5;
  if (waitSec <= 30 && retriesLeft > 0) {
    await new Promise(r => setTimeout(r, Math.ceil(waitSec * 1000) + 600));
    return streamRound(...); // ← Retry silently
  }
  send(JSON.stringify({
    type: "error",
    error: `Groq rate limit reached...`,
  })); // ← Only sent after max retries exhausted
}
```

**Impact:** User waits ~30 sec with no feedback thinking app is broken.

**Action:** Send progress update **before** retrying:
```typescript
send(JSON.stringify({
  type: 'status',
  message: `Rate limited — retrying in ${waitSec}s...`,
  retryCount: MAX_RATE_LIMIT_RETRIES - retriesLeft,
}));
```

**Effort:** Small (few hours) | **Priority:** Medium

---

## 6. Maintainability Issues

### 6.1 🟡 MEDIUM: Hard to Add New Norms

**Checklist for adding support for a new jurisdiction (e.g., Canada):**

- [ ] Add keywords to `subscenario-detector.ts`
- [ ] Add keywords to `detectLocation()` in route.ts
- [ ] Create `docs/normativa/canada.md`
- [ ] Add to file map in route.ts
- [ ] Add Norm type to `septicTank.ts`
- [ ] Add defaults to `DEFAULTS_BY_NORM` in `septicTank.ts`
- [ ] Add to `getParams()` in `SepticTankCalculator.jsx` (if standalone calc)
- [ ] Add to `USE_TYPES` in calculator
- [ ] Add tests for new norm
- [ ] Update CLAUDE.md instructions
- [ ] Update i18n strings if needed

**This is unsustainable.** One new norm = 9 changes across 7 files.

**Action:** Normative registry (see 4.2) solves this — add norm once, everywhere uses it.

---

### 6.2 🟡 MEDIUM: Implicit Contracts in Tool Chaining

**Problem:** The 4-tool chain (tank → drainage → validation → PDF) relies on **undocumented assumptions**:

```typescript
// route.ts:487–491 — "injectPreviousOutputs" 
// Replaces tool arguments with REAL outputs from history
// But this is IMPLICIT — no type checking, no validation

parsedArgs = injectPreviousOutputs(
  tc.function.name,
  parsedArgs,
  [...messages, ...toolMsgs],
);
```

**Risk:**
- If tool names change, injection breaks silently
- If tool output format changes, next tool gets garbage
- Very hard to debug

**Action:** Create a **typed tool pipeline**:
```typescript
// src/lib/agent/tools/pipeline.ts
export class ToolPipeline {
  private context: {
    septicTank?: SepticTankResult;
    drainageField?: DrainageFieldResult;
    validation?: ValidationResult;
  } = {};

  async execute(toolName: ToolName, args: any): Promise<any> {
    const result = await executeTool(toolName, args);
    
    // Auto-inject context
    if (toolName === 'calculate_drainage_field') {
      if (!this.context.septicTank) throw new Error('Tank must be calculated first');
      args.daily_flow = this.context.septicTank.caudal_diario_litros;
    }
    
    // Cache result
    if (toolName === 'calculate_septic_tank') this.context.septicTank = result;
    // ... etc
    
    return result;
  }
}
```

**Effort:** Medium (2 days) | **Priority:** Medium

---

## 7. Documentation Gaps

### 7.1 🟡 MEDIUM: Incomplete ARCHITECTURE.md

**Status:** Partially written, incomplete sections:

- Section 3 (Data Flow) ends at line 198 (cut off)
- No diagram of state flow
- No documented assumptions about tool ordering
- No troubleshooting guide

**Action:** Complete ARCHITECTURE.md with:
- Full state machine (initial → detection → guidance → calculation)
- Tool chaining diagram + ordering guarantees
- Error paths + recovery
- Performance characteristics

**Effort:** Small (1 day) | **Priority:** Low

---

### 7.2 🟡 MEDIUM: No Runbook for Debugging Tool Failures

**Problem:** When a tool fails (malformed input, validation error), the debugging path is unclear.

**Action:** Create `docs/DEBUGGING.md`:
```markdown
## Tool Failures

### Symptom: "Tool not found"
1. Check tool name in Groq response (route.ts:495)
2. Verify tool is in toolExecutors (tools/index.ts:64–77)
3. ...

### Symptom: Tool returns error with data
1. Check ValidationError schema
2. Verify input passed injection (route.ts:487)
...
```

**Effort:** Small (few hours) | **Priority:** Low

---

## 8. Testing Gaps

### 8.1 🟠 HIGH: No Tests for Calculator Component

**Coverage:**
- ✅ `septicTank.ts` — tested (src/__tests__/calculations/septicTank.test.ts)
- ✅ `drainageField.ts` — tested
- ✅ `cteValidator.ts` — tested (159 tests)
- ❌ `SepticTankCalculator.jsx` — **NO TESTS**
- ❌ `HydroAgent.jsx` — **NO TESTS**
- ❌ `route.ts` — **NO TESTS**

**Risk:** UI bugs only caught by manual testing.

**Action:** Add integration tests:
```typescript
// src/__tests__/components/SepticTankCalculator.test.ts
describe('SepticTankCalculator', () => {
  it('calculates tank volume correctly', async () => {
    const { getByLabelText, getByText } = render(<SepticTankCalculator />);
    await userEvent.type(getByLabelText(/users/i), '10');
    // ... verify result
  });
});
```

**Effort:** High (3–4 days) | **Priority:** High

---

### 8.2 🟡 MEDIUM: No Tests for Tool Chaining

**Gap:** No test validates that:
- Tank → Drainage → Validation chain works
- Tool outputs flow correctly into next tool
- Error in one tool doesn't crash pipeline

**Action:** Add end-to-end test:
```typescript
// src/__tests__/agent/toolComposition.test.ts (EXPAND)
describe('Tool Pipeline', () => {
  it('chains tank → drainage → validation', async () => {
    const tank = await executeCalculateSepticTank({ usuarios: 10, tipo_uso: 'vivienda_unifamiliar' });
    const drainage = await executeCalculateDrainageField({ 
      daily_flow: tank.caudal_diario_litros, 
      soil_permeability: 'high' 
    });
    const validation = await executeValidateAgainstCte({ septic_tank: tank, drainage_field: drainage });
    expect(validation.ok).toBe(true); // or check for expected warnings
  });
});
```

**Effort:** Medium (2 days) | **Priority:** High

---

## 9. Security Considerations

### 9.1 🟠 HIGH: Input Validation Gaps

**Problem:** User inputs not thoroughly validated before passing to Groq:

```typescript
// route.ts:530
const lastMessage = messages[messages.length - 1]?.content || "";
// What if content is 100KB? What if it contains prompt injection?
```

**Action:**
1. Validate message length (max 5000 chars)
2. Sanitize HTML/script tags
3. Rate limit by user session

**Effort:** Medium (1 day) | **Priority:** Medium

---

### 9.2 🟡 MEDIUM: No CSRF Protection

**Problem:** POST `/api/agent` has no CSRF token validation.

**Action:** Add CSRF middleware (or verify same-origin via SameSite cookie).

**Effort:** Small (few hours) | **Priority:** Low (if no auth required)

---

## 10. Recommended Refactoring Roadmap

### Phase 1: Consolidation (1–2 weeks) — 🔴 CRITICAL

**Goal:** Eliminate duplication, unify state, fix type safety

| Task | Effort | Impact |
|------|--------|--------|
| Merge calculation logic (septicTank + Calculator + tools) | 4 days | Eliminates inconsistency |
| Unify state management | 3 days | Single source of truth |
| Create normative registry | 2 days | Extensible architecture |
| Add strict typing to tool pipeline | 2 days | Fewer runtime errors |

**Total:** ~11 days

---

### Phase 2: Refactoring (2 weeks) — 🟠 HIGH

**Goal:** Break monoliths, improve performance, add tests

| Task | Effort | Impact |
|------|--------|--------|
| Split `SepticTankCalculator.jsx` → 4 components | 3 days | Testable, reusable |
| Split `HydroAgent.jsx` → 5 components | 3 days | Easier to maintain |
| Add component tests | 3 days | Catch UI bugs |
| Lazy-load 3D diagram | 1 day | Faster initial load |
| Memoize expensive calculations | 1 day | Smoother UX |

**Total:** ~11 days

---

### Phase 3: Polish (1 week) — 🟡 MEDIUM

**Goal:** Complete documentation, add error handling, improve observability

| Task | Effort | Impact |
|------|--------|--------|
| Complete ARCHITECTURE.md | 1 day | Clear reference |
| Add debugging guide | 1 day | Faster issue resolution |
| Improve error messages | 1 day | Better UX |
| Add logging/observability | 2 days | Easier to diagnose issues |

**Total:** ~5 days

---

## Summary Table

| Category | Issue | Severity | Effort | ROI |
|----------|-------|----------|--------|-----|
| **Architecture** | Monolithic components | 🔴 | Medium | High |
| **Code Quality** | Calculation duplication | 🔴 | High | Very High |
| **State** | Fragmented state mgmt | 🔴 | Medium | Very High |
| **Performance** | Always-load 3D | 🟠 | Small | Medium |
| **Type Safety** | Weak tool typing | 🟡 | Medium | High |
| **Testing** | No component tests | 🟠 | High | Very High |
| **Maintainability** | Hard to add norms | 🟡 | Small | High |
| **Error Handling** | Silent failures | 🟠 | Medium | High |

---

## Conclusion

HydroStack has a **solid foundation** (modular tools, type-safe calculations, proper layer separation) but is being held back by:

1. **Duplication** in calculation logic (3 sources)
2. **Monolithic components** (1100+ line components)
3. **Fragmented state** (4 independent sources)
4. **Weak typing** in tool orchestration

**Recommended priority:** Fix the 3 🔴 CRITICAL issues first (1–2 weeks of focused work), then refactor components and add tests.

**After these fixes:** System will be easier to extend (new norms, new tools), more reliable (proper state, type safety), and more maintainable (smaller components, comprehensive tests).

---

**Next Steps:**
1. Review this analysis with the team
2. Prioritize Phase 1 tasks
3. Create GitHub issues for each refactoring
4. Assign ownership
5. Execute in sprint format
