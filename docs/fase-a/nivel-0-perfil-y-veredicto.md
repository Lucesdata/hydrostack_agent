# Nivel 0 — Perfil del Oferente + Contrato del Veredicto

**Fecha:** 2026-06-26 · impl. 2026-06-27
**Status:** Implementado en Nivel 0 (contrato + 5 compuertas + agregación + seed, 24 tests). Pendiente: wiring a API/UI y datos reales del perfil.
**Alcance:** Fase A · Nivel 0 del embudo ("¿puedo participar en este proceso?")
**Relación:** consume la red sectorial ([ingest-net.ts](../../src/lib/secop/ingest-net.ts), ADR-0001)
y el gate documental ([document-access.ts](../../src/lib/secop/document-access.ts)).

---

## 1. Contexto y alcance

El **Nivel 0 — Veredicto** es un semáforo que responde *"¿puedo participar en este
proceso?"* usando **solo metadata del proceso**, sin abrir documentos. Es el puente
entre el ELT (datos) y la futura UI (semáforo).

Invariante de protección del *probing* lazy:

> Una compuerta que necesite el pliego (`requiredLevel: 2`) **debe** devolver `UNKNOWN`
> en Nivel 0. Ninguna compuerta documental puede pintar verde/rojo sin abrir el
> documento — igual que `preclassify()` nunca afirma `PUBLIC`.

**Fuera de alcance de esta fase:** UI, fetch/probing, y la *lógica* de las compuertas
(solo se definen tipos, firmas y el contrato de datos).

### Hallazgo de auditoría (reusar, no redefinir)

Buena parte del contrato del veredicto ya existe en el ELT:

| Pieza | Ya existe en | Acción |
|---|---|---|
| `DocumentAccess` (`PUBLIC\|RESTRICTED\|NOT_PUBLISHED\|UNKNOWN`) | [document-access.ts:27](../../src/lib/secop/document-access.ts) | **Reusar** |
| Patrón "metadata vs probe" (`method`) | `DocumentAccessResult` | **Espejar** en `GateResult` |
| Metadata normalizada del proceso | `SecopProceso` ([types.ts:10](../../src/lib/secop/types.ts)) | **Extender** |
| Categoría UNSPSC (ambas variantes ya colapsadas a `unspsc`) | [config.ts](../../src/lib/secop/config.ts) | **Reusar** |
| Match sectorial precomputado | `matchesSectorNet()` + tabla `clasificacionSectorial` | **Leer**, no recalcular |

Lo genuinamente nuevo: **el Perfil del Oferente** y **las firmas de las compuertas**.

---

## 2. Decisiones validadas (2026-06-26)

| # | Decisión | Resolución |
|---|---|---|
| 1 | **Compuerta Plazo** | Spike hecho (2026-06-27): el dataset Procesos **NO trae fecha de cierre** (solo publicación; el cierre exacto vive en el cronograma del pliego = Nivel 2). **SÍ trae `estado_de_apertura_del_proceso`** (Abierto/Cerrado). Plazo es parcial Nivel 0: Cerrado→FAIL, Abierto→WARN; días exactos = upgrade Nivel 2. |
| 2 | **Categoría UNSPSC** | Autoridad = `config.ts`. El gate sectorial tolera `UNSPECIFIED`/null delegando en `clasificacionSectorial.sectorAgua`. |
| 3 | **Alcance del perfil** | Datos mono-tenant (seed/config), **tipo** multi-tenant (lleva `id`). Cero tabla Drizzle esta fase. |
| 4 | **Origen RUP** | Manual + procedencia (`fuente`, `vigenciaHasta`). Tipo listo para fuente RUES luego. |
| 5 | **Bandas de Cuantía** | 3 bandas (verde/amarillo/rojo), margen ±relativo **configurable** (default 0.20). Capacidad K = upgrade Nivel 2. |
| 6 | **Agregación `overall`** | *Worst-of* transparente; `UNKNOWN` se reporta aparte sin forzar rojo; sin veto sectorial duro aún. |

---

## 3. Entregable 1 — Perfil del Oferente

Dominio del **usuario que evalúa si licitar** (distinto del `proveedor` adjudicado del
catálogo → por eso `oferente`). Convención del repo: interfaz plana, sin deps externas.

```ts
export type TipoPersona = 'natural' | 'juridica';

/** Código UNSPSC propio, formato normalizado (sin "V1."): familia 5d "83101"
 *  o clase 8d "83101500". Mismo formato que matchesSectorNet/ingest-net. */
export type UnspscCodigo = string;

/** D4: procedencia del RUP. Manual hoy; 'rues' cuando se ingeste el padrón. */
export type FuenteRUP = 'manual' | 'rues';

/** Indicadores RUP de capacidad financiera. // traza: indicadores RUP */
export interface CapacidadFinancieraRUP {
  capitalTrabajoCop: number;        // COP
  indiceLiquidez: number;           // veces
  indiceEndeudamiento: number;      // 0–1 (proporción)
  razonCoberturaIntereses: number;  // veces
  fuente: FuenteRUP;                // D4
  /** ISO. RUP vencido reprueba habilitación, importa incluso en modo manual. D4. */
  vigenciaHasta: string | null;
}

/** Cobertura como DIVIPOLA (reusa tabla `geografia`). */
export interface CoberturaGeografica {
  departamentos: string[]; // 2 díg — ['76'] = Valle del Cauca (piloto)
  municipios: string[];    // 5 díg — ['76001'] = Cali (opcional, más fino)
}

export interface CuantiaObjetivo {
  minCop: number;
  maxCop: number;
}

export interface OferenteProfile {
  /** D3: presente desde ya → el tipo es multi-tenant aunque los datos sean uno. */
  id: string;
  tipoPersona: TipoPersona;
  /** UNSPSC propios → se cruzan contra codigo_de_categoria(_principal) del proceso. */
  sectoresUnspsc: UnspscCodigo[];
  capacidadFinanciera: CapacidadFinancieraRUP;
  /** K de capacidad residual de obra (COP). // traza: Decreto 1082 de 2015 */
  kCapacidadResidualCop: number | null;
  cobertura: CoberturaGeografica;
  cuantiaObjetivo: CuantiaObjetivo;
}
```

**Persistencia (D3, diferida):** el perfil se materializa como **objeto de config / seed**
(un solo oferente). Cuando entre el segundo, se promueve a tabla Drizzle `oferente_perfil`
en `src/lib/db/schema/` — barato porque la identidad (`id`) ya está en el contrato.
**Nada de SQL/migración en esta fase.**

---

## 4. Entregable 2 — Contrato del Veredicto

### 4.1 Metadata del proceso (extiende `SecopProceso`, no duplica)

```ts
import type { SecopProceso } from '@/src/lib/secop/types';

/** Lo que las compuertas LEEN. SecopProceso ya trae id, referencia, entidad,
 *  modalidad, estado, descripcion, unspsc, departamento, ciudad, precioBase,
 *  fechaPublicacion, documentAccess. Falta solo la fecha de cierre. */
/** Señal binaria de apertura del proceso, derivable de metadata
 *  (`estado_de_apertura_del_proceso`). Único insumo Nivel-0 de Plazo: el dataset
 *  Procesos NO trae fecha de cierre exacta (spike 2026-06-27). */
export type EstadoApertura = 'Abierto' | 'Cerrado';

export interface VerdictProcessInput extends SecopProceso {
  /** D1 — Cierre EXACTO: NO existe en el dataset Procesos (vive en el cronograma
   *  del pliego). Queda en el contrato para una fuente futura (Nivel 2); en
   *  Nivel 0 es null. */
  fechaCierre: string | null; // ISO
  /** D1 — Apertura binaria, SÍ en metadata. Insumo Nivel-0 de PlazoGate. */
  estadoApertura: EstadoApertura | null;
  /** Contempla ambas variantes de origen del UNSPSC (Procesos vs Contratos). */
  categoriaUnspscOrigen?: 'proceso' | 'contrato';
}
```

### 4.2 Resultado de una compuerta (espeja `DocumentAccessResult`)

```ts
/** Semáforo + gris. PASS=verde, WARN=amarillo, FAIL=rojo, UNKNOWN=no resoluble aquí. */
export type GateStatus = 'PASS' | 'WARN' | 'FAIL' | 'UNKNOWN';

/** Nivel del embudo que la resuelve. 0 = solo metadata; 2 = requiere pliego. */
export type ResolutionLevel = 0 | 2;

export interface GateResult {
  status: GateStatus;
  reason: string;                       // auditable, bilingüe (como DocumentAccessResult.reason)
  resolvedBy: 'metadata' | 'document';  // espejo de DocumentAccessResult.method
  requiredLevel: ResolutionLevel;       // CRÍTICO: declara si necesita el pliego
}
```

### 4.3 Firmas de las cinco compuertas (tipos, sin cuerpo)

```ts
// ── NIVEL 0 (resoluble con metadata) ──────────────────────────────────────
/** Intersección UNSPSC perfil ∩ categoría. D2: si UNSPSC del proceso es null/
 *  UNSPECIFIED, delega en clasificacionSectorial.sectorAgua (entró por keyword). */
export type SectorialGate = (p: OferenteProfile, proc: VerdictProcessInput) => GateResult; // L0

/** valor del proceso vs rango objetivo, 3 bandas (D5). La parte "vs capacidad K"
 *  es upgrade Nivel 2 (cómo se exige K vive en el pliego). */
export type CuantiaGate = (
  p: OferenteProfile,
  proc: VerdictProcessInput,
  cfg: CuantiaBandsConfig,
) => GateResult; // L0

/** D1: si fechaCierre (fuente futura) → días restantes; si no, usa estadoApertura
 *  (Cerrado→FAIL, Abierto→WARN); si ninguno → UNKNOWN. Días exactos = upgrade L2. */
export type PlazoGate = (proc: VerdictProcessInput, now: Date) => GateResult; // L0 parcial

/** ubicación del proceso (DIVIPOLA) ∈ cobertura del perfil. */
export type UbicacionGate = (p: OferenteProfile, proc: VerdictProcessInput) => GateResult; // L0

// ── NIVEL 2 (requiere pliego) ─────────────────────────────────────────────
/** Los umbrales RUP/jurídicos EXIGIDOS viven en el pliego. En Nivel 0 SIEMPRE
 *  retorna { status: 'UNKNOWN', requiredLevel: 2 }. El perfil ya carga los
 *  indicadores propios para comparar cuando llegue el pliego. */
export type HabilitacionGate = (p: OferenteProfile, proc: VerdictProcessInput) => GateResult; // L2

/** D5 — bandas de Cuantía configurables (no hardcoded). */
export interface CuantiaBandsConfig {
  /** Margen ±relativo para la banda amarilla en el borde del rango. Default 0.20. */
  margenAmarillo: number;
}
```

### 4.4 Veredicto agregado (proyección derivada, recomputable)

```ts
export interface Verdict {
  procesoId: string;
  /** D6: worst-of (ver regla §5.4). */
  overall: GateStatus;
  gates: {
    sectorial: GateResult;
    cuantia: GateResult;
    plazo: GateResult;
    ubicacion: GateResult;
    habilitacion: GateResult; // UNKNOWN/requiere-pliego en Nivel 0
  };
  level: ResolutionLevel;     // 0 en esta fase
  evaluatedAt: string;        // ISO
}

/** D6 — agregación, firma sin cuerpo (la lógica es de implementación). */
export type AggregateVerdict = (gates: Verdict['gates']) => GateStatus;
```

El veredicto **no se persiste** en Nivel 0: es derivado de (perfil × metadata),
recomputable — coherente con D18 (recomputar sin re-ingerir).

---

## 5. Reglas derivadas de las decisiones

### 5.1 Sectorial tolera UNSPSC ausente (D2)
Si `proc.unspsc` es `null`/`UNSPECIFIED`, el gate **no** puede intersecar por código.
Delega en `clasificacionSectorial.sectorAgua` (el proceso entró a la red por keyword).
Sin esto, los procesos sin código —medidos 100% relevantes— darían falso negativo.

### 5.2 Cuantía, 3 bandas (D5)
Sobre el valor de metadata (`precioBase`/`valorAdjudicacion`) vs `cuantiaObjetivo`:
- **PASS (verde):** valor dentro de `[minCop, maxCop]`.
- **WARN (amarillo):** valor dentro de `±margenAmarillo` del borde del rango.
- **FAIL (rojo):** fuera del rango y del margen.

`margenAmarillo` viene de `CuantiaBandsConfig` (default 0.20). El chequeo *vs capacidad K*
es el **upgrade Nivel 2** (requiere cómo el pliego exige K: AIU, fórmula Decreto 1082).

### 5.3 Plazo: señal de apertura en Nivel 0, días exactos en Nivel 2 (D1)
Spike (2026-06-27) confirmó que el dataset Procesos **no expone fecha de cierre**; el
único insumo Nivel-0 es `estado_de_apertura_del_proceso` (Abierto/Cerrado). Semántica:
- `fechaCierre != null` (fuente futura, p. ej. cronograma) → días restantes → semáforo fino.
- `estadoApertura === 'Cerrado'` → `FAIL` ("proceso cerrado a ofertas"), `metadata`, `requiredLevel: 0`.
- `estadoApertura === 'Abierto'` → `WARN` ("abierto; fecha exacta de cierre en el cronograma del pliego"), `metadata`, `requiredLevel: 0`.
- ninguno → `UNKNOWN`.

El conteo de días exacto es el **upgrade Nivel 2** de Plazo (requiere el cronograma).

### 5.4 Agregación worst-of (D6)
Sobre las compuertas **resueltas** (las que no son `UNKNOWN`):
1. Si alguna es `FAIL` → `overall = FAIL` (rojo).
2. Si no, si alguna es `WARN` → `overall = WARN` (amarillo).
3. Si todas las resueltas son `PASS` → `overall = PASS` (verde).
Las `UNKNOWN` (requiere pliego / dato faltante) **no fuerzan rojo**: se reportan aparte.
Sin veto sectorial duro (la señal sectorial es probabilística en Nivel 0).

---

## 6. Dónde viven

| Estructura | Ubicación | Por qué |
|---|---|---|
| `OferenteProfile` y subtipos | **`src/lib/oferente/types.ts`** (nuevo) | Dominio del usuario; nombre `oferente` para no chocar con `proveedor` (catálogo). |
| Contrato del veredicto (`GateResult`, gates, `Verdict`, `VerdictProcessInput`, `CuantiaBandsConfig`) | **`src/lib/secop/verdict.ts`** (nuevo) | Capa puente, junto a `document-access.ts`/`types.ts`. Reusa `SecopProceso` y `DocumentAccess`. |
| `estadoApertura` (insumo Plazo) | `FIELDS_PROCESOS.estadoApertura = 'estado_de_apertura_del_proceso'` + normalizador ([client.ts](../../src/lib/secop/client.ts)) | Campo real del dataset; cableable ya. `fechaCierre` NO se mapea (no existe en Procesos). |
| `oferente_perfil` (tabla) | `src/lib/db/schema/` — **diferido (D3)** | Solo al pasar a multi-tenant. |

---

## 7. Prerrequisitos para implementación

1. ~~Spike `fechaCierre`~~ **(hecho 2026-06-27)**: no existe fecha de cierre en Procesos.
   Cablear en su lugar `estado_de_apertura_del_proceso` → `FIELDS_PROCESOS.estadoApertura`
   + normalizador en `client.ts` → poblar `VerdictProcessInput.estadoApertura`.
2. ~~Seed del perfil (D3/D4)~~ **(hecho)**: `src/lib/oferente/pilot.ts` (`OFERENTE_PILOTO`).
   ⚠️ con valores RUP/cuantía **placeholder** — el owner debe poner los reales.
3. ~~Default de `CuantiaBandsConfig` (D5)~~ **(hecho)**: `DEFAULT_CUANTIA_BANDS = { margenAmarillo: 0.2 }`.
4. ~~Sectorial lee `sectorAgua` (D2)~~ **(hecho)**: vía `VerdictProcessInput.sectorAgua`
   (la bandera se pasa como insumo; el gate no hace I/O).
5. ~~Wiring adaptador + endpoint~~ **(hecho 2026-06-27)**: `toVerdictInput` adapta
   `SecopProceso → VerdictProcessInput`; `GET /api/secop` (procesos) adjunta `verdict`
   por ítem con `OFERENTE_PILOTO`. Verificado end-to-end con datos live (`estadoApertura`
   "Cerrado" → plazo FAIL). En la foto live `sectorAgua`/`fechaCierre` son null (sectorial
   usa el UNSPSC; plazo usa estadoApertura).
6. ~~UI del semáforo~~ **(hecho 2026-06-27)**: `SecopExplorer` pinta un readout HUD por
   tarjeta (overall + 5 chips de compuerta con `reason` en tooltip), fiel al design system
   cyberpunk. Verificado en navegador (25 tarjetas, 0 errores). ⚠️ Con el perfil placeholder
   (`sectoresUnspsc:['83101']` estrecho + cuantía de ejemplo) el `overall` sale FAIL casi
   siempre — **artefacto del seed, no bug**; los chips muestran los 4 colores. Diversifica al
   poner el perfil real.

---

## 8. Diferido a Nivel 2 / fases siguientes

- **Hallazgos de revisión (2026-06-27) — RESUELTOS:**
  - ~~`#1` `plazoGate` `fechaCierre` inválida → NaN → PASS~~ ✅ guarda `Number.isNaN` → UNKNOWN (+ test).
  - ~~`#2` `ubicacionGate` ignora `cobertura.municipios`~~ ✅ cruza depto **O** municipio vía
    crosswalk DANE (`MUNICIPIOS`), depto desambigua (+ tests). Cierra el footgun `departamentos:[]`.
- **Plazo con días exactos:** requiere el cronograma del pliego (no está en metadata).
- **Habilitación financiera/jurídica real:** comparar perfil vs umbrales del pliego.
- **Cuantía vs capacidad K residual:** banda relativa a capacidad (Decreto 1082, AIU).
- **Veto sectorial duro (D6, opción C):** evaluar tras medir precisión sectorial (D19/D20).
- **Ingesta RUP automática (D4):** fuente `rues`, sustituye el modo manual.
- **Persistencia del perfil y del veredicto:** tablas Drizzle al pasar a multi-tenant.
