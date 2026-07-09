# Re-skin Licitaciones (SecopExplorer) al clear theme — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dark cyberpunk theme in `src/components/secop/SecopExplorer.tsx` (Licitaciones + semáforo de elegibilidad Nivel 0) with the clear theme already used by the landing and the calculators hub — pure re-skin, zero behavior change.

**Architecture:** Add a small set of shared `clr-*` CSS primitives (input, select, badge, verdict) to `app/globals.css` next to the existing clear-theme block, then swap class names and a couple of small mapping-object values in `SecopExplorer.tsx`. No changes to state, fetch, types, or JSX structure/nesting — only `className` strings, two `Record` value strings, and the component's local `<style>` block.

**Tech Stack:** Next.js 15 (App Router), plain CSS custom properties (no Tailwind), Vitest for unit tests.

---

## Spec reference

Design doc: `docs/superpowers/specs/2026-07-09-secop-explorer-clear-theme-design.md`. This plan implements that spec's full scope (in-scope: `SecopExplorer.tsx` + new `clr-*` primitives in `globals.css`; out of scope: calculators, BuildFlow — untouched).

## File Structure

- **Modify:** `app/globals.css` — append new `clr-input`/`clr-select`/`clr-badge`/`clr-verdict` primitives after the existing clear-theme block (after line 754, end of file).
- **Modify:** `src/components/secop/SecopExplorer.tsx` — update two `Record` mapping constants, all JSX `className` values, and replace the entire local `CSS` template string (lines 256-579) with a smaller component-specific block that only covers what the shared primitives don't (filters grid, card internals, pager, empty/error states).
- **No new files.** No test files created — this is a visual-only change; the existing `src/__tests__/secop/verdict.test.ts` (pure logic, no DOM/CSS) must keep passing unchanged, and is used as the regression guard.

---

### Task 1: Add shared `clr-*` primitives to `app/globals.css`

**Files:**
- Modify: `app/globals.css` (append at end of file, after line 754)

- [ ] **Step 1: Run the existing test suite to capture a clean baseline**

Run: `npm test -- verdict`
Expected: All tests in `src/__tests__/secop/verdict.test.ts` PASS (this file has nothing to do with CSS — it must stay green through every task in this plan; if it ever fails, something outside the intended scope was touched).

- [ ] **Step 2: Append the new primitives to `app/globals.css`**

Add this block at the very end of the file (after the existing `.clr-guided-banner:hover .clr-cta-arrow` rule at line 753):

```css

/* ── Clear theme — form inputs (clr-*) ───────────────────────────────────── */
.clr-input,
.clr-select {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  color: var(--ink-900);
  padding: 8px 12px;
  font-size: var(--fs-sm);
  font-family: var(--font-sans);
  outline: none;
  transition: border-color 0.18s, box-shadow 0.18s;
}
.clr-input::placeholder { color: var(--ink-300); }
.clr-input:focus,
.clr-select:focus {
  border-color: var(--focus-ring);
  box-shadow: 0 0 0 3px var(--accent-faint);
}
.clr-input:hover,
.clr-select:hover { border-color: var(--accent-soft); }

/* ── Clear theme — badges (clr-*) ─────────────────────────────────────────── */
.clr-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: var(--fs-xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  font-family: var(--font-mono);
  white-space: nowrap;
}
.clr-badge--neutral {
  background: var(--surface-alt);
  color: var(--ink-600);
  border: 1px solid var(--line);
}
.clr-badge--accent {
  background: var(--accent-faint);
  color: var(--accent);
  border: 1px solid var(--accent-soft);
}
.clr-badge--success {
  background: rgba(22,163,74,0.1);
  color: var(--success);
  border: 1px solid rgba(22,163,74,0.3);
}
.clr-badge--warning {
  background: rgba(217,119,6,0.1);
  color: var(--warning);
  border: 1px solid rgba(217,119,6,0.3);
}

/* ── Clear theme — veredicto Nivel 0, tratamiento "badge primero" (clr-*) ─── */
.clr-verdict {
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.clr-verdict-overall {
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  gap: 6px;
  border-radius: var(--radius-pill);
  padding: 5px 12px;
  font-size: var(--fs-xs);
  font-weight: 600;
}
.clr-verdict-overall--pass {
  background: rgba(22,163,74,0.1);
  border: 1px solid rgba(22,163,74,0.3);
  color: var(--success);
}
.clr-verdict-overall--warn {
  background: rgba(217,119,6,0.1);
  border: 1px solid rgba(217,119,6,0.3);
  color: var(--warning);
}
.clr-verdict-overall--fail {
  background: rgba(220,38,38,0.1);
  border: 1px solid rgba(220,38,38,0.3);
  color: var(--danger);
}
.clr-verdict-overall--unknown {
  background: var(--surface-alt);
  border: 1px solid var(--line);
  color: var(--ink-600);
}
.clr-verdict-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}
.clr-verdict-gates {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
}
.clr-verdict-gate {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--ink-600);
  cursor: default;
}
.clr-verdict-glyph { font-weight: 700; line-height: 1; }
.clr-verdict-gate--pass .clr-verdict-glyph { color: var(--success); }
.clr-verdict-gate--warn .clr-verdict-glyph { color: var(--warning); }
.clr-verdict-gate--fail .clr-verdict-glyph { color: var(--danger); }
.clr-verdict-gate--unknown .clr-verdict-glyph { color: var(--ink-300); }
```

- [ ] **Step 3: Verify the CSS parses — build the project**

Run: `npm run build`
Expected: Build succeeds (Next.js compiles `globals.css` — a syntax error here would fail the build immediately). If it fails, check for a missing semicolon or unbalanced brace in the block just added.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat(secop): agrega primitivas clr-input/clr-select/clr-badge/clr-verdict"
```

---

### Task 2: Update the two mapping constants in `SecopExplorer.tsx`

**Files:**
- Modify: `src/components/secop/SecopExplorer.tsx:38-43` (the `ACCESS_CLASS` constant)

- [ ] **Step 1: Change `ACCESS_CLASS` values from CSS-suffix names to badge-variant names**

Current code (lines 38-43):

```typescript
const ACCESS_CLASS: Record<DocumentAccess, string> = {
  PUBLIC: "public",
  RESTRICTED: "restricted",
  NOT_PUBLISHED: "notpub",
  UNKNOWN: "unknown",
};
```

Replace with:

```typescript
const ACCESS_CLASS: Record<DocumentAccess, string> = {
  PUBLIC: "success",
  RESTRICTED: "warning",
  NOT_PUBLISHED: "warning",
  UNKNOWN: "neutral",
};
```

This is the only change needed to this constant — it will be consumed by the new `.clr-badge--{variant}` classes in Task 4. `ACCESS_LABEL` (the Spanish text above it) and `STATUS`/`OVERALL_LABEL`/`GATE_LABEL` (used by the verdict block) are unchanged — their `cls` values (`pass`/`warn`/`fail`/`unknown`) already match the new `.clr-verdict-gate--*` / `.clr-verdict-overall--*` suffixes added in Task 1, so no edit needed there.

- [ ] **Step 2: Run the test suite again**

Run: `npm test -- verdict`
Expected: Still PASS — this constant isn't imported by the test file, so this is a no-op check confirming nothing else broke.

- [ ] **Step 3: Commit**

```bash
git add src/components/secop/SecopExplorer.tsx
git commit -m "refactor(secop): ACCESS_CLASS usa nombres de variante de badge"
```

---

### Task 3: Re-skin the page shell, header, and filters (JSX)

**Files:**
- Modify: `src/components/secop/SecopExplorer.tsx:138-161`

- [ ] **Step 1: Replace the root container, header, and filters JSX**

Current code (lines 138-161):

```tsx
  return (
    <div className="hs-secop">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <header className="hs-secop-head">
        <span className="hs-secop-tag">SECOP II · DATOS ABIERTOS</span>
        <h1>Licitaciones · Agua y Saneamiento</h1>
        <p>Procesos de contratación pública del sector agua potable y saneamiento básico en Colombia — adjudicados y por adjudicar.</p>
      </header>

      <div className="hs-secop-filters">
        <input className="hs-secop-input" placeholder="Buscar (municipio, objeto, entidad…)"
          value={filters.q} onChange={set("q")} />
        <select className="hs-secop-input" value={filters.departamento} onChange={set("departamento")}>
          <option value="">Todos los departamentos</option>
          {DEPARTAMENTOS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="hs-secop-input" value={filters.estado} onChange={set("estado")}>
          <option value="">Todos los estados</option>
          {ESTADOS_PROCESO.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <input className="hs-secop-input" type="number" placeholder="Valor mín. (COP)"
          value={filters.valorMin} onChange={set("valorMin")} />
      </div>
```

Replace with:

```tsx
  return (
    <div className="clr-page">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="clr-container">
        <header style={{ marginBottom: 22 }}>
          <span className="clr-tag">SECOP II · Datos abiertos</span>
          <h1 className="clr-h1">Licitaciones · Agua y Saneamiento</h1>
          <p className="clr-sub">Procesos de contratación pública del sector agua potable y saneamiento básico en Colombia — adjudicados y por adjudicar.</p>
        </header>

        <div className="clr-secop-filters">
          <input className="clr-input" placeholder="Buscar (municipio, objeto, entidad…)"
            value={filters.q} onChange={set("q")} />
          <select className="clr-select" value={filters.departamento} onChange={set("departamento")}>
            <option value="">Todos los departamentos</option>
            {DEPARTAMENTOS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="clr-select" value={filters.estado} onChange={set("estado")}>
            <option value="">Todos los estados</option>
            {ESTADOS_PROCESO.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <input className="clr-input" type="number" placeholder="Valor mín. (COP)"
            value={filters.valorMin} onChange={set("valorMin")} />
        </div>
```

Note the opened `<div className="clr-container">` — it will be closed in Task 6 (it wraps everything through the pager). `clr-tag`/`clr-h1`/`clr-sub`/`clr-page` already exist in `globals.css` (used today by `app/calculators/page.js`) — no new CSS needed for this task.

- [ ] **Step 2: Commit**

```bash
git add src/components/secop/SecopExplorer.tsx
git commit -m "feat(secop): re-skin de header y filtros al clear theme"
```

---

### Task 4: Re-skin the results grid, card shell, and state/value row (JSX)

**Files:**
- Modify: `src/components/secop/SecopExplorer.tsx:163-196`

- [ ] **Step 1: Replace the results wrapper and the top of each card**

Current code (lines 163-196):

```tsx
      {error && <div className="hs-secop-error">⚠ {error}</div>}

      <div className="hs-secop-results">
        {loading && <div className="hs-secop-skeleton">Consultando SECOP…</div>}

        {!loading && data?.items.length === 0 && (
          <div className="hs-secop-empty">Sin resultados para estos filtros.</div>
        )}

        {!loading && data?.items.map((p) => {
          // Acceso efectivo: el del probe on-demand si existe, si no el preliminar.
          const acc = probed[p.id] ?? { state: p.documentAccess, message: p.accessMessage };
          const v = p.verdict;
          return (
          <article key={p.id} className="hs-secop-card">
            <div className="hs-secop-card-top">
              <span className={`hs-secop-state hs-secop-state--${p.adjudicado ? "adj" : "open"}`}>
                {p.estado || (p.adjudicado ? "Adjudicado" : "Abierto")}
              </span>
              <span className="hs-secop-val">
                {p.valorAdjudicacion ?? p.precioBase
                  ? COP.format((p.valorAdjudicacion ?? p.precioBase)!)
                  : "—"}
              </span>
            </div>
            <h3 className="hs-secop-card-title">{p.nombre || p.referencia}</h3>
            <p className="hs-secop-card-entity">{p.entidad}</p>
            <div className="hs-secop-meta">
              <span>{p.departamento}{p.ciudad ? ` · ${p.ciudad}` : ""}</span>
              <span>{p.modalidad}</span>
              {p.fechaPublicacion && (
                <span>{new Date(p.fechaPublicacion).toLocaleDateString("es-CO")}</span>
              )}
            </div>
```

Replace with:

```tsx
      {error && <div className="clr-secop-error">⚠ {error}</div>}

      <div className="clr-grid">
        {loading && <div className="clr-secop-empty">Consultando SECOP…</div>}

        {!loading && data?.items.length === 0 && (
          <div className="clr-secop-empty">Sin resultados para estos filtros.</div>
        )}

        {!loading && data?.items.map((p) => {
          // Acceso efectivo: el del probe on-demand si existe, si no el preliminar.
          const acc = probed[p.id] ?? { state: p.documentAccess, message: p.accessMessage };
          const v = p.verdict;
          return (
          <article key={p.id} className="clr-card is-active">
            <div className="clr-secop-card-top">
              <span className={`clr-badge clr-badge--${p.adjudicado ? "accent" : "neutral"}`}>
                {p.estado || (p.adjudicado ? "Adjudicado" : "Abierto")}
              </span>
              <span className="clr-secop-val">
                {p.valorAdjudicacion ?? p.precioBase
                  ? COP.format((p.valorAdjudicacion ?? p.precioBase)!)
                  : "—"}
              </span>
            </div>
            <h3 className="clr-card-title">{p.nombre || p.referencia}</h3>
            <p className="clr-secop-entity">{p.entidad}</p>
            <div className="clr-secop-meta">
              <span>{p.departamento}{p.ciudad ? ` · ${p.ciudad}` : ""}</span>
              <span>{p.modalidad}</span>
              {p.fechaPublicacion && (
                <span>{new Date(p.fechaPublicacion).toLocaleDateString("es-CO")}</span>
              )}
            </div>
```

`clr-grid` and `clr-card`/`clr-card-title` already exist in `globals.css` and are reused as-is. `is-active` on `clr-card` just enables the existing hover lift/shadow rule (`.clr-card.is-active:hover`) — there is no "is-soon" state here, every result card is fully interactive.

- [ ] **Step 2: Commit**

```bash
git add src/components/secop/SecopExplorer.tsx
git commit -m "feat(secop): re-skin de grid y tarjetas al clear theme"
```

---

### Task 5: Re-skin the verdict block — "badge primero" (JSX)

**Files:**
- Modify: `src/components/secop/SecopExplorer.tsx:197-220`

- [ ] **Step 1: Replace the verdict block markup**

Current code (lines 197-220):

```tsx
            {v && (
              <div className={`hs-verdict hs-verdict--${STATUS[v.overall].cls}`}>
                <div className="hs-verdict-head">
                  <span className="hs-verdict-tag">VEREDICTO · NIVEL 0</span>
                  <span className="hs-verdict-overall">
                    <span className="hs-verdict-dot" />
                    {OVERALL_LABEL[v.overall]}
                  </span>
                </div>
                <div className="hs-verdict-gates">
                  {GATE_LABEL.map(([key, label]) => {
                    const g = v.gates[key];
                    const s = STATUS[g.status];
                    const tip = `${label}: ${g.reason}${g.requiredLevel === 2 ? " · requiere pliego" : ""}`;
                    return (
                      <span key={key} className={`hs-verdict-gate hs-verdict-gate--${s.cls}`} title={tip}>
                        <span className="hs-verdict-glyph">{s.glyph}</span>
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
```

Replace with:

```tsx
            {v && (
              <div className="clr-verdict">
                <span className={`clr-verdict-overall clr-verdict-overall--${STATUS[v.overall].cls}`}>
                  <span className="clr-verdict-dot" />
                  {OVERALL_LABEL[v.overall]}
                  <span style={{ opacity: 0.7, fontWeight: 400 }}>· Nivel 0</span>
                </span>
                <div className="clr-verdict-gates">
                  {GATE_LABEL.map(([key, label]) => {
                    const g = v.gates[key];
                    const s = STATUS[g.status];
                    const tip = `${label}: ${g.reason}${g.requiredLevel === 2 ? " · requiere pliego" : ""}`;
                    return (
                      <span key={key} className={`clr-verdict-gate clr-verdict-gate--${s.cls}`} title={tip}>
                        <span className="clr-verdict-glyph">{s.glyph}</span>
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
```

This drops the boxed/bordered "HUD" container (`hs-verdict-head` tag row) in favor of the pill-first layout from the approved design: the overall status is a colored pill (green/amber/red/gray matching `--success`/`--warning`/`--danger`/muted), and the 5 gates render as plain inline text with a colored glyph, no per-gate box or border. `STATUS`, `OVERALL_LABEL`, and `GATE_LABEL` are unchanged (defined at lines 49-71) — only the JSX and class names change.

- [ ] **Step 2: Commit**

```bash
git add src/components/secop/SecopExplorer.tsx
git commit -m "feat(secop): semaforo Nivel 0 con tratamiento badge-primero"
```

---

### Task 6: Re-skin adjudicatario, access row, actions, and close the container (JSX)

**Files:**
- Modify: `src/components/secop/SecopExplorer.tsx:221-253`

- [ ] **Step 1: Replace the remainder of the card and close the wrapping `clr-container`**

Current code (lines 221-253):

```tsx
            {p.adjudicatario && p.adjudicatario !== "No Adjudicado" && (
              <p className="hs-secop-adj">Adjudicatario: <strong>{p.adjudicatario}</strong></p>
            )}
            <div className="hs-secop-access-row">
              <span className={`hs-secop-access hs-secop-access--${ACCESS_CLASS[acc.state]}`}>
                {ACCESS_LABEL[acc.state]}
              </span>
              <span className="hs-secop-access-msg">{acc.message}</span>
            </div>
            <div className="hs-secop-actions">
              {acc.state !== "PUBLIC" && !probed[p.id] && p.url && (
                <button className="hs-secop-probe" onClick={() => probe(p)} disabled={probing[p.id]}>
                  {probing[p.id] ? "Verificando…" : "Verificar acceso"}
                </button>
              )}
              {p.url && (
                <a className="hs-secop-link" href={p.url} target="_blank" rel="noreferrer">
                  {acc.state === "PUBLIC" ? "Ver en SECOP ↗" : "Abrir en SECOP II ↗"}
                </a>
              )}
            </div>
          </article>
          );
        })}
      </div>

      <div className="hs-secop-pager">
        <button disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>← Anterior</button>
        <span>Página {page}</span>
        <button disabled={loading || (data?.items.length ?? 0) === 0} onClick={() => setPage((p) => p + 1)}>Siguiente →</button>
      </div>
    </div>
  );
}
```

Replace with:

```tsx
            {p.adjudicatario && p.adjudicatario !== "No Adjudicado" && (
              <p className="clr-secop-adj">Adjudicatario: <strong>{p.adjudicatario}</strong></p>
            )}
            <div className="clr-secop-access-row">
              <span className={`clr-badge clr-badge--${ACCESS_CLASS[acc.state]}`}>
                {ACCESS_LABEL[acc.state]}
              </span>
              <span className="clr-secop-access-msg">{acc.message}</span>
            </div>
            <div className="clr-secop-actions">
              {acc.state !== "PUBLIC" && !probed[p.id] && p.url && (
                <button className="clr-secop-probe" onClick={() => probe(p)} disabled={probing[p.id]}>
                  {probing[p.id] ? "Verificando…" : "Verificar acceso"}
                </button>
              )}
              {p.url && (
                <a className="clr-secop-link" href={p.url} target="_blank" rel="noreferrer">
                  {acc.state === "PUBLIC" ? "Ver en SECOP ↗" : "Abrir en SECOP II ↗"}
                </a>
              )}
            </div>
          </article>
          );
        })}
      </div>

      <div className="clr-secop-pager">
        <button disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>← Anterior</button>
        <span>Página {page}</span>
        <button disabled={loading || (data?.items.length ?? 0) === 0} onClick={() => setPage((p) => p + 1)}>Siguiente →</button>
      </div>
      </div>
    </div>
  );
}
```

Note the extra closing `</div>` before the final `</div>` — it closes the `clr-container` opened in Task 3.

- [ ] **Step 2: Commit**

```bash
git add src/components/secop/SecopExplorer.tsx
git commit -m "feat(secop): re-skin de acceso documental, acciones y paginador"
```

---

### Task 7: Replace the component's local `CSS` block

**Files:**
- Modify: `src/components/secop/SecopExplorer.tsx:256-579` (the `const CSS = \`...\`` template string)

- [ ] **Step 1: Replace the entire local CSS block**

Replace the full current block (from `const CSS = \`` at line 256 through the closing `` ` `` at line 579) with:

```tsx
const CSS = `
.clr-secop-filters{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}
.clr-secop-error{
  border: 1px solid rgba(217,119,6,0.3);
  background: rgba(217,119,6,0.06);
  color: var(--warning);
  padding: 12px 16px;
  border-radius: var(--radius-md);
  margin-bottom: 16px;
  font-size: var(--fs-sm);
}
.clr-secop-empty{
  grid-column: 1 / -1;
  padding: 48px;
  text-align: center;
  color: var(--ink-600);
  font-size: var(--fs-sm);
  border: 1px dashed var(--line);
  border-radius: var(--radius-lg);
}
.clr-secop-card-top{
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.clr-secop-val{
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: var(--ink-900);
  text-align: right;
}
.clr-secop-entity{
  color: var(--accent);
  font-size: 12px;
  font-family: var(--font-mono);
  margin: 0;
}
.clr-secop-meta{
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  color: var(--ink-600);
  font-size: 11px;
  font-family: var(--font-mono);
}
.clr-secop-adj{ font-size: 12px; color: var(--ink-600); margin: 0; }
.clr-secop-adj strong{ color: var(--ink-900); }
.clr-secop-access-row{
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  margin-top: 2px;
}
.clr-secop-access-msg{
  font-size: 11px;
  color: var(--ink-600);
  line-height: 1.3;
}
.clr-secop-actions{
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  padding-top: 6px;
}
.clr-secop-probe{
  background: transparent;
  border: 1px solid var(--line);
  color: var(--ink-600);
  padding: 5px 11px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: 12px;
  transition: border-color 0.18s, color 0.18s;
}
.clr-secop-probe:hover:not(:disabled){ border-color: var(--accent); color: var(--accent); }
.clr-secop-probe:disabled{ opacity: 0.5; cursor: not-allowed; }
.clr-secop-link{
  color: var(--accent);
  text-decoration: none;
  font-size: 12px;
  font-weight: 500;
}
.clr-secop-link:hover{ text-decoration: underline; }
.clr-secop-pager{
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-top: 32px;
  font-size: 13px;
  color: var(--ink-600);
}
.clr-secop-pager button{
  background: transparent;
  border: 1px solid var(--line);
  color: var(--ink-900);
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: 13px;
  transition: border-color 0.18s, color 0.18s;
}
.clr-secop-pager button:hover:not(:disabled){ border-color: var(--accent); color: var(--accent); }
.clr-secop-pager button:disabled{ opacity: 0.35; cursor: not-allowed; }
`;
```

This drops every `hs-secop-*`/`hs-verdict-*` rule (dark backgrounds, `var(--cyan)`, `var(--deep2)`, `Orbitron`/`IBM Plex Mono`) — all of it is now either covered by shared `clr-*` primitives (Task 1) or by this shorter component-local block using only clear-theme tokens.

- [ ] **Step 2: Run the full build**

Run: `npm run build`
Expected: Succeeds with no TypeScript or CSS errors.

- [ ] **Step 3: Run the regression test suite one more time**

Run: `npm test -- verdict`
Expected: PASS, identical results to Task 1 Step 1 — confirms the entire re-skin didn't touch verdict logic.

- [ ] **Step 4: Commit**

```bash
git add src/components/secop/SecopExplorer.tsx
git commit -m "refactor(secop): reemplaza CSS local cyberpunk por bloque clear-theme"
```

---

### Task 8: Manual visual verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server and open `/licitaciones`**

Use the preview tool to start the Next.js dev server and navigate to `/licitaciones`. Confirm:
- Page background is light (`--bg` `#FAFAF7`), not black.
- Header shows the `clr-tag` pill, bold serif-free title, and subtitle — same visual pattern as `/calculators`.
- Filters render as light inputs/selects with the teal focus ring on click.

- [ ] **Step 2: Confirm the verdict pill renders correctly for all 4 states**

Because live SECOP data may not include all 4 `GateStatus` values on a given day, use `preview_eval` to inject a synthetic result into the page state (or temporarily hardcode one `verdict` object per state in a scratch fetch mock) and confirm, for each of PASS / WARN / FAIL / UNKNOWN:
- The overall pill shows the right color (green/amber/red/gray) and the right label (Elegible/Con reservas/No elegible/Por confirmar).
- Each of the 5 gates shows its glyph (✓/!/✕/?) in the matching color, as plain inline text with no box/border.
- Hovering a gate shows its `title` tooltip with the reason text.

- [ ] **Step 3: Confirm access badges and actions**

Confirm the "Público"/"Restringido"/"Sin publicar"/"Por confirmar" badges render in success/warning/warning/neutral colors respectively, the "Verificar acceso" button and "Ver en SECOP ↗" link have visible hover states in `--accent` teal, and clicking "Verificar acceso" still triggers the probe request (check via `preview_network`) exactly as before.

- [ ] **Step 4: Confirm pager and empty/error states**

Paginate forward/back and confirm the pager buttons match the site's button style. Trigger an empty-results filter combination and confirm the "Sin resultados" message renders in the light dashed-border box. If possible, force a fetch error and confirm the error banner renders in the amber/warning palette.

- [ ] **Step 5: Final full-suite regression check**

Run: `npm test`
Expected: Entire suite passes — this is a broader net than the `verdict`-only checks in earlier tasks, confirming nothing in `src/lib/secop/*` or elsewhere regressed.

- [ ] **Step 6: Update the design doc status (optional but recommended)**

Add a one-line note at the top of `docs/superpowers/specs/2026-07-09-secop-explorer-clear-theme-design.md` marking it implemented, e.g. `> **Estado:** implementado 2026-07-09.` Commit:

```bash
git add docs/superpowers/specs/2026-07-09-secop-explorer-clear-theme-design.md
git commit -m "docs(secop): marca spec de re-skin como implementada"
```
