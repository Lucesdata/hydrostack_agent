# Mapa departamental en el hero — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar la coropleta departamental ya construida en la columna derecha del hero de la portada, sin enviar la geometría al navegador.

**Architecture:** `app/page.js` seguirá siendo un componente de servidor: consulta los agregados con degradación segura y entrega el SVG ya renderizado a `PortadaCliente` mediante la prop `mapa`. `PortadaCliente` conserva su estado y efectos de cliente, pero coloca ese hueco dentro de la rejilla del hero; no crea otra consulta ni otra ruta pública.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Vitest, Drizzle, SVG y CSS existente.

**Spec:** `docs/rediseno-2026-09/BRIEF-MAPA-Y-HERO.md`, `docs/rediseno-2026-09/SPEC-GEOMETRIA-MAPA.md`

## Global Constraints

- No añadir dependencias cartográficas ni enviar `data/geo/departamentos.geo.json` al bundle de cliente.
- El mapa navega solo a `/licitaciones/departamento/[slug]`; no filtra la portada ni usa `searchParams`.
- La leyenda visible conserva “Según ubicación de la entidad contratante” y los procesos sin ubicación se quedan fuera del reparto.
- No cambiar `--bg`, `--accent` ni los colores semánticos; reutilizar los tokens y clases existentes.
- Si la base no responde durante el prerender, la portada sigue respondiendo con el mapa en gris, sin inventar cifras.
- No alterar el resto de secciones de la portada ni introducir datos escritos a mano.

---

## Estructura de archivos

- `app/page.js`: frontera de servidor; obtiene `agregadosPortada()` y construye la prop `mapa` con el SVG ya renderizado.
- `src/components/landing/PortadaCliente.jsx`: isla de cliente; sitúa la prop `mapa` en la columna derecha de `bp-hero-grid` y elimina la sección duplicada posterior.
- `src/__tests__/landing/PortadaCliente.test.tsx`: regresión de composición; asegura que el mapa entregado se renderiza dentro del hero y no queda como bloque independiente después de las rutas de intención.
- `docs/superpowers/plans/2026-09-22-mapa-en-hero.md`: este plan y sus decisiones de alcance.

### Task 1: Fijar la composición del hero con una prueba de regresión

**Files:**
- Create: `src/__tests__/landing/PortadaCliente.test.tsx`
- Test: `src/__tests__/landing/PortadaCliente.test.tsx`

**Interfaces:**
- Consumes: `PortadaCliente({ mapa?: ReactNode })`.
- Produces: una garantía de que el marcador de mapa forma parte de `.bp-hero-grid` y aparece una sola vez.

- [ ] **Step 1: Write the failing test**

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PortadaCliente from "@/src/components/landing/PortadaCliente";

describe("PortadaCliente", () => {
  it("renderiza el mapa del servidor dentro del hero", () => {
    const html = renderToStaticMarkup(
      <PortadaCliente mapa={<div data-testid="mapa-departamental">Mapa departamental</div>} />
    );
    const hero = html.match(/<div class="bp-hero-grid"[\\s\\S]*?<\\/div><\\/div>/)?.[0] ?? "";

    expect(hero).toContain('data-testid="mapa-departamental"');
    expect(html.match(/data-testid="mapa-departamental"/g)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/landing/PortadaCliente.test.tsx`

Expected: FAIL because the map is currently rendered after the intent-route block, outside `.bp-hero-grid`.

- [ ] **Step 3: Write minimal implementation**

In `PortadaCliente.jsx`, replace the right-side empty hero slot with a wrapper that renders `{mapa}` only when supplied. Keep the text column’s `maxWidth: 645`, add an explicit class for the map column, and use the existing responsive breakpoint so the columns stack on narrow screens. Delete the later `id="mapa"` section completely so the SVG is rendered once.

```jsx
<div className="bp-hero-mapa" aria-label="Procesos abiertos por departamento">
  {mapa}
</div>
```

Add CSS scoped to the existing blueprint string:

```css
.bp-hero-mapa { min-width: 0; align-self: center; }
.bp-hero-mapa:empty { display: none; }
@media (max-width: 900px) { .bp-hero-mapa { margin-top: 32px; } }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/landing/PortadaCliente.test.tsx`

Expected: PASS, with one map marker inside the hero markup.

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/PortadaCliente.jsx src/__tests__/landing/PortadaCliente.test.tsx
git commit -m "feat: place departmental map in landing hero"
```

### Task 2: Conservar la frontera servidor/cliente y probar el SVG completo

**Files:**
- Modify: `app/page.js:1-51`
- Modify: `src/__tests__/mapa/ColombiaChoropleth.test.tsx:20-66`
- Test: `src/__tests__/mapa/ColombiaChoropleth.test.tsx`

**Interfaces:**
- Consumes: `agregadosPortada(): Promise<{ totalAbiertos: number; departamentos: FilaAgregado[] }>` and `ColombiaChoropleth({ filas, totalAbiertos })`.
- Produces: a server-rendered map with 33 geometries and an empty, truthful fallback if the aggregate read fails.

- [ ] **Step 1: Write the failing test**

Extend the existing map component test with the expected fallback semantics:

```tsx
it("sigue dibujando los 33 departamentos cuando no llegan filas", () => {
  const html = renderToStaticMarkup(<ColombiaChoropleth filas={[]} />);

  expect(html.match(/class="clr-mapa__dpto/g)).toHaveLength(33);
  expect(html).not.toContain("sin ubicación resuelta");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/mapa/ColombiaChoropleth.test.tsx`

Expected: If the fallback has been accidentally removed while integrating the page, FAIL because fewer than 33 paths are emitted. If it already passes, leave the component unchanged and record that the test proves existing required behavior.

- [ ] **Step 3: Write minimal implementation**

Keep `app/page.js` as a server component. Its only data read is the existing `agregadosPortada()` in `try/catch`; on rejection pass `[]` and `undefined`, then pass the `ColombiaChoropleth` JSX as `mapa` to `PortadaCliente`.

```jsx
let departamentos = [];
let totalAbiertos;
try {
  const agregados = await agregadosPortada();
  departamentos = agregados.departamentos;
  totalAbiertos = agregados.totalAbiertos;
} catch (error) {
  console.error("[portada] agregados no disponibles, el mapa sale vacío:", error);
}
```

Do not import map geometry in `PortadaCliente`, do not add an API route, and do not set `force-dynamic`: ISR remains `21600` seconds as documented for the actual ingestion cadence.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/mapa/ColombiaChoropleth.test.tsx src/__tests__/landing/PortadaCliente.test.tsx`

Expected: PASS; 33 shapes are still emitted, the fallback remains truthful, and the client composition test stays green.

- [ ] **Step 5: Commit**

```bash
git add app/page.js src/__tests__/mapa/ColombiaChoropleth.test.tsx
git commit -m "fix: preserve map fallback at landing boundary"
```

### Task 3: Validar la ruta completa y actualizar el grafo

**Files:**
- Modify: `graphify-out/` (generado por `graphify update .`; no editar manualmente)

**Interfaces:**
- Consumes: los componentes y pruebas de las tareas 1 y 2.
- Produces: verificación local de la composición, mapa, tipado, formato y build.

- [ ] **Step 1: Run focused regression suite**

Run: `npm test -- src/__tests__/landing/PortadaCliente.test.tsx src/__tests__/mapa`

Expected: PASS.

- [ ] **Step 2: Run repository validation with no development server active**

Run:

```bash
npm test
npm run lint
npx prettier --check "src/**/*" "app/**/*"
npm run build
```

Expected: the complete suite, lint, formatting, and build succeed. If the documented pre-existing Prettier failures or Google Fonts network failure recur, preserve their exact output and do not reformat unrelated files.

- [ ] **Step 3: Update the graph**

Run: `graphify update .`

Expected: successful AST-only graph update; no source behavior changes.

- [ ] **Step 4: Commit the plan and graph update**

```bash
git add docs/superpowers/plans/2026-09-22-mapa-en-hero.md graphify-out
git commit -m "docs: plan landing hero map integration"
```

## Self-review

- Coverage: Task 1 places the map in the required 5/12–7/12 hero and removes the duplicate section. Task 2 preserves server rendering, 33-department fallback, real aggregation, location basis, and ISR. Task 3 validates the acceptance path and graph.
- No placeholders: every task has explicit paths, test code, commands, expected result, and implementation boundary.
- Type consistency: `PortadaCliente` consumes `ReactNode`; `ColombiaChoropleth` consumes `FilaAgregado[]` plus optional `totalAbiertos`; both match the existing definitions.
