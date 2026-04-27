# Developer Guide: Isometric Diagram Integration

**For developers extending or integrating the isometric diagram generator.**

---

## 📦 Component API

### IsometricDiagram Component

```jsx
import IsometricDiagram from "@/components/IsometricDiagram";

<IsometricDiagram
  r={calculatorResults}           // Calculation object from runCalc()
  projectName="Project Name"       // String, optional (default: "Proyecto")
  location="City, State"           // String, optional (default: "Sitio")
  designer="Engineer Name"         // String, optional (default: "Diseño")
/>
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `r` | Object | ✅ | Calculator results object with tank geometry |
| `projectName` | String | ❌ | Project title for title block |
| `location` | String | ❌ | Location for metadata |
| `designer` | String | ❌ | Designer/engineer name |

### Results Object Structure (from `runCalc()`)

```javascript
{
  // Flow rates
  Qd: Number,           // Daily wastewater flow (m³/day)
  Qs: Number,           // Design flow rate (m³/s)
  
  // Tank volumes
  Vtot: Number,         // Total tank volume (m³)
  Vl: Number,           // Liquid volume (m³)
  Vs: Number,           // Sludge volume (m³)
  Vn: Number,           // Scum volume (m³)
  
  // Geometry
  L: Number,            // Tank length (m)
  W: Number,            // Tank width (m)
  depth: Number,        // Effective depth (m)
  
  // Design parameters
  chambers: Number,     // Number of chambers (1-3)
  trhDays: Number,      // Hydraulic retention time (days)
  SRT: Number,          // Solids retention time (days)
  
  // Other
  users: Number,        // Number of users
  // ... other calculated values
}
```

---

## 🎨 Styling System (DS object)

Internal design system used by the component:

```javascript
const DS = {
  // Primary colors
  cyanBright: "#00F5FF",
  cyanDim: "rgba(0, 245, 255, 0.3)",
  greenBright: "#00FF88",
  greenDim: "rgba(0, 255, 136, 0.2)",
  amberBright: "#FFB020",
  ambierDim: "rgba(255, 176, 32, 0.15)",
  
  // Backgrounds
  bgDark: "#020C10",
  bgCard: "#041820",
  
  // Text
  textMain: "#E8F8FF",
  textMuted: "#4A7A8A",
  
  // Borders
  border: "rgba(0, 245, 255, 0.12)",
};
```

### Override example

To customize colors globally, edit `/components/IsometricDiagram.jsx` lines 10-26.

---

## 🔌 API Endpoint

### POST /api/generate-isometric

Generates visual description for image generation services.

#### Request

```javascript
fetch("/api/generate-isometric", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: String,           // Detailed visual description
    systemParams: Object,     // Calculator results object
  }),
})
```

#### Response (Success)

```json
{
  "description": "Detailed visual description of isometric drawing...",
  "systemParams": { /* echo of input */ },
  "message": "Image generation description created successfully.",
  "imageUrl": null,
  "note": "Para generar la imagen final, integra este endpoint con DALL-E (OpenAI) o Midjourney API"
}
```

#### Response (Error)

```json
{
  "error": "ANTHROPIC_API_KEY not configured"
}
```

---

## 🛠️ Integration Steps

### Step 1: Add to Calculator

In `SepticTankCalculator.jsx`:

```jsx
// 1. Add import at top
import IsometricDiagram from "./IsometricDiagram";

// 2. Add tab to TABS array
const TABS = [
  // ... other tabs
  {id:"diagrama3d", label:"Diagrama 3D"},
  // ...
];

// 3. Add tab content (in render)
{activeTab==="diagrama3d"&&(
  <div style={{height:"100%"}}>
    <IsometricDiagram
      r={r}
      projectName={projectName}
      location={location}
      designer={designer}
    />
  </div>
)}
```

### Step 2: Environment Setup

Create/update `.env.local`:

```
ANTHROPIC_API_KEY=sk-your-key-here
```

### Step 3: Install Dependencies (if needed)

Current setup requires **no additional packages** beyond Next.js 14 + React 18.

---

## 🎬 Component Behavior

### SVG Mode

1. **Render**: Instant, on mount or when `r` object changes
2. **Projection**: Isometric transformation using `iso.project(x, y, z)`
3. **Export**: Canvas → PNG download
4. **File**: Generated SVG is 960×720 px

### Image Generation Mode

1. **Prompt generation**: System generates detailed visual description from `r`
2. **API call**: POST to `/api/generate-isometric`
3. **Claude API**: Receives prompt, returns enhanced description
4. **Future**: Description passed to DALL-E / Midjourney
5. **Download**: User can save the generated image

---

## 🧪 Testing the Integration

### Manual test

1. Navigate to `/calculators/fosa-septica`
2. Fill parameters and click "Calcular"
3. Click tab "Diagrama 3D"
4. Verify SVG renders (should show house, pipes, tank, field)
5. Try "⬇️ Descargar PNG" button
6. Switch to "🎨 Fotorrealista" mode
7. Click "Generar Imagen..." (requires ANTHROPIC_API_KEY)
8. Check browser console for errors

### Console debugging

```javascript
// In browser DevTools, after component mounts:
window.isometricDebug = {
  r: resultObject,
  scale: 25,
  svgWidth: 960,
  svgHeight: 720,
};
```

---

## 📐 SVG Structure

### Root SVG

```xml
<svg width="960" height="720" viewBox="0 0 960 720">
  <defs>
    <!-- Gradients, patterns, markers -->
  </defs>
  
  <!-- Background / earth -->
  <rect class="soil-background" />
  
  <!-- Elements (grouped) -->
  <g><!-- House --></g>
  <g><!-- Pipes --></g>
  <g><!-- Tank --></g>
  <g><!-- Infiltration field --></g>
  
  <!-- Data panel -->
  <g><!-- Right side panel --></g>
  
  <!-- Bottom status bar -->
  <rect class="status-bar" />
</svg>
```

### Key groups

| Group | Contains | Coordinates |
|-------|----------|-------------|
| House | 3D structure, door, windows | cx - 300 |
| Pipes | Orange PVC curves, label | cx, cy |
| Tank | Main body, zones, dimensions | cx + 150 |
| Field | Trenches, boundary, label | cx + 350 |
| Panel | Data table, legend | SVG_W - 260 |

---

## 🔄 Isometric Math

### Projection formula

```javascript
// 3D point (x, y, z) → 2D screen (px, py)
const cos30 = Math.cos(Math.PI / 6);  // √3/2 ≈ 0.866
const sin30 = Math.sin(Math.PI / 6);  // 0.5

const px = (x - z) * cos30;
const py = y + (x + z) * sin30;
```

### Example: Tank corner

```javascript
// 3D model coords (meters)
x = 1.5 (width/2)
y = 0
z = 0

// Isometric screen coords (px)
px = (1.5 - 0) * 0.866 * 25 = 32.5
py = 0 + (1.5 + 0) * 0.5 * 25 = 18.75
```

---

## 🎯 Customization Points

### 1. Change scale

**File**: `IsometricDiagram.jsx`, line 97
```javascript
const scale = 25; // Change to 30 or 20 for zoom
```

### 2. Change viewport size

**File**: `IsometricDiagram.jsx`, line 95
```javascript
const SVG_W = 1000; // width
const SVG_H = 800;  // height
```

### 3. Change colors

Edit the `DS` object (lines 10–26) or override in component render:
```javascript
const myDS = { ...DS, cyanBright: "#00FFFF" };
```

### 4. Change field size

**File**: `IsometricDiagram.jsx`, line 114
```javascript
const fieldWidth = 8;   // was 6
const fieldDepth = 6;   // was 5
```

### 5. Add more elements (ej. secondary tank)

Add a new `<g>` section in SVG return, using same `iso` helpers:
```jsx
<g transform={`translate(${cx + 500}, ${cy + 100})`}>
  {/* your custom SVG */}
</g>
```

---

## 🚀 Performance Tips

1. **Memoization**: Component doesn't use React.memo (can add if many re-renders)
2. **SVG size**: 960×720 is reasonable; larger = slower export
3. **API calls**: Image generation is async; show loading spinner
4. **Cache**: Browser caches SVG; good for print

---

## 🐛 Common Issues & Fixes

### SVG not showing

**Cause**: `r` prop is null or missing keys
**Fix**: Verify calculator ran successfully before switching tab

### PNG download fails

**Cause**: Browser download restrictions or canvas security
**Fix**: Check CORS, allow downloads in browser settings

### Image generation timeout

**Cause**: API takes >30s, request times out
**Fix**: Increase client timeout, or show spinner longer

### Weird isometric angles

**Cause**: Scale or viewport mismatch
**Fix**: Verify `scale = 25` and SVG_W/H dimensions

---

## 📋 Checklist: Adding to new calc

- [ ] Import component: `import IsometricDiagram from "./IsometricDiagram"`
- [ ] Add tab: `{id:"diagrama3d", label:"Diagrama 3D"}`
- [ ] Add tab render: `{activeTab==="diagrama3d"&&...}`
- [ ] Pass `r`, `projectName`, `location`, `designer` props
- [ ] Test with various parameter values
- [ ] Test PNG export
- [ ] Verify styling matches your theme

---

## 📚 File Locations

```
/hydrostack
├── components/
│   ├── IsometricDiagram.jsx       ← Main component
│   └── SepticTankCalculator.jsx   ← Integration
├── app/
│   └── api/
│       └── generate-isometric/
│           └── route.js           ← API endpoint
├── .claude/
│   └── skills/
│       └── isometric-diagram-generator/
│           └── SKILL.md           ← Skill definition
├── DIAGRAMA_3D_GUIDE.md           ← User guide
└── DEVELOPERS_ISOMETRIC.md        ← This file
```

---

## 🔗 Related Documentation

- [User Guide](./DIAGRAMA_3D_GUIDE.md) — For end users
- [Skill Definition](./.claude/skills/isometric-diagram-generator/SKILL.md) — Overview
- [Calculator](./components/SepticTankCalculator.jsx) — Parent component

---

## 📞 Support

For issues or extensions, check:
1. Browser console (F12 → Console tab)
2. Network tab (POST /api/generate-isometric)
3. Build logs (`npm run build`)

---

**Last updated**: April 2025  
**Component version**: 1.0.0  
**Next.js**: 14.2.3  
**React**: 18.x
