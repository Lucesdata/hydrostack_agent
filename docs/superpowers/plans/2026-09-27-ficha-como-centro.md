# Plan — La ficha como centro

Spec: `docs/superpowers/specs/2026-09-27-ficha-como-centro.md`.
Necesita aprobación (`docs/CONDUCTA.md` §4): cambia rutas públicas y toca más de
tres archivos de producción.

## Orden: primero lo que no se muda, luego cada mudanza con su borrado

Borrar `/pliego` y `/competidores` antes de que la ficha tenga su sustituto
dejaría un hueco: la extracción de pliegos solo quedaría en
`/mis-coincidencias`, y el perfil de rival no estaría en ninguna parte. Por eso
cada página que se muda se borra **en el mismo PR** que lleva su concepto a la
ficha. Tres PR, cada uno verificable por separado.

### PR 1 — Borrar lo que no se muda

Páginas: `/asistente/*`, `/auditoria`, `/reportes/[slug]`, `/soluciones` y
`/nosotros`.

1. Redirecciones permanentes (308) en `next.config.js` (`redirects()`), según el criterio 1
   del spec.
2. Quitar entradas de `SECCIONES_HOME` y `NOMBRE_POR_ID` (`seccionesHome.js`),
   `sitemap.ts`, `robots.ts`, `PROTECTED_PREFIXES` (`middleware.ts`) y el enlace
   de `/mis-filtros` a `/auditoria`.
3. Asistentes: `app/asistente/`, `app/api/assistant/`, `app/api/documents/`
   (si solo la usa el asistente), `src/components/assistants/`,
   `src/lib/assistants/`, la capacidad `asistentes` de `politica.ts` y las
   dependencias `@ai-sdk/anthropic` y `@ai-sdk/react`. **Las tablas
   `conversacion`, `mensaje` y `documento` se quedan en el esquema**: quitarlas
   genera un `DROP`.
4. Reportes: `app/reportes/`. `run-daily.ts` genera un reporte antes de cada
   correo y lo enlaza. Se quita esa generación y el enlace del correo, no la
   tabla `al_reportes`. Hoy el correo no se entrega (§0), así que no se rompe
   nada en producción; se prueba con los tests de `alertas/` y `email/`.
5. `/soluciones` (y `recordUserSignal` si queda sin uso), `/nosotros` con
   `PlantaHero.jsx`, `plantaPaths.js` y `scripts/planta-paths.mjs`.
6. Pasar el grafo de imports y knip en modo producción: borrar lo que quede
   huérfano.

**Riesgos.** `acceso.test.ts` y `enlaces.test.ts` vigilan el catálogo, así que
fallarán si algo se queda a medias; eso es lo que se busca. La política de
acceso pierde `asistentes`: hay que revisar que ningún test enumere las
capacidades a mano.

### PR 2 — El pliego en la ficha, y fuera `/pliego`

1. `src/lib/secop/pliego-ficha.ts` (nuevo): lee la fila de `pliego_proceso` del
   proceso y la reduce a lo que la ficha pinta. Se prueba contra PGlite con las
   migraciones reales.
2. §4 de `app/licitaciones/[slug]/page.tsx`: con fila, requisitos, presupuesto y
   causales con su origen; sin fila, el bloque de subida. Se reutiliza
   `uploadPliego()` y la acción de servidor de `PliegoUploadBlock`, que ya
   persiste por `procesoId`. El nivel lo decide `puede("pliego_extraer")`, que
   así se usa por primera vez en un handler (CLAUDE.md §4).
3. Ojo con la estrategia de render: la ficha es pública y cacheable. Lo que
   depende de la sesión (el formulario de subida) va en un componente de
   cliente o en un segmento dinámico aparte, **no** convirtiendo la ficha entera
   en dinámica.
4. Borrar `app/pliego/`, `/api/pliego/extract` si ya no la llama nadie, la
   pestaña «Analizar pliego» de `LicitacionesTabs.tsx` y su entrada en el
   catálogo. Redirección permanente (308) `/pliego` → `/licitaciones`.

### PR 3 — El rival en la ficha, y fuera `/competidores`

1. `competidoresComparables()` agrupa por `proveedor_key` y devuelve la llave.
2. `historialComparable(key, { tipoProyecto, departamentoCodigo })` (nuevo, en
   `al/consulta/competidor.ts`): las mismas métricas que `historialCompetidor`,
   restringidas a procesos comparables, más sus sanciones. PGlite.
3. §7 de la ficha: cada fila es un `<details>`. Para cumplir el criterio 6 (sin
   consultas por rival en el render inicial), el detalle se pide al abrir a una
   ruta `GET /api/ficha/[id]/rival/[key]` cacheada en el CDN, como
   `/api/departamento/[dpto]/resumen`.
4. Borrar `app/competidores/`, `S4Competidores.jsx`, la capacidad
   `competidores` si queda sin uso y el enlace de `/licitaciones/entidades`.
   Redirecciones permanentes (308).
5. Revisar qué queda de `al/consulta/competidor.ts` y `getCifrasSector()`
   (sus dos cifras eran de `/competidores`).

## Verificación en cada PR

```
npm test
npm run build
npm run lint
npx prettier --check "src/**/*" "app/**/*"
```

Además: grafo de imports sin huérfanos, `curl -I` a cada ruta retirada para ver
el 308 en el preview de Vercel, y en PR 2 y PR 3 una ficha real abierta en el
preview con y sin sesión.
