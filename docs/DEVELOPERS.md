# 👨‍💻 Developer Guide — HydroStack

**How to extend, customize, and develop HydroStack.**

---

## 🎯 Quick Start for Developers

### Before Reading This

1. Read [../README.md](../README.md) — Project overview
2. Read [../GETTING_STARTED.md](../GETTING_STARTED.md) — Get it running
3. Read [ARCHITECTURE.md](./ARCHITECTURE.md) — System design
4. Come back here

---

## 📁 Project Structure Review

```
src/
├── components/                # React components
│   ├── Calculators/          # Calculator UIs
│   ├── Common/               # Shared components
│   └── HydroAgent/           # Chat UI
├── lib/
│   ├── calculations/         # Engineering logic
│   ├── validation/           # Input validation
│   ├── agent/                # Agent logic
│   └── i18n.tsx              # Translations
├── types/
│   └── index.ts              # TypeScript definitions
└── __tests__/                # Test files

app/
├── page.tsx                  # Home page
├── layout.tsx                # Global layout
├── api/                      # API routes
│   ├── chat/
│   ├── agent/
│   └── generate-isometric/
└── calculators/              # Calculator pages
    └── fosa-septica/
```

---

## 🛠️ Common Development Tasks

### Task 1: Add a New Input Field to Calculator

**File:** `src/components/Calculators/SepticForm.tsx`

1. Add to state:
```typescript
const [profundidad, setProfundidad] = useState(1.2)
```

2. Add to JSX:
```jsx
<label style={styles.label}>
  Profundidad (m)
  <input
    type="number"
    value={profundidad}
    onChange={(e) => setProfundidad(parseFloat(e.target.value))}
    style={styles.input}
  />
</label>
```

3. Pass to calculation:
```typescript
const result = runCalc({
  // ... other params
  profundidad: profundidad
})
```

### Task 2: Modify a Calculation Formula

**File:** `src/lib/calculations/septic.ts`

Find the calculation:
```typescript
function calculateTankVolume(users, dotacion, trh) {
  return (users * dotacion * trh) / 1440  // liters to m³
}
```

Update formula:
```typescript
// Old: return (users * dotacion * trh) / 1440
// New: return (users * dotacion * trh) / 1200  // changed divisor
```

**Don't forget:**
1. Update related calculations
2. Update tests if any
3. Document change in comments
4. Test with different values

### Task 3: Add Support for a New Standard

**Files to modify:**
1. `src/lib/calculations/norms.ts` — Add norm definition
2. `src/lib/validation/inputs.ts` — Add validation rules
3. `docs/normativa/new-standard.md` — Document the standard

**Step-by-step:**

1. **Define norm** in `norms.ts`:
```typescript
const NORMS = {
  // ... existing norms
  'my-standard': {
    name: 'My Standard Name',
    country: 'My Country',
    minTRH: 24,            // hours
    maxLoading: 0.15,      // m³/m²/day
    sludgeRate: 0.05,      // m³/person/year
    tankMargin: 0.30       // 30% safety margin
  }
}
```

2. **Add validation** in `validation.ts`:
```typescript
const normSpecificRules = {
  'my-standard': {
    maxDepth: 3.0,
    minVolume: 1.5,
    maxUsers: 100
  }
}
```

3. **Create documentation:**
Create `docs/normativa/my-standard.md` with:
- Standard name & reference
- Design requirements
- TRH specifications
- Field loading rates
- Local contact info

### Task 4: Customize Colors

**File:** `src/components/IsometricDiagram.tsx`

Find design system (lines 10-30):
```typescript
const DS = {
  house: '#f5f5f5',
  tank: '#06b6d4',
  pipes: '#f97316',
  field: '#22c55e',
  inlet: '#10b981',
  outlet: '#eab308'
}
```

Change any colors:
```typescript
const DS = {
  house: '#ffffff',      // Changed to white
  tank: '#3b82f6',       // Changed to blue
  pipes: '#ef4444',      // Changed to red
  // ...
}
```

**Test:** Run dev server and check diagram.

### Task 5: Add a New Calculator

**Step 1:** Create calculation module

File: `src/lib/calculations/imhoff-tank.ts`

```typescript
export interface ImhoffInput {
  users: number
  dotacion: number
  temperatura: number
  // ... other params
}

export interface ImhoffResult {
  volumeArriba: number
  volumeAbajo: number
  altoTotal: number
  // ... other results
}

export function calculateImhoff(input: ImhoffInput): ImhoffResult {
  // Implementation here
  return {
    volumeArriba: users * dotacion * 6 / 1000,
    // ...
  }
}
```

**Step 2:** Create component

File: `src/components/Calculators/ImhoffTankCalculator.tsx`

```typescript
import { calculateImhoff, ImhoffInput, ImhoffResult } from '@/lib/calculations/imhoff-tank'

export default function ImhoffTankCalculator() {
  const [input, setInput] = useState<ImhoffInput>(defaults)
  const [results, setResults] = useState<ImhoffResult | null>(null)

  const handleCalculate = () => {
    const r = calculateImhoff(input)
    setResults(r)
  }

  return (
    <div>
      {/* Form */}
      <input
        value={input.users}
        onChange={(e) => setInput({...input, users: parseInt(e.target.value)})}
      />
      <button onClick={handleCalculate}>Calculate</button>
      
      {/* Results */}
      {results && <div>{/* Display results */}</div>}
    </div>
  )
}
```

**Step 3:** Create page

File: `app/calculators/imhoff-tank/page.tsx`

```typescript
import ImhoffTankCalculator from '@/src/components/Calculators/ImhoffTankCalculator'

export const metadata = {
  title: 'Imhoff Tank Calculator'
}

export default function ImhoffTankPage() {
  return <ImhoffTankCalculator />
}
```

**Step 4:** Register in module list

File: `app/page.tsx`

```typescript
const CALCULATORS = [
  // ... existing
  {
    slug: 'imhoff-tank',
    name: 'Tanque Imhoff',
    description: '...',
    icon: '🏗️',
    ready: true
  }
]
```

**Step 5:** Test and document

- Run: `npm run dev`
- Visit: `http://localhost:3000/calculators/imhoff-tank`
- Create: `docs/calculators/imhoff-tank.md`

---

## 🧪 Testing

### Running Tests

```bash
npm run test              # Run all tests
npm run test:watch       # Watch mode
npm run test:ui          # Visual UI
npm run test:coverage    # Coverage report
```

### Writing Tests

**Calculation Test:**

File: `src/__tests__/calculations/imhoff.test.ts`

```typescript
import { calculateImhoff } from '@/lib/calculations/imhoff-tank'

describe('Imhoff tank calculations', () => {
  it('calculates volume correctly', () => {
    const input = {
      users: 5,
      dotacion: 150,
      temperatura: 20
    }
    const result = calculateImhoff(input)
    expect(result.volumeArriba).toBeGreaterThan(0)
  })

  it('handles edge cases', () => {
    const input = { users: 1, dotacion: 50, temperatura: 5 }
    const result = calculateImhoff(input)
    expect(result.volumeArriba).toBeLessThan(0.1)
  })
})
```

**Component Test:**

File: `src/__tests__/components/ImhoffCalculator.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import ImhoffTankCalculator from '@/src/components/Calculators/ImhoffTankCalculator'

describe('ImhoffTankCalculator', () => {
  it('renders form inputs', () => {
    render(<ImhoffTankCalculator />)
    expect(screen.getByLabelText(/Usuarios/)).toBeInTheDocument()
  })

  it('calculates on button click', () => {
    render(<ImhoffTankCalculator />)
    fireEvent.click(screen.getByText('Calculate'))
    expect(screen.getByText(/Volumen/)).toBeInTheDocument()
  })
})
```

---

## 🌍 Internationalization (i18n)

### How It Works

File: `src/lib/i18n.tsx`

```typescript
export const translations = {
  es: {
    'calculator.title': 'Calculadora de Fosa Séptica',
    'calculator.users': 'Usuarios',
    'calculator.dotacion': 'Dotación (L/hab/día)',
    // ... many more
  },
  en: {
    'calculator.title': 'Septic Tank Calculator',
    'calculator.users': 'Users',
    'calculator.dotacion': 'Dotation (L/person/day)',
    // ... many more
  }
}
```

### Using Translations

```typescript
import { t } from '@/lib/i18n'
import { useLanguage } from '@/lib/i18n'

export default function MyComponent() {
  const { lang } = useLanguage()
  
  return <h1>{t(lang, 'calculator.title')}</h1>
}
```

### Adding New Translations

1. **Add to translations object:**
```typescript
export const translations = {
  es: {
    'my-key': 'Valor en español',
    // ...
  },
  en: {
    'my-key': 'English value',
    // ...
  }
}
```

2. **Use in component:**
```typescript
<label>{t(lang, 'my-key')}</label>
```

**Rules:**
- Always add both ES and EN
- Use dot notation for keys: `calculator.errors.invalidInput`
- Keep Spanish and English in sync
- Document new keys

---

## 🔐 Type Safety

### TypeScript Setup

File: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "moduleResolution": "bundler"
  }
}
```

**Key settings:**
- `strict: true` — Enables all strict checks
- `jsx: react-jsx` — React 18 new JSX transform

### Common Types

File: `src/types/index.ts`

```typescript
export interface CalculationInput {
  users: number
  dotacion: number
  temperatura: number
  profundidad: number
  norm: string
  // ...
}

export interface CalculationResult {
  volumeM3: number
  fieldAreaM2: number
  trh: number
  cargaSuperficial: number
  // ...
}

export interface ValidationError {
  field: string
  message: string
  value: any
}
```

**Best practices:**
- Define types in `src/types/index.ts`
- Avoid `any` type
- Use interfaces for objects
- Use unions for multiple options: `'es' | 'en'`

---

## 🎨 Styling Guidelines

### CSS-in-JS Pattern

```typescript
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
    fontFamily: 'inherit',
    '&:focus': {  // Won't work! Use onFocus handler instead
      outline: 'none',
      borderColor: '#2563eb'
    }
  }
}

// For dynamic styling:
const buttonStyle = {
  ...styles.button,
  backgroundColor: isLoading ? '#ccc' : '#2563eb',
  cursor: isLoading ? 'not-allowed' : 'pointer'
}
```

### Color Palette

```typescript
const colors = {
  primary: '#2563eb',      // Blue
  success: '#10b981',      // Green
  error: '#ef4444',        // Red
  warning: '#f59e0b',      // Orange
  gray: '#6b7280',         // Neutral gray
  lightGray: '#f3f4f6',    // Light gray
  darkGray: '#1f2937'      // Dark gray
}
```

### Responsive Design

```typescript
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    '@media (min-width: 768px)': {  // Won't work inline!
      flexDirection: 'row'
    }
  }
}

// Instead, use JavaScript:
const isTablet = typeof window !== 'undefined' && window.innerWidth >= 768

const styles = {
  container: {
    display: 'flex',
    flexDirection: isTablet ? 'row' : 'column'
  }
}
```

---

## 🚀 Building & Deployment

### Development Build

```bash
npm run dev
# Hot reload enabled
# Source maps available
# Slower performance (by design)
```

### Production Build

```bash
npm run build
# Optimizes code
# Minifies output
# Creates .next/ folder
# ~2-3 minutes
```

### Testing the Prod Build Locally

```bash
npm run build
npm run start
# Server runs on http://localhost:3000
# Serves optimized build
# Closest to production behavior
```

### Deploy to Vercel

```bash
npm install -g vercel
vercel
# Follow prompts
# Takes ~1 minute
```

### Deploy to Other Hosts

**Requirements:**
- Node.js 18+
- npm or yarn
- 512 MB RAM minimum

**Steps:**
```bash
# Build
npm run build

# Start server
npm run start
# Or use a process manager (PM2, systemd, etc.)
```

---

## 🔍 Debugging

### Browser DevTools

**Console:**
```javascript
// In calculator component
window.lastInput
window.lastResult

// In diagram
window.diagramDebug
```

**Network tab:**
- Monitor `/api/chat` requests
- Check response times
- Debug image generation

**React DevTools:**
- Install React DevTools extension
- Inspect component hierarchy
- Check props and state
- Profile performance

### Server Debugging

```bash
# Enable verbose logging
DEBUG=* npm run dev

# Check specific module
DEBUG=app:* npm run dev
```

### Common Issues

| Error | Solution |
|-------|----------|
| "Module not found" | Run `npm install` |
| "Port 3000 in use" | `lsof -i :3000` + kill process |
| "API key not set" | Add to `.env.local` |
| "Build fails" | Check `npm run lint` |
| "Tests fail" | Check test file naming |

---

## 📊 Performance Optimization

### Code Splitting

Next.js automatically code-splits, but you can optimize:

```typescript
import dynamic from 'next/dynamic'

// Lazy load heavy components
const IsometricDiagram = dynamic(
  () => import('@/components/IsometricDiagram'),
  { loading: () => <p>Loading...</p> }
)
```

### Memoization

```typescript
import { memo } from 'react'

// Prevent unnecessary re-renders
const MyComponent = memo(function MyComponent(props) {
  return <div>{props.value}</div>
})

export default MyComponent
```

### Profiling

```bash
# Build profiling data
npm run build -- --profile

# Analyze with browser DevTools
```

---

## 🔒 Security Best Practices

### Input Validation

Always validate user input:

```typescript
import { validateCalculatorInput } from '@/lib/validation'

const handleCalculate = (input) => {
  const validation = validateCalculatorInput(input)
  if (!validation.valid) {
    // Show errors
    setErrors(validation.errors)
    return
  }
  // Proceed with calculation
}
```

### Environment Variables

Never commit API keys:

```bash
# .gitignore
.env.local
.env.*.local
```

```typescript
// API routes can access .env.local
const apiKey = process.env.ANTHROPIC_API_KEY
```

### HTTPS Only

Always use HTTPS in production:

```typescript
// Vercel handles this automatically
// For custom servers, use nginx/caddy
```

---

## 📚 Additional Resources

### Documentation
- [../README.md](../README.md) — Project overview
- [../GETTING_STARTED.md](../GETTING_STARTED.md) — Quick start
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System design
- [FEATURES.md](./FEATURES.md) — Feature list

### Code Examples
- Check `src/__tests__/` for test examples
- Check components for React patterns
- Check `src/lib/` for utility patterns

### External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Vitest Documentation](https://vitest.dev)

---

## 💡 Tips & Tricks

### Hot Reload
Changes save automatically when you edit files

### TypeScript Compilation
Check for errors: `npm run build`

### Test in Watch Mode
```bash
npm run test:watch
# Re-runs tests on file changes
```

### Browser Sync
```bash
npm run dev
# Opens browser automatically
```

### Kill Stuck Process
```bash
npm run dev &  # Start in background
jobs            # List jobs
kill %1         # Kill job 1
```

---

## 🤝 Contributing Code

### Before Committing

1. **Format code:**
```bash
# No formatter configured (use IDE)
# or `npm run lint` if available
```

2. **Run tests:**
```bash
npm run test
```

3. **Build check:**
```bash
npm run build
```

4. **Manual testing:**
- Try your changes in browser
- Test on mobile
- Try different scenarios

### Commit Message Format

```
type(scope): subject

body explaining changes

Fixes #123
```

Examples:
```
feat(calculator): add new input field
fix(validation): handle negative values
docs(README): update build instructions
test(calculations): add edge case tests
```

### Pull Request Process

1. Create feature branch
2. Make changes + commit
3. Push to GitHub
4. Create Pull Request
5. Link to issue (if exists)
6. Wait for review

---

## 📞 Getting Help

### Search
1. Check [ARCHITECTURE.md](./ARCHITECTURE.md)
2. Check [../README.md](../README.md)
3. Check source code comments
4. Search GitHub issues

### Ask Questions
- Create GitHub issue
- Include error messages
- Include reproduction steps
- Include your environment info

---

**Last Updated:** May 2026

For system design details, see [ARCHITECTURE.md](./ARCHITECTURE.md)  
For user guide, see [../README.md](../README.md)
