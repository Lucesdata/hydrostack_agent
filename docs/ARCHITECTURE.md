# 🏗️ HydroStack Architecture

**System design, data flow, and component structure.**

---

## 📐 System Overview

```
┌──────────────────────────────────────────────────────────┐
│                  Browser (React 18)                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │            UI Components                           │  │
│  │  ┌────────────┐  ┌───────────┐  ┌──────────────┐ │  │
│  │  │ Calculator │  │ 3D Diagr. │  │ Chat Agent   │ │  │
│  │  │  (Septic)  │  │ (Isometric│  │ (Streaming)  │ │  │
│  │  └────────────┘  └───────────┘  └──────────────┘ │  │
│  └───────────────────────────────────────────────────┘  │
│              ↓ HTTP (SSE for streaming) ↓               │
└──────────────────────────────────────────────────────────┘
              ↓
┌──────────────────────────────────────────────────────────┐
│              Next.js API Server (Node 18+)               │
│  ┌───────────────────────────────────────────────────┐  │
│  │    Single Unified Endpoint: POST /api/agent       │  │
│  │                                                    │  │
│  │  ├─ Message history & context                     │  │
│  │  ├─ User profile detection (owner/prof/...)       │  │
│  │  ├─ Subscenario auto-detection                    │  │
│  │  └─ Tool chaining (4 modular tools)               │  │
│  └───────────────────────────────────────────────────┘  │
│         ↓ External API Integration ↓                    │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Groq API (llama-3.3-70b-versatile)               │  │
│  │  + Streaming SSE responses + Tool execution       │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Agent-Centric** — Conversational UI drives the system (chat interface)
2. **Server-Side LLM** — Groq inference on every message, tool orchestration
3. **Modular Tools** — 4 chainable tools (tank → drainage → validation → PDF)
4. **Streaming First** — SSE responses for real-time user feedback
5. **Zero Database** — No persistence (results downloadable)
6. **Type-Safe** — Full TypeScript in all server tools
7. **Bilingual** — Spanish/English auto-detected from message

---

## 🏢 Layer Architecture

### 1. Presentation Layer (React Components)

**Location:** `src/components/`

**Responsibilities:**
- Render chat UI and calculator
- Handle user input
- Stream messages via SSE
- Display calculation results
- Manage local component state

**Key Components:**
```
components/
├── SepticTankCalculator.jsx         # Main calculator UI
├── IsometricDiagram.jsx             # 2D/isometric SVG diagram
├── IsometricDiagram3D.jsx           # 3D Babylon.js viewer
├── LaminaTecnica.jsx                # Technical report view
├── Navbar.js                        # Navigation + language switcher
└── HydroAgent/                      # Chat agent UI
    ├── index.js                     # Main chat component
    ├── markdown.js                  # Markdown rendering for responses
    └── [other message components]
```

**State Management:**
- Local component state (useState)
- SSE event listeners for streaming responses
- Message history in state
- No global state library needed

### 2. Business Logic Layer (Server-Side + Shared)

**Location:** `src/lib/`

**Responsibilities:**
- LLM orchestration (agent logic)
- Tool execution & chaining
- Calculation engines
- Validation rules
- PDF report generation
- Language detection

**Modules:**

```
lib/
├── agent/
│   ├── tools/                       # 4 modular tools
│   │   ├── calculateSepticTank.ts   # Tank sizing (CTE DB-HS 5)
│   │   ├── calculateDrainageField.ts # Field sizing
│   │   ├── validateAgainstCte.ts    # Regulatory validation
│   │   ├── generatePdfReport.ts     # Multi-page PDF output
│   │   └── index.ts                 # Tool registry & executor
│   ├── subscenario-detector.ts      # Auto-detect user scenario
│   ├── filter.ts                    # Response formatting
│   └── catalog.ts                   # Static reference data
├── calculations/
│   ├── septicTank.ts                # Pure tank calculation logic
│   └── drainageField.ts             # Pure field calculation logic
├── validation/
│   └── cteValidator.ts              # CTE DB-HS 5 / RD 1620/2007 rules
├── reports/
│   └── generatePdfReport.ts         # PDF generation (pdfkit)
├── i18n.js                          # Translation strings (ES/EN)
└── owner-state.js                   # User profile persistence
```

**Design Principles:**
- Pure calculation functions (no side effects)
- Tools are async & chain results
- Single responsibility per tool
- Validation rules isolated
- Tests in `src/__tests__/` mirroring structure

### 3. API Layer (Server-Side Only)

**Location:** `app/api/`

**Responsibilities:**
- Handle HTTP requests from frontend
- Manage Groq API connection
- Stream SSE responses
- Execute tools sequentially
- Error handling & retries

**Endpoints:**

```
api/
└── agent/
    └── route.ts                     # POST — streaming chat endpoint
                                      # Input: { messages, userProfile, etc }
                                      # Output: SSE stream of agent responses
```

**Architecture:**
- **Single endpoint** — `/api/agent` handles all chat
- **Streaming SSE** — Real-time response chunks
- **Tool Chaining** — Injects tool results into next LLM round
- **Retry Logic** — Exponential backoff for Groq 429 (rate limit)
- **Token Budget** — Fixed max_tokens per round to stay under Groq free tier

**Key Implementation:**
- Groq model: `llama-3.3-70b-versatile` (respects OpenAI tool format)
- Tool definitions sent in EVERY round (not just round 0)
- `injectPreviousOutputs()` substitutes real tool results before next LLM call
- Max 6 tool rounds allows chaining: tank → drainage → validation → PDF

### 4. External Services

**Groq API:**
- Primary LLM: `llama-3.3-70b-versatile`
- Function calling (tool execution)
- Streaming completions
- Free tier: 100k tokens/day, ~14.4 RPM

**Optional (installed but not required):**
- Anthropic Claude API (for image generation)
- Google Generative AI
- Babylon.js (3D rendering)

---

## 🔄 Data Flow

### Calculator Flow (Standalone)

```
User Input in SepticTankCalculator.jsx
    ├─ users, dotacion, temperature, depth, norm, ...
    ↓
[Client-side validation]
    ├─ Check ranges (users >= 1, depth > 0, ...)
    └─ Show errors if invalid
    ↓
[Pure calculation functions]
    ├─ calculateSepticTank() from septicTank.ts
    ├─ calculateDrainageField() from drainageField.ts
    └─ Format results
    ↓
[Display Results]
    ├─ Text summary (volumes, dimensions, ...)
    ├─ Data table with key values
    ├─ SVG diagram (IsometricDiagram.jsx)
    ├─ Optional: 3D viewer (IsometricDiagram3D.jsx with Babylon.js)
    └─ Optional: Technical report view (LaminaTecnica.jsx)
    
Note: Calculator is fully offline (no API calls).
Tool chain in agent is alternative, conversational path.
```

### Chat Flow (Agent-Driven)

```
User Message in HydroAgent UI
    ↓
[Client detects language: ES or EN]
    ↓
[POST /api/agent]
├─ body: { messages: [...history], userProfile?: 'owner'|'prof'|..., ... }
│
[Server: /api/agent/route.ts]
│   ├─ Detect subscenario (if owner + not yet detected)
│   ├─ Build system prompt (role-specific instructions)
│   ├─ Send to Groq with tools
│   │
│   └─ Groq Response Loop (max 6 rounds):
│       ├─ Round 0: User message → agent thinks
│       ├─ Agent decides: need tools?
│       │   ├─ YES → Round 1: execute calculate_septic_tank
│       │   │         ↓ inject result
│       │   │         Round 2: execute calculate_drainage_field
│       │   │         ↓ inject result
│       │   │         Round 3: execute validate_against_cte
│       │   │         ↓ inject result
│       │   │         Round 4: execute generate_pdf_report
│       │   │         ↓ inject result
│       │   │         Round 5: summarize for user
│       │   │
│       │   └─ NO → Direct text response to user
│       │
│       └─ Exit on: tool exec error OR no more tool calls
    ↓
[Stream response as SSE chunks]
    ↓
[Frontend HydroAgent receives chunks]
    ├─ Append to message history
    ├─ Render markdown
    ├─ Parse tool outputs if present
    └─ Display final response
```

### PDF Report Generation (via Tool Chain)

```
User asks agent: "Dame un reporte PDF para presentar"
    ↓
[Agent executes tool chain in /api/agent]
    ├─ Tool 1: calculate_septic_tank → volume, dims
    ├─ Tool 2: calculate_drainage_field → area, depth
    ├─ Tool 3: validate_against_cte → warnings, passed
    └─ Tool 4: generate_pdf_report → binary PDF + base64
    ↓
[Server returns PDF to client via SSE]
    ├─ Encoded in response chunk
    └─ Frontend decodes and offers download
    
Report includes:
- Project info & design inputs
- Tank & field calculations
- CTE compliance matrix
- Technical diagrams (SVG embedded)
- Regulatory references
```

---

## 🗂️ File Organization

### Core Structure

```
project/
├── app/                         # Next.js App Router
│   ├── page.tsx                 # Home page (list of routes)
│   ├── layout.tsx               # Global layout
│   ├── api/
│   │   └── agent/
│   │       └── route.ts         # POST /api/agent (SSE streaming)
│   └── calculators/
│       └── fosa-septica/
│           └── page.tsx         # Calculator page
├── src/
│   ├── components/              # React UI components (JSX/JS)
│   ├── lib/                     # Business logic (TS)
│   └── __tests__/               # Tests (TS/TSX)
├── public/                      # Static assets
├── docs/                        # Documentation
└── [config files: tsconfig.json, next.config.js, package.json, ...]
```

### Agent Tools (4 Modular)

`src/lib/agent/tools/`:
```typescript
// Each tool: definition + executor

calculateSepticTank.ts
├─ calculateSepticTankTool     // OpenAI format def
├─ executeCalculateSepticTank  // Async executor
└─ types: ExecuteToolInput

calculateDrainageField.ts
├─ calculateDrainageFieldTool
├─ executeCalculateDrainageField
└─ types: ExecuteDrainageFieldInput

validateAgainstCte.ts
├─ validateAgainstCteTool      // Read-only check
├─ executeValidateAgainstCte
└─ types: ExecuteValidateAgainstCteInput

generatePdfReport.ts
├─ generatePdfReportTool       // PDF generation
├─ executeGeneratePdfReport
└─ types: ExecuteGeneratePdfReportInput

index.ts
├─ tools[]                      // All definitions for Groq
├─ toolExecutors{}              // Registry for execution
└─ executeTool(name, input)     // Router function
```

### Calculation Engine

`src/lib/calculations/`:
```typescript
septicTank.ts
├─ interface TankInput
├─ interface TankResult
├─ calculateSepticTank(input): TankResult   // Pure function
└─ helper functions for subcomponents

drainageField.ts
├─ interface FieldInput
├─ interface FieldResult
├─ calculateDrainageField(input): FieldResult
└─ helper functions
```

### Component Structure

`src/components/SepticTankCalculator.jsx`:
```javascript
// Single-file calculator with:
// - Form input handlers
// - Calculation trigger
// - Result state
// - Tab switching (form → results → diagram)
// - Imports IsometricDiagram.jsx
```

`src/components/HydroAgent/index.js`:
```javascript
// Chat UI component
// - Message input field
// - Message history display
// - SSE listener for streaming responses
// - Message rendering with markdown.js
```

---

## 🔌 Integration Points

### Diagram Integration

**Component:** `IsometricDiagram.jsx`

**Props:**
```javascript
{
  r: { volumeM3, dimensions, ... },  // Result object
  projectName?: string,
  location?: string,
  designer?: string
}
```

**Used in:**
- `SepticTankCalculator` — Shows diagram in results tab
- Standalone: `<IsometricDiagram r={results} />`

**Variants:**
- `IsometricDiagram.jsx` — 2D SVG (fast, responsive)
- `IsometricDiagram3D.jsx` — 3D Babylon.js viewer (optional, heavy)

### Agent Integration

**Single Endpoint:** `POST /api/agent`

**Client:**
```javascript
const eventSource = new EventSource('/api/agent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: '...' }, ...],
    userProfile: 'owner',                // optional
    // country, language auto-detected
  })
})

eventSource.onmessage = (event) => {
  // Append event.data to chat history
  // Parse tool outputs if present
}
```

**Response Format (SSE chunks):**
```
data: {"type":"message","content":"Hello..."}
data: {"type":"tool_call","tool":"calculate_septic_tank",...}
data: {"type":"tool_result","output":{...}}
...
data: {"type":"done"}
```

### Tool Execution Chain

**Frontend → /api/agent:**
- Sends user message + history

**Server → Groq:**
- Round 0: User query → agent decides
- Round 1-5: Tool execution loop
  - If agent calls `calculate_septic_tank` → execute locally, return result
  - If agent calls `calculate_drainage_field` → inject prev result, execute
  - etc.

**Server → Frontend (SSE):**
- Streams each tool call, result, and final message

---

## 🧵 State Management

### Local State (Component Level)

**Calculator (SepticTankCalculator.jsx):**
```javascript
const [input, setInput] = useState({ users, dotacion, ... })
const [results, setResults] = useState(null)
const [tab, setTab] = useState('form')  // form | results | diagram
```

**Chat (HydroAgent/index.js):**
```javascript
const [messages, setMessages] = useState([])
const [loading, setLoading] = useState(false)
const [subscenario, setSubscenario] = useState(null)
```

### Session State (Browser)

**Persisted by:**
- `src/lib/owner-state.js` — User profile, language preference
- localStorage in HydroAgent — Chat history (optional)

**Data:**
- `userProfile` (owner|prof|contractor|exploring)
- `language` (es|en, auto-detected)
- `subscenario` (installation|active-failure|preventive|abandoned)

### No Global State Manager

- Props drilling is minimal
- Each page (calculator, chat) is isolated
- No shared Redux/Zustand needed

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

### Calculator Performance

**Client-side only:**
- No network latency
- O(n) math operations (linear time)
- Results instant (<100ms)
- Diagram rendering: SVG optimized (~50ms)

### Agent Performance

**Groq API constraints:**
- Free tier: 100k tokens/day, ~14.4 requests/min
- First response: 3-8s (LLM thinking + tool chain)
- Tool execution: 0.5-2s per tool
- SSE streaming: real-time chunks visible

**Budget management:**
- `MAX_TOKENS_ROUND0 = 700` (input reasoning)
- `MAX_TOKENS_FOLLOWUP = 500` (post-tool summary)
- `MAX_NORMATIVA_CHARS = 2200` (limit context)

### Bundle Optimization

- No external UI library
- Lazy load 3D viewer (Babylon.js)
- CSS-in-JS only
- Tree-shake unused code

**Typical bundle:** ~250 KB (Next.js optimized)

---

## 🔒 Security Architecture

### Input Validation

**Calculator:**
- Range checks (users >= 1, depth > 0.5m, etc.)
- Numeric type validation
- Standard validation (norm exists)
- `src/lib/validation/cteValidator.ts`

**Agent:**
- Message length limits (prevent token exhaustion)
- Tool output sanitization
- No raw SQL/command construction

### API Security

**Environment:**
- `.env.local` (dev) / environment vars (prod)
- `GROQ_API_KEY` required
- `ANTHROPIC_API_KEY` optional
- Never exposed in client

**Groq API:**
- Streaming over HTTPS
- Rate limiting (free tier enforced)
- Error messages are safe (no stack traces)

### Data Privacy

- **No database** — calculations never stored
- **Client-side calculations** — calculator fully offline
- **Agent chats** — not persisted (in-memory only, session-scoped)
- **No tracking cookies** — user privacy preserved
- **GDPR compliant** — no PII collection

---

## 🔄 Extension Points

### Adding a New Tool to Agent

1. **Create executor:** `src/lib/agent/tools/myNewTool.ts`
   - Export tool definition (OpenAI format)
   - Export async executor function
2. **Register:** Update `src/lib/agent/tools/index.ts`
   - Add to `tools[]` array
   - Add to `toolExecutors{}` map
3. **Add to system prompt:** `app/api/agent/route.ts`
   - Document when to use it
   - Add to TOOLS section
4. **Test:** Create test in `src/__tests__/agent/`

### Adding a New Standard/Norm

1. **Update logic:** `src/lib/calculations/septicTank.ts` or `drainageField.ts`
   - Add new norm ID to switch/if
   - Implement calculation differences
2. **Update validation:** `src/lib/validation/cteValidator.ts`
   - Add norm-specific rules
3. **Update system prompt:** `app/api/agent/route.ts`
   - Document the standard
4. **Test:** Add cases in `src/__tests__/`

### Customizing Agent Behavior

1. **Rules:** Edit `CLAUDE.md` (project instructions)
   - Changes apply to all new conversations
2. **Profile detection:** `src/lib/agent/subscenario-detector.ts`
   - Modify keywords or confidence logic
3. **Response formatting:** `src/lib/agent/filter.ts`
   - Add response filters or post-processing

---

## 📊 Dependencies

### Runtime (Essential)
- `react@18` — UI framework
- `next@14.2.3` — App framework

### Runtime (Agent & Calculations)
- `pdfkit@0.18.0` — PDF report generation
  - Note: `.afm` font files need `serverComponentsExternalPackages` in next.config.js

### Runtime (Optional, Installed but Not Required)
- `@anthropic-ai/sdk` — Claude API (for image generation)
- `@babylonjs/core`, `babylonjs` — 3D rendering
- `@google/generative-ai` — Google Gemini (alternative LLM)

### Dev
- `typescript` — Type safety
- `vitest` — Test runner
- `@types/react`, `@types/node`, `@types/pdfkit` — Type defs
- `eslint`, `eslint-config-next` — Linting

**Zero external UI libraries** — CSS-in-JS inline styles only

---

## 🚀 Deployment Architecture

### Development
```bash
npm run dev
# Runs on http://localhost:3000
# Hot reload enabled (HMR)
# Full source maps
# Groq API: use .env.local GROQ_API_KEY
```

### Production Build
```bash
npm run build
# Next.js optimization
# Minification + tree-shaking
# Code splitting per page
# Output: .next/ folder

npm run start
# Serves optimized build
# Closest to production behavior
```

### Deployment Options

**Vercel (Recommended):**
```
- Auto-deploy on git push
- Edge Functions available
- CDN globally distributed
- Environment variables via dashboard
- Zero-config setup
```

**Self-Hosted:**
```bash
# Requirements: Node.js 18+, npm/yarn
npm run build
npm run start  # or use PM2, systemd, Docker
# Env vars: GROQ_API_KEY (required)
```

**Docker (Self-Hosted):**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
ENV GROQ_API_KEY=your-key
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Configuration

**Required:**
- `GROQ_API_KEY` — Groq API key for LLM

**Optional:**
- `ANTHROPIC_API_KEY` — Claude API (for image gen)
- `GOOGLE_API_KEY` — Google Generative AI

All must be set before `npm run dev` or deployment

---

## 📝 Architecture Decisions

### Single `/api/agent` Endpoint
- **Why:** Unified LLM interface + tool orchestration
- **Tradeoff:** Requires streaming SSE on frontend
- **Alternative rejected:** Separate endpoints per tool = more complex routing

### Groq over Anthropic/OpenAI
- **Why:** Free tier 100k tokens/day, faster responses, low cost
- **Constraint:** Max 14.4 RPM on free tier
- **Token budget:** Fixed per round to stay under free limit
- **Alternative:** Could use Anthropic API (installed, optional)

### Tool Definitions in Every Round
- **Why:** llama-3.3-70b respects OpenAI tool format reliably
  - Alternative (llama-3.1-8b) emits tool calls as pseudo-XML text
- **Cost:** Adds ~100 tokens per round
- **Benefit:** 100% tool call parsing success

### `injectPreviousOutputs()` Substitution
- **Why:** Groq transmits tool results unreliably in subsequent context
- **Solution:** Replace with actual results before next LLM call
- **Limitation:** Adds complexity to streaming loop

### Client-Side Calculator + Agent Tools as Separate Paths
- **Why:** Users can calculate offline OR ask agent for help
- **Tradeoff:** Code duplication (pure calc functions + tool wrappers)
- **Benefit:** Two UX paths (direct calc vs conversational)

---

## 🔍 Debugging

### Browser Console

**Calculator:**
```javascript
// Check calculation state
window.lastInput
window.lastResult
```

**Chat Agent:**
```javascript
// Check streaming messages
window.messageHistory  // if stored globally
// Network tab → /api/agent → Response → see SSE chunks
```

### Server Logs

```bash
npm run dev
# Logs in terminal:
# - Next.js build messages
# - API route execution
# - Tool execution logs
# - Groq API requests/responses

# With debug output:
DEBUG=* npm run dev
```

### Network Tab (DevTools)

- **POST /api/agent** — Main chat endpoint
  - Request body: messages, userProfile, etc.
  - Response: SSE stream (text/event-stream)
  - Each chunk contains: type, content, tool info
- **Check SSE format** — `data: {...}\n\n` separates chunks

### Common Issues

| Error | Check |
|-------|-------|
| "Groq API key not set" | `.env.local` has `GROQ_API_KEY` |
| "Tool not found" | `/api/agent/route.ts` imports correct tools |
| "PDF generation fails" | `pdfkit` in `serverComponentsExternalPackages` |
| "Calculator won't compute" | Browser console errors in `septicTank.ts` |
| "Chat freezes" | Check Groq rate limit (429 errors) |

---

**Last Updated:** May 2026

For implementation details, see [DEVELOPERS.md](./DEVELOPERS.md)
For usage, see [../README.md](../README.md) and [../GETTING_STARTED.md](../GETTING_STARTED.md)
