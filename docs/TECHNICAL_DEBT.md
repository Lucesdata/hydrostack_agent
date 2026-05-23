# 💳 HydroStack Technical Debt — Specific Issues & Solutions

**Last Updated:** 2026-05-22  
**Purpose:** Track specific technical debt items with code examples and refactoring paths

---

## 1. DEBT: Duplicated Septic Tank Logic

### Current State

**File 1: `src/lib/calculations/septicTank.ts` (220 lines)**
- CTE DB-HS 5 (Spain) only
- Pure function, type-safe
- **Sludge rate:** 50 kg/(person·year)
- **Scum factor:** 0.25

```typescript
const TASA_LODOS = 50; // kg/(person·year)
const FACTOR_NATAS = 0.25; // 25% of liquid volume

export function calculateSepticTank(input: SepticTankInput): SepticTankResult {
  // ... sludge calculation
  const volumen_lodos = (he_efectiva * TASA_LODOS * 1 * 1000) / 1000;
  // ...
}
```

**File 2: `src/components/SepticTankCalculator.jsx` (lines 79–400)**
- 5 norms (EPA, UK, AU, Spain, RAS)
- Embedded in component, untested
- Different sludge rates per norm:
  - EPA: 65 kg/p/y
  - UK: 50–75 kg/p/y
  - AU/NZ: 55–100 kg/p/y
  - Spain: 50–60 kg/p/y
  - RAS: 40–60 kg/p/y

```javascript
// getParams() function in SepticTankCalculator.jsx
const computeNorm = (normKey, users, dotacion, retCoef, temp, cleanYears, depth) => {
  const p = getParams(normKey, temp); // Returns different sludge rates!
  
  // For EPA:
  if (norm === "epa") {
    if (temp >= 20) return { trhDays: 1.5, sludgeRate: 65, scumFactor: 0.25, ... };
  }
  // For RAS:
  if (norm === "ras") {
    if (temp >= 20) return { trhDays: 1.5, sludgeRate: 40, scumFactor: 0.30, ... };
  }
};
```

**File 3: `src/lib/agent/tools/calculateSepticTank.ts` (170 lines)**
- Tool wrapper for File 1
- Calls pure function

### Problem

| Metric | File 1 | File 2 | File 3 |
|--------|--------|--------|--------|
| **Sludge for EPA** | N/A | 65 kg/p/y | N/A (uses File 1 = 50) |
| **Temperature handling** | None (global) | 5 buckets (esp, uk, epa, au, ras) | None |
| **Tested** | ✅ Yes | ❌ No | ✅ (tests File 1) |
| **Norms supported** | 1 (CTE) | 5 (all) | 1 (CTE) |

**Inconsistency Risk:** If user is in EPA territory (USA) and uses calculator:
- **Calculator result:** Uses EPA defaults (sludgeRate: 65, trhDays: 1.5)
- **Agent result:** Uses CTE defaults (sludgeRate: 50, trhDays: 2) → Different tank size!

### Solution: Unified Calculation Engine

**Step 1: Expand `septicTank.ts` to support all norms**

```typescript
// src/lib/calculations/septicTank.ts (refactored)

export type Norm = 'cte' | 'epa' | 'uk' | 'au' | 'ras';

interface NormDefaults {
  sludgeRate: (temp: number) => number;  // Temperature-aware
  scumFactor: number;
  minVolume: number;  // m³
  minDepth: number;
  minWidth: number;
  minLength: number;
  dotacion: (useType: TipoUso) => number;
  timeRetention: (temp: number) => number;  // Temperature-aware
}

// Central registry of all norms
const NORM_DEFAULTS: Record<Norm, NormDefaults> = {
  cte: {
    sludgeRate: (temp) => 50,  // CTE uses fixed rate
    scumFactor: 0.25,
    minVolume: 1.5,
    minDepth: 1.0,
    minWidth: 0.75,
    minLength: 1.5,
    dotacion: (use) => ({
      vivienda_unifamiliar: 200,
      vivienda_colectiva: 200,
      restaurante: 200,
      // ...
    }[use] ?? 200),
    timeRetention: (temp) => temp >= 15 ? 1.5 : 2.0,
  },
  
  epa: {
    sludgeRate: (temp) => {
      if (temp >= 20) return 65;
      if (temp >= 10) return 80;
      return 95;
    },
    scumFactor: 0.25,
    minVolume: 3.785,  // 1000 gallons
    minDepth: 1.0,
    minWidth: 0.9,
    minLength: 1.8,
    dotacion: (use) => 75,  // GPD/bedroom
    timeRetention: (temp) => {
      if (temp >= 20) return 1.5;
      if (temp >= 10) return 2.0;
      return 2.5;
    },
  },
  
  uk: {
    sludgeRate: (temp) => {
      if (temp >= 15) return 50;
      if (temp >= 10) return 65;
      return 75;
    },
    scumFactor: 0.25,
    minVolume: 1.5,
    minDepth: 1.0,
    minWidth: 0.75,
    minLength: 1.5,
    dotacion: (_use) => 200,  // L/person/day
    timeRetention: (temp) => {
      if (temp >= 15) return 1.5;
      if (temp >= 10) return 2.0;
      return 2.5;
    },
  },
  
  // ... au, ras similarly
};

export interface SepticTankInput {
  habitantes_equivalentes: number;
  tipo_uso: TipoUso;
  norm: Norm;  // ← NEW: Specify norm
  temp?: number;  // ← NEW: Temperature for norm-aware defaults
  // ... rest of fields
}

export function calculateSepticTank(input: SepticTankInput): SepticTankResult {
  const defaults = NORM_DEFAULTS[input.norm];
  const sludgeRate = defaults.sludgeRate(input.temp ?? 15);
  const timeRetention = defaults.timeRetention(input.temp ?? 15);
  
  // Rest of logic uses these norm-aware defaults
  const volumen_lodos = (he_efectiva * sludgeRate * 1 * 1000) / 1000;
  
  // ... return result
}
```

**Step 2: Update `SepticTankCalculator.jsx` to use unified function**

```jsx
// BEFORE: Embedded getParams() with 5 different implementations
const computeNorm = (normKey, users, ...) => {
  const p = getParams(normKey, temp); // ← Complex 50-line function
  // ... 300 lines of calculation
};

// AFTER: Single import, single function
import { calculateSepticTank } from '@/src/lib/calculations/septicTank';

const computeNorm = (normKey, users, dotacion, temp, depth, ...) => {
  const result = calculateSepticTank({
    habitantes_equivalentes: users,
    tipo_uso: mapUseTypeToTipoUso(useType),  // 'dom' → 'vivienda_unifamiliar'
    norm: normKey,  // 'epa' → 'epa'
    temp,
    profundidad_m: depth,
    // ... other fields
  });
  
  // Now result is consistent with agent calculations!
  return {
    volumen: result.volumen_util_litros,
    dimensiones: result.dimensiones,
    // ... format for UI
  };
};
```

**Step 3: Delete calculation logic from `SepticTankCalculator.jsx`**

- Remove `getParams()` function (~50 lines)
- Remove `computeNorm()` function (~300 lines)
- Remove embedded temp-based calculations
- Keep only UI rendering

**Result:**
- ✅ Calculator now uses EXACT SAME logic as agent
- ✅ Only 1 place to fix bugs
- ✅ New norm = update `NORM_DEFAULTS` + `calculateSepticTank.test.ts`
- ✅ Temperature handling unified

**Effort:** 3–4 days | **Files Changed:** 3

---

## 2. DEBT: Fragmented State Management

### Current State

**4 independent sources of truth:**

```
localStorage
├── "hydrostack_profile" = "owner" | "professional" | "contractor" | "exploring"
└── (other keys via getOwnerState)

getOwnerState() → localStorage.getItem("hydrostack_owner_state") → OwnerState
├── phase: "initial" | "explanation" | "orientation" | "detail" | null
├── subscenario: "installation" | "active_failure" | "preventive" | "abandoned" | null
├── explanationOffered: boolean
├── country: string | null
├── occupants: number | null
├── systemAge: number | null
└── lastUpdated: ISO8601

FormState (filter.ts) — in-memory only
├── users, dotacion, temp, depth, ...
├── calculated: boolean
├── subscenario, phase, explanationOffered
└── (Partially persisted? Unclear)

request payload (route.ts)
├── { messages, formState, userProfile, ownerState }
└── (4 different state objects in 1 request!)
```

### Problem

```typescript
// HydroAgent.jsx:47–54
const state = getOwnerState();  // Load from localStorage
if (state) {
  setOwnerState(state);  // Update React state
}

// HydroAgent.jsx:67–71
function handleProfileSelect(profileId) {
  setUserProfile(profileId);  // Update React state
  localStorage.setItem("hydrostack_profile", profileId);  // Sync to localStorage
  inputRef.current?.focus();
}

// Issue: When userProfile changes, does ownerState know?
// When country is updated, does profile reflect it?
// → No synchronization mechanism
```

### Solution: Unified State Manager

**Step 1: Create state model**

```typescript
// src/lib/state/HydroStackState.ts

export interface UserState {
  profile: 'owner' | 'professional' | 'contractor' | 'exploring';
  language: 'es' | 'en';
}

export interface OwnerPhaseState {
  phase: 'initial' | 'explanation' | 'orientation' | 'detail' | null;
  subscenario: 'installation' | 'active_failure' | 'preventive' | 'abandoned' | null;
  explanationOffered: boolean;
  country: 'colombia' | 'spain' | 'usa' | 'other' | null;
  occupants: number | null;
  systemAge: number | null;
}

export interface CalculationState {
  norm: Norm;
  users: number;
  dotacion: number;
  temp: number;
  depth: number;
  soilPermeability: string;
  calculated: boolean;
}

export interface HydroStackState {
  user: UserState;
  owner?: OwnerPhaseState;  // Only if profile === 'owner'
  calculation?: CalculationState;  // Only if calculation started
}

// Strict versioning
export const STATE_VERSION = 1;
export interface PersistedState {
  version: number;
  state: HydroStackState;
  savedAt: string;  // ISO8601
}
```

**Step 2: Create state manager**

```typescript
// src/lib/state/StateManager.ts

export class HydroStackStateManager {
  private static readonly STORAGE_KEY = 'hydrostack_state_v1';
  private state: HydroStackState;
  private listeners: Set<(state: HydroStackState) => void> = new Set();

  constructor(initialState: HydroStackState) {
    this.state = initialState;
  }

  // Hydrate from localStorage
  static hydrate(): HydroStackState {
    if (typeof window === 'undefined') {
      return HydroStackStateManager.getDefaultState();
    }
    
    try {
      const stored = localStorage.getItem(HydroStackStateManager.STORAGE_KEY);
      if (!stored) return HydroStackStateManager.getDefaultState();
      
      const parsed: PersistedState = JSON.parse(stored);
      if (parsed.version !== STATE_VERSION) {
        // Migration logic here
        return HydroStackStateManager.getDefaultState();
      }
      
      return parsed.state;
    } catch {
      return HydroStackStateManager.getDefaultState();
    }
  }

  // Persist to localStorage
  save(): void {
    if (typeof window === 'undefined') return;
    
    const persisted: PersistedState = {
      version: STATE_VERSION,
      state: this.state,
      savedAt: new Date().toISOString(),
    };
    
    localStorage.setItem(
      HydroStackStateManager.STORAGE_KEY,
      JSON.stringify(persisted),
    );
  }

  // Update state with strict validation
  setUserProfile(profile: HydroStackState['user']['profile']): void {
    this.state.user.profile = profile;
    
    // Clear owner-specific state if switching away
    if (profile !== 'owner') {
      delete this.state.owner;
    } else if (!this.state.owner) {
      this.state.owner = this.getDefaultOwnerState();
    }
    
    this.notifyListeners();
    this.save();
  }

  setLanguage(lang: 'es' | 'en'): void {
    this.state.user.language = lang;
    this.notifyListeners();
    this.save();
  }

  updateOwnerPhase(updates: Partial<OwnerPhaseState>): void {
    if (!this.state.owner) {
      this.state.owner = this.getDefaultOwnerState();
    }
    
    this.state.owner = { ...this.state.owner, ...updates };
    this.notifyListeners();
    this.save();
  }

  updateCalculation(updates: Partial<CalculationState>): void {
    if (!this.state.calculation) {
      this.state.calculation = this.getDefaultCalculationState();
    }
    
    this.state.calculation = { ...this.state.calculation, ...updates };
    this.notifyListeners();
    this.save();
  }

  getState(): HydroStackState {
    return this.state;
  }

  subscribe(listener: (state: HydroStackState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  private static getDefaultState(): HydroStackState {
    return {
      user: {
        profile: 'exploring',
        language: 'es',
      },
    };
  }

  private getDefaultOwnerState(): OwnerPhaseState {
    return {
      phase: null,
      subscenario: null,
      explanationOffered: false,
      country: null,
      occupants: null,
      systemAge: null,
    };
  }

  private getDefaultCalculationState(): CalculationState {
    return {
      norm: 'cte',
      users: 5,
      dotacion: 200,
      temp: 15,
      depth: 1.2,
      soilPermeability: 'unknown',
      calculated: false,
    };
  }
}
```

**Step 3: React hook**

```typescript
// src/lib/state/useHydroStackState.ts

import { useState, useEffect } from 'react';
import { HydroStackStateManager, HydroStackState } from './StateManager';

// Singleton instance
let manager: HydroStackStateManager | null = null;

export function useHydroStackState() {
  const [state, setState] = useState<HydroStackState | null>(null);
  const [manager_, setManager] = useState<HydroStackStateManager | null>(null);

  useEffect(() => {
    // Initialize on client only
    if (typeof window === 'undefined') return;
    
    if (!manager) {
      manager = new HydroStackStateManager(HydroStackStateManager.hydrate());
    }
    
    setManager(manager);
    setState(manager.getState());
    
    // Subscribe to changes
    const unsubscribe = manager.subscribe((newState) => {
      setState(newState);
    });
    
    return unsubscribe;
  }, []);

  return {
    state: state || HydroStackStateManager.hydrate(),
    manager: manager_,
  };
}
```

**Step 4: Refactor components**

```typescript
// BEFORE: HydroAgent.jsx
const [userProfile, setUserProfile] = useState(null);
const [ownerState, setOwnerState] = useState(null);

useEffect(() => {
  const storedProfile = localStorage.getItem("hydrostack_profile");
  if (storedProfile) setUserProfile(storedProfile);
  
  if (storedProfile === "owner") {
    const state = getOwnerState();
    if (state) setOwnerState(state);
  }
}, []);

function handleProfileSelect(profileId) {
  setUserProfile(profileId);
  localStorage.setItem("hydrostack_profile", profileId);
}

// AFTER: HydroAgent.jsx
const { state, manager } = useHydroStackState();

function handleProfileSelect(profileId) {
  manager?.setUserProfile(profileId);
  // ✅ Automatically persisted + listeners notified
}

// Pass single state object to API:
await fetch('/api/agent', {
  body: JSON.stringify({
    messages,
    state,  // ← Single source of truth
  }),
});
```

**Step 5: Server-side alignment**

```typescript
// app/api/agent/route.ts (refactored)

interface ChatRequest {
  messages: ChatMessage[];
  state: HydroStackState;  // ← Unified state object
}

export async function POST(req: Request) {
  const { messages, state }: ChatRequest = await req.json();
  
  const userProfile = state.user.profile;
  const ownerState = state.owner;
  
  // Rest of logic uses state properties directly
  if (userProfile === "owner" && !ownerState?.subscenario) {
    const detection = detectSubscenario(lastMessage);
    if (detection.subscenario && detection.confidence > 50) {
      ownerState.subscenario = detection.subscenario;  // ✅ Automatic sync
    }
  }
  
  // ...
}
```

**Result:**
- ✅ Single source of truth
- ✅ Type-safe updates (no stale state)
- ✅ Automatic persistence
- ✅ Easy to debug (all state in one place)
- ✅ No sync bugs

**Effort:** 3–4 days | **Files Changed:** 8

---

## 3. DEBT: Hard to Add New Normatives

### Current State

To add Canada (CAN) norm:

1. **`subscenario-detector.ts:15–75`** — Add keywords
   ```typescript
   "canada": {
     keywords: ["canada", "ontario", "quebec", ...],
     weight: 1.0,
   },
   ```

2. **`route.ts:192–226`** — Add location detection
   ```typescript
   "canada": "can-onsite",
   "ontario": "can-onsite",
   ```

3. **`route.ts:231–237`** — Add doc path
   ```typescript
   const map = {
     "can-onsite": "docs/normativa/can-onsite.md",
   };
   ```

4. **`septicTank.ts`** — Add norm type and defaults
   ```typescript
   export type Norm = "cte" | "epa" | "uk" | "au" | "ras" | "can";
   
   const NORM_DEFAULTS: Record<Norm, NormDefaults> = {
     can: { sludgeRate: ..., ... },
   };
   ```

5. **`SepticTankCalculator.jsx:14–47`** — Add NORMS entry
   ```javascript
   const NORMS = {
     can: { name: "Canada", flag: "🇨🇦", dotacion: 200, ... },
   };
   ```

6. **`SepticTankCalculator.jsx:79–400`** — Add getParams() case
   ```javascript
   if (norm === "can") {
     if (temp >= 15) return { trhDays: 1.5, sludgeRate: 60, ... };
   }
   ```

7. **Tests** — Add test cases
8. **Documentation** — Update CLAUDE.md
9. **i18n** — Add translation strings (if needed)

= **9 changes across 7 files** = High friction

### Solution: Normative Registry

**Create single registry file:**

```typescript
// src/lib/config/NormativeRegistry.ts

import type { Norm, NormDefaults, TipoUso } from '@/src/lib/calculations/septicTank';

export interface NormativeInfo {
  code: Norm;
  name: string;
  region: string;
  flag: string;
  docPath: string;
  detectionKeywords: string[];
  defaults: NormDefaults;
  dotacion: {
    [key in TipoUso]: number;  // L/hab·day or GPD/bed
  };
  unit: string;  // "L/person/day" vs "GPD/bed"
  reference: string;  // e.g., "EPA 625/R-06/003"
}

export const NORMS_REGISTRY: Record<Norm, NormativeInfo> = {
  cte: {
    code: 'cte',
    name: 'CTE DB-HS 5 (Spain)',
    region: 'Spain',
    flag: '🇪🇸',
    docPath: 'docs/normativa/cte-hs5.md',
    detectionKeywords: ['españa', 'madrid', 'barcelona', 'spanish', 'cte'],
    defaults: {
      sludgeRate: (temp) => 50,
      scumFactor: 0.25,
      minVolume: 1.5,
      minDepth: 1.0,
      minWidth: 0.75,
      minLength: 1.5,
      dotacion: (use) => ({
        vivienda_unifamiliar: 200,
        vivienda_colectiva: 200,
        restaurante: 200,
        hotel: 200,
        camping: 150,
        oficina: 100,
        industrial: 100,
      }[use] ?? 200),
      timeRetention: (temp) => temp >= 15 ? 1.5 : 2.0,
    },
    dotacion: {
      vivienda_unifamiliar: 200,
      vivienda_colectiva: 200,
      restaurante: 200,
      hotel: 200,
      camping: 150,
      oficina: 100,
      industrial: 100,
    },
    unit: 'L/person/day',
    reference: 'CTE DB-HS 5 / RD 1620/2007',
  },

  epa: {
    code: 'epa',
    name: 'EPA 625/R-06/003 (USA)',
    region: 'USA & most English-speaking countries',
    flag: '🇺🇸',
    docPath: 'docs/normativa/epa-onsite.md',
    detectionKeywords: ['usa', 'united states', 'california', 'texas', 'florida', 'epa'],
    defaults: {
      sludgeRate: (temp) => {
        if (temp >= 20) return 65;
        if (temp >= 10) return 80;
        return 95;
      },
      scumFactor: 0.25,
      minVolume: 3.785,
      minDepth: 1.0,
      minWidth: 0.9,
      minLength: 1.8,
      dotacion: (_use) => 75,  // GPD/bed
      timeRetention: (temp) => {
        if (temp >= 20) return 1.5;
        if (temp >= 10) return 2.0;
        return 2.5;
      },
    },
    dotacion: {
      vivienda_unifamiliar: 75,  // GPD/bed
      vivienda_colectiva: 75,
      restaurante: 50,
      hotel: 60,
      camping: 40,
      oficina: 30,
      industrial: 30,
    },
    unit: 'GPD/bed',
    reference: 'EPA 625/R-06/003',
  },

  // ... uk, au, ras similarly

  can: {  // ← NEW NORM — Only place it needs to be added!
    code: 'can',
    name: 'Canada Onsite (CSA B128)',
    region: 'Canada',
    flag: '🇨🇦',
    docPath: 'docs/normativa/can-onsite.md',
    detectionKeywords: ['canada', 'ontario', 'quebec', 'bc', 'alberta'],
    defaults: {
      sludgeRate: (temp) => {
        if (temp >= 15) return 60;
        if (temp >= 10) return 75;
        return 90;
      },
      scumFactor: 0.25,
      minVolume: 2.0,
      minDepth: 1.0,
      minWidth: 0.8,
      minLength: 1.5,
      dotacion: (_use) => 200,  // L/person/day
      timeRetention: (temp) => {
        if (temp >= 15) return 1.5;
        return 2.5;
      },
    },
    dotacion: { /* ... */ },
    unit: 'L/person/day',
    reference: 'CSA B128:23',
  },
};

/**
 * Get registry entry for a norm code
 */
export function getNormative(norm: Norm): NormativeInfo {
  const entry = NORMS_REGISTRY[norm];
  if (!entry) throw new Error(`Unknown norm: ${norm}`);
  return entry;
}

/**
 * Detect norm from text keywords
 */
export function detectNormFromText(text: string): Norm | null {
  const lowerText = text.toLowerCase();
  
  for (const [norm, info] of Object.entries(NORMS_REGISTRY)) {
    for (const keyword of info.detectionKeywords) {
      if (lowerText.includes(keyword)) {
        return norm as Norm;
      }
    }
  }
  
  return null;
}

/**
 * List all norms (for dropdowns, etc.)
 */
export function listNorms(): NormativeInfo[] {
  return Object.values(NORMS_REGISTRY);
}
```

**Usage everywhere:**

```typescript
// route.ts — replace detectLocation()
const norm = detectNormFromText(lastMessage);
const normInfo = getNormative(norm ?? 'cte');
const normativaMD = await readFile(normInfo.docPath);

// SepticTankCalculator.jsx — use registry for dropdown
const norms = listNorms();
<select>
  {norms.map(n => <option value={n.code}>{n.name}</option>)}
</select>

// septicTank.ts — use registry for defaults
const normInfo = getNormative(input.norm);
const defaults = normInfo.defaults;

// Add test: check registry consistency
describe('NormativeRegistry', () => {
  it('all norms have valid doc paths', () => {
    for (const norm of listNorms()) {
      expect(fs.existsSync(norm.docPath)).toBe(true);
    }
  });
});
```

**Result:**
- ✅ Add new norm = 1 entry in registry + 1 doc file
- ✅ All code auto-detects and uses it
- ✅ Easy to audit (single source of truth)
- ✅ Testable (registry can be tested)

**Effort:** 2 days (mostly copy/paste) | **Files Changed:** 5 (reduced from 9)

---

## 4. DEBT: Weak Tool Typing

### Current State

```typescript
// route.ts:424–463
const toolCalls: any[] = [];  // ← any!

while (true) {
  const { done, value } = await reader.read();
  // ... parse SSE chunks ...
  
  if (delta?.tool_calls) {
    for (const tc of delta.tool_calls) {
      const idx = tc.index ?? 0;
      if (!toolCalls[idx]) {
        toolCalls[idx] = {
          id: tc.id ?? `call_${idx}`,
          type: "function",
          function: { name: "", arguments: "" },  // ← Mutable strings
        };
      }
      if (tc.function?.name) toolCalls[idx].function.name = tc.function.name;
      if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments;  // ← String concat!
    }
  }
}
```

**Problems:**
1. No type checking on tool names
2. Arguments are raw strings (not parsed until line 481)
3. Can't tell if tool is valid until execution time
4. No IDE autocomplete

### Solution: Typed Tool Registry

```typescript
// src/lib/agent/tools/toolRegistry.ts

import {
  calculateSepticTankTool,
  executeCalculateSepticTank,
  type CalculateSepticTankInput,
  type SepticTankResult,
} from './calculateSepticTank';

// Define a tool in the registry
interface ToolDefinition<Input = any, Output = any> {
  definition: object;  // OpenAI/Groq format
  execute: (input: Input) => Promise<Output>;
  inputSchema: zod.ZodType<Input>;  // Or other validation
}

// Registry is strongly typed
export const TOOL_REGISTRY = {
  calculate_septic_tank: {
    definition: calculateSepticTankTool,
    execute: executeCalculateSepticTank,
    inputSchema: CalculateSepticTankInputSchema,
  } as ToolDefinition<CalculateSepticTankInput, SepticTankResult>,

  calculate_drainage_field: {
    // ...
  } as ToolDefinition<DrainageFieldInput, DrainageFieldResult>,

  // ...
} as const;

export type ToolName = keyof typeof TOOL_REGISTRY;

/**
 * Execute a tool with type checking
 */
export async function executeToolTyped<T extends ToolName>(
  toolName: T,
  input: any,
): Promise<Awaited<ReturnType<typeof TOOL_REGISTRY[T]['execute']>>> {
  const toolDef = TOOL_REGISTRY[toolName as keyof typeof TOOL_REGISTRY];
  
  if (!toolDef) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  
  // Validate input
  const validated = toolDef.inputSchema.parse(input);
  
  // Execute
  return toolDef.execute(validated);
}

/**
 * Get all tool definitions for Groq
 */
export function getToolDefinitions() {
  return Object.values(TOOL_REGISTRY).map(t => t.definition);
}
```

**Usage in route.ts:**

```typescript
// BEFORE: any[]
const toolCalls: any[] = [];

// AFTER: Typed
import { TOOL_REGISTRY, ToolName, executeToolTyped } from '@/src/lib/agent/tools/toolRegistry';

const toolCalls: Array<{
  id: string;
  function: { name: ToolName; arguments: string };
}> = [];

// In execution:
const toolName = tc.function.name as ToolName;
if (!TOOL_REGISTRY[toolName]) {
  throw new Error(`Unknown tool: ${toolName}`);
}

try {
  const parsedArgs = JSON.parse(tc.function.arguments);
  const result = await executeToolTyped(toolName, parsedArgs);
  // ✅ Type checking + validation happens here
} catch (e) {
  // Clear error message if tool unknown or validation failed
}
```

**Result:**
- ✅ IDE auto-completion on tool names
- ✅ Runtime validation of inputs
- ✅ Type-safe tool execution
- ✅ Single registry to keep in sync

**Effort:** 2 days | **Files Changed:** 3

---

## Summary: Priority Refactorings

| Debt | Current | Refactored | Effort | Impact |
|------|---------|-----------|--------|--------|
| **Calculation duplication** | 3 sources | 1 source | 4 days | Very High |
| **Fragmented state** | 4 systems | 1 manager | 4 days | Very High |
| **Hard to add norms** | 9 changes | 1 entry | 2 days | High |
| **Weak tool typing** | `any[]` | Typed registry | 2 days | High |

**Total:** ~12 days of focused refactoring → Significantly more maintainable system

