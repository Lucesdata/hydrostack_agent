# Licitaciones v2 — "Workbench" de oportunidades (rediseño UX)

**Fecha**: 2026-07-11 · **Estado**: aprobado (maqueta validada por el usuario)
**Alcance**: rediseño UX completo de `/licitaciones` (SecopExplorer) sin infraestructura nueva.

## 1. Problema

La página actual (grid de cards) tiene fallas de jerarquía y de relevancia:

- Títulos en mayúsculas gigantes dominan la card; lo importante (valor, elegibilidad, estado) queda enterrado.
- El primer pantallazo muestra procesos **cancelados y no elegibles** primero (orden cronológico puro).
- El veredicto Nivel 0 se presenta como ristra de ✕✕✕✕ con razones escondidas en tooltips — transmite negatividad y no se entiende.
- La `descripcion` del proceso (ya normalizada por el API) no se muestra en ningún lado.
- No hay vista de detalle: todo expulsa al usuario a SECOP II.
- Paginación ciega ("Página 2") sin total de resultados ni de páginas.

Referentes analizados: Stotles (feed por relevancia + pipeline), OpenOpps, PLACE
(marches-publics.gouv.fr: contador total, paginación con total, fecha límite prominente),
competencia local (Licitaciones.info, BuscaSECOP, LicitarUS). Ninguna competencia local
presenta bien un score de elegibilidad → el veredicto Nivel 0 bien presentado es el diferenciador.

## 2. Decisiones tomadas (con el usuario)

1. **Alcance**: rediseño UX completo. Sin auth, sin pipeline/guardados (fase posterior).
2. **Layout**: lista compacta (izquierda, ≈42%) + panel de detalle (derecha, ≈58%). Master-detail.
3. **Relevancia**: por defecto solo procesos **abiertos** (`estado_de_apertura = 'Abierto'`);
   toggle "Incluir cerrados y cancelados" revela el resto.

## 3. Diseño

### 3.1 Estructura (desktop ≥900px)

```
Header compacto (tag + h1 + sub, ~50% menos alto que hoy)
Barra de control: búsqueda · departamento · estado · valor mín · orden · toggle cerrados
Línea de contexto: "N procesos abiertos · sector agua y saneamiento"  [+ selector por página]
┌────────────────┬──────────────────────────────┐
│ LISTA (42%)    │ PANEL DE DETALLE (58%)       │
└────────────────┴──────────────────────────────┘
Paginación: ← Anterior · Página X de Y · Siguiente →
```

Móvil (<900px): lista a ancho completo; al seleccionar, el detalle se abre como overlay
deslizante a pantalla completa con botón "← Volver a resultados".

### 3.2 Fila de lista

- Título en *sentence case* (CSS `text-transform` no aplica — el dato viene en mayúsculas;
  se transforma en JS: primera letra mayúscula, resto minúsculas, preservando siglas comunes
  como PTAP/PTAR/ESP si es viable de forma simple, si no, lowercase con capitalización inicial).
  Máximo 2 líneas (`-webkit-line-clamp: 2`).
- Línea meta: entidad · departamento (gris, 11px).
- Pie de fila: valor COP compacto (mono, formato abreviado "$2.450 M") + indicador de
  elegibilidad: punto de color + "n/5" (verde ≥4 PASS, ámbar 2–3, rojo ≤1; gris si todo UNKNOWN).
- Badge de estado SOLO si no es un proceso abierto normal (Cancelado/Desierto…), atenuado (opacity ~0.55).
- Fila seleccionada: borde accent 1.5px + halo suave. Hover: borde `--accent-soft`.
- Selección inicial: el primer resultado de la página se auto-selecciona en desktop
  (el panel nunca está vacío); en móvil no hay auto-selección.

### 3.3 Panel de detalle

Orden de contenido:
1. Badges: estado apertura (ABIERTO verde / CERRADO gris), modalidad, tipo de contrato.
2. Título completo (sin clamp) + entidad (mono, accent).
3. Fila de datos: Valor base (mono, completo) · Publicado (fecha es-CO) · Referencia.
4. **Bloque de elegibilidad** (el diferenciador):
   - Cabecera: "Elegibilidad · nivel 0" + resumen "n de 5 compuertas".
   - Barra segmentada de 5 tramos (verde PASS, ámbar WARN, rojo FAIL, gris UNKNOWN).
   - Lista vertical de las 5 compuertas: icono (✓/!/✕/?) + nombre + `reason` en texto visible.
     Las de `requiredLevel: 2` muestran "requiere revisar pliego (nivel 2)".
5. Descripción del proceso (campo `descripcion`, line-clamp ~6 líneas con "ver más" expandible).
6. Adjudicatario si existe y ≠ "No Adjudicado".
7. Pie: estado de acceso documental + CTA primario "Abrir en SECOP II ↗" (botón sólido accent).

**Probe automático**: al seleccionar un proceso cuyo `documentAccess` no sea PUBLIC y tenga
`url`, se dispara el probe on-demand automáticamente (una sola vez por proceso, cache en
estado local como hoy). El botón manual "Verificar acceso" desaparece.

Empty state del panel (solo móvil o sin resultados): mensaje breve invitando a seleccionar.

### 3.4 Relevancia y orden (backend, ~20 líneas)

- Nuevo param `apertura=Abierto|Cerrado` en `GET /api/secop` → SoQL
  `estado_de_apertura_del_proceso = ...`. El frontend lo envía por defecto (`Abierto`)
  salvo que el toggle "Incluir cerrados y cancelados" esté activo.
- Nuevo param `orden=fecha|valor` → `$order` (`fecha_de_publicacion_del DESC` |
  `precio_base DESC`). Default: `fecha`.
- **Contador total** (patrón PLACE): el route handler hace en paralelo una segunda consulta
  SODA `$select=count(*)` con los mismos `$where`, y devuelve `total` en `SecopResult`.
  La UI muestra "N procesos abiertos" y "Página X de Y".
- Selector de resultados por página (10 / 25 / 50) usando `pageSize` ya soportado.

### 3.5 Manejo de errores y estados

- Error de API: banner como hoy (estilo `clr-secop-error`), la lista conserva el último resultado si lo hay.
- Si la consulta count falla, `total` queda undefined y la paginación degrada al modo actual
  (sin "de Y") — nunca bloquea los resultados.
- Loading: skeleton de 5 filas en la lista (no texto "Consultando…" que colapsa el layout).
- Probe fallido: se mantiene el chip preliminar (comportamiento actual).

## 4. Fuera de alcance (roadmap documentado)

- Conteos por opción de filtro (requiere queries de agregación por faceta).
- Guardar/descartar procesos, "Mi pipeline", alertas por email (requieren auth/persistencia).
- Perfil de oferente configurable por el usuario (hoy: `OFERENTE_PILOTO` hardcodeado —
  siguiente paso natural para el feed personalizado estilo Stotles).
- Fecha límite de presentación prominente (patrón PLACE): requiere cronograma del pliego (Nivel 2).
- Búsqueda semántica.

## 5. Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/components/secop/SecopExplorer.tsx` | Reescritura del render (misma capa de datos/fetch). Puede dividirse en subcomponentes (`ProcessList`, `ProcessDetail`) en el mismo directorio. |
| `src/lib/secop/client.ts` | Soporte `apertura`, `orden`, consulta count. |
| `app/api/secop/route.ts` | Parseo de los 2 params nuevos + total. |
| `src/lib/secop/types.ts` | `SecopQuery` += `apertura`, `orden`. |
| `src/lib/secop/config.ts` | Constantes de orden si aplica. |

Se mantiene el clear theme (`clr-*` de `app/globals.css`) y el patrón de CSS embebido del componente.

## 6. Criterios de éxito

- El primer pantallazo muestra solo oportunidades vivas, ordenadas por fecha, con contador total.
- Un usuario entiende en <5 segundos por qué un proceso es o no elegible (razones visibles).
- La descripción del proceso es legible sin salir a SECOP II.
- Sin regresión: filtros existentes (q, departamento, estado, valorMin) siguen funcionando.
- Responsive: usable en 375px (overlay de detalle) y 1280px (split view).
