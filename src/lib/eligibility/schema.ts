/**
 * Requisitos habilitantes CUANTIFICADOS de un proceso — segundo paso sobre
 * `PliegoExtraction.requisitos_habilitantes` (texto libre, ya extraído por
 * extractPliegoHybrid). Este módulo NO extrae del PDF: estructura texto que
 * ya salió del extractor único (CLAUDE.md §2). `verificar_manual` + `cita_textual`
 * es el mismo contrato de grounding que `NO_ENCONTRADO` en pliego/schema.ts —
 * nunca se inventa un número si el pliego no lo declara con claridad.
 */

export type IndicadorFinancieroCodigo =
  | 'indice_liquidez'
  | 'indice_endeudamiento'
  | 'razon_cobertura_intereses'
  | 'rentabilidad_patrimonio'
  | 'rentabilidad_activo'
  | 'patrimonio_smmlv'
  | 'capital_trabajo_smmlv';

export type Operador = 'gte' | 'lte';

export interface IndicadorFinancieroExigido {
  indicador: IndicadorFinancieroCodigo;
  operador: Operador;
  valor: number;
  verificar_manual: boolean;
  cita_textual: string;
}

export interface ExperienciaExigida {
  valor_min_smmlv: number | null;
  unspsc_exigidos: string[];
  max_contratos_aportables: number | null;
  verificar_manual: boolean;
  cita_textual: string;
}

export interface RequisitosHabilitantesEstructurados {
  experiencia: ExperienciaExigida;
  indicadores_financieros: IndicadorFinancieroExigido[];
}

const INDICADORES_VALIDOS: IndicadorFinancieroCodigo[] = [
  'indice_liquidez',
  'indice_endeudamiento',
  'razon_cobertura_intereses',
  'rentabilidad_patrimonio',
  'rentabilidad_activo',
  'patrimonio_smmlv',
  'capital_trabajo_smmlv',
];

const OPERADORES_VALIDOS: Operador[] = ['gte', 'lte'];

export const REQUISITOS_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    experiencia: {
      type: 'object',
      additionalProperties: false,
      properties: {
        valor_min_smmlv: { type: ['number', 'null'] },
        unspsc_exigidos: { type: 'array', items: { type: 'string' } },
        max_contratos_aportables: { type: ['number', 'null'] },
        verificar_manual: { type: 'boolean' },
        cita_textual: { type: 'string' },
      },
      required: ['valor_min_smmlv', 'unspsc_exigidos', 'max_contratos_aportables', 'verificar_manual', 'cita_textual'],
    },
    indicadores_financieros: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          indicador: { type: 'string', enum: INDICADORES_VALIDOS },
          operador: { type: 'string', enum: OPERADORES_VALIDOS },
          valor: { type: 'number' },
          verificar_manual: { type: 'boolean' },
          cita_textual: { type: 'string' },
        },
        required: ['indicador', 'operador', 'valor', 'verificar_manual', 'cita_textual'],
      },
    },
  },
  required: ['experiencia', 'indicadores_financieros'],
} as const;

function asString(v: unknown, field: string): string {
  if (typeof v !== 'string') throw new Error(`campo ${field} debe ser string`);
  return v;
}
function asBoolean(v: unknown, field: string): boolean {
  if (typeof v !== 'boolean') throw new Error(`campo ${field} debe ser boolean`);
  return v;
}
function asNumberOrNull(v: unknown, field: string): number | null {
  if (v === null) return null;
  if (typeof v !== 'number' || Number.isNaN(v)) throw new Error(`campo ${field} debe ser número o null`);
  return v;
}
function asNumber(v: unknown, field: string): number {
  if (typeof v !== 'number' || Number.isNaN(v)) throw new Error(`campo ${field} debe ser número`);
  return v;
}

export function parseRequisitosEstructurados(raw: unknown): RequisitosHabilitantesEstructurados {
  if (typeof raw !== 'object' || raw === null) throw new Error('requisitos estructurados: no es un objeto');
  const o = raw as Record<string, unknown>;

  if (typeof o.experiencia !== 'object' || o.experiencia === null) {
    throw new Error('experiencia es requerida');
  }
  const e = o.experiencia as Record<string, unknown>;
  if (!Array.isArray(e.unspsc_exigidos)) throw new Error('experiencia.unspsc_exigidos debe ser un array');
  const experiencia: ExperienciaExigida = {
    valor_min_smmlv: asNumberOrNull(e.valor_min_smmlv, 'experiencia.valor_min_smmlv'),
    unspsc_exigidos: e.unspsc_exigidos.map((c, i) => asString(c, `experiencia.unspsc_exigidos[${i}]`)),
    max_contratos_aportables: asNumberOrNull(e.max_contratos_aportables, 'experiencia.max_contratos_aportables'),
    verificar_manual: asBoolean(e.verificar_manual, 'experiencia.verificar_manual'),
    cita_textual: asString(e.cita_textual, 'experiencia.cita_textual'),
  };

  if (!Array.isArray(o.indicadores_financieros)) {
    throw new Error('indicadores_financieros debe ser un array');
  }
  const indicadores_financieros: IndicadorFinancieroExigido[] = o.indicadores_financieros.map((it, i) => {
    if (typeof it !== 'object' || it === null) throw new Error(`indicadores_financieros[${i}] inválido`);
    const ii = it as Record<string, unknown>;
    const indicador = asString(ii.indicador, `indicadores_financieros[${i}].indicador`);
    if (!INDICADORES_VALIDOS.includes(indicador as IndicadorFinancieroCodigo)) {
      throw new Error(`indicadores_financieros[${i}].indicador inválido: ${indicador}`);
    }
    const operador = asString(ii.operador, `indicadores_financieros[${i}].operador`);
    if (!OPERADORES_VALIDOS.includes(operador as Operador)) {
      throw new Error(`indicadores_financieros[${i}].operador debe ser gte|lte`);
    }
    return {
      indicador: indicador as IndicadorFinancieroCodigo,
      operador: operador as Operador,
      valor: asNumber(ii.valor, `indicadores_financieros[${i}].valor`),
      verificar_manual: asBoolean(ii.verificar_manual, `indicadores_financieros[${i}].verificar_manual`),
      cita_textual: asString(ii.cita_textual, `indicadores_financieros[${i}].cita_textual`),
    };
  });

  return { experiencia, indicadores_financieros };
}
