/**
 * ──────────────────────────────────────────────────────────────────────────
 *  Nivel 0 — Veredicto: "¿puedo participar en este proceso?"
 * ──────────────────────────────────────────────────────────────────────────
 *
 *  Semáforo que cruza el Perfil del Oferente ([oferente/types.ts]) contra la
 *  metadata del proceso, usando SOLO metadata del ELT — sin abrir documentos.
 *  Es el puente entre el pipeline (datos) y la futura UI (semáforo).
 *
 *  ESTE ARCHIVO ES SOLO EL CONTRATO: tipos, firmas de las compuertas y el
 *  veredicto agregado. La LÓGICA de cada compuerta es el siguiente incremento
 *  (con TDD). No hay cuerpos aquí a propósito.
 *
 *  Invariante (protege el probing lazy, igual que `preclassify` nunca afirma
 *  PUBLIC): una compuerta con `requiredLevel: 2` DEBE devolver `UNKNOWN` en
 *  Nivel 0. Ninguna compuerta documental puede pintar verde/rojo sin el pliego.
 *
 *  Reusa, no redefine: `SecopProceso` ([./types]) y `DocumentAccess`
 *  ([./document-access]) ya existen y son la base. `GateResult` espeja a
 *  `DocumentAccessResult` (state/reason/method).
 *
 *  Diseño y decisiones: docs/fase-a/nivel-0-perfil-y-veredicto.md.
 * ──────────────────────────────────────────────────────────────────────────
 */

import type { OferenteProfile } from '@/src/lib/oferente/types';
import type { SecopProceso } from './types';
import { DEPARTAMENTOS } from '@/data/dane/divipola';
import { normalizeGeoText } from '@/src/lib/transform/geo';

// ===========================================================================
//  Insumo: metadata del proceso que leen las compuertas
// ===========================================================================

/** `EstadoApertura` vive en ./types (metadata normalizada general); se re-exporta
 *  por conveniencia de los consumidores del veredicto. */
export type { EstadoApertura } from './types';

/**
 * Lo que las compuertas LEEN. Extiende `SecopProceso` (que ya trae id, referencia,
 * entidad, modalidad, estado, descripcion, unspsc, departamento, ciudad,
 * precioBase, valorAdjudicacion, fechaPublicacion, estadoApertura, documentAccess)
 * con lo que el veredicto necesita y la foto normalizada aún no expone.
 */
export interface VerdictProcessInput extends SecopProceso {
  /**
   * D1 — Cierre EXACTO de presentación de ofertas. NO existe en el dataset
   * Procesos (vive en el cronograma del pliego). Queda en el contrato para una
   * fuente futura (Nivel 2); en Nivel 0 es `null`. La apertura binaria
   * (`estadoApertura`) se hereda de `SecopProceso`.
   */
  fechaCierre: string | null; // ISO
  /**
   * D2 — bandera sectorial precomputada (`clasificacion_sectorial.sector_agua`).
   * Fallback de la compuerta Sectorial cuando el UNSPSC del proceso es null/
   * UNSPECIFIED (entró a la red por keyword). `null` si no se ha clasificado.
   */
  sectorAgua: boolean | null;
  /** Contempla ambas variantes de origen del UNSPSC (Procesos vs Contratos). */
  categoriaUnspscOrigen?: 'proceso' | 'contrato';
}

// ===========================================================================
//  Resultado de una compuerta
// ===========================================================================

/** Semáforo + gris. PASS=verde, WARN=amarillo, FAIL=rojo, UNKNOWN=no resoluble aquí. */
export type GateStatus = 'PASS' | 'WARN' | 'FAIL' | 'UNKNOWN';

/** Nivel del embudo que resuelve la compuerta. 0 = solo metadata; 2 = requiere pliego. */
export type ResolutionLevel = 0 | 2;

/** Espeja `DocumentAccessResult` (state/reason/method) para mantener el patrón. */
export interface GateResult {
  status: GateStatus;
  /** Por qué — auditable, para depurar el veredicto sin adivinar. */
  reason: string;
  /** Cómo se resolvió: `metadata` (Nivel 0) vs `document` (Nivel 2). */
  resolvedBy: 'metadata' | 'document';
  /** CRÍTICO: declara si la compuerta necesita el pliego para resolverse de verdad. */
  requiredLevel: ResolutionLevel;
}

// ===========================================================================
//  Configuración (parámetros calibrables, no hardcoded)
// ===========================================================================

/** D5 — bandas de la compuerta Cuantía. */
export interface CuantiaBandsConfig {
  /** Margen ±relativo para la banda amarilla en el borde del rango. Default 0.20. */
  margenAmarillo: number;
}

// ===========================================================================
//  Firmas de las compuertas (tipos, sin cuerpo)
// ===========================================================================

// ── NIVEL 0 (resoluble con metadata) ──────────────────────────────────────

/**
 * Intersección UNSPSC perfil ∩ categoría del proceso. D2: si el UNSPSC del proceso
 * es `null`/`UNSPECIFIED`, no se puede intersecar por código → delega en la
 * clasificación ya hecha (`clasificacion_sectorial.sector_agua`, que entró por
 * keyword), para no producir falso negativo en los procesos sin código.
 */
export type SectorialGate = (p: OferenteProfile, proc: VerdictProcessInput) => GateResult; // L0

/**
 * Valor del proceso vs rango objetivo, 3 bandas (D5). El chequeo *vs capacidad K*
 * es el upgrade Nivel 2 (cómo se exige K vive en el pliego: AIU, Decreto 1082).
 */
export type CuantiaGate = (
  p: OferenteProfile,
  proc: VerdictProcessInput,
  cfg: CuantiaBandsConfig,
) => GateResult; // L0

/**
 * D1: si `fechaCierre` (fuente futura) → días restantes → semáforo fino; si no,
 * usa `estadoApertura` (Cerrado→FAIL, Abierto→WARN); si ninguno → UNKNOWN. El
 * conteo de días exacto es upgrade Nivel 2.
 */
export type PlazoGate = (proc: VerdictProcessInput, now: Date) => GateResult; // L0 parcial

/** Ubicación del proceso (DIVIPOLA) ∈ cobertura del perfil. */
export type UbicacionGate = (p: OferenteProfile, proc: VerdictProcessInput) => GateResult; // L0

// ── NIVEL 2 (requiere pliego) ─────────────────────────────────────────────

/**
 * Los umbrales RUP/jurídicos EXIGIDOS viven en el pliego, no en metadata. En
 * Nivel 0 SIEMPRE devuelve `{ status: 'UNKNOWN', requiredLevel: 2 }`. El perfil
 * ya carga los indicadores propios para comparar cuando llegue el pliego.
 */
export type HabilitacionGate = (p: OferenteProfile, proc: VerdictProcessInput) => GateResult; // L2

// ===========================================================================
//  Veredicto agregado (proyección derivada, recomputable — no se persiste en L0)
// ===========================================================================

export interface Verdict {
  procesoId: string;
  /** D6 — worst-of sobre las compuertas resueltas (ver `AggregateVerdict`). */
  overall: GateStatus;
  gates: {
    sectorial: GateResult;
    cuantia: GateResult;
    plazo: GateResult;
    ubicacion: GateResult;
    /** UNKNOWN / requiere-pliego en Nivel 0. */
    habilitacion: GateResult;
  };
  /** Nivel del embudo que produjo este veredicto. 0 en esta fase. */
  level: ResolutionLevel;
  /** ISO. */
  evaluatedAt: string;
}

/**
 * D6 — regla de agregación (firma sin cuerpo; la lógica es de implementación):
 * sobre las compuertas NO `UNKNOWN`, cualquier `FAIL`→`FAIL`; si no, cualquier
 * `WARN`→`WARN`; si todas son `PASS`→`PASS`. Las `UNKNOWN` no fuerzan rojo; se
 * reportan aparte. Sin veto sectorial duro en Nivel 0.
 */
export type AggregateVerdict = (gates: Verdict['gates']) => GateStatus;

// ===========================================================================
//  Implementación de las compuertas (Nivel 0)
// ===========================================================================

/** D5 — bandas de Cuantía por defecto: ±20% para la banda amarilla. */
export const DEFAULT_CUANTIA_BANDS: CuantiaBandsConfig = { margenAmarillo: 0.2 };

/** Umbral de días para pintar amarillo cuando hay fecha de cierre (rama L2). */
const PLAZO_WARN_DIAS = 7;

/** Normaliza un UNSPSC a solo dígitos: "V1.83101500" → "83101500". `null` si
 *  vacío o centinela ("UNSPECIFIED" → "" → null). Sirve para códigos del proceso
 *  ("V1.xxxx") y del perfil ("83101"). */
function unspscDigits(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const d = String(raw).replace(/^v\d+\./i, '').replace(/\D/g, '');
  return d || null;
}

/** Mapa nombre-de-departamento-normalizado → código DIVIPOLA (2 díg), con aliases.
 *  Reusa el crosswalk DANE estático (data/dane) — puro, sin I/O. */
const DEPT_NAME_TO_CODE: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const d of DEPARTAMENTOS) {
    const primary = normalizeGeoText(d.departamentoNombre);
    if (primary) m.set(primary, d.departamentoCodigo);
    for (const a of d.aliases ?? []) {
      const n = normalizeGeoText(a);
      if (n) m.set(n, d.departamentoCodigo);
    }
  }
  return m;
})();

/**
 * Sectorial: intersección UNSPSC perfil ∩ categoría del proceso. Si el proceso no
 * trae código (null/UNSPECIFIED), delega en `sectorAgua` precomputado (D2): true →
 * WARN (intersección por confirmar), false/null → UNKNOWN.
 */
export const sectorialGate: SectorialGate = (p, proc) => {
  const procDigits = unspscDigits(proc.unspsc);
  if (procDigits) {
    const hit = p.sectoresUnspsc.some((code) => {
      const c = unspscDigits(code);
      return c != null && (procDigits.startsWith(c) || c.startsWith(procDigits));
    });
    return hit
      ? { status: 'PASS', reason: `categoría ${proc.unspsc} dentro de tus sectores`, resolvedBy: 'metadata', requiredLevel: 0 }
      : { status: 'FAIL', reason: `categoría ${proc.unspsc} fuera de tus sectores UNSPSC`, resolvedBy: 'metadata', requiredLevel: 0 };
  }
  if (proc.sectorAgua === true) {
    return {
      status: 'WARN',
      reason: 'categoría sin código UNSPSC; proceso del sector agua por keyword — intersección por confirmar',
      resolvedBy: 'metadata',
      requiredLevel: 0,
    };
  }
  return { status: 'UNKNOWN', reason: 'categoría sin código UNSPSC y sin clasificación sectorial', resolvedBy: 'metadata', requiredLevel: 0 };
};

/**
 * Cuantía: valor del proceso vs rango objetivo, 3 bandas (D5). Dentro → PASS;
 * dentro del margen ±`cfg.margenAmarillo` del borde → WARN; fuera → FAIL.
 */
export const cuantiaGate: CuantiaGate = (p, proc, cfg) => {
  const value = proc.precioBase ?? proc.valorAdjudicacion;
  if (value == null) {
    return { status: 'UNKNOWN', reason: 'proceso sin valor en metadata', resolvedBy: 'metadata', requiredLevel: 0 };
  }
  const { minCop, maxCop } = p.cuantiaObjetivo;
  if (value >= minCop && value <= maxCop) {
    return { status: 'PASS', reason: 'valor dentro de tu rango objetivo', resolvedBy: 'metadata', requiredLevel: 0 };
  }
  const lowerSoft = minCop * (1 - cfg.margenAmarillo);
  const upperSoft = maxCop * (1 + cfg.margenAmarillo);
  if (value >= lowerSoft && value <= upperSoft) {
    return { status: 'WARN', reason: `valor cerca del borde de tu rango (±${Math.round(cfg.margenAmarillo * 100)}%)`, resolvedBy: 'metadata', requiredLevel: 0 };
  }
  return { status: 'FAIL', reason: 'valor fuera de tu rango objetivo', resolvedBy: 'metadata', requiredLevel: 0 };
};

/**
 * Plazo (D1, L0 parcial): si hay `fechaCierre` (fuente L2 futura) → días restantes
 * → semáforo fino (resolvedBy document); si no, usa `estadoApertura` (Cerrado→FAIL,
 * Abierto→WARN, metadata); si ninguno → UNKNOWN.
 */
export const plazoGate: PlazoGate = (proc, now) => {
  if (proc.fechaCierre != null) {
    // TODO(review 2026-06-27, #1): guardar contra fecha inválida — new Date('basura')
    // → NaN → cae a PASS con "NaN días". Cerrar antes de activar esta rama (fuente L2).
    const dias = Math.ceil((new Date(proc.fechaCierre).getTime() - now.getTime()) / 86_400_000);
    if (dias < 0) return { status: 'FAIL', reason: `cierre vencido hace ${-dias} día(s)`, resolvedBy: 'document', requiredLevel: 2 };
    if (dias <= PLAZO_WARN_DIAS) return { status: 'WARN', reason: `cierra en ${dias} día(s)`, resolvedBy: 'document', requiredLevel: 2 };
    return { status: 'PASS', reason: `${dias} días hasta el cierre`, resolvedBy: 'document', requiredLevel: 2 };
  }
  if (proc.estadoApertura === 'Cerrado') {
    return { status: 'FAIL', reason: 'proceso cerrado a ofertas', resolvedBy: 'metadata', requiredLevel: 0 };
  }
  if (proc.estadoApertura === 'Abierto') {
    return { status: 'WARN', reason: 'abierto; fecha exacta de cierre en el cronograma del pliego', resolvedBy: 'metadata', requiredLevel: 0 };
  }
  return { status: 'UNKNOWN', reason: 'sin señal de apertura ni fecha de cierre', resolvedBy: 'metadata', requiredLevel: 0 };
};

/**
 * Ubicación (L0): departamento del proceso (nombre) ∈ cobertura del perfil
 * (DIVIPOLA). Resuelve nombre→código vía el crosswalk DANE estático. El cruce a
 * nivel municipio requiere la tabla `geografia` (DB) → diferido.
 */
export const ubicacionGate: UbicacionGate = (p, proc) => {
  // TODO(review 2026-06-27, #2): solo cruza a nivel departamento; `cobertura.municipios`
  // no se lee. Footgun: un perfil con solo municipios y departamentos:[] reprobaría todo.
  // Resolver junto con el cruce municipio (tabla geografia) en el upgrade.
  const key = normalizeGeoText(proc.departamento);
  const code = key ? DEPT_NAME_TO_CODE.get(key) : undefined;
  if (!code) {
    return { status: 'UNKNOWN', reason: `departamento no reconocido (${proc.departamento || '—'})`, resolvedBy: 'metadata', requiredLevel: 0 };
  }
  return p.cobertura.departamentos.includes(code)
    ? { status: 'PASS', reason: `el proceso está en tu cobertura (${proc.departamento})`, resolvedBy: 'metadata', requiredLevel: 0 }
    : { status: 'FAIL', reason: `el proceso está en ${proc.departamento}, fuera de tu cobertura`, resolvedBy: 'metadata', requiredLevel: 0 };
};

/**
 * Habilitación (L2): los umbrales RUP/jurídicos exigidos viven en el pliego. En
 * Nivel 0 SIEMPRE UNKNOWN + requiredLevel 2 (protege el probing lazy).
 */
export const habilitacionGate: HabilitacionGate = () => ({
  status: 'UNKNOWN',
  reason: 'requiere pliego: los indicadores RUP/jurídicos exigidos están en el pliego de condiciones',
  resolvedBy: 'document',
  requiredLevel: 2,
});

/**
 * D6 — worst-of sobre las compuertas resueltas (no UNKNOWN): cualquier FAIL→FAIL;
 * si no, cualquier WARN→WARN; si todas PASS→PASS. Si todas son UNKNOWN→UNKNOWN.
 * Las UNKNOWN no fuerzan rojo (se reportan aparte). Sin veto sectorial duro.
 */
export const aggregateVerdict: AggregateVerdict = (gates) => {
  const resolved = Object.values(gates)
    .map((g) => g.status)
    .filter((s) => s !== 'UNKNOWN');
  if (resolved.length === 0) return 'UNKNOWN';
  if (resolved.includes('FAIL')) return 'FAIL';
  if (resolved.includes('WARN')) return 'WARN';
  return 'PASS';
};

/**
 * Adapta la foto normalizada (`SecopProceso`) al insumo del veredicto, sumando lo
 * que la foto no expone: la bandera sectorial precomputada (D2) y la fecha de
 * cierre (fuente L2; `null` en Nivel 0). Sin I/O — el caller decide de dónde salen
 * los extras (clasificación, cronograma).
 */
export function toVerdictInput(
  proceso: SecopProceso,
  extra: {
    sectorAgua?: boolean | null;
    fechaCierre?: string | null;
    categoriaUnspscOrigen?: 'proceso' | 'contrato';
  } = {},
): VerdictProcessInput {
  return {
    ...proceso,
    sectorAgua: extra.sectorAgua ?? null,
    fechaCierre: extra.fechaCierre ?? null,
    categoriaUnspscOrigen: extra.categoriaUnspscOrigen,
  };
}

/**
 * Orquestador: compone las cinco compuertas y agrega el `overall`. Proyección
 * derivada y recomputable — no se persiste en Nivel 0.
 */
export function buildVerdict(
  profile: OferenteProfile,
  proc: VerdictProcessInput,
  now: Date = new Date(),
  cfg: CuantiaBandsConfig = DEFAULT_CUANTIA_BANDS,
): Verdict {
  const gates = {
    sectorial: sectorialGate(profile, proc),
    cuantia: cuantiaGate(profile, proc, cfg),
    plazo: plazoGate(proc, now),
    ubicacion: ubicacionGate(profile, proc),
    habilitacion: habilitacionGate(profile, proc),
  };
  return {
    procesoId: proc.id,
    overall: aggregateVerdict(gates),
    gates,
    level: 0,
    evaluatedAt: now.toISOString(),
  };
}
