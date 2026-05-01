# HydroStack 2 — Diagnóstico Arquitectura & Deuda Técnica

**Fecha:** 2026-05-01 | **Codebase:** 4,694 LOC | **Modelo:** Next.js 14 (App Router)

---

## 1. ARQUITECTURA GENERAL

### 1.1 Mapeo de Flujo de Datos

```
┌─ CLIENTE (Browser) ─────────────────────────────────────────┐
│                                                              │
│  Landing/Calculators (app/page.js, app/calculators/*)      │
│        ↓                                                     │
│  SepticTankCalculator.jsx (RenderStates)                    │
│    ├─ Input Form → FormState (LocalStorage)                 │
│    ├─ SVG Diagrams (IsometricDiagram, 3D)                   │
│    ├─ Lamina Técnica (PDF export)                           │
│    └─ Chat Module (formState sync)                          │
│        │                                                     │
│        ↓ (POST /api/chat)                                   │
│      Chat Page                                              │
│        ↓ SSE stream                                         │
│        └─ Groq Agent (respuestas con catálogo)              │
│                                                              │
├─ FormState (localStorage)                                   │
│  └─ Cálculos normalizados (RAS/ESP/EU/EPA)                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
     ↓ (SSE)
     
┌─ SERVIDOR (Node/Vercel Edge) ─────────────────────────────┐
│                                                              │
│  /api/chat/route.ts                                         │
│  ├─ Detecta ubicación en mensajes                           │
│  ├─ Lee normativa .md (RAS/CTE/EPA/EN)                      │
│  ├─ Inyecta en system prompt de Groq                        │
│  ├─ Streaming SSE a cliente                                 │
│  └─ Groq API (endpoint abierto)                             │
│                                                              │
│  /api/agent/suggest/route.ts                                │
│  ├─ POST con {formState, conversationHistory}              │
│  ├─ suggestNextQuestions() → filter.ts                      │
│  ├─ Retorna 2–3 preguntas relevantes (JSON)                 │
│  └─ Cliente renderiza como botones de sugerencia            │
│                                                              │
│  /api/generate-isometric/route.js                           │
│  └─ [Generador de diagramas 3D Babylon.js]                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Estructura de Directorios

```
hydrostack-2/
├── app/
│   ├── layout.js                    # Root layout + LangProvider
│   ├── page.js                      # Landing (467 líneas)
│   ├── globals.css                  # Base styles
│   ├── calculators/
│   │   ├── page.js                  # Calculators index
│   │   └── fosa-septica/
│   │       └── page.js              # Septic tank wrapper
│   ├── chat/
│   │   └── page.js                  # Chat UI + SSE streaming (200+ líneas)
│   └── api/
│       ├── chat/route.ts            # Groq agent endpoint (200+ líneas)
│       ├── agent/suggest/route.ts   # Suggestion engine (45 líneas)
│       └── generate-isometric/      # [Babylon.js 3D]
│
├── components/
│   ├── SepticTankCalculator.jsx     # ⚠️ MONOLITO (1,102 líneas)
│   ├── IsometricDiagram.jsx         # SVG 2D (643 líneas)
│   ├── IsometricDiagram3D.jsx       # Babylon.js (318 líneas)
│   ├── LaminaTecnica.jsx            # PDF export
│   └── Navbar.js
│
├── src/lib/agent/
│   ├── filter.ts                    # suggestNextQuestions() + conditions
│   └── catalog.ts                   # CATALOG: 93 preguntas organizadas
│
├── lib/
│   └── i18n.js                      # LangProvider + translations
│
├── docs/normativa/
│   ├── cte-hs5.md                   # Normativa España
│   ├── ras-2000.md                  # RAS Colombia
│   └── epa-onsite.md                # EPA USA
│
└── [config files]
```

---

## 2. PROBLEMAS ESTRUCTURALES

### 2.1 ⚠️ MONOLITO CRÍTICO: SepticTankCalculator.jsx (1,102 LOC)

**Severidad:** 🔴 ALTO

Este componente es un **monolito sin división de responsabilidades**:

```javascript
// SepticTankCalculator.jsx contiene TODO:
- Lógica de cálculo normativo (computeNorm, getParams)
- 3 máquinas de estado separadas:
  ① form inputs (users, depth, etc.)
  ② render state (showResults, showDiagram, etc.)
  ③ calculation results (r, p, computed values)
- Renderizado de 5 secciones:
  ① Selector de normativa + parámetros
  ② Formulario de entrada
  ③ Validaciones y alertas
  ④ SVG schematic (DetailedSchematic)
  ⑤ 3D diagrama + exportación PDF
- Helpers SVG (ArrowMarkers, DimLine, DetailedSchematic)
- Manejo de localStorage
- Sincronización con Chat (formState push)
```

**Impacto:**

- Difícil testear cada pieza aisladamente
- Rendimiento potencial: re-render de TODO en cada keystroke
- Bugs de estado complejos (stale closure, race conditions)
- Onboarding para nuevos desarrolladores lento
- Cambios en cálculo afectan diagrama, que afecta export

**Ejemplo de acoplamiento:**

```javascript
// Línea 62-71: cálculo normativo
const computeNorm = (normKey, users, ...) => { /* */ };

// Línea 150+: renderizado de diagrama usa MISMO resultado
function DetailedSchematic({ r, freeboard }) {
  const hNata = r.Vn / Area;  // ← tight coupling
  // ...
}

// Línea 600+: PDF export usa MISMO estado
function handleExportPDF() {
  const pdfContent = `...${r.Vtot}...${r.L}...`; // ← tight coupling
}
```

**Recomendación:**

Refactorizar en 3 capas:

```
1. hooks/useCalcNorm.ts
   - export { computeNorm, getParams }
   - export { useFormState } (+ localStorage sync)
   
2. components/SepticForm.jsx
   - Solo form inputs y validación
   
3. components/SepticResults.jsx
   - DetailedSchematic, alerts, computed values
   
4. hooks/useSepticDiagram.ts
   - Lógica para generar SVG/3D
   
5. components/SepticExport.jsx
   - PDF generation aislado
```

---

### 2.2 ⚠️ MEZCLA DE RESPONSABILIDADES: API /api/chat

**Severidad:** 🟠 MEDIO-ALTO

El endpoint `/api/chat` tiene **4 responsabilidades mezcladas:**

```typescript
// app/api/chat/route.ts líneas 1-200

1. Location Detection  (líneas 61-85)
   - Regex sobre texto del usuario
   - Hardcoded locationMap
   → Debería estar en src/lib/location.ts

2. File I/O para Normativa  (líneas 87-99)
   - readFile("docs/normativa/...")
   - Fallback silencioso si no encuentra
   → Debería estar en src/lib/normativa.ts con caching

3. System Prompt Assembly  (líneas 10-52)
   - Inyección dinámica de normativa
   - Lógica de FormState → system prompt
   → Debería estar en src/lib/agent/system-prompt.ts

4. Streaming SSE + Groq API  (líneas 100+)
   - Llamada a Groq
   - Parseo de stream
   - Manejo de errores
   → Debería estar en src/lib/agent/groq-client.ts
```

**Problemas específicos:**

1. **Location detection frágil:**
   ```typescript
   const lowerText = text.toLowerCase();
   for (const [keyword, norm] of Object.entries(locationMap)) {
     if (lowerText.includes(keyword)) return norm;
   }
   ```
   - Falso positivo: "Me dirijo a españa" → busca `españa` directamente
   - No maneja ciudad + departamento (ej: "Bogotá, Cundinamarca")
   - Falta regex: "ubicación" en pregunta debería ignorarse

2. **Normativa hardcodeada en system prompt + inyección dinámica:**
   - Si usuario dice "Colombia" tarde en conversación, normativa NO se actualiza
   - Si dice "España", pero había dicho "Colombia", primera toma precedencia
   - Solución: pasar formState con normKey explícito, no detectar por texto

3. **Sin caching de archivos:**
   ```typescript
   const fullPath = join(process.cwd(), path);
   return await readFile(fullPath, "utf-8");  // ← read en CADA request
   ```
   - En Vercel (serverless), cada invocación es estateless → lectura repetida
   - Solución: cached map en memoria o importar archivos como módulos

---

### 2.3 ⚠️ FALTA DE VALIDACIÓN EN APIs

**Severidad:** 🟠 MEDIO

**FormState no se valida:**

```typescript
// app/api/agent/suggest/route.ts línea 8

interface ChatRequest {
  formState?: FormState;  // ← undefined es aceptado
  conversationHistory?: string[];
}

if (!formState) {
  return new Response(...);  // ← Pero luego se usa
}

const suggestions = suggestNextQuestions(formState, conversationHistory);
```

**Problemas:**

- `conversationHistory` no se valida tipo
- Si `formState.temp` es "25°C" (string), filter.ts lo compara como número
- Faltan rango checks: `users < 0` no se rechaza
- Falta sanitización: FormState podría contener caracteres problémáticos en `soilType`

**Impacto:**

```javascript
// En filter.ts línea 49:
if (temp !== undefined && temp < 10) // ← si temp es "cold", esto es false
```

---

### 2.4 ⚠️ DESINCRONIZACIÓN FORM ↔ DIAGRAM

**Severidad:** 🟠 MEDIO

SepticTankCalculator mantiene **3 fuentes de verdad** para dimensiones:

```javascript
// Estado del formulario (user inputs)
const [depth, setDepth] = useState(formState?.depth ?? 1.5);
const [freeboard, setFreeboard] = useState(formState?.freeboard ?? 0.3);

// Resultado de cálculo (salida)
const r = computeNorm(normKey, users, dotacion, ..., depth);

// LocalStorage (persistencia)
useEffect(() => {
  localStorage.setItem("hydrostack_formstate", JSON.stringify({
    users, dotacion, retCoef, temp, depth, freeboard, ...
  }));
}, [users, dotacion, retCoef, temp, depth, freeboard, ...]);

// DetailedSchematic renderiza basado en r
function DetailedSchematic({ r, freeboard }) {
  const hNata = r.Vn / Area;  // ← usa r.Vn
  // pero freeboard viene de prop separada
}
```

**Problema:**

- Si usuario cambia `depth` en formulario, `r` recalcula, pero LocalStorage se actualiza asincronamente
- Si SepticTankCalculator desmonta/remonta (ej: filtro de móvil → escritorio), valores pueden desync
- Diagram y Form pueden estar mostrando estados distintos brevemente

---

## 3. CÓDIGO DUPLICADO & FRAGMENTACIÓN

### 3.1 Tablas de Parámetros (Normativa)

**Severidad:** 🟠 MEDIO

Parámetros se definen en **3 lugares distintos:**

**Lugar 1:** SepticTankCalculator.jsx (líneas 6-50)

```javascript
const NORMS = {
  ras: { name:"RAS Colombia", flag:"🇨🇴", dotacion:120 },
  esp: { name:"España", dotacion:160 },
  eu:  { name:"Europa", dotacion:150 },
  epa: { name:"EE.UU.", dotacion:190 },
};

const getParams = (norm, temp) => {
  if (norm==="ras") {
    if (temp>=20) return {trhDays:1.5, sludgeRate:40, ...};
    if (temp>=10) return {trhDays:2.0, sludgeRate:50, ...};
    return {trhDays:2.5, sludgeRate:60, ...};
  }
  // ... 6 normativas × 3-4 rangos temp = 25+ casos
};
```

**Lugar 2:** app/api/chat/route.ts (líneas 10-52)

```typescript
const SYSTEM_PROMPT = `...
## CATÁLOGO DE PREGUNTAS AUTORIZADAS
Tienes acceso a un catálogo de preguntas...
- **normativa**: Normas, requisitos mínimos, T_r, separaciones
...
`;
```

**Lugar 3:** src/lib/agent/catalog.ts (líneas 32-323)

```typescript
export const CATALOG: CatalogQuestion[] = [
  {
    id: "norm-02",
    intent: "...RAS: 1.0 m³, España: 1.5 m³, Europa: 2.0 m³, EPA: 3.785 m³..."
  },
  ...
];
```

**Problema:**

- Si se actualiza un parámetro (ej: RAS Vl mínimo cambia a 1.2 m³), **3 places to change**
- Risk de inconsistencia
- Mantenibilidad baja

**Solución:**

Crear archivo central `/src/lib/norms.ts`:

```typescript
export const NORMS_DATA = {
  ras: {
    name: "RAS Colombia",
    flag: "🇨🇴",
    params: {
      temp20: { trhDays: 1.5, sludgeRate: 40, minVolume: 1.0 },
      temp10: { trhDays: 2.0, sludgeRate: 50, minVolume: 1.0 },
      temp0:  { trhDays: 2.5, sludgeRate: 60, minVolume: 1.0 },
    },
  },
  // ...
};

export function getParams(norm: string, temp: number) {
  // single source of truth
}

export const NORM_DESCRIPTIONS = {
  ras: "Colombia, RAS 2017",
  // ...
};
```

---

### 3.2 Estilos Inline en app/page.js

**Severidad:** 🟡 MEDIO

La landing page tiene **200+ líneas de estilos inline** en un objeto `S`:

```javascript
const S = {
  page: { minHeight: "100vh", fontFamily: "...", position: "relative", ... },
  hero: { position: "relative", minHeight: "...", display: "flex", ... },
  heroWrap: { position: "relative", minHeight: "...", overflow: "hidden", ... },
  heroContent: { position: "relative", zIndex: 2, flex: "1 1 0", ... },
  // ... 50+ estilos
};
```

**Problemas:**

- No compartible entre componentes
- Difícil de mantener (typos en properties)
- Sin TypeScript checking (color typo no se detecta)
- Responsive media queries requieren JS (clamp es workaround)

**Impacto:**

- Bundle size: inline styles = JS (no puede ser cached separadamente)
- DevTools: no preview de hover/media queries
- Redeclaración si otro componente necesita `heroWrap`

---

## 4. CUELLOS DE BOTELLA DE RENDIMIENTO

### 4.1 Re-renders Innecesarios en SepticTankCalculator

**Severidad:** 🟡 MEDIO

Sin `useMemo`/`useCallback`, cada keystroke en input causa re-render de:

```javascript
// Línea 200+: cada cambio de input
function handleFormChange(field, value) {
  setFormState(prev => ({ ...prev, [field]: value }));
  // ↓ triggers re-render
}

// ↓ DetailedSchematic recalcula
function DetailedSchematic({ r, freeboard }) {
  const Area = r.Vtot / r.depth;        // ← new object
  const hNata = r.Vn / Area;            // ← new calculation
  const scaleY = tH / totalD;           // ← new calculation
  // Retorna <svg> con 100+ elementos → re-render SVG completo
}

// ↓ IsometricDiagram recalcula perspectiva
// ↓ IsometricDiagram3D redibuja canvas Babylon.js
```

**Medición:**

- Form input keypress → 3D canvas re-render = 500ms+ (en mobile)
- Campo de 30 caracteres = 30 × 500ms = 15 segundos laggy

**Solución:**

```javascript
const DetailedSchematic = useMemo(() => {
  return ({ r, freeboard }) => (
    <svg>... geometry calculations</svg>
  );
}, [r, freeboard]);

const IsometricDiagram = React.memo(IsometricDiagram);
```

---

### 4.2 Bundle Size: Babylon.js 9.4.1

**Severidad:** 🟡 BAJO-MEDIO

```json
{
  "dependencies": {
    "@babylonjs/core": "^9.4.1",     // ← 5–6 MB minified
    "babylonjs": "^9.4.1"             // ← 3–4 MB minified
  }
}
```

**Impacto:**

- Primera carga: descarga 8–10 MB antes de pintar
- Mobile: 20+ segundos en 3G
- Componente IsometricDiagram3D solo se renderiza si `showDiagram3D === true`

**Solución:**

- `dynamic(() => import('./IsometricDiagram3D'), { ssr: false })`
- Load-on-demand con Suspense

---

### 4.3 SSE Streaming no tiene Timeout

**Severidad:** 🟡 MEDIO

```typescript
// app/api/chat/route.ts

const res = await fetch("https://api.groq.com/...", {
  method: "POST",
  body: JSON.stringify({ ... }),
  // ← sin timeout
});

// Si Groq API cuelga, cliente espera indefinido
```

---

## 5. RIESGOS DE MANTENIBILIDAD

### 5.1 Dependencia de Variables de Entorno No Documentadas

**Severidad:** 🟠 MEDIO

- `process.cwd()` en /api/chat para leer docs/normativa
- No hay `.env.example` documentando `GROQ_API_KEY`
- Script `npm run dev` no valida que existan variables

**Solución:**

```bash
# .env.example
GROQ_API_KEY=sk_live_xxxxx
NEXT_PUBLIC_HYDROSTACK_VERSION=1.0.0
```

---

### 5.2 Catálogo Hardcodeado (catalog.ts)

**Severidad:** 🟡 MEDIO

Archivo tiene **93 preguntas hardcodeadas** con 323 líneas.

**Problemas:**

- Si agregar normativa nueva (ej: ABNT Brasil), agregar 15+ preguntas al CATALOG
- No hay separación por normativa (enum o índice)
- Si cambiar structure de `CatalogQuestion`, todos 93 deben actualizarse

**Riesgo:**

- Accidente: alguien agrega question sin `conditions` válidas
- Typo en `id` no se detecta en build time

**Solución:**

```typescript
// src/lib/agent/catalog/normativa.ts
export const NORMATIVA_QUESTIONS = [
  { id: "norm-01", intent: "...", conditions: ["form_empty", "always"] },
  ...
];

// src/lib/agent/catalog/index.ts
export const CATALOG = [
  ...NORMATIVA_QUESTIONS,
  ...DIMENSIONADO_QUESTIONS,
  ...SUELO_QUESTIONS,
  ...MATERIALES_QUESTIONS,
  ...MANTENIMIENTO_QUESTIONS,
];
```

---

### 5.3 Sin Tests

**Severidad:** 🔴 ALTO

0 test files encontrados. **Riesgo crítico:**

```javascript
// Si cambio línea 64 en SepticTankCalculator.jsx
const Qd = users * dotacion * retCoef / 1000;  // ← ¿1000 o 10000?

// No hay test que valide:
// users=5, dotacion=120, retCoef=0.75 → Qd=0.45 m³/día
```

**Impacto:**

- Cambios en `computeNorm()` no se validan contra normas reales
- Refactoring de SepticTankCalculator puede romper cálculos sin saberlo
- No hay regresión tests para cambios recientes (integración catálogo)

---

### 5.4 TypeScript Parcial

**Severidad:** 🟡 MEDIO

```
- ✅ app/api/chat/route.ts      (TypeScript)
- ✅ src/lib/agent/filter.ts    (TypeScript)
- ✅ src/lib/agent/catalog.ts   (TypeScript)
- ❌ components/SepticTankCalculator.jsx  (JSX sin tipos)
- ❌ components/IsometricDiagram.jsx      (JSX sin tipos)
- ❌ app/page.js                          (JS)
- ❌ lib/i18n.js                          (JS)
```

**Problema:**

- Props no documentadas (`DetailedSchematic` recibe qué props exactamente?)
- Type safety pierde en punto crítico (SepticTankCalculator)

---

## 6. ANÁLISIS DE DEUDA TÉCNICA (Scoring)

| Categoría | Severidad | Puntos | Acción |
|-----------|-----------|--------|--------|
| **Monolito SepticTankCalculator** | 🔴 CRÍTICO | 40 | Refactorizar en 3–4 componentes + hooks |
| **API /api/chat (mezcla responsabilidades)** | 🟠 ALTO | 30 | Extraer location detection, file I/O, system prompt |
| **Código duplicado (NORMS, parámetros)** | 🟠 ALTO | 25 | Crear `norms.ts` centralizado |
| **Sin tests** | 🔴 CRÍTICO | 30 | Agregar test suite (jest + @testing-library) |
| **Re-renders innecesarios** | 🟡 MEDIO | 15 | useMemo, React.memo en componentes pesados |
| **Babylon.js bundle (8–10 MB)** | 🟡 MEDIO | 10 | Dynamic import + code splitting |
| **Catalogo hardcodeado** | 🟡 MEDIO | 12 | Modularizar por ruta |
| **FormState validación débil** | 🟠 ALTO | 20 | Zod/Yup validation en APIs |
| **Sin documentación de API** | 🟡 MEDIO | 10 | OpenAPI/Swagger |

**TOTAL DEUDA:** 182 puntos

**Estimado de Refactoring:**
- Fase 1 (crítico): 40–60 horas → SepticTankCalculator, tests, validation
- Fase 2 (alto): 30–40 horas → API modularización, NORMS centralizado
- Fase 3 (medio): 20–30 horas → Optimización, docstring, observability

---

## 7. RECOMENDACIONES INMEDIATAS (Roadmap)

### Semana 1: ESTABILIDAD
```
[ ] Agregar validación FormState (Zod)
[ ] Crear test suite mínimo (5-10 tests críticos)
[ ] Extraer NORMS_DATA a norms.ts centralizado
[ ] Crear .env.example con variables requeridas
```

### Semana 2: ARQUITECTURA
```
[ ] Refactorizar SepticTankCalculator:
    - hooks/useCalcNorm.ts
    - components/SepticForm.jsx
    - components/SepticResults.jsx
    - components/SepticDiagram.jsx
[ ] Modularizar /api/chat
    - src/lib/location.ts
    - src/lib/normativa.ts
    - src/lib/agent/groq-client.ts
```

### Semana 3: OPTIMIZACIÓN
```
[ ] React.memo + useMemo en diagrams
[ ] Dynamic import para IsometricDiagram3D
[ ] Vercel Analytics para detectar bottlenecks reales
[ ] TypeScript: convertir JSX → TSX en components/
```

### Semana 4: OBSERVABILIDAD
```
[ ] Logging estructurado en /api/chat (qué normativa detectada)
[ ] Error boundaries en componentes críticos
[ ] Monitoreo de Groq API latency
[ ] Docs: README explicando architecture
```

---

## 8. ARQUITECTURA OBJETIVO (Post-Refactoring)

```
src/
├── lib/
│   ├── norms.ts                    # ✨ Source of truth: parámetros
│   ├── location.ts                 # ✨ Location detection logic
│   ├── normativa.ts                # ✨ File I/O + caching normativa
│   └── agent/
│       ├── groq-client.ts          # ✨ Groq API abstraction
│       ├── system-prompt.ts        # ✨ Prompt assembly
│       ├── filter.ts               # (existing) suggestion logic
│       └── catalog.ts              # (split into sub-files)
│
├── hooks/
│   ├── useCalcNorm.ts              # ✨ Calculation logic
│   ├── useFormState.ts             # ✨ Form state + localStorage
│   └── useSepticDiagram.ts         # ✨ Diagram geometry
│
├── components/
│   ├── SepticForm.jsx              # ✨ Form inputs only
│   ├── SepticResults.jsx           # ✨ Results + alerts
│   ├── SepticDiagram.jsx           # ✨ SVG schematic wrapper
│   ├── IsometricDiagram.jsx        # (refactored) React.memo
│   ├── IsometricDiagram3D.jsx      # (refactored) lazy loaded
│   └── ...
│
└── __tests__/
    ├── lib/norms.test.ts           # ✨ Test computeNorm()
    ├── lib/location.test.ts        # ✨ Test location detection
    ├── hooks/useCalcNorm.test.ts   # ✨ Test calc hook
    └── ...

app/
└── api/
    ├── chat/route.ts               # (refactored) cleaner
    ├── agent/suggest/route.ts      # (refactored) validated
    └── ...
```

---

## 9. CONCLUSIÓN

**Estado Actual:** Prototipo robusto, pero **arquitectura monolítica y frágil** para crecer.

**Riesgos Principales:**
1. Monolito SepticTankCalculator → será insostenible al agregar más normas/calculadores
2. Falta de tests → no hay red de seguridad para refactoring
3. Duplicación de parámetros → sincronización manual error-prone

**Viabilidad de Roadmap:** ✅ Realista en 4 semanas con 1–2 eng dedicados.

**Después de Refactoring:** Arquitectura escalable para agregar nuevas calculadoras (Imhoff, UASB, etc.) sin reescribir.

