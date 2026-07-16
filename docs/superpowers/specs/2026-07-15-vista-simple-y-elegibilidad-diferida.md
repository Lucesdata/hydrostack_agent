# Separación de momentos: vista simple de procesos + elegibilidad diferida

**Fecha:** 2026-07-15 · **Estado:** Fase 1, Fase 2 y Fase 3 implementadas

## Problema

`/licitaciones` presenta de entrada el workbench completo (5 filtros, paginación,
master-detail, semáforo de elegibilidad). Para el usuario general que solo quiere
*ver* procesos es demasiado, y la carga inicial es cara: `/api/secop` hace en un
solo request la búsqueda live a Socrata + count paralelo + veredicto por ítem.
La base Neon con ingesta cron ya existe pero la UI no la usa.

## Principio

Dos momentos separados:

1. **Ver procesos** (usuario general): los últimos 25 procesos, sin filtros, sin
   veredicto, servidos desde nuestro Postgres con caché ISR. Carga en milisegundos.
2. **¿Puedo participar?** (opt-in): elegibilidad de empresa o persona natural,
   solo cuando el usuario lo pide. Nunca antes.

## Fases

### Fase 1 — Vista rápida (esta iteración)

- `src/lib/secop/recientes.ts`: `getProcesosRecientes()` lee los últimos 25 de la
  tabla `proceso` (join `entidad`, `geografia`, `raw_record` para la URL).
  Fallback a Socrata live si la base está vacía o falla. Mappers puros testeables.
- `GET /api/procesos/recientes`: endpoint liviano cacheado (`revalidate = 300`).
  Sin count, sin verdict, sin probe.
- `/licitaciones`: página **server-rendered con ISR** (revalidate 300) que muestra
  la lista simple (`ProcesosRecientes`). Cada tarjeta enlaza al proceso en SECOP.
  CTA discreto al pie: "¿Quieres saber si puedes participar?" + enlace
  "Búsqueda avanzada" en el encabezado.
- `/licitaciones/explorar`: el workbench actual (`SecopExplorer`) intacto, como
  modo avanzado.

### Fase 2 — Segundo momento: elegibilidad on-demand ✅ implementada

- `buildVerdict` salió del fetch de lista: `GET /api/secop` ya no adjunta
  `verdict` a los items (`app/api/secop/route.ts`). Endpoint separado
  `POST /api/secop/verdict` (`app/api/secop/verdict/route.ts`) recibe
  `{ proceso, perfil }` y devuelve `{ verdict }` — recomputado en cada
  llamada, nunca persistido (invariante de `verdict.ts`).
- Mini-wizard de 4 pasos (`src/components/secop/OferenteWizard.tsx`,
  construcción pura en `src/lib/oferente/wizard.ts`): identidad (empresa /
  persona natural) → sectores UNSPSC → cobertura geográfica → rango de
  cuantía. Solo pide los campos que las compuertas Nivel 0 leen; reemplaza a
  `OFERENTE_PILOTO`. Perfil persistido en `localStorage` vía
  `clientStore.ts` (`getOferentePerfil`/`saveOferentePerfil`), sin cuenta.
- En el workbench (`SecopExplorer.tsx`), el detalle (`ProcessDetail.tsx`)
  muestra un CTA "¿Puedo participar? Cuéntanos de ti" si no hay perfil
  guardado; con perfil, el semáforo se calcula on-demand al seleccionar un
  proceso (o justo al completar el wizard) y se cachea en memoria por
  `procesoId` — no recomputa si ya se pidió para ese proceso.
- Nota de alcance: el CTA del wizard vive en el workbench (`/licitaciones/explorar`),
  no en la vista simple de Fase 1 (`/licitaciones`), que sigue intacta.

### Fase 3 — Pulido ✅ implementada

- Página educativa `/licitaciones/como-participar` (`ComoParticipar.tsx`):
  prosa, tono del agente (directo, "paso concreto", avisos de error común),
  5 pasos desde habilitarse (RUP) hasta la firma del contrato. El CTA al pie
  de la vista simple (`ProcesosRecientes.tsx`) ahora enlaza aquí; la página
  cierra con un CTA hacia `/licitaciones/explorar`.
- Workbench migrado a Postgres (`GET /api/secop`): `searchProcesosDb`/
  `countProcesosDb` (`src/lib/secop/db-search.ts`) primero; Socrata live
  (`searchProcesos`/`countProcesos`) queda como fallback si la base falla
  (throw), nunca por resultado vacío. `proceso` solo normaliza un subconjunto
  de columnas — `unspsc`, `estado_apertura`, `valor_adjudicacion`,
  `adjudicatario`, `fase`, `descripción` no tienen columna propia y se
  extraen de `raw_record.payload` (jsonb) con las mismas llaves de
  `FIELDS_PROCESOS`. `clasificacion_sectorial` está vacía (0 filas, el
  clasificador UNSPSC nunca corrió) — el filtro "solo sector agua" reproduce
  el mismo OR de keywords que Socrata live, pero contra el JSON crudo.
  **Costo real medido:** el ILIKE sobre jsonb sin índice tarda 9–24s en frío
  contra 87k filas (mejor que los 84s de Socrata live sin caché, pero lejos de
  "milisegundos"). Mitigado con memoización en memoria por combinación de
  filtros (`src/lib/secop/cached-db-search.ts`, TTL = `REVALIDATE_SEARCH`/
  `REVALIDATE_COUNT`, singleton en `globalThis` para sobrevivir HMR en dev y
  reusarse entre invocaciones calientes en prod): el primer visitante por
  combinación de filtros paga el costo, todos los siguientes (dentro del TTL)
  reciben cache hit en ~10ms. Un índice GIN sobre el texto extraído (o correr
  el clasificador sectorial) resolvería el caso frío; queda pendiente como
  mejora futura, no bloqueante.
- Métricas: `@vercel/analytics` + `@vercel/speed-insights` montados en
  `app/layout.js`. Tiempo a primer render por ruta lo captura Speed Insights
  automáticamente (Core Web Vitals, sin código adicional). Tasa de clic en el
  CTA vía `TrackedCtaLink` (`src/components/secop/TrackedCtaLink.tsx`, único
  client component de la página — el resto sigue siendo server component):
  eventos `licitaciones_cta_como_participar` y `como_participar_cta_buscar`.
  Requiere activar Analytics/Speed Insights en el dashboard de Vercel para
  ver los datos.

## Decisiones

- **Fuente de la vista rápida:** Postgres propio (ingesta cron ya operativa).
- **Workbench:** se mantiene como modo avanzado en `/licitaciones/explorar`.
- **Veredicto:** recomputable, nunca persistido (invariante existente en
  `verdict.ts`); solo cambia *cuándo* se computa.
- **Filtro sector agua en Postgres:** keywords sobre JSON crudo (mismo criterio
  que Socrata live), no `clasificacion_sectorial` — esa tabla está vacía hoy.
  Revisar cuando el clasificador UNSPSC corra contra los 87k procesos.
