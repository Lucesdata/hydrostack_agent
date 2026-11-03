/**
 * Campos del Lote 1 de datos de la Ficha Viva (spec 2026-10-24-lote1-datos-columnas):
 * duración del proceso y, del contrato, origen y destino del gasto, fuentes de
 * recursos, días adicionados y liquidación.
 *
 * Puro y sin base. Lo usan **a la vez** el transform (`mapCanonical.ts`) y el script
 * de relleno por identificador: un solo lugar define qué es «sin dato».
 *
 * Reglas (spec R3 y R4): `0`, vacío y centinelas («No Definido») no crean dato; una
 * fuente de recursos con valor `0` no se lista. Los textos de origen y destino se
 * guardan tal como los publica el SECOP (R7: no se interpretan).
 */

import { cleanText, parseBool, parseMoney, stripAccents } from "./normalize";

type SodaRow = Record<string, unknown>;

export type UnidadDuracion = "dias" | "semanas" | "meses" | "anos";

export interface Lote1Proceso {
  duracionValor: number | null;
  duracionUnidad: UnidadDuracion | null;
}

/** Claves del `jsonb` `contrato.fuentes_recursos`; solo aparecen las de valor > 0. */
export type FuenteRecursos = "sgp" | "propios" | "pgn" | "credito" | "regalias";

export interface Lote1Contrato {
  origenRecursos: string | null;
  destinoGasto: string | null;
  fuentesRecursos: Partial<Record<FuenteRecursos, number>> | null;
  diasAdicionados: number | null;
  liquidado: boolean | null;
}

/** Campo de Socrata de cada fuente de recursos. */
const CAMPO_DE_FUENTE: Record<FuenteRecursos, string> = {
  sgp: "sistema_general_de_participaciones",
  propios: "recursos_propios",
  pgn: "presupuesto_general_de_la_nacion_pgn",
  credito: "recursos_de_credito",
  regalias: "sistema_general_de_regal_as",
};

/**
 * Campos de Socrata que lee este módulo. La ingesta los pide en `$select`
 * (`ingest/campos.ts`): sin esto no llegan, porque desde 2026-09-12 solo se pide lo
 * que se usa. Un test deriva las claves `row["…"]` de este archivo y exige que estén aquí.
 */
export const CAMPOS_LOTE1_PROCESOS = ["duracion", "unidad_de_duracion"] as const;
export const CAMPOS_LOTE1_CONTRATOS = [
  "origen_de_los_recursos",
  "destino_gasto",
  ...Object.values(CAMPO_DE_FUENTE),
  "dias_adicionados",
  "liquidaci_n",
] as const;

/** Entero estrictamente positivo desde texto o número JSON; `null` en cualquier otro caso. */
function enteroPositivo(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }
  const s = cleanText(value);
  if (s === null || !/^\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function unidadDeDuracion(value: unknown): UnidadDuracion | null {
  const s = cleanText(value);
  if (s === null) return null;
  const k = stripAccents(s.toLowerCase());
  if (k.startsWith("dia")) return "dias";
  if (k.startsWith("seman")) return "semanas";
  if (k.startsWith("mes")) return "meses";
  if (k.startsWith("ano")) return "anos";
  return null;
}

/** Procesos (`p6dx-8zbt`). Valor y unidad van juntos o no van: una sola mitad no es un dato. */
export function mapLote1Proceso(row: SodaRow): Lote1Proceso {
  const valor = enteroPositivo(row["duracion"]);
  const unidad = unidadDeDuracion(row["unidad_de_duracion"]);
  return valor !== null && unidad !== null
    ? { duracionValor: valor, duracionUnidad: unidad }
    : { duracionValor: null, duracionUnidad: null };
}

/** Contratos (`jbjy-vk9h`). */
export function mapLote1Contrato(row: SodaRow): Lote1Contrato {
  const fuentes: Partial<Record<FuenteRecursos, number>> = {};
  for (const [clave, campo] of Object.entries(CAMPO_DE_FUENTE) as [FuenteRecursos, string][]) {
    const v = parseMoney(row[campo]);
    if (v !== null && v > 0) fuentes[clave] = v;
  }
  return {
    origenRecursos: cleanText(row["origen_de_los_recursos"]),
    destinoGasto: cleanText(row["destino_gasto"]),
    fuentesRecursos: Object.keys(fuentes).length > 0 ? fuentes : null,
    diasAdicionados: enteroPositivo(row["dias_adicionados"]),
    liquidado: parseBool(row["liquidaci_n"]),
  };
}
