# 🏗️ HydroStack Architecture

**System design, data flow, and component structure.**

---

## 📐 System Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Browser (React 18)                     │
│  ┌────────────────────────────────────────────────────┐ │
│  │              UI Components                          │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │ │
│  │  │ Calculator│  │  3D Diag │  │ Chat Interface   │ │ │
│  │  └──────────┘  └──────────┘  └──────────────────┘ │ │
│  └────────────────────────────────────────────────────┘ │
│               ↓ API calls / Events ↓                     │
│  ┌────────────────────────────────────────────────────┐ │
│  │         Client-Side Logic (src/lib/)               │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │ │
│  │  │Calculations│ │Validation │ │ i18n / State     │ │ │
│  │  └──────────┘  └──────────┘  └──────────────────┘ │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
              ↓ HTTP requests ↓
┌─────────────────────────────────────────────────────────┐
│              Next.js API Server (Node)                   │
│  ┌────────────────────────────────────────────────────┐ │
│  │            API Routes (app/api/)                    │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │ │
│  │  │/chat      │  │/agent    │  │/generate-isometric│ │ │
│  │  └──────────┘  └──────────┘  └──────────────────┘ │ │
│  └────────────────────────────────────────────────────┘ │
│               ↓ External APIs ↓                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │    Anthropic Claude API (Image Generation)         │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Client-Side First** — All calculations happen in the browser
2. **Stateless API** — Server handles I/O only (API calls, image gen)
3. **Zero Database** — No persistence layer (user downloads if needed)
4. **Type-Safe** — Full TypeScript throughout
5. **Bilingual** — Spanish/English support everywhere

---

## 🏢 Layer Architecture

### 1. Presentation Layer (React Components)

**Location:** `src/components/`

**Responsibilities:**
- Render UI
- Handle user input
- Display results
- Manage local component state

**Key Components:**
```
components/
├── Calculators/
│   ├── SepticTankCalculator.tsx     # Main calculator
│   ├── SepticForm.tsx               # Input form
│   └── SepticResults.tsx            # Results display
├── Common/
│   ├── Navbar.tsx                   # Navigation
│   └── LanguageSwitcher.tsx          # Language selection
├── IsometricDiagram.tsx             # 3D diagram renderer
└── HydroAgent/
    ├── ChatWindow.tsx               # Chat UI
    └── MessageList.tsx              # Message display
```

**State Management:**
- Local component state (useState)
- Props drilling for simple data flow
- No global state library needed

### 2. Business Logic Layer (Client-Side)

**Location:** `src/lib/`

**Responsibilities:**
- Calculations
- Validation
- Data transformation
- Language handling

**Modules:**

```
lib/
├── calculations/
│   ├── septic.ts                    # Tank calculations
│   ├── infiltration.ts              # Field calculations
│   └── norms.ts                     # Standard-specific logic
├── validation/
│   └── inputs.ts                    # Parameter validation
├── i18n.tsx                         # Translation strings
└── agent/
    ├── subscenario-detector.ts      # Auto-detection logic
    ├── filter.ts                    # Response filtering
    └── catalog.ts                   # Agent data catalog
```

**Design Principles:**
- Pure functions where possible
- Single responsibility
- Easy to test
- No side effects

### 3. API Layer (Server-Side)

**Location:** `app/api/`

**Responsibilities:**
- Handle HTTP requests
- Call external APIs (Anthropic)
- Generate images/responses
- Error handling

**Endpoints:**

```
api/
├── chat/route.ts                    # Agent chat
├── agent/
│   └── suggest/route.ts             # Next steps
└── generate-isometric/
    └── route.ts                     # Image generation
```

**Request/Response Handling:**
- JSON bodies
- TypeScript types
- Error responses
- Rate limiting (future)

### 4. External Services

**Anthropic Claude API:**
- Image generation prompts
- Optional AI enhancement
- Requires API key

---

## 🔄 Data Flow

### Calculation Flow

```
User Input
    ↓
[Form Validation]
    ↓ Invalid? → Show error
    ↓ Valid
[Client-Side Calculations]
    ├─ Tank volume calculation
    ├─ Field area calculation
    ├─ TRH calculation
    ├─ Compliance check
    └─ Format results
    ↓
[Display Results]
    ├─ Text summary
    ├─ Data table
    ├─ 3D diagram SVG
    └─ Export options
```

### Chat Flow

```
User Message
    ↓
[Language Detection]
    ↓
[Scenario Detection]
    ├─ Keyword analysis
    ├─ Context evaluation
    └─ Confidence scoring
    ↓
[Profile Determination]
    ├─ User type (owner/prof/contractor)
    └─ Expertise level
    ↓
[HTTP POST /api/chat]
    ↓
[Server Processing]
    ├─ Collect context
    ├─ Call Claude API
    └─ Format response
    ↓
[Response Display]
    ├─ Render message
    ├─ Update state
    └─ Store history
```

### Image Generation Flow

```
[SVG Diagram Ready]
    ↓
[User clicks "Generar Imagen"]
    ↓
[HTTP POST /api/generate-isometric]
    ├─ Include diagram data
    └─ Include design context
    ↓
[Server Processing]
    ├─ Generate description
    ├─ Call Claude API
    └─ Create image prompt
    ↓
[Response with Image Info]
    ├─ Status/URL
    ├─ Further instructions
    └─ Alternative services
```

---

## 🗂️ File Organization

### Core Structure

```
project/
├── app/                         # Next.js App Router pages
├── src/
│   ├── components/              # React components
│   ├── lib/                     # Business logic
│   ├── types/                   # TypeScript definitions
│   └── __tests__/               # Tests
├── public/                      # Static assets
├── docs/                        # Documentation
└── [config files]
```

### Calculation Modules

`src/lib/calculations/septic.ts`:
```typescript
interface CalculationInput {
  users: number              // Number of users
  dotacion: number           // L/person/day
  temperatura: number        // °C
  profundidad: number        // m
  norm: string              // Standard ID
  // ...
}

interface CalculationResult {
  volumeM3: number
  fieldAreaM2: number
  trh: number              // hours
  // ... many more fields
}

export function runCalc(input: CalculationInput): CalculationResult
```

### Component Structure

`src/components/Calculators/SepticTankCalculator.tsx`:
```typescript
export default function SepticTankCalculator() {
  const [input, setInput] = useState<CalcInput>(defaults)
  const [results, setResults] = useState<CalcResult | null>(null)
  const [tab, setTab] = useState<'form' | 'results' | 'diagram'>('form')

  const handleCalculate = () => {
    const r = runCalc(input)
    setResults(r)
    setTab('results')
  }

  return (
    <div style={styles.container}>
      {tab === 'form' && <SepticForm ... />}
      {tab === 'results' && <SepticResults ... />}
      {tab === 'diagram' && <IsometricDiagram ... />}
    </div>
  )
}
```

---

## 🔌 Integration Points

### 3D Diagram Integration

**Component:** `IsometricDiagram.tsx`

**Props:**
```typescript
interface IsometricDiagramProps {
  r: CalculationResult          // Calculation results
  projectName?: string
  location?: string
  designer?: string
}
```

**Used in:**
- `SepticTankCalculator` (built-in)
- Can be copied to other calculators

### Agent Integration

**Endpoints:**
- `POST /api/chat` — Chat messages
- `GET /api/agent/suggest` — Next steps

**Client Usage:**
```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: userMessage,
    history: chatHistory,
    userProfile: profile,
    detectedScenario: scenario
  })
})
```

### API Generation Integration

**Endpoint:** `POST /api/generate-isometric`

**Request:**
```json
{
  "prompt": "SVG diagram description",
  "context": { ...designContext },
  "format": "jpeg" | "png"
}
```

**Response:**
```json
{
  "status": "ready" | "generating" | "pending",
  "imageUrl": "...",
  "instructions": "..."
}
```

---

## 🧵 State Management

### Local State (Component Level)

**Used for:**
- Form inputs
- Tab selection
- UI toggles
- Temporary values

**Pattern:**
```typescript
const [input, setInput] = useState<Input>(initialValue)
const [loading, setLoading] = useState(false)
```

### Session State (Browser)

**Used for:**
- User profile (owner/professional)
- Chat history
- Language preference
- Recent calculations

**Storage:**
- sessionStorage (current session)
- localStorage (persistent)

**No Global State:**
- Don't need Redux/Zustand for this app
- Simple data flow
- Props drilling manageable

---

## 🎨 Styling Approach

### CSS-in-JS (Inline Styles)

**No external CSS files** — Everything in component style objects:

```typescript
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  input: {
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px'
  }
  // ...
}

return <div style={styles.container}> ... </div>
```

**Advantages:**
- No CSS file organization needed
- Styles co-located with components
- Dynamic styles easy
- Bundle size smaller

**Disadvantages:**
- Verbose for large projects
- No CSS-in-CSS syntax highlighting
- No cascade/inheritance

### Design System

**Colors:**
- Primary: #2563eb (blue)
- Success: #10b981 (green)
- Error: #ef4444 (red)
- Warning: #f59e0b (orange)
- Neutral: #6b7280 (gray)

**Spacing:**
- Base unit: 8px
- Use multiples: 8, 16, 24, 32, etc.

**Typography:**
- System fonts (no custom fonts)
- Base size: 14px
- Line height: 1.5

---

## 🧪 Testing Architecture

### Test Files

```
__tests__/
├── calculations/
│   └── septic.test.ts           # Calculation tests
├── validation/
│   └── inputs.test.ts           # Validation tests
└── agent/
    └── subscenario-detector.test.ts
```

### Test Patterns

**Calculation Test:**
```typescript
describe('Septic calculations', () => {
  it('calculates tank volume correctly', () => {
    const input = { users: 4, dotacion: 150, ... }
    const result = runCalc(input)
    expect(result.volumeM3).toBeCloseTo(2.4, 1)
  })
})
```

**Component Test:**
```typescript
describe('SepticForm', () => {
  it('renders all input fields', () => {
    const { getByLabelText } = render(<SepticForm ... />)
    expect(getByLabelText(/Usuarios/)).toBeInTheDocument()
  })
})
```

---

## 📈 Performance Considerations

### Bundle Optimization

- Lazy load calculator pages
- No external dependencies (React + TS only)
- Tree-shake unused code
- Minify CSS-in-JS

**Target:** <200 KB minified

### Calculation Performance

- Client-side only (no network latency)
- O(n) operations (linear time)
- All results instant (<100ms)

### Rendering Performance

- React.memo for expensive calculations
- Controlled re-renders
- SVG rendering optimized

**Target:** 60 FPS interactions

### API Performance

- Short response times (<5s)
- Image generation async (user feedback)
- Proper error handling

---

## 🔒 Security Architecture

### Input Validation

```typescript
// All user inputs validated before calculation
const validatedInput = validateCalculatorInput(userInput)
if (!validatedInput.valid) {
  return { error: validatedInput.errors }
}
```

### API Security

- HTTPS only
- No sensitive data in URLs
- API keys in environment (never exposed)
- Request validation
- Error messages safe

### Data Privacy

- No server-side persistence
- Client-side calculations only
- No cookies for tracking
- GDPR compliant

---

## 🔄 Extension Points

### Adding a New Calculator

1. **Create calculation logic:** `src/lib/calculations/new-calc.ts`
2. **Create component:** `src/components/Calculators/NewCalc.tsx`
3. **Create page:** `app/calculators/new-slug/page.tsx`
4. **Register:** Add to module list

### Adding a New Standard

1. **Add norms:** `src/lib/calculations/norms.ts`
2. **Create procedures:** `docs/normativa/new-standard.md`
3. **Update validation:** `src/lib/validation/inputs.ts`
4. **Test:** Add test cases

### Customizing Agent

1. **Edit rules:** `CLAUDE.md`
2. **Update detection:** `src/lib/agent/subscenario-detector.ts`
3. **Add responses:** `src/lib/agent/catalog.ts`

---

## 📊 Dependencies

### Runtime
- `react` — UI framework
- `next` — App framework
- (That's it!)

### Dev
- `typescript` — Type safety
- `vitest` — Testing
- `@types/react`, `@types/node` — Type definitions

**Zero external UI libraries** — Pure CSS/React

---

## 🚀 Deployment Architecture

### Development
```
npm run dev
→ http://localhost:3000
→ Hot reload enabled
→ Full source maps
```

### Production Build
```
npm run build
→ Next.js optimization
→ Minification
→ Code splitting
→ Asset optimization
```

### Deployment
```
Vercel (recommended)
├─ Auto-deploy on push
├─ Edge functions
├─ CDN globally distributed
└─ Zero config needed

OR

Self-hosted
├─ npm run build
├─ npm run start
└─ Node.js server
```

---

## 📝 Architecture Decisions

### Why No Database?
- All results calculated in real-time
- No need for persistence
- Users can export/download if needed
- Simpler, more secure

### Why No Global State Manager?
- Simple prop drilling sufficient
- Each feature self-contained
- Avoids over-engineering
- Faster development

### Why CSS-in-JS Only?
- Single source of truth
- Dynamic styling easy
- Smaller bundle
- Component-scoped styles

### Why TypeScript Everywhere?
- Catches errors early
- Self-documenting code
- Better IDE support
- Refactoring confidence

### Why Next.js?
- Hybrid rendering (static + dynamic)
- Built-in API routes
- Automatic code splitting
- Simple deployment

---

## 🔍 Debugging

### Browser Console
```javascript
// In calculator
window.lastCalcInput
window.lastCalcResult

// In diagram
window.diagramDebug = { scale: 25, svg: ... }
```

### Server Logs
```bash
npm run dev
# Logs appear in terminal
# Check request/response details
```

### Network Tab
- Inspect API calls
- Check response times
- Debug image generation

---

**Last Updated:** May 2026

For implementation details, see [DEVELOPERS.md](./DEVELOPERS.md)
