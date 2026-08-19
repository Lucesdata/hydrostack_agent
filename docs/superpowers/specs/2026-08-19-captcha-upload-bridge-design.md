# Puente captcha→upload en `/mis-coincidencias` — diseño

## Contexto

`document-access.ts` clasifica el acceso a un documento de SECOP II como
`PUBLIC | RESTRICTED | NOT_PUBLISHED | UNKNOWN`. El hallazgo verificado en
ese módulo (2026-06-25) es que la página de detalle de SECOP II
(`community.secop.gov.co/.../OpportunityDetail`) **siempre** redirige a un
muro de Google ReCaptcha para clientes no-navegador — un probe server-side
nunca pasa ese muro. En la práctica, hoy **no existe extracción automática
de pliegos para ningún estado**, ni siquiera `PUBLIC`: el único camino real
es la subida manual del PDF vía `/api/pliego/extract`.

Este documento formaliza, con el vocabulario de "puente captcha→upload" de
un prompt de referencia (ver
[docs/architecture/agenthydro-etapas-gates.md](../../architecture/agenthydro-etapas-gates.md),
sección "Lo que sí es una novedad real"), el diseño de esa pieza: ofrecer
la subida manual directamente en `/mis-coincidencias`, y persistir el
resultado de la extracción ligado al proceso para que no se pierda al
recargar ni tenga que repetirse por cada usuario que vea ese mismo proceso.

## Decisiones cerradas

1. **El botón de subir pliego aparece siempre en cada tarjeta**, sin
   condicionarlo a un probe de `document-access.ts`. Razón: hoy no hay
   extracción automática para ningún estado, así que un gate por estado no
   protege nada real en este flujo — solo añadiría una llamada de red sin
   beneficio. `/mis-coincidencias` no muestra hoy ningún estado de acceso
   documental (eso solo vive en `/licitaciones/explorar`) y este diseño no
   lo introduce.
2. **El resultado de la extracción se persiste**, ligado a `proceso.id`,
   no a la sesión del usuario que subió el archivo. Un pliego de SECOP es
   el mismo documento público para cualquier usuario que vea ese proceso —
   persistirlo por proceso evita re-extracción (costo de Gemini) y hace
   que el trabajo de un usuario beneficie a los demás.
3. **No se guarda el PDF original en Storage en esta iteración.** Guardar
   el archivo crudo requeriría una política de Storage nueva (el bucket
   privado `contracts` existente filtra por `auth.uid()` como prefijo de
   ruta — pensado para documentos privados por usuario, no compartidos por
   proceso) y un paso manual en el dashboard de Supabase, igual que el
   "Task 16" que ya documenta `src/lib/assistants/documents.ts`. El
   objetivo del puente (que la Etapa 3/4 avance sin depender del captcha)
   se cumple persistiendo solo el resultado extraído. Si más adelante hace
   falta el archivo original (auditoría, re-extracción), es un incremento
   aparte con su propio paso manual de Storage.

## Arquitectura

Tres piezas nuevas. Cero cambios a `matchProcesos` / `getMatchesForPerfil`
/ `getMatchesForPerfilMinimo` — están probados y no se tocan; el estado del
pliego se mergea en `page.tsx` con una consulta aparte.

### 1. Tabla `pliegoProceso`

Nuevo archivo `src/lib/db/schema/pliego.ts`, siguiendo el patrón modular
existente (`hechos.ts`, `asistentes.ts`, `control.ts`, ...):

```
pliegoProceso
  id                    uuid, PK, default random
  procesoId             uuid, FK -> proceso.id, UNIQUE (un pliego activo por proceso)
  subidoPorUsuarioId    text, FK -> usuario.id (auditoría: quién lo subió)
  nombreArchivo         text
  extraction            jsonb  — PliegoExtraction (src/lib/pliego/schema.ts)
  validation            jsonb  — resultado de validatePliego()
  origen                jsonb  — CampoOrigen: por campo, si vino de reglas o de Gemini
  gateMatematicoPasado  boolean — denormalizado desde validation, mismo patrón
                                  que proceso.documentAccess (columna indexada
                                  para filtrar sin deserializar el jsonb)
  createdAt             timestamptz, default now
  updatedAt             timestamptz, default now
```

Índices: `uniqueIndex` en `procesoId` (soporta el upsert "el último sube
gana"), `index` en `gateMatematicoPasado`.

Migración vía `drizzle-kit generate`. **No se aplica contra Neon sin
confirmación explícita del usuario en el momento de ejecutarla** — incluso
dentro de este plan ya aprobado, aplicar una migración a una base
compartida es una acción que se confirma en el momento, no por adelantado.

### 2. Server action `uploadPliegoAction`

Nuevo archivo `src/lib/secop/pliego-actions.ts`, `"use server"`. Mismo
patrón que `handleEnviarAhora` (inline en `page.tsx`) y
`saveMinimoPerfilAction` (`src/lib/oferente/actions.ts`) — formulario HTML
+ server action, sin fetch ni estado de cliente.

Flujo:
1. `getSessionUser()` — rechaza si no hay sesión (defensa en profundidad;
   la página ya exige auth, pero la action se protege por sí misma).
2. Lee `procesoId` (hidden input) y `file` del `FormData`.
3. Valida el archivo: magic bytes `%PDF-` + tope de tamaño. **Este check
   ya está duplicado en `/api/pliego/extract` y `/api/documents/upload` —
   se extrae a un helper compartido** (p. ej. `isPdfBuffer()` +
   `MAX_BYTES_PDF` en `src/lib/pliego/validate.ts`) y las tres llamadas lo
   usan. Es una limpieza de bajo riesgo que toca solo la validación de
   entrada, no la lógica de extracción.
4. `extractPliegoHybrid(buffer, {})` — sin Formulario 1 en esta iteración
   (alcance v1: solo el Documento Base).
5. `validatePliego(extraction)`.
6. `INSERT INTO pliegoProceso ... ON CONFLICT (procesoId) DO UPDATE SET
   ...` — reemplaza el pliego anterior del mismo proceso si existía.
7. `recordUserSignal(user.id, "estructurador")` — mismo signal que ya
   dispara `/api/pliego/extract` hoy.
8. `redirect("/mis-coincidencias?pliego=ok")` en éxito, o
   `redirect("/mis-coincidencias?pliego=error&pliegoError=<msg>")` en
   fallo (extracción lanza, o el archivo no es PDF válido).

### 3. UI en cada tarjeta

`<details>`/`<summary>` HTML nativo — cero JavaScript, coherente con que
`/mis-coincidencias` es un Server Component puro sin islas de cliente
hasta ahora.

- **Sin pliego cargado**: `<summary>Subir pliego</summary>`. Al
  desplegar: una línea explicando el puente ("SECOP pide verificación
  humana para abrir este documento — ábrelo tú en SECOP, descarga el
  Documento Base y súbelo aquí"), enlace a `proceso.url` (abre en pestaña
  nueva, como ya hace el link "Ver en SECOP ↗" existente), formulario con
  `<input type="file" accept="application/pdf">` + botón submit + hidden
  `procesoId`.
- **Con pliego cargado**: `<summary>` muestra el glyph ✓/✕ del gate
  matemático (mismo `STATUS` que ya usa `ProcessDetail.tsx` para los
  gates de elegibilidad) + fecha de carga. Cuerpo: 2-3 campos clave de
  `extraction` (presupuesto, fecha de cierre) + enlace "Volver a subir"
  que reabre el mismo formulario (reemplaza vía el mismo upsert).

Nueva consulta `getPliegoStatusForProcesos(procesoIds: string[])` en
`src/lib/secop/pliego-status.ts` — un solo `WHERE procesoId IN (...)`,
llamada una vez en `page.tsx` para ambas ramas (perfil mínimo y perfil
completo) y mergeada por `procesoId` al renderizar cada tarjeta.

## Manejo de errores

- Archivo no es PDF válido (magic bytes) → banner de error a nivel
  página, mismo mecanismo que `PERFIL_ERROR`/`BANNER` ya existentes en
  `page.tsx`. No se persiste nada.
- `extractPliegoHybrid` lanza (Gemini caído, documento ilegible, etc.) →
  banner "Extracción falló: `<mensaje>`", igual formato que ya usa
  `/api/pliego/extract`. No se persiste nada — nunca se guarda una
  extracción a medias.
- `GEMINI_API_KEY` no configurada en el servidor → mismo 500 que ya
  maneja `/api/pliego/extract`; la action lo traduce a banner genérico.
- Gate matemático falla (`validatePliego` marca inconsistencia) → **sí se
  persiste** (con `gateMatematicoPasado: false`), mostrando el glyph ✕ en
  la tarjeta — coherente con la Etapa 4 del prompt original: el gate
  bloquea el avance a "elegible", no el registro del intento.

## Testing

- `getPliegoStatusForProcesos` y el upsert: `vi.mock("@/src/lib/db/client")`,
  mismo patrón que `src/__tests__/oferente/perfil-store.test.ts`.
- El helper de validación de PDF extraído (`isPdfBuffer`, tope de tamaño):
  vitest plano sin mocks, mismo patrón que `src/__tests__/pliego/validate.test.ts`.
- No se prueba la server action end-to-end (requiere Gemini real) — mismo
  criterio que hoy aplica a `/api/pliego/extract`, sin test de integración.

## Fuera de alcance (explícito)

- Subida del Formulario 1 (presupuesto XLS) en este flujo — solo
  Documento Base.
- Guardar el PDF original en Storage — ver decisión cerrada #3.
- Cualquier automatización de descarga (Playwright/navegador headless) —
  no existe en el repo y este diseño no la introduce; el puente asume
  descarga manual por el usuario.
- Probing de `document-access.ts` en `/mis-coincidencias` — el botón de
  subir es incondicional (decisión cerrada #1), así que no hace falta
  traer el probe a esta página.
