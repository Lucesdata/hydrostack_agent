/**
 * Perfil del Oferente — insumo "quién soy" del veredicto Nivel 0.
 *
 * Dominio del USUARIO que evalúa si licitar. Deliberadamente distinto del
 * `proveedor` adjudicado del catálogo ([db/schema/catalogos.ts]) → por eso el
 * nombre `oferente`. La otra mitad del cruce de elegibilidad es la metadata del
 * proceso (`VerdictProcessInput` en [secop/verdict.ts]).
 *
 * Convención del repo: interfaz plana, sin deps externas (ni zod). Si más adelante
 * hace falta validar en runtime, será un guard puro `parseOferenteProfile`, igual
 * que [pliego/schema.ts] — no un validador externo.
 *
 * Persistencia (D3): hoy es un objeto de config / seed (un solo oferente, piloto
 * Valle del Cauca). El tipo ya lleva `id` para promoverlo a tabla Drizzle
 * `oferente_perfil` sin repintar cuando entre el segundo oferente.
 *
 * Diseño y decisiones: docs/fase-a/nivel-0-perfil-y-veredicto.md (§3).
 */

export type TipoPersona = 'natural' | 'juridica';

/**
 * Código UNSPSC propio del oferente, en formato normalizado (sin el prefijo
 * "V1." de Socrata). Admite granularidad de familia (5 díg, "83101") o de clase
 * (8 díg, "83101500"). Se cruza contra `codigo_principal_de_categoria` (Procesos)
 * / `codigo_de_categoria_principal` (Contratos). Mismo formato que
 * [secop/ingest-net.ts] usa en `matchesSectorNet`.
 */
export type UnspscCodigo = string;

/** Procedencia de los indicadores RUP (D4). Manual hoy; `rues` cuando se ingeste. */
export type FuenteRUP = 'manual' | 'rues';

/** Indicadores RUP de capacidad financiera. // traza: indicadores RUP */
export interface CapacidadFinancieraRUP {
  /** Capital de trabajo en COP. */
  capitalTrabajoCop: number;
  /** Índice de liquidez (veces). */
  indiceLiquidez: number;
  /** Índice de endeudamiento (proporción 0–1). */
  indiceEndeudamiento: number;
  /** Razón de cobertura de intereses (veces). */
  razonCoberturaIntereses: number;
  /** D4 — de dónde salen estos números. */
  fuente: FuenteRUP;
  /**
   * ISO. Vigencia del RUP: un RUP vencido reprueba habilitación, así que importa
   * incluso en modo manual. `null` si no se declaró.
   */
  vigenciaHasta: string | null;
}

/**
 * Cobertura geográfica como códigos DANE DIVIPOLA (reusa la convención de la tabla
 * `geografia` en [db/schema/catalogos.ts]).
 */
export interface CoberturaGeografica {
  /** DIVIPOLA de 2 dígitos. Ej.: ['76'] = Valle del Cauca (piloto). */
  departamentos: string[];
  /** DIVIPOLA de 5 dígitos (opcional, más fino). Ej.: ['76001'] = Cali. */
  municipios: string[];
}

/** Rango de valor de contrato que persigue el oferente (COP). */
export interface CuantiaObjetivo {
  minCop: number;
  maxCop: number;
}

export interface OferenteProfile {
  /**
   * D3 — presente desde ya: el tipo es multi-tenant aunque los datos sean de un
   * solo oferente. Habilita promover el config a tabla sin cambiar el contrato.
   */
  id: string;
  tipoPersona: TipoPersona;
  /** UNSPSC en los que el oferente trabaja → insumo de la compuerta Sectorial. */
  sectoresUnspsc: UnspscCodigo[];
  capacidadFinanciera: CapacidadFinancieraRUP;
  /** K de capacidad residual de obra (COP). `null` si no aplica. // traza: Decreto 1082 de 2015 */
  kCapacidadResidualCop: number | null;
  cobertura: CoberturaGeografica;
  cuantiaObjetivo: CuantiaObjetivo;
}
