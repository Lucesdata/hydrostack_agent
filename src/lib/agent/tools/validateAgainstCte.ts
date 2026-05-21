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
          description: 'Información adicional del emplazamiento.',
          properties: {
            distancia_vivienda_m: {
              type: 'number',
              description: 'Distancia desde el sistema a la vivienda en metros (mínimo CTE: 5 m).',
            },
            distancia_pozo_m: {
              type: 'number',
              description: 'Distancia al pozo de agua en metros (mínimo CTE: 30 m).',
            },
            zona_protegida_bool: {
              type: 'boolean',
              description: 'True si el emplazamiento está en zona protegida (acuíferos, reservas hídricas, etc.).',
            },
          },
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

  const result = validateAgainstCte(input as CteValidatorInput);
  return result;
}
