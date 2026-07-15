# Separación de momentos: vista simple de procesos + elegibilidad diferida

**Fecha:** 2026-07-15 · **Estado:** Fase 1 y Fase 2 implementadas

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

### Fase 3 — Pulido

- Página educativa "Cómo participar en una licitación" (prosa, tono del agente).
- Migrar el workbench a leer de Postgres también (hoy Socrata live) y dejar
  Socrata solo como fallback/probe.
- Métricas: tiempo a primer render de /licitaciones, tasa de clic en el CTA.

## Decisiones

- **Fuente de la vista rápida:** Postgres propio (ingesta cron ya operativa).
- **Workbench:** se mantiene como modo avanzado en `/licitaciones/explorar`.
- **Veredicto:** recomputable, nunca persistido (invariante existente en
  `verdict.ts`); solo cambia *cuándo* se computa.
