# ADR-0002 — Deprecación del dominio séptico; SECOP como único producto activo

**Fecha**: 2026-08-08
**Estado**: Aceptado

## Contexto

El repositorio nació como una herramienta de cálculo para sistemas de
tratamiento de aguas residuales in-situ (fosas sépticas, campos de
infiltración, mantenimiento) — el "dominio séptico": calculadoras
client-side sin persistencia, un asistente conversacional (Hydro_Agent vía
Groq) y generación de diagramas 3D e informes PDF.

El 2026-06-04 el producto giró hacia una plataforma de inteligencia para
contratación pública en agua y saneamiento sobre SECOP II ("el dominio
SECOP"): exploración de procesos, extracción de pliegos, perfil de
oferente y elegibilidad, y alertas. Ver memoria de proyecto
`proyecto_hydrostack_contratacion` (2026-06-04) y los docs de fase
(`docs/fase-0/`, `docs/fase-1/`, `docs/fase-a/`).

Desde ese giro, ambos dominios convivieron en el mismo repo/deploy sin que
ninguna decisión lo documentara. La auditoría arquitectónica del
2026-08-08 (`AUDITORIA_ARQUITECTONICA_2026-08-08.md`, hallazgo A.1 y G)
identificó esto como el hallazgo estructural principal: "el repo es dos
productos, no uno", sin ADR que explique la coexistencia ni un límite de
repo/deploy que la refleje.

## Decisión

**El dominio séptico queda deprecado y se retira del runtime activo.
SECOP / inteligencia para contratación pública es el único producto
activo de HydroStack.**

Se ejecuta como deprecación controlada, no como pérdida de trabajo: el
estado completo del dominio séptico previo a esta operación queda
recuperable en el tag de git `archive/septic-product-2026-08-08` (commit
`efa9fb5`, `main` antes de esta serie de commits).

Se retira:
- Rutas: `/chat`, `/build`, `/calculators/*`, `/experiencia`.
- Componentes: `HydroAgent/*`, `BuildFlow/*`, `calculator/*`, `geo/*`,
  `icons/calculators/*`, `experiencia/*`, `IsometricDiagram*.jsx`,
  `LaminaTecnica.jsx`, `MaintenanceCalculator.jsx`,
  `SepticTankCalculator.jsx`.
- Lib de dominio: `src/lib/{calculations,septic,validation,geo,reports}`,
  `src/lib/agent/*` (incluida la herramienta `search_secop_tenders` — se
  decidió no migrarla; recuperar el chat con licitaciones SECOP sería una
  feature nueva, diseñada de cero, no un remanente del agente séptico),
  `src/lib/config/{normativeRegistry,regulatory_framework}.ts` (quedaron
  sin consumidores tras retirar lo anterior).
- Endpoints: `/api/agent`, `/api/agent/suggest`, `/api/generate-isometric`,
  `/api/report/generate`.
- `src/lib/i18n.js` (LangProvider) — sin consumidores reales tras el
  retiro; el selector de idioma del Navbar ya estaba desactivado.
- Dependencias huérfanas: `@babylonjs/core`, `babylonjs`, `leaflet`,
  `pdfkit`, `@types/pdfkit`.
- `src/lib/pliego/extractPliego.ts` (Anthropic) — dominio SECOP, no
  séptico, pero confirmado sin caller en producción por la misma auditoría
  (hallazgo F.9); se retiró junto con esta operación porque permitía
  eliminar por completo la dependencia `@anthropic-ai/sdk`, que de otro
  modo habría quedado huérfana solo por el lado séptico
  (`/api/generate-isometric`).

Se conserva (infraestructura compartida, con uso real desde SECOP):
- `src/lib/state/clientStore.ts` — podado de todo lo séptico (perfil de
  propietario, owner-state, form-state, build-progress) pero conservado
  porque `SecopExplorer.tsx`, `OferenteWizard.tsx` y
  `app/api/perfil/route.ts` lo usan para el perfil de oferente.
- `app/layout.js`, `app/page.js`, `Navbar.js` — editados para quitar las
  referencias sépticas, no eliminados.

## Alternativas consideradas

1. **Mantener ambos dominios, solo reordenar la navegación.** Rechazada:
   no resuelve la causa raíz (dos productos sin relación compitiendo por
   superficie de mantenimiento) y la auditoría ya identificó consecuencias
   concretas de esto (cálculo normativo duplicado, `clientStore.ts`
   evitado por 6 componentes, endpoints sin gobernanza de costo).
2. **Mover el dominio séptico a un repo/proyecto separado en vez de
   eliminarlo del actual.** Descartada por ahora: no hay razón de negocio
   activa para mantenerlo desplegado en paralelo; el tag de git es
   suficiente para recuperación si esa razón aparece.
3. **Migrar `search_secop_tenders` a un endpoint SECOP antes de borrar el
   agente.** Evaluada y descartada: es una decisión de producto (un
   asistente conversacional para SECOP), no una consecuencia técnica
   obligatoria de esta consolidación.

## Consecuencias

- Superficie de mantenimiento reducida: ~90 archivos y 5 dependencias de
  paquete menos; un solo dominio de negocio en el runtime activo.
- `CLAUDE.md` y `README.md` dejan de describir un producto que ya no
  existe en producción.
- Pérdida real: la búsqueda de licitaciones vía chat (`search_secop_tenders`)
  y la generación de informes PDF/3D del flujo `/build` dejan de estar
  disponibles. Recuperables desde el tag si se decide retomarlas.
- El dominio séptico puede reintroducirse en el futuro como producto,
  aplicación o módulo independiente si aparece una razón de negocio real
  — no se diseña hoy arquitectura para ese escenario hipotético.

## Reintroducción futura

Si se decide retomar el dominio séptico:
1. `git log archive/septic-product-2026-08-08` tiene el estado completo
   previo a esta deprecación.
2. Debería nacer como proyecto o deploy independiente, no reintegrarse a
   este repo — la razón de esta ADR es precisamente que compartir
   runtime entre dos dominios sin relación generó los hallazgos F.3, F.5
   y G de la auditoría del 2026-08-08.
