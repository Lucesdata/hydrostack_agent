/**
 * Tool definition for generate_pdf_report in OpenAI format (Groq compatible).
 *
 * Generates a technical memo PDF with calculation results and CTE validation.
 * Saves to public/reports/{uuid}.pdf and returns the download URL.
 */

import {
  generatePdfReport,
  PdfReportInput,
  PdfReportResult,
} from '@/lib/reports/generatePdfReport';

// ─────────────────────────────────────────────────────────────────────────
// Tool definition for Groq (OpenAI format)
// ─────────────────────────────────────────────────────────────────────────

export const generatePdfReportTool = {
  type: 'function',
  function: {
    name: 'generate_pdf_report',
    description: `
**Qué hace:** Genera una memoria técnica en PDF (A4) con resultados de dimensionado, validación normativa y referencias. Guarda el archivo en public/reports/ y devuelve URL descargable y report_id.

**Cuándo USAR:**
- AL FINAL del flujo, una vez que se han ejecutado calculate_septic_tank, calculate_drainage_field y validate_against_cte.
- Cuando el usuario pide "memoria técnica", "PDF", "informe", "documento", "reporte".
- Solo cuando hay al menos un cálculo (septic_tank o drainage_field) disponible.

**Cuándo NO USAR:**
- Si no hay cálculos previos (devolverá error pidiendo datos).
- Si el usuario solo pide explicaciones o aclaraciones.
- Antes de validar contra CTE: idealmente validar primero para reflejar cumplimiento en el PDF.

**Si faltan datos críticos:**
- Si no se proporciona \`proyecto.nombre\` ni \`proyecto.ubicacion\`, devuelve error pidiendo esos datos.
- Si solo hay un cálculo (fosa o drenaje), genera PDF parcial con lo disponible.
`,
    parameters: {
      type: 'object',
      properties: {
        septic_tank: {
          type: 'object',
          description: 'Output completo de calculate_septic_tank.',
        },
        drainage_field: {
          type: 'object',
          description: 'Output completo de calculate_drainage_field.',
        },
        validation: {
          type: 'object',
          description: 'Output de validate_against_cte. Si se omite, el PDF no incluye sección de validación.',
        },
        proyecto: {
          type: 'object',
          description: 'Información del proyecto.',
          properties: {
            nombre: {
              type: 'string',
              description: 'Nombre del proyecto (ej. "Vivienda Rural Pirineo").',
            },
            ubicacion: {
              type: 'string',
              description: 'Ubicación del proyecto (ej. "Pirineo, Huesca").',
            },
            fecha: {
              type: 'string',
              description: 'Fecha de la memoria (formato libre). Por defecto: fecha actual.',
            },
            redactor: {
              type: 'string',
              description: 'Nombre del redactor o entidad. Opcional.',
            },
          },
          required: ['nombre', 'ubicacion'],
        },
      },
      required: ['proyecto'],
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Execution function
// ─────────────────────────────────────────────────────────────────────────

export interface ExecuteGeneratePdfReportInput {
  septic_tank?: any;
  drainage_field?: any;
  validation?: any;
  proyecto?: {
    nombre?: string;
    ubicacion?: string;
    fecha?: string;
    redactor?: string;
  };
}

export async function executeGeneratePdfReport(
  input: ExecuteGeneratePdfReportInput
): Promise<PdfReportResult | { error: string; missing_fields: string[] }> {
  const missing_fields: string[] = [];

  if (!input.proyecto) {
    return {
      error: 'Falta información del proyecto.',
      missing_fields: ['proyecto.nombre', 'proyecto.ubicacion'],
    };
  }

  if (!input.proyecto.nombre || typeof input.proyecto.nombre !== 'string') {
    missing_fields.push('proyecto.nombre');
  }

  if (!input.proyecto.ubicacion || typeof input.proyecto.ubicacion !== 'string') {
    missing_fields.push('proyecto.ubicacion');
  }

  if (missing_fields.length > 0) {
    return {
      error: 'Faltan datos críticos para generar el PDF. El usuario debe proporcionarlos.',
      missing_fields,
    };
  }

  // At least one calculation must be present
  if (!input.septic_tank && !input.drainage_field) {
    return {
      error: 'No hay cálculos disponibles. Ejecuta calculate_septic_tank o calculate_drainage_field antes.',
      missing_fields: ['septic_tank', 'drainage_field'],
    };
  }

  const result = await generatePdfReport({
    septic_tank: input.septic_tank,
    drainage_field: input.drainage_field,
    validation: input.validation,
    proyecto: {
      nombre: input.proyecto.nombre!,
      ubicacion: input.proyecto.ubicacion!,
      fecha: input.proyecto.fecha,
      redactor: input.proyecto.redactor,
    },
  });

  return result;
}
