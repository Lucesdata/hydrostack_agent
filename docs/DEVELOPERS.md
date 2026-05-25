# 👨‍💻 Developer Guide — HydroStack

**How to extend, customize, and develop HydroStack.**

---

## 🎯 Quick Start for Developers

### Prerequisites

1. Node.js 18+
2. npm or yarn
3. Code editor (VS Code recommended)
4. Groq API key (free tier: https://console.groq.com)

### Before Reading This

1. Read [../README.md](../README.md) — Project overview
2. Read [../GETTING_STARTED.md](../GETTING_STARTED.md) — Get it running locally
3. Read [ARCHITECTURE.md](./ARCHITECTURE.md) — System design
4. Come back here for development tasks

---

## 📁 Real Project Structure

```
hydrostack-2/
├── app/                           # Next.js App Router
│   ├── page.tsx                   # Home (route list)
│   ├── layout.tsx                 # Root layout
│   ├── api/
│   │   └── agent/
│   │       └── route.ts           # POST /api/agent (SSE streaming)
│   └── calculators/
│       └── fosa-septica/
│           └── page.tsx
├── src/
│   ├── components/                # React UI (JSX/JS)
│   │   ├── SepticTankCalculator.jsx
│   │   ├── IsometricDiagram.jsx
│   │   ├── IsometricDiagram3D.jsx
│   │   ├── LaminaTecnica.jsx
│   │   ├── Navbar.js
│   │   └── HydroAgent/
│   │       ├── index.js
│   │       ├── markdown.js
│   │       └── [other components]
│   ├── lib/
│   │   ├── agent/                 # LLM + tools
│   │   │   ├── tools/             # 4 modular tools
│   │   │   │   ├── calculateSepticTank.ts
│   │   │   │   ├── calculateDrainageField.ts
│   │   │   │   ├── validateAgainstCte.ts
│   │   │   │   ├── generatePdfReport.ts
│   │   │   │   └── index.ts
│   │   │   ├── subscenario-detector.ts
│   │   │   ├── filter.ts
│   │   │   └── catalog.ts
│   │   ├── calculations/          # Pure logic
│   │   │   ├── septicTank.ts
│   │   │   └── drainageField.ts
│   │   ├── validation/
│   │   │   └── cteValidator.ts
│   │   ├── reports/
│   │   │   └── generatePdfReport.ts
│   │   ├── i18n.js                # Translations (ES/EN)
│   │   └── owner-state.js         # User profile
│   └── __tests__/
│       ├── agent/
│       ├── calculations/
│       └── validation/
├── public/                        # Static assets
├── docs/                          # Documentation
├── package.json
├── tsconfig.json
├── next.config.js
└── [env files]
```

---

## 🛠️ Common Development Tasks

### Task 1: Modify the Calculator Form

**File:** `src/components/SepticTankCalculator.jsx`

This is a **single monolithic component**. It contains:
- Input state (users, dotacion, temperatura, etc.)
- Calculation trigger
- Result display
- Diagram rendering

**To add an input field:**

1. Find the state section (~line 30):
```javascript
const [users, setUsers] = useState(4)
const [dotacion, setDotacion] = useState(150)
// Add your new field:
const [newField, setNewField] = useState(defaultValue)
```

2. Add input element in the form section:
```javascript
<label style={styles.label}>
  My Field (units)
  <input
    type="number"
    value={newField}
    onChange={(e) => setNewField(parseFloat(e.target.value))}
    style={styles.input}
  />
</label>
```

3. Pass to calculation function:
```javascript
const result = calculateSepticTank({
  users, dotacion, temperatura, // existing
  newField,                      // add this
  // ... other params
})
```

4. Update calculation logic:
   - Modify `src/lib/calculations/septicTank.ts` to use `newField`
   - Add tests in `src/__tests__/calculations/septicTank.test.ts`

### Task 2: Modify a Calculation Formula

**File:** `src/lib/calculations/septicTank.ts`

Find the formula:
```typescript
export function calculateSepticTank(input: TankInput): TankResult {
  // Calculation logic here
  const volumeM3 = (input.users * input.dotacion * trh) / 1440
  // ... more calculations
}
```

**To change the formula:**

1. Find the specific calculation (e.g., TRH, volume, etc.)
2. Update the logic:
```typescript
// Old formula
const volumeM3 = (input.users * input.dotacion * trh) / 1440

// New formula (example: different divisor)
const volumeM3 = (input.users * input.dotacion * trh) / 1200
```

3. **Don't forget:**
   - Update related calculations (field size depends on tank volume)
   - Update validation rules in `cteValidator.ts` if needed
   - Add test cases in `src/__tests__/calculations/septicTank.test.ts`
   - Run `npm test` to verify
   - Test with different inputs in browser

4. **Example test:**
```typescript
describe('Tank volume calculation', () => {
  it('calculates correctly with new formula', () => {
    const result = calculateSepticTank({
      users: 4,
      dotacion: 150,
      temperatura: 20,
      norm: 'CTE',
      profundidad: 1.2
    })
    expect(result.volumeM3).toBeCloseTo(2.4, 1)  // Adjust expected value
  })
})
```

### Task 3: Add a New Agent Tool

**This is the main pattern for extending the agent. Each tool has:**
- Definition (OpenAI format for Groq)
- Executor function (async, returns JSON)
- TypeScript types

**Step-by-step:**

1. **Create tool file:** `src/lib/agent/tools/myNewTool.ts`

```typescript
import type { ToolInput } from './index';

// OpenAI format definition
export const myNewToolDef = {
  type: 'function',
  function: {
    name: 'my_new_tool',
    description: 'What this tool does',
    parameters: {
      type: 'object',
      properties: {
        param1: { type: 'string', description: '...' },
        param2: { type: 'number', description: '...' }
      },
      required: ['param1']
    }
  }
};

// Type for this tool's input
export interface ExecuteMyNewToolInput {
  param1: string;
  param2?: number;
}

// Executor function (called by agent)
export async function executeMyNewTool(
  input: ExecuteMyNewToolInput
): Promise<{ result: string; data: unknown }> {
  // Your logic here
  const output = doSomething(input.param1);
  return { result: 'success', data: output };
}
```

2. **Register in tool registry:** Update `src/lib/agent/tools/index.ts`

```typescript
import { myNewToolDef, executeMyNewTool, ExecuteMyNewToolInput } from './myNewTool';

// Add to tools array
export const tools = [
  // ... existing
  myNewToolDef,  // Add this
];

// Add to executor map
export const toolExecutors: Record<string, ToolExecutor> = {
  // ... existing
  my_new_tool: async (input: ToolInput) => {
    return executeMyNewTool(input as ExecuteMyNewToolInput);
  },
};
```

3. **Add to system prompt:** Update `app/api/agent/route.ts`

Find the TOOLS section and add:
```typescript
**\`my_new_tool\`** — What it does.
- When to use: Describe when agent should call this.
- Inputs: param1 (string), param2 (optional number).
- Output: Returns { result, data }.
```

4. **Test it:** Create `src/__tests__/agent/myNewTool.test.ts`

```typescript
import { executeMyNewTool } from '@/src/lib/agent/tools/myNewTool';

describe('myNewTool', () => {
  it('executes successfully', async () => {
    const result = await executeMyNewTool({ param1: 'test' });
    expect(result.result).toBe('success');
  });
});
```

5. **Run tests:**
```bash
npm test -- myNewTool.test.ts
```

### Task 4: Customize Diagram Colors

**File:** `src/components/IsometricDiagram.jsx`

Find the design system object at the top:
```javascript
const DS = {
  house: '#f5f5f5',
  tank: '#06b6d4',
  pipes: '#f97316',
  field: '#22c55e',
  inlet: '#10b981',
  outlet: '#eab308'
}
```

Change any color:
```javascript
const DS = {
  house: '#ffffff',      // Changed from #f5f5f5 (white)
  tank: '#3b82f6',       // Changed from #06b6d4 (blue)
  pipes: '#ef4444',      // Changed from #f97316 (red)
  // ... rest unchanged
}
```

**Test your changes:**
```bash
npm run dev
# Visit http://localhost:3000/calculators/fosa-septica
# Fill form and check diagram colors
```

### Task 5: Update CTE Validation Rules

**File:** `src/lib/validation/cteValidator.ts`

This file checks tank + field against CTE DB-HS 5 and RD 1620/2007.

**To add a new rule:**

```typescript
export function validateAgainstCte(input: ValidateInput): ValidationResult {
  const errors = [];
  const warnings = [];
  
  // Existing rules...
  
  // Add your rule:
  if (input.volumeM3 < 2.0) {
    errors.push({
      field: 'volumeM3',
      message: 'Mínimo 2 m³ por CTE DB-HS 5',
      severity: 'error',
      article: 'CTE DB-HS 5, 4.2.1'
    });
  }
  
  return { errors, warnings, compliant: errors.length === 0 };
}
```

**Test it:**
```bash
npm test -- cteValidator.test.ts
```

### Task 6: Add a New Calculator Page

**This is less common (usually users call agent instead), but here's the pattern:**

**Step 1:** Create calculation module

File: `src/lib/calculations/imhoff-tank.ts`

```typescript
export interface ImhoffInput {
  users: number
  dotacion: number
  // ... other params
}

export interface ImhoffResult {
  volumeArriba: number
  volumeAbajo: number
  // ... other results
}

export function calculateImhoff(input: ImhoffInput): ImhoffResult {
  // Implement calculation logic
  return { volumeArriba: ..., ... }
}
```

**Step 2:** Create React component

File: `src/components/ImhoffTankCalculator.jsx`

```javascript
import { calculateImhoff } from '@/src/lib/calculations/imhoff-tank'

export default function ImhoffTankCalculator() {
  const [input, setInput] = useState({ users: 4, dotacion: 150 })
  const [results, setResults] = useState(null)

  const handleCalculate = () => {
    const r = calculateImhoff(input)
    setResults(r)
  }

  return (
    <div style={styles.container}>
      <input ... onChange={e => setInput({...input, users: parseInt(e.target.value)})} />
      <button onClick={handleCalculate}>Calculate</button>
      {results && <div>{results.volumeArriba}</div>}
    </div>
  )
}
```

**Step 3:** Create page

File: `app/calculators/imhoff-tank/page.tsx`

```typescript
import ImhoffTankCalculator from '@/src/components/ImhoffTankCalculator'

export const metadata = { title: 'Imhoff Tank Calculator' }

export default function ImhoffTankPage() {
  return <ImhoffTankCalculator />
}
```

**Step 4:** Add to home page

Edit `app/page.tsx` and add to the CALCULATORS list:
```typescript
{
  slug: 'imhoff-tank',
  name: 'Tanque Imhoff',
  description: 'Design an Imhoff tank',
  icon: '🏗️',
  ready: true
}
```

---

## 🧪 Testing (Vitest)

### Running Tests

```bash
npm run test              # Run all tests once
npm run test:watch       # Watch mode (re-run on changes)
```

**Note:** Tests use Vitest, not Jest. Same API, faster execution.

### Current Test Coverage

```
src/__tests__/
├── agent/
│   └── toolComposition.test.ts      # Tool chaining tests
├── calculations/
│   ├── septicTank.test.ts           # Tank calculation tests
│   └── drainageField.test.ts        # Field calculation tests
└── validation/
    └── cteValidator.test.ts         # CTE validation tests
```

Run specific test file:
```bash
npm run test -- septicTank.test.ts
npm run test -- agent/toolComposition.test.ts
```

### Writing Calculation Tests

**File:** `src/__tests__/calculations/septicTank.test.ts`

```typescript
import { calculateSepticTank } from '@/src/lib/calculations/septicTank'
import { describe, it, expect } from 'vitest'

describe('Septic tank calculations', () => {
  it('calculates volume correctly', () => {
    const result = calculateSepticTank({
      users: 4,
      dotacion: 150,
      temperatura: 20,
      norm: 'CTE',
      profundidad: 1.2
    })
    
    // Assert expected volume
    expect(result.volumeM3).toBeGreaterThan(0)
    expect(result.volumeM3).toBeLessThan(10) // Sanity check
  })

  it('handles edge case: single user', () => {
    const result = calculateSepticTank({
      users: 1,
      dotacion: 100,
      temperatura: 15,
      norm: 'CTE',
      profundidad: 1.2
    })
    
    expect(result.volumeM3).toBeGreaterThan(0.5)
    expect(result.volumeM3).toBeLessThan(1.5)
  })

  it('respects minimum volume per norm', () => {
    const result = calculateSepticTank({
      users: 1,
      dotacion: 50,
      temperatura: 25,
      norm: 'CTE',
      profundidad: 1.0
    })
    
    // CTE requires minimum volume
    expect(result.volumeM3).toBeGreaterThanOrEqual(2.0)
  })
})
```

### Writing Tool Tests

**File:** `src/__tests__/agent/myNewTool.test.ts`

```typescript
import { executeMyNewTool } from '@/src/lib/agent/tools/myNewTool'
import { describe, it, expect } from 'vitest'

describe('myNewTool', () => {
  it('executes successfully with valid input', async () => {
    const result = await executeMyNewTool({
      param1: 'test',
      param2: 42
    })
    
    expect(result).toHaveProperty('result', 'success')
    expect(result.data).toBeDefined()
  })

  it('handles missing optional params', async () => {
    const result = await executeMyNewTool({ param1: 'test' })
    expect(result.result).toBe('success')
  })
})
```

### Best Practices

- **Arrange-Act-Assert:** Setup → Execute → Verify
- **Descriptive names:** `it('calculates tank volume when users > 4', ...)`
- **Test edge cases:** Single user, max users, boundary values
- **Avoid mocking:** Test real calculation functions, not stubs
- **Use `toBeCloseTo()`** for floating-point comparisons: `expect(2.001).toBeCloseTo(2.0, 2)`

---

## 🌍 Internationalization (i18n)

### How It Works

File: `src/lib/i18n.js`

Simple key-value object for Spanish (ES) and English (EN):

```javascript
export const translations = {
  es: {
    'home.title': 'HydroStack',
    'calculator.users': 'Usuarios',
    'calculator.dotacion': 'Dotación (L/hab/día)',
    // ... many more
  },
  en: {
    'home.title': 'HydroStack',
    'calculator.users': 'Users',
    'calculator.dotacion': 'Dotation (L/person/day)',
    // ... many more
  }
}

// Helper function
export function t(lang, key) {
  return translations[lang]?.[key] || key // Fallback to key if missing
}
```

### Using in Components

```javascript
import { t } from '@/src/lib/i18n'

export default function MyComponent({ lang }) {
  return (
    <div>
      <h1>{t(lang, 'home.title')}</h1>
      <label>{t(lang, 'calculator.users')}</label>
    </div>
  )
}
```

### Language Detection

**In agent (`app/api/agent/route.ts`):**
- Detects language from first message
- Maintains language throughout conversation
- System prompt changes role instructions per language

**In calculator (SepticTankCalculator.jsx):**
- Uses `owner-state.js` for persistent language
- User can toggle via Navbar language switcher

### Adding New Translations

1. **Add to BOTH languages:**

```javascript
export const translations = {
  es: {
    'my.new.key': 'Texto en español',
  },
  en: {
    'my.new.key': 'English text',
  }
}
```

2. **Use in component:**
```javascript
<p>{t(lang, 'my.new.key')}</p>
```

**Rules:**
- **Always add ES and EN together** — Don't forget either one
- **Dot notation for hierarchy:** `calculator.errors.invalidInput`
- **Keep them in sync** — Delete from both if removing
- **Test both languages:** npm run dev → toggle language in UI

---

## 🔐 Type Safety (TypeScript)

### TypeScript Setup

File: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "paths": {
      "@/src/*": ["src/*"]
    }
  }
}
```

**Key settings:**
- `strict: true` — All strict type checking enabled
- `jsx: "react-jsx"` — React 18 JSX transform

### Types Defined Inline

**Note:** There's no separate `src/types/index.ts`. Types are defined in each module:

`src/lib/calculations/septicTank.ts`:
```typescript
export interface TankInput {
  users: number
  dotacion: number
  temperatura: number
  norm: string
  profundidad: number
  // ...
}

export interface TankResult {
  volumeM3: number
  dimensiones: { alto: number; ancho: number; largo: number }
  trh: number
  // ...
}

export function calculateSepticTank(input: TankInput): TankResult { ... }
```

`src/lib/agent/tools/index.ts`:
```typescript
export interface ToolInput {
  [key: string]: unknown;
}

export interface ToolExecutor {
  (input: ToolInput): Promise<unknown>;
}
```

### Best Practices

- **Define types near usage** — Keep them in the same file as functions
- **Avoid `any`** — Use `unknown` and narrow types
- **Use unions** for options: `type Language = 'es' | 'en'`
- **Run type check:** `npm run build` includes TypeScript check
- **No test runs before build** — Build fails if types are wrong

---

## 🎨 Styling Guidelines

### CSS-in-JS Pattern (Inline Styles Only)

All styling uses inline style objects. No external CSS files:

```javascript
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: 'system-ui, sans-serif'
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit'
  },
  inputFocus: {
    borderColor: '#2563eb',
    outline: 'none'
  }
}

// In JSX, use onFocus/onBlur for interactive states:
<input
  style={focusedField === 'users' ? {...styles.input, ...styles.inputFocus} : styles.input}
  onFocus={() => setFocusedField('users')}
  onBlur={() => setFocusedField(null)}
/>
```

### Color Palette

```javascript
const colors = {
  primary: '#2563eb',      // Blue
  success: '#10b981',      // Green
  error: '#ef4444',        // Red
  warning: '#f59e0b',      // Orange
  gray: '#6b7280',         // Neutral gray
  lightGray: '#f3f4f6',    // Very light
  darkGray: '#1f2937'      // Very dark
}
```

**Example: Dynamic colors**
```javascript
const buttonStyle = {
  ...styles.button,
  backgroundColor: isLoading ? colors.gray : colors.primary,
  cursor: isLoading ? 'not-allowed' : 'pointer'
}
```

### Responsive Design

**Inline styles don't support media queries.** Use JavaScript instead:

```javascript
const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0)

useEffect(() => {
  const handleResize = () => setWindowWidth(window.innerWidth)
  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [])

const isTablet = windowWidth >= 768
const isMobile = windowWidth < 640

const styles = {
  container: {
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    padding: isMobile ? '10px' : '20px'
  }
}
```

**Or simpler — just use CSS percentages and flexbox:**
```javascript
const styles = {
  container: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px'
  },
  item: {
    flex: '1 1 300px'  // Grows/shrinks, min 300px
  }
}
```

---

## 🚀 Building & Deployment

### Development Setup

```bash
# Install dependencies
npm install

# Create .env.local with API key
echo "GROQ_API_KEY=your-key-here" > .env.local

# Start dev server
npm run dev
# → http://localhost:3000
# → Hot reload enabled
# → Full source maps
```

### Type Check & Build

```bash
# Check for TypeScript errors
npm run build
# This includes: type checking + Next.js build + optimization
# Output: .next/ folder
# Time: 2-3 minutes

# If build fails: check error messages (usually missing types)
```

### Testing Before Deploy

```bash
# Run all tests
npm run test

# Test production build locally
npm run build
npm run start
# → Serves optimized code
# → Closest to production
# → Use this to verify everything works
```

### Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI (once)
npm install -g vercel

# Deploy from project root
cd /path/to/hydrostack-2
vercel

# First deploy: follow prompts
# - Link to GitHub repo
# - Set environment: GROQ_API_KEY
# - Auto-deploys on git push after that
```

### Deploy to Other Hosts (Self-Hosted)

**Requirements:**
- Node.js 18+
- npm or yarn
- GROQ_API_KEY environment variable

**Steps:**
```bash
# On your server:
cd /app/hydrostack-2

# Install & build
npm install
npm run build

# Start server
npm run start
# Listens on http://localhost:3000

# Reverse proxy with nginx/caddy
# Or use process manager (PM2, systemd, Docker)
```

**Docker example:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
ENV GROQ_API_KEY=your-key
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t hydrostack .
docker run -e GROQ_API_KEY=xxx -p 3000:3000 hydrostack
```

---

## 🔍 Debugging

### Browser DevTools

**Console in calculator:**
```javascript
// Check what's being calculated
window.lastResult
// or log from component: console.log(results)

// Check calculation errors
// Try different inputs and watch calculation output
```

**Network tab for agent:**
- Click `/api/agent` request
- Watch **Response** tab as it streams
- Should see `data: {...}` lines (SSE format)
- Check for errors or malformed JSON

**React DevTools (Browser Extension):**
- Install: https://react-devtools-extension.com/
- Inspect HydroAgent component state
- Check messages array
- Profile rendering (Profiler tab)

### Server Logs

```bash
npm run dev

# Terminal output shows:
# - Next.js build process
# - API route logs (if you add console.log)
# - Groq API errors
# - Tool execution results

# Example: Add logging to a tool:
console.log('Tool input:', input)
const result = executeCalculation(input)
console.log('Tool result:', result)
```

### Common Issues & Solutions

| Problem | Check | Solution |
|---------|-------|----------|
| "Groq API key not set" | `.env.local` file | `echo "GROQ_API_KEY=xxx" > .env.local` |
| Chat doesn't respond | Network tab: POST /api/agent | Check response for errors |
| PDF tool fails | Server logs | Check pdfkit installed: `npm ls pdfkit` |
| Calculator won't compute | Browser console | Check for JS errors in calculation |
| Build fails | Run `npm run build` | TypeScript error? Check error message |
| Tests fail | Run `npm test -- -t "test name"` | Debug specific test |
| Port 3000 in use | `lsof -i :3000` | Kill: `kill -9 <PID>` |

### Debugging a Specific Tool

**Example: Debug `calculateSepticTank` tool**

1. Add logging to the tool:
```typescript
// src/lib/agent/tools/calculateSepticTank.ts
export async function executeCalculateSepticTank(input: ExecuteToolInput) {
  console.log('🔧 calculateSepticTank input:', input)
  
  const result = calculateSepticTank({...})
  
  console.log('🔧 calculateSepticTank output:', result)
  return result
}
```

2. Start dev server and watch logs:
```bash
npm run dev 2>&1 | grep "calculateSepticTank"
```

3. Call agent with a test message that triggers the tool
4. Check server logs for input/output

---

## 📊 Performance Optimization

### Bundle Size

Check what's in the build:

```bash
npm run build
# Look for: "pages" and "size" output
# Should be < 500 KB for /api/agent route

# Tools like `next/bundle-analyzer` can help (optional)
npm install -D @next/bundle-analyzer
# Add to next.config.js and re-run build
```

### React Component Memoization

Use when a component is expensive to render:

```javascript
import { memo } from 'react'

const IsometricDiagram = memo(function Diagram(props) {
  // Only re-renders if props change
  return <svg>{...}</svg>
})

export default IsometricDiagram
```

### Lazy Load Heavy Components

```javascript
import dynamic from 'next/dynamic'

// Load 3D viewer only when user clicks it
const IsometricDiagram3D = dynamic(
  () => import('@/src/components/IsometricDiagram3D'),
  { loading: () => <p>Loading 3D view...</p> }
)
```

### Minimize Tool Chain Rounds

Each tool round = new Groq API call. Reduce if possible:
- Combine multiple checks into one tool
- Cache intermediate results (future feature)
- Limit context size (already done: `MAX_NORMATIVA_CHARS`)

---

## 🔒 Security Best Practices

### Environment Variables

**Never commit secrets to git:**

```bash
# .gitignore
.env.local
.env.*.local

# Example .env.local (NEVER commit this):
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk_xxx (optional)
```

**In production:**
- Set via Vercel dashboard (recommended)
- OR environment variables on server
- Never hardcode keys

### Input Validation

Calculator and validation always run on real input:

```javascript
// src/lib/validation/cteValidator.ts
export function validateAgainstCte(input) {
  const errors = []
  
  if (input.volumeM3 < 2.0) {
    errors.push({ field: 'volumeM3', message: 'Min 2 m³' })
  }
  
  return { valid: errors.length === 0, errors }
}
```

**Use in component:**
```javascript
const validation = validateAgainstCte(results)
if (!validation.valid) {
  setErrors(validation.errors)
}
```

### API Security

**Groq API:**
- API key only stored in environment (server-side)
- Never sent to browser
- HTTPS by default on Groq endpoints
- Rate limiting protects against abuse

**Message inputs:**
- No SQL/shell injection risk (no database, no system calls)
- Tool outputs sanitized before re-injection to LLM
- Message length limits prevent token exhaustion

### HTTPS Only

```bash
# Development: http://localhost:3000 OK for testing
npm run dev

# Production: Always HTTPS
# Vercel: automatic HTTPS
# Self-hosted: use nginx/Caddy with Let's Encrypt cert
```

---

## 📚 Additional Resources

### HydroStack Documentation
- [../README.md](../README.md) — Project overview & features
- [../GETTING_STARTED.md](../GETTING_STARTED.md) — Quick setup guide
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System design & data flow
- [CLAUDE.md](../CLAUDE.md) — Agent rules & instructions

### Code Examples
- Tests: `src/__tests__/` — Vitest examples for calculations
- Components: `src/components/` — React patterns (JSX/CSS-in-JS)
- Tools: `src/lib/agent/tools/` — How to write tools
- Calculations: `src/lib/calculations/` — Pure math logic

### External Documentation
- [Next.js 14 Docs](https://nextjs.org/docs) — App Router, API routes
- [React 18 Docs](https://react.dev) — Hooks, components
- [TypeScript Docs](https://www.typescriptlang.org/docs) — Type system
- [Vitest Docs](https://vitest.dev) — Testing framework
- [Groq API](https://console.groq.com/docs) — LLM models & tool calling

---

## 💡 Tips & Tricks

### Hot Module Reload (HMR)

```bash
npm run dev
# Changes to JS/JSX/CSS auto-refresh in browser
# State might reset on component changes
# Full page reload: Cmd+R / Ctrl+R if needed
```

### Type Checking Without Building

```bash
# Check types only (faster than full build):
npm run build  # Includes type check at start

# Run tests to catch logic errors:
npm run test
```

### Test in Watch Mode (TDD)

```bash
npm run test
# Re-runs tests on file changes
# Great for TDD workflow
# Type `q` to quit, `w` to show file filters
```

### Quick Restart Server

```bash
# If server gets stuck:
Ctrl+C  # Stop npm run dev
npm run dev  # Restart

# Or in another terminal:
lsof -i :3000  # Find process
kill -9 <PID>
npm run dev
```

### Inspect Network Requests

```bash
npm run dev
# Open DevTools → Network tab
# Watch POST /api/agent requests
# Response should be `text/event-stream` (SSE)
# See individual `data:` chunks streaming in
```

---

## 🤝 Contributing & Committing

### Before Committing

1. **Run tests locally:**
```bash
npm run test
# Should show: "✓ 29 tests passed"
```

2. **Build check:**
```bash
npm run build
# Should complete with no errors
```

3. **Manual testing:**
- Try your feature in browser
- Test both calculator and chat
- Test both Spanish and English

### Commit Guidelines

**Format:**
```
type(scope): short summary

Optional longer explanation of why

Fixes #123 (if closing an issue)
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `test:` Add/update tests
- `docs:` Documentation only
- `refactor:` Code cleanup (no behavior change)

**Examples:**
```
feat(agent): add new validate_against_cte tool
fix(calculator): prevent division by zero
test(calculations): add septic tank edge cases
docs(DEVELOPERS): update instructions for new tool
```

### Making a Change

1. Create branch (optional):
```bash
git checkout -b my-feature-name
```

2. Edit files and test locally

3. Commit your work:
```bash
git add src/lib/calculations/myfile.ts
git commit -m "feat(calc): improve tank volume formula"
```

4. Push and create PR on GitHub

---

## 📞 Getting Help

### Self-Service Debugging

1. **Check existing docs:**
   - [ARCHITECTURE.md](./ARCHITECTURE.md) — System design
   - [../GETTING_STARTED.md](../GETTING_STARTED.md) — Setup issues
   - [../README.md](../README.md) — Feature overview
   - [CLAUDE.md](../CLAUDE.md) — Agent rules

2. **Check the code:**
   - `src/__tests__/` — Examples of how things work
   - `src/lib/calculations/septicTank.ts` — Calculation logic
   - `app/api/agent/route.ts` — Full agent flow

3. **Check error messages:**
   - Read full error stack in terminal
   - Search for error message in docs
   - Check GitHub Issues (closed issues often have solutions)

### Debugging Checklist

**If something doesn't work:**
- [ ] `.env.local` has `GROQ_API_KEY` set
- [ ] `npm run build` passes (no TypeScript errors)
- [ ] `npm test` shows all tests passing
- [ ] Browser console has no errors (DevTools)
- [ ] Network tab shows `/api/agent` response is SSE stream
- [ ] Port 3000 not already in use: `lsof -i :3000`

### Report a Bug

Create a GitHub issue with:
- **What you tried:** "I clicked the calculator button"
- **What happened:** Error message from browser console or terminal
- **What you expected:** Should show results
- **Your environment:** `node --version`, OS, browser

Example:
```
Title: "Calculator won't compute with 4 users"

Error:
TypeError: Cannot read property 'volumeM3' of undefined
  at SepticTankCalculator.jsx:42

Steps:
1. Go to /calculators/fosa-septica
2. Enter 4 users, 150 L/person/day
3. Click "Calculate"
4. Error appears in console

Environment: Node 18.17.0, macOS 14, Chrome 120
```

### Request a Feature

Create an issue titled: `[Feature] Description of what you want`

Include:
- **Why you need it:** Use case or problem it solves
- **Suggested approach:** How you might implement it
- **Linked issue:** Is it related to an existing issue?

---

## 🎓 Learning Path

**New to the project?**

1. Read [../README.md](../README.md) (2 min)
2. Run `npm run dev` and explore (5 min)
3. Read [ARCHITECTURE.md](./ARCHITECTURE.md) → System Overview section (10 min)
4. Read this file's **Quick Start** section (5 min)
5. Try a simple task: modify a color in IsometricDiagram.jsx (15 min)

**Want to add a tool?**

1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) → API Layer section
2. Read **Task 3: Add a New Agent Tool** in this file
3. Copy `src/lib/agent/tools/calculateSepticTank.ts` as template
4. Follow the step-by-step in Task 3

**Want to fix a calculation?**

1. Run `npm test` to see what's failing
2. Look at test in `src/__tests__/calculations/septicTank.test.ts`
3. Find calculation in `src/lib/calculations/septicTank.ts`
4. Update formula and re-run `npm test`

---

**Last Updated:** May 2026

**Quick Links:**
- Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Getting Started: [../GETTING_STARTED.md](../GETTING_STARTED.md)
- Agent Rules: [../CLAUDE.md](../CLAUDE.md)
- Project Home: [../README.md](../README.md)
