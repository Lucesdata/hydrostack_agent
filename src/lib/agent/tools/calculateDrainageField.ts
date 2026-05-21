/**
 * Tool definition for calculate_drainage_field in OpenAI format (Groq compatible).
 *
 * Sizes the infiltration field (filter trenches, filter bed, or filter well)
 * that receives the effluent of the septic tank.
 */

import {
  calculateDrainageField,
  DrainageFieldInput,
  DrainageFieldResult,
} from '@/src/lib/calculations/drainageField';

// ─────────────────────────────────────────────────────────────────────────
// Tool definition for Groq (OpenAI format)
// ─────────────────────────────────────────────────────────────────────────

export const calculateDrainageFieldTool = {
  type: 'function',
  function: {
    name: 'calculate_drainage_field',
    description: `
**Qué hace:** Dimensiona el campo de infiltración (zanjas filtrantes, lecho filtrante o pozo filtrante) que recibe el efluente de la fosa séptica. Calcula superficie de infiltración, longitud de zanjas, número de zanjas, separación y profundidad según CTE DB-HS 5 Anejo G y RD 1620/2007.

**Cuándo USAR:**
- DESPUÉS de calculate_septic_tank, usando su output \`caudal_diario_litros\` como \`caudal_diario_l\`.
- Cuando el usuario menciona "drenaje", "infiltración", "zanjas filtrantes", "campo de drenaje", "lecho filtrante", "pozo filtrante".
- Cuando se dispone de la permeabilidad del suelo (K) en m/día (del estudio de suelo o perc test).

**Cuándo NO USAR:**
- Si solo se pide dimensionar la fosa séptica (usar calculate_septic_tank).
- Si el usuario pregunta por temas normativos generales sin datos concretos.
- Si NO se conoce la permeabilidad del suelo: pedirla antes de llamar al tool.

**Si faltan datos:**
- Si \`tipo_sistema\` no se especifica, se auto-selecciona según K.
- Si \`nivel_freatico_m\` o \`distancia_pozo_agua_m\` no se conocen, se omiten (no se validan esas restricciones).
- Si K < 10⁻⁶ m/s (≈ 0.086 m/día) → devuelve bloqueante: suelo no apto.
`,
    parameters: {
      type: 'object',
      properties: {
        caudal_diario_l: {
          type: 'number',
          description:
            'Caudal diario en litros/día. Típicamente viene del output de calculate_septic_tank (campo "caudal_diario_litros").',
          minimum: 100,
          maximum: 100000,
        },
        permeabilidad_suelo_m_dia: {
          type: 'number',
          description:
            'Permeabilidad del suelo K en m/día (del perc test o estudio de suelo). Conversiones útiles: 1 m/día ≈ 1.16×10⁻⁵ m/s. Rango típico: 0.01 (arcilla) – 100 (grava).',
          minimum: 0.001,
          maximum: 1000,
        },
        tipo_sistema: {
          type: 'string',
          enum: ['zanjas_filtrantes', 'lecho_filtrante', 'pozo_filtrante'],
          description:
            'Tipo de sistema de infiltración. Si se omite, se auto-selecciona según K: zanjas (K media), lecho (K alta), pozo (compacto).',
        },
        nivel_freatico_m: {
          type: 'number',
          description:
            'Profundidad del nivel freático en metros. CTE Anejo G exige mínimo 1 m por debajo del sistema.',
          minimum: 0,
          maximum: 50,
        },
        distancia_pozo_agua_m: {
          type: 'number',
          description:
            'Distancia a pozo o captación de agua en metros. CTE Anejo G exige mínimo 30 m.',
          minimum: 0,
          maximum: 1000,
        },
      },
      required: ['caudal_diario_l', 'permeabilidad_suelo_m_dia'],
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Execution function (validation + call to pure function)
// ─────────────────────────────────────────────────────────────────────────

export interface ExecuteDrainageFieldInput {
  caudal_diario_l?: number;
  permeabilidad_suelo_m_dia?: number;
  tipo_sistema?: string;
  nivel_freatico_m?: number;
  distancia_pozo_agua_m?: number;
}

export async function executeCalculateDrainageField(
  input: ExecuteDrainageFieldInput
): Promise<DrainageFieldResult> {
  // Validate required fields
  if (input.caudal_diario_l === undefined || input.caudal_diario_l === null) {
    throw new Error('caudal_diario_l es requerido.');
  }
  if (typeof input.caudal_diario_l !== 'number' || input.caudal_diario_l <= 0) {
    throw new Error('caudal_diario_l debe ser un número > 0.');
  }
  if (input.caudal_diario_l < 100 || input.caudal_diario_l > 100000) {
    throw new Error('caudal_diario_l debe estar entre 100 y 100000 L/día.');
  }

  if (
    input.permeabilidad_suelo_m_dia === undefined ||
    input.permeabilidad_suelo_m_dia === null
  ) {
    throw new Error('permeabilidad_suelo_m_dia es requerido.');
  }
  if (
    typeof input.permeabilidad_suelo_m_dia !== 'number' ||
    input.permeabilidad_suelo_m_dia <= 0
  ) {
    throw new Error('permeabilidad_suelo_m_dia debe ser un número > 0.');
  }

  // Validate tipo_sistema enum
  const validTipos = ['zanjas_filtrantes', 'lecho_filtrante', 'pozo_filtrante'];
  if (input.tipo_sistema !== undefined && !validTipos.includes(input.tipo_sistema)) {
    throw new Error(`tipo_sistema inválido. Opciones: ${validTipos.join(', ')}`);
  }

  // Validate optional ranges
  if (
    input.nivel_freatico_m !== undefined &&
    (typeof input.nivel_freatico_m !== 'number' ||
      input.nivel_freatico_m < 0 ||
      input.nivel_freatico_m > 50)
  ) {
    throw new Error('nivel_freatico_m debe estar entre 0 y 50 m.');
  }

  if (
    input.distancia_pozo_agua_m !== undefined &&
    (typeof input.distancia_pozo_agua_m !== 'number' ||
      input.distancia_pozo_agua_m < 0 ||
      input.distancia_pozo_agua_m > 1000)
  ) {
    throw new Error('distancia_pozo_agua_m debe estar entre 0 y 1000 m.');
  }

  const result = calculateDrainageField({
    caudal_diario_l: input.caudal_diario_l,
    permeabilidad_suelo_m_dia: input.permeabilidad_suelo_m_dia,
    tipo_sistema: input.tipo_sistema as
      | 'zanjas_filtrantes'
      | 'lecho_filtrante'
      | 'pozo_filtrante'
      | undefined,
    nivel_freatico_m: input.nivel_freatico_m,
    distancia_pozo_agua_m: input.distancia_pozo_agua_m,
  });

  return result;
}
