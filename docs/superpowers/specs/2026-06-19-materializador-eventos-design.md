# Spec — Materializador de eventos contractuales (D-007)

> **Fecha:** 2026-06-19
> **Fase:** 1 (primera pieza). Cierra la deuda **D-007** marcada en `docs/fase-0/0.6-cierre-fase-0.md` §5 como impacto **ALTO — "el valor central de la plataforma"**.
> **Estado:** Diseño aprobado. Listo para plan de implementación.

---

## 1. Problema

El contrato es una foto de estado mutable. Los cambios sustantivos entre una foto y la
siguiente (adiciones, prórrogas, suspensiones, cesiones, terminaciones) son el valor central
de HydroStack: permiten responder *qué le pasó a este contrato en el tiempo*, no solo *cuál es
su estado actual*.

La lógica para detectar esos cambios **ya existe y está probada** (`src/lib/transform/events.ts`:
`diffContrato`, `contratoSnapshotFromRow`; tests en `src/__tests__/transform/events.test.ts`).
La tabla destino **ya existe** (`contrato_evento` en `src/lib/db/schema/hechos.ts`). Lo que falta
es el **materializador**: leer los snapshots de `raw_record`, ordenarlos, diffear pares
consecutivos, y persistir los eventos detectados en `contrato_evento`. Hoy ningún archivo fuera
del schema escribe en esa tabla y tiene 0 filas.

### Realidad de los datos (al 2026-06-06)

`raw_record` de contratos: **699 snapshots / 699 source_record_id únicos** — cada contrato tiene
hoy **una sola foto**. Con estos datos el materializador produce **0 eventos** (un evento exige
≥2 snapshots del mismo contrato). Los eventos aparecerán cuando la ingesta incremental acumule
cambios en el tiempo, o cuando se haga backfill de ventanas históricas. **Esto no es un defecto**:
el materializador debe quedar correcto y listo, validado con datos sintéticos. La validación con
datos reales es consecuencia natural del paso del tiempo, fuera del alcance de este trabajo.

### Propiedad heredada de la capa de ingesta (refuerza el diseño)

En `src/lib/ingest/sources.ts`, `SOURCE_CONTRATOS.volatileFields` excluye del `payload_hash`
tanto el watermark (`ultima_actualizacion`) como **todos los campos de ejecución financiera**
(`valor_facturado`, `valor_pagado`, `valor_pendiente_de_pago`, `valor_amortizado`, etc.). El sink
de ingesta (`makeDbSink`) solo inserta un nuevo snapshot cuando cambia el `payload_hash`. Por lo
tanto, **los snapshots que existen en `raw_record` ya representan cambios contractuales
sustantivos** — no republicaciones triviales ni movimientos de ejecución financiera (D13 ya
respetado en la capa de ingesta). El diff no verá ruido financiero.

---

## 2. Alcance

**Incluye:**
- Núcleo puro `buildContratoEventos(...)` que transforma grupos de snapshots ordenados en filas de evento.
- Adaptador IO `rebuildContratoEventos(db, batchId)` que lee de `raw_record`, resuelve FKs y persiste.
- Cableado en `runTransform()` (orchestrator) tras el upsert de contratos.
- `eventos` en `TransformSummary`.
- Test puro nuevo `eventWriter.test.ts` sobre el núcleo puro.

**No incluye (YAGNI / fuera de alcance acordado):**
- Backfill de ventanas históricas reales para generar eventos reales.
- Capa de presentación (query de cierre, endpoint, vista) de los eventos.
- Eventos de **procesos** (solo contratos en esta pieza; el modelo lo soporta a futuro).
- Tocar la lógica pura existente en `events.ts` (queda intacta).

---

## 3. Decisiones de diseño (cerradas en brainstorm)

| # | Decisión | Elección |
|---|----------|----------|
| E-1 | Estrategia de materialización | **Rebuild completo idempotente**: cada `runTransform` borra y reconstruye `contrato_evento` desde todos los snapshots. Coherente con D28/C5 (el transform ya reconstruye TODO). |
| E-2 | Orden de snapshots para diffear | **`source_updated_at` (NULLS LAST), desempate por `ingested_at`**. El ~43% de contratos sin timestamp fuente cae a `ingested_at`. |
| E-3 | Alcance de validación | **Materializador + tests sintéticos.** Sin backfill real, sin capa de presentación. |
| E-4 | Estructura del escritor | **Enfoque A**: módulo dedicado `eventWriter.ts` (núcleo puro + adaptador IO), invocado por el orchestrator. |
| E-5 | Testing | **Núcleo puro testeado** (matchea la convención 100%-pura del repo). El adaptador IO se valida con corrida E2E manual, sin introducir harness de BD. |

---

## 4. Arquitectura y componentes

```
raw_record ──SELECT──► rebuildContratoEventos (IO, eventWriter.ts)
                          │  agrupa por source_record_id, ordena
                          ▼
                       buildContratoEventos (PURO, eventWriter.ts)
                          │  diffContrato por par consecutivo
                          │  correlation_id por transición
                          ▼
                       filas DetectedEventRow[]
                          │  resuelve proveedor FK + contrato_id (IO)
                          ▼
                       DELETE + INSERT (transaccional)  ──► contrato_evento
```

| Componente | Archivo | Cambio | Responsabilidad |
|------------|---------|--------|-----------------|
| Lógica de diff | `src/lib/transform/events.ts` | **sin cambios** | Comparar 2 snapshots → `DetectedEvent[]`. Ya probada. |
| Núcleo puro | `src/lib/transform/eventWriter.ts` | **nuevo** | `buildContratoEventos(groups)`: grupos ordenados → filas de evento con `correlation_id`. Sin BD, sin FKs. |
| Adaptador IO | `src/lib/transform/eventWriter.ts` | **nuevo** | `rebuildContratoEventos(db, batchId)`: SELECT, agrupa/ordena, llama al núcleo, resuelve FKs, DELETE+INSERT transaccional. |
| Orquestación | `src/lib/transform/orchestrator.ts` | **editar** | `runTransform()` llama `rebuildContratoEventos()` tras `transformContratos()`. Suma `eventos` a `TransformSummary`. |
| Test | `src/__tests__/transform/eventWriter.test.ts` | **nuevo** | Puro, sobre `buildContratoEventos`. |

### Frontera núcleo puro ↔ IO

El núcleo puro recibe los grupos ya materializados en memoria, con esta forma (nombres
indicativos, a fijar en el plan):

```ts
interface SnapshotRow {
  rawRecordId: string;       // raw_record.id del snapshot
  sourceUpdatedAt: string | null;
  ingestedAt: string;
  payload: Record<string, unknown>;
}
// grupo = SnapshotRow[] de un mismo source_record_id, YA ORDENADO
```

`buildContratoEventos(groups)` devuelve filas neutras de BD **sin** `contrato_id` ni
`proveedor_*_id` resueltos (eso lo hace el IO). Devuelve el `docProveedor` crudo para que el IO
resuelva la FK. Toda la lógica testeable (agrupación de eventos por transición, asignación de
`correlation_id`, propagación de `source_observed_at`/`raw_record_id`) vive aquí.

---

## 5. Flujo de datos (algoritmo de `rebuildContratoEventos`)

1. **Cargar contratos canónicos**: SELECT `cleanText(secop_contrato_id) → contrato.id` en un `Map`.
   El join de grupo a contrato usa `cleanText` en ambos lados (E-2 nota: `source_record_id` se
   guardó con `String()` crudo y `secop_contrato_id` con `cleanText()`; normalizar evita que un
   espacio rompa el match).
2. **Cargar snapshots**: SELECT de `raw_record` WHERE `source = 'secop_ii_contratos'`, columnas
   `source_record_id, id, source_updated_at, ingested_at, payload`.
3. **Agrupar** por `source_record_id`; **ordenar** cada grupo por `source_updated_at` (NULLS LAST),
   desempate `ingested_at`.
4. **Llamar al núcleo puro** `buildContratoEventos(groups)` → filas de evento.
5. **Resolver FKs** (IO):
   - `contrato_id` ← `Map` del paso 1 por `source_record_id` normalizado. Si no existe contrato
     canónico (p.ej. el snapshot fue a cuarentena), se **omite** el grupo y se cuenta en métricas.
   - `proveedor_anterior_id` / `proveedor_nuevo_id` (solo `cesion`) ← lookup por `nit_canonico` en
     `proveedor`. Si no resuelve, FK = `null` y el NIT crudo va a `delta`.
6. **Persistir transaccional**: `DELETE FROM contrato_evento` + bulk `INSERT`. Atómico.
7. Grupos con 1 solo snapshot → 0 eventos (caso de hoy, esperado).

### Procedencia de cada columna de `contrato_evento`

| Columna | Origen |
|---------|--------|
| `contrato_id` | Map `secop_contrato_id → contrato.id` (snapshot `next`). |
| `tipo_evento` | `DetectedEvent.tipoEvento`. |
| `correlation_id` | UUID generado por **transición** (par `prev→next`) que emitió ≥1 evento; compartido entre los eventos de esa transición (otrosí múltiple). |
| `source_observed_at` | `next.source_updated_at` (puede ser `null`). |
| `detected_at` | `defaultNow()`. |
| `valor_anterior/nuevo`, `fecha_anterior/nueva`, `estado_anterior/nuevo` | Campos del `DetectedEvent`. |
| `proveedor_anterior_id/nuevo_id` | Lookup por NIT (solo cesión); `null` si no resuelve. |
| `delta` | Escape hatch: para cesión sin FK resuelta, guarda `{docProveedorAnterior, docProveedorNuevo}`. |
| `raw_record_id` | `next.rawRecordId` (el snapshot que reveló el cambio). |

---

## 6. Manejo de errores e idempotencia

- **Transacción**: `DELETE` + `INSERT` en una transacción → nunca queda media tabla. Re-correr
  `runTransform` N veces produce tabla idéntica (verificable con diff, estilo C5 de 0.6).
- **Payload corrupto**: si `contratoSnapshotFromRow` o el parseo de un grupo lanza, se captura
  **por grupo**, se incrementa `gruposConError` en métricas, y se continúa con los demás grupos.
  No se inyecta a `transform_quarantine` (evitar duplicar el mecanismo; aquí solo se cuenta).
- **Grupo sin contrato canónico**: se omite, se cuenta en `gruposSinContrato`. No es error.

---

## 7. Métricas (`EventMetrics`, sumado a `TransformSummary.eventos`)

| Campo | Significado |
|-------|-------------|
| `gruposTotal` | source_record_id distintos de contratos en `raw_record`. |
| `gruposMultiSnapshot` | grupos con ≥2 snapshots (los únicos que pueden producir eventos). |
| `eventosInsertados` | filas insertadas en `contrato_evento`. |
| `porTipo` | conteo por `tipo_evento` (`adicion`, `prorroga`, `suspension`, `terminacion`, `cesion`). |
| `cesionesSinProveedorFk` | cesiones con NIT no resuelto a `proveedor.id`. |
| `gruposSinContrato` | grupos omitidos por no tener contrato canónico. |
| `gruposConError` | grupos saltados por payload corrupto. |

---

## 8. Plan de pruebas

**Convención del repo:** 100% de `src/__tests__` son tests **puros** (ninguno toca la BD). Este
trabajo respeta esa convención.

- **Unit existente** `events.test.ts` — intacto.
- **Unit nuevo** `eventWriter.test.ts` sobre `buildContratoEventos` (puro), casos:
  1. Grupo de 1 snapshot → 0 eventos.
  2. Adición + prórroga en la **misma** transición (otrosí) → 2 eventos con **mismo** `correlation_id`.
  3. Cesión → 1 evento `cesion` con `docProveedor` anterior/nuevo crudos.
  4. Suspensión → terminación en transiciones distintas → eventos con `correlation_id` distintos.
  5. Transición sin cambios sustantivos → 0 eventos.
  6. `source_observed_at` y `raw_record_id` toman el valor del snapshot `next`.
  7. Idempotencia conceptual: misma entrada → misma salida (función pura, determinista salvo el
     UUID; el test fija/inyecta el generador de `correlation_id` o asevera la **agrupación**, no
     el valor literal del UUID).
- **Validación del adaptador IO**: corrida E2E manual `npm run db:transform` (más adelante, cuando
  haya datos multi-snapshot o un fixture). No se introduce harness de BD en esta pieza.

### Nota de testabilidad

Para que el test 7 sea determinista, `buildContratoEventos` debe permitir **inyectar** el
generador de `correlation_id` (p.ej. parámetro opcional `newCorrelationId: () => string`, default
`randomUUID`). Así el test asevera valores estables y la agrupación por transición.

---

## 9. Archivos tocados (resumen)

| Archivo | Acción |
|---------|--------|
| `src/lib/transform/eventWriter.ts` | nuevo (núcleo puro + adaptador IO) |
| `src/lib/transform/orchestrator.ts` | editar (`runTransform` + `TransformSummary`) |
| `src/lib/transform/index.ts` | editar (export del nuevo módulo) |
| `src/__tests__/transform/eventWriter.test.ts` | nuevo (puro) |
| `src/lib/transform/events.ts` | **sin cambios** |
| `src/lib/db/schema/hechos.ts` | **sin cambios** (la tabla ya existe) |

---

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| `source_record_id` (`String()` crudo) ≠ `secop_contrato_id` (`cleanText()`) por whitespace | Normalizar con `cleanText` en ambos lados del Map (§5.1). |
| Orden ambiguo cuando varios snapshots comparten `source_updated_at` y `ingested_at` | Desempate estable adicional por `raw_record.id`; documentar que el caso es improbable (hash distinto implica payload distinto). |
| Falsos eventos si un backfill carga ventanas fuera de orden | E-2 mitiga parcialmente (timestamp fuente prima). Riesgo aceptado para esta pieza; se revisa si el backfill lo materializa (D-009 futuro). |
| Volumen alto vuelve caro el rebuild completo | Aceptado (E-1). Optimización por `batch_id` es D-008, fuera de alcance. |
