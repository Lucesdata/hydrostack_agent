# Auditoría de Deuda Técnica — Hydrostack

**Fecha**: 2026-07-18 · **Alcance**: `app/`, `src/`, `scripts/` (151 archivos fuente)

## Estado general

| Chequeo | Resultado |
|---|---|
| TypeScript (`tsc --noEmit`) | ✅ 0 errores |
| Tests (`vitest run`) | ✅ 312/312 pasando (35 archivos) |
| ESLint (`next lint`) | ⚠️ 12 errores + 4 warnings |
| Duplicación (jscpd) | ✅ 0.27% líneas duplicadas (15 clones menores) |
| Código sin usar (knip) | ⚠️ 10 archivos, 2 dependencias, 39 exports, 70 tipos |

El proyecto está sano en lo fundamental: sin errores de tipos y con la suite completa en verde. La deuda es de baja severidad y concentrada en limpieza.

---

## Hallazgos priorizados

Puntaje = (Impacto + Riesgo) × (6 − Esfuerzo). Mayor = más prioritario.

### 1. Lint-gate desactivado con errores pendientes — Puntaje 30
`next.config.js` tiene `eslint.ignoreDuringBuilds: true` para esquivar 12 errores preexistentes. Mientras exista, ningún error nuevo de lint bloqueará el build.

- 10 errores son `react/no-unescaped-entities` (comillas sin escapar en JSX): `ProfileDetector.jsx:12`, `IsometricDiagram.jsx:168,501`, `CalculatorSchematics.jsx:182`, `ComoParticipar.tsx:32,76`.
- 2 errores en `src/lib/db/client.ts:34,36`: los comentarios `eslint-disable @typescript-eslint/no-require-imports` referencian una regla que no existe en la config (`next/core-web-vitals` no incluye typescript-eslint). Cambiar por `// eslint-disable-next-line` sin la regla TS o instalar el plugin.

**Fix**: corregir los 12 errores (~30 min) y reactivar el lint-gate quitando `ignoreDuringBuilds`.
Impacto 3 · Riesgo 3 · Esfuerzo 1

### 2. Warnings de react-hooks con riesgo de bugs reales — Puntaje 28
- `HydroAgent.jsx:293`: `useCallback` con dependencias faltantes (`lang`, `ownerState`, `userProfile`) — puede enviar estado obsoleto al agente (stale closure).
- `LocationPickerMap.jsx:178`: `mapElRef.current` leído en el cleanup del effect — puede fallar al desmontar el mapa Leaflet.

Estos dos no son cosméticos; son la categoría de warning que produce bugs intermitentes difíciles de reproducir.
Impacto 3 · Riesgo 4 · Esfuerzo 2

### 3. Dependencias sin uso en producción — Puntaje 25
- `@google/generative-ai`: cero referencias en el código. Eliminar.
- `@babylonjs/core`: sin uso — `IsometricDiagram3D.jsx` importa el paquete legacy `babylonjs` (bundle completo, no tree-shakeable). Están instalados ambos. Opción rápida: eliminar `@babylonjs/core`. Opción mejor: migrar el import a `@babylonjs/core` y eliminar `babylonjs`.

Dependencias muertas = superficie de ataque y peso de instalación sin beneficio.
Impacto 2 · Riesgo 3 · Esfuerzo 1

### 4. Archivos muertos — Puntaje 20
Sin ninguna referencia entrante (verificado con knip + grep):

- `src/components/IsometricDiagram.jsx` — versión 2D reemplazada por `IsometricDiagram3D` (y concentra 3 de los 12 errores de lint).
- `src/lib/classify/index.ts`, `src/lib/ingest/index.ts`, `src/lib/transform/index.ts` — barrels que nadie importa (los consumidores importan los módulos directos).
- `scripts/exploration/*.mjs` (6 archivos) — scripts de exploración de datos ya cumplida. Si tienen valor histórico, moverlos a `docs/` o borrarlos (están en git).

Impacto 2 · Riesgo 2 · Esfuerzo 1

### 5. Documentación desactualizada (CLAUDE.md) — Puntaje 20
`CLAUDE.md` declara "Next.js 15 + React" pero el proyecto usa **Next 14.2.3**. Como CLAUDE.md gobierna el comportamiento del agente en este repo, la discrepancia induce errores (ej. sugerir APIs de Next 15 como `serverExternalPackages` en vez de `experimental.serverComponentsExternalPackages`).
Impacto 2 · Riesgo 2 · Esfuerzo 1

### 6. Duplicación puntual — Puntaje 12
Global muy baja (0.27%), pero tres focos con lógica repetida real:

- `src/lib/secop/db-search.ts` ↔ `src/lib/secop/recientes.ts` — 3 clones (~20 líneas): condiciones de búsqueda y mapeo de filas repetidos. Extraer a un helper común en `src/lib/secop/`.
- `src/components/HydroAgent/LocationPicker.jsx` ↔ `PeoplePicker.jsx` ↔ `BuildSystemFlow.jsx` — 4 clones (~38 líneas): estructura de picker repetida. Candidato a componente base compartido.
- `src/components/BuildFlow/BuildFlow.jsx` ↔ `GlobalProgress.jsx` — 1 clon (11 líneas).

Los clones internos (`runIngest.ts`, `drainageField.ts`, `CalculatorSchematics.jsx`, `hechos.ts`) son pequeños y tolerables — no tocar salvo que se edite el archivo por otra razón.
Impacto 2 · Riesgo 2 · Esfuerzo 3

### 7. Exports y tipos sin consumidor — Puntaje 8
39 exports y 70 tipos exportados sin uso externo (lista completa: `npx knip --include exports,types`). Muchos son API "por si acaso" (`toolExecutors`, `NORMATIVE_REGISTRY`, `listNormatives`, tipos de `maintenance.ts`). No es urgente; quitar el `export` (sin borrar el código) cuando se toque cada archivo reduce falsa superficie pública.
Impacto 1 · Riesgo 1 · Esfuerzo 2

---

## Plan de remediación por fases

**Fase 1 — una sesión (~2 h), sin riesgo**
Corregir los 12 errores de lint → reactivar lint-gate en `next.config.js` → eliminar `@google/generative-ai` y `@babylonjs/core` → borrar `IsometricDiagram.jsx`, los 3 barrels y `scripts/exploration/` → actualizar CLAUDE.md (Next 14.2.3). Verificación: `npm run lint && npx tsc --noEmit && npm test && npm run build`.

**Fase 2 — siguiente sesión (~2 h), requiere prueba manual**
Arreglar los 2 warnings de react-hooks (HydroAgent y LocationPickerMap) probando el chat del agente y el mapa. Extraer helper común en `src/lib/secop/` para db-search/recientes (hay tests que cubren ambos: `db-search.test.ts`, `recientes.test.ts`).

**Fase 3 — oportunista, junto a trabajo de features**
Unificar pickers de HydroAgent cuando se toque ese módulo. Limpiar exports/tipos sin uso archivo por archivo. Considerar migración `babylonjs` → `@babylonjs/core` si el peso del bundle importa.

---

*Herramientas: tsc 5.x, next lint (eslint 8), vitest 4, jscpd 4 (min-tokens 70), knip 5. Nota: instalé `@rolldown/binding-linux-arm64-gnu` con `--no-save` en node_modules para poder correr vitest en mi entorno Linux; no afecta tu package.json y desaparece con el próximo `npm install`.*
