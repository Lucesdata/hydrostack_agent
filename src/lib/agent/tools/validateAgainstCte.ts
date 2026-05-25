/**
 * Tool definition for validate_against_cte in OpenAI format (Groq compatible).
 *
 * Read-only tool that validates already-computed results against
 * CTE DB-HS 5 and RD 1620/2007 regulatory requirements.
 */

import {
  validateAgainstCte,
  CteValidatorInput,
  CteValidationResult,
} from '@/src/lib/validation/cteValidator';

// ─────────────────────────────────────────────────────────────────────────
// Tool definition for Groq (OpenAI format)
// ─────────────────────────────────────────────────────────────────────────

export const validateAgainstCteTool = {
  type: 'function',
  function: {
    name: 'validate_against_cte',
    description: `
**Qué hace:** Valida resultados ya calculados (fosa séptica + campo de drenaje) contra reglas normativas CTE DB-HS 5 y RD 1620/2007. Devuelve un informe estructurado con bloqueantes (incumplimientos críticos) y advertencias (recomendaciones), citando código y artículo normativo de cada hallazgo.

**Cuándo USAR:**
- DESPUÉS de calculate_septic_tank y/o calculate_drainage_field, pasando sus outputs como input.
- Cuando el usuario pide "validar", "verificar normativa", "cumple CTE", "comprobar normativa".
- ANTES de generar el PDF (generate_pdf_report) para garantizar que el diseño cumple.

**Cuándo NO USAR:**
- Si NO hay resultados previos calculados (este tool es de solo lectura).
- Para recalcular o redimensionar: usar calculate_septic_tank o calculate_drainage_field.
- Para preguntas teóricas sobre la normativa (responder con conocimiento general).

**IMPORTANTE — Solo lectura:**
Este tool NO recalcula nada. Solo valida los resultados que recibe como input. Si necesitas recalcular, llama primero a calculate_septic_tank o calculate_drainage_field.

**Si faltan datos:**
- Si no hay septic_tank ni drainage_field, devuelve resultado vacío (cumple=true, sin issues).
- Si contexto está incompleto (sin distancias), no valida esas restricciones específicas.
`,
    parameters: {
      type: 'object',
      properties: {
        septic_tank: {
          type: 'object',
          description:
            'Output del tool calculate_septic_tank (objeto completo con volumen_util_litros, dimensiones, validacion_cte, etc.). Pasa el objeto tal cual lo devolvió ese tool.',
        },
        drainage_field: {
          type: 'object',
          description:
            'Output del tool calculate_drainage_field (objeto completo con tipo_sistema, dimensiones, validacion, etc.). Pasa el objeto tal cual lo devolvió ese tool.',
        },
        contexto: {
          type: 'object',
          description: 'Información básica del emplazamiento.',
          properties: {
            distancia_vivienda_m: {
              type: 'number',
              description: 'Distancia desde el sistema a la vivienda (m). Mínimo: 5 m (Res. 0330/2017 Art. 143).',
            },
            distancia_pozo_m: {
              type: 'number',
              description: 'Distancia al pozo de abastecimiento (m). Mínimo: 30 m.',
            },
            zona_protegida_bool: {
              type: 'boolean',
              description: 'True si el predio está en zona de protección ambiental o hídrica.',
            },
          },
        },
        geoespacial: {
          type: 'object',
          description:
            'Verificaciones geoespaciales detalladas del sitio (Fase 1). ' +
            'Devuelve estado OK/ALERTA/BLOQUEANTE por cada restricción, ' +
            'y sugiere tecnologías alternativas si el nivel freático es alto.',
          properties: {
            distancia_pozos_m: {
              type: 'number',
              description: 'Distancia a pozos de abastecimiento de agua (m). Mínimo: 30 m (Art. 143).',
            },
            distancia_cuerpo_agua_m: {
              type: 'number',
              description: 'Distancia a cuerpos de agua o ronda hídrica (m). Mínimo: 30 m (Art. 144).',
            },
            distancia_edificaciones_m: {
              type: 'number',
              description: 'Distancia a edificaciones y linderos (m). Mínimo: 5 m (Art. 143).',
            },
            distancia_arboles_m: {
              type: 'number',
              description: 'Distancia a árboles de raíz profunda (m). Mínimo: 3 m (Art. 143).',
            },
            aguas_abajo_captaciones: {
              type: 'boolean',
              description: 'True si el sistema está hidráulicamente aguas abajo de todas las captaciones de agua.',
            },
            nivel_freatico_medido_m: {
              type: 'number',
              description:
                'Profundidad medida al nivel freático máximo estacional desde la superficie (m). ' +
                'El fondo de la zanja debe quedar a ≥ 1.20 m sobre el N.F. máximo (Art. 144). ' +
                'Si N.F. < 1.5 m, el agente sugerirá tecnologías alternativas.',
            },
            profundidad_instalacion_m: {
              type: 'number',
              description:
                'Profundidad desde la superficie al fondo de la zanja de infiltración (m). ' +
                'Típico: 0.60–0.90 m para zanjas filtrantes. Usado para calcular distancia al N.F.',
            },
          },
        },
        norm_code: {
          type: 'string',
          enum: ['ras', 'cte', 'epa', 'uk', 'asnzs'],
          description: '"ras" = Colombia (Res. 0330/2017, default). "cte" = España.',
        },
      },
      required: [],
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Execution function (validation + call to pure function)
// ─────────────────────────────────────────────────────────────────────────

export interface ExecuteValidateAgainstCteInput {
  septic_tank?: any;
  drainage_field?: any;
  contexto?: {
    distancia_vivienda_m?: number;
    distancia_pozo_m?: number;
    zona_protegida_bool?: boolean;
  };
  geoespacial?: {
    distancia_pozos_m?: number;
    distancia_cuerpo_agua_m?: number;
    distancia_edificaciones_m?: number;
    distancia_arboles_m?: number;
    aguas_abajo_captaciones?: boolean;
    nivel_freatico_medido_m?: number;
    profundidad_instalacion_m?: number;
  };
  norm_code?: string;
}

export async function executeValidateAgainstCte(
  input: ExecuteValidateAgainstCteInput
): Promise<CteValidationResult> {
  // Validate input shape (no required fields, but if provided, they must be objects)
  if (
    input.septic_tank !== undefined &&
    input.septic_tank !== null &&
    typeof input.septic_tank !== 'object'
  ) {
    throw new Error('septic_tank debe ser un objeto (output de calculate_septic_tank).');
  }

  if (
    input.drainage_field !== undefined &&
    input.drainage_field !== null &&
    typeof input.drainage_field !== 'object'
  ) {
    throw new Error('drainage_field debe ser un objeto (output de calculate_drainage_field).');
  }

  if (input.contexto !== undefined && input.contexto !== null) {
    if (typeof input.contexto !== 'object') {
      throw new Error('contexto debe ser un objeto.');
    }
    if (
      input.contexto.distancia_vivienda_m !== undefined &&
      (typeof input.contexto.distancia_vivienda_m !== 'number' ||
        input.contexto.distancia_vivienda_m < 0)
    ) {
      throw new Error('contexto.distancia_vivienda_m debe ser un número ≥ 0.');
    }
    if (
      input.contexto.distancia_pozo_m !== undefined &&
      (typeof input.contexto.distancia_pozo_m !== 'number' || input.contexto.distancia_pozo_m < 0)
    ) {
      throw new Error('contexto.distancia_pozo_m debe ser un número ≥ 0.');
    }
  }

  const result = validateAgainstCte({
    septic_tank: input.septic_tank,
    drainage_field: input.drainage_field,
    contexto: input.contexto,
    geoespacial: input.geoespacial,
    norm_code: input.norm_code,
  } as CteValidatorInput);
  return result;
}
