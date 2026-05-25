/**
 * Tool definition for calculate_septic_tank in OpenAI format (Groq compatible).
 *
 * Phase 1: adds coeficiente_retorno (Cr=0.85 default), temperatura_agua_c
 * (TRH correction via Van't Hoff), intervalo_limpieza_anos (default 3),
 * full flow suite (Q_max, Q_min), and norm_code selection.
 */

import { calculateSepticTank, SepticTankInput, SepticTankResult } from '@/src/lib/calculations/septicTank';

// ─────────────────────────────────────────────────────────────────────────
// Tool definition for OpenAI / Groq API format
// ─────────────────────────────────────────────────────────────────────────

export const calculateSepticTankTool = {
  type: 'function',
  function: {
    name: 'calculate_septic_tank',
    description: `
**Qué hace:** Calcula el volumen y dimensiones de una fosa séptica según la normativa española CTE DB-HS 5 (Código Técnico de la Edificación, Documento Básico de Salubridad, Sección 5) y RD 1620/2007 (Regulación de sistemas individuales de tratamiento).

**Cuándo USAR:**
- Dimensionamiento de nuevas instalaciones de saneamiento individual en España.
- Verificación de sistemas existentes contra CTE DB-HS 5.
- Cálculo de capacidad hidráulica según población y uso (vivienda, restaurante, camping, oficina, etc.).

**Cuándo NO USAR:**
- Si el sistema ya está instalado y funciona sin problemas (solo requiere inspección, no cálculo).
- Si el usuario habla de campo de drenaje o terrenos (ese es otro tool: calculate_drainage_field).
- Si no proporciona número de habitantes o tipo de uso.

**Si faltan datos:**
- Se aplican automáticamente mínimos CTE DB-HS 5 (vivienda unifamiliar: 5 h-e mínimo, 200 L/hab·día dotación, 1–2 días retención).
- El usuario recibe avisos en "validacion_cte.avisos" indicando qué valores fueron normalizados.
`,
    parameters: {
      type: 'object',
      properties: {
        habitantes_equivalentes: {
          type: 'integer',
          description: 'Número de habitantes equivalentes (h-e). Mínimo 1. CTE DB-HS 5: vivienda unifamiliar requiere mín. 5 h-e.',
          minimum: 1,
          maximum: 500,
        },
        tipo_uso: {
          type: 'string',
          enum: [
            'vivienda_unifamiliar',
            'vivienda_colectiva',
            'restaurante',
            'hotel',
            'camping',
            'oficina',
            'industrial',
          ],
          description: 'Tipo de uso/instalación. Define dotación y mínimos CTE por defecto.',
        },
        dotacion_litros_hab_dia: {
          type: 'number',
          description:
            'Dotación diaria en L/hab·día. Por defecto: 200 (Res. 0330/2017 Art. 134). Rango típico: 100–250.',
          minimum: 50,
          maximum: 500,
        },
        tiempo_retencion_dias: {
          type: 'number',
          description:
            'TRH en días. Si se omite, se calcula automáticamente con corrección por temperatura. ' +
            'Mínimo Colombia (Res. 0330/2017 Art. 138): 1.5 días (2.0 días en clima frío, e.g. Bogotá).',
          minimum: 1,
          maximum: 5,
        },
        coeficiente_retorno: {
          type: 'number',
          description:
            'Fracción del agua suministrada que retorna como aguas residuales. ' +
            'Por defecto: 0.85 (RAS 2000 y literatura estándar). Usar 1.00 solo si hay retorno total.',
          minimum: 0.5,
          maximum: 1.0,
        },
        temperatura_agua_c: {
          type: 'number',
          description:
            'Temperatura media del agua residual en °C. Afecta el TRH mínimo por cinética anaerobia (Van\'t Hoff). ' +
            'Bogotá: 14–16°C → TRH aumenta a 2.0 días. Clima cálido (>20°C): TRH = 1.5 días.',
          minimum: 5,
          maximum: 35,
        },
        intervalo_limpieza_anos: {
          type: 'integer',
          description:
            'Intervalo de extracción de lodos en años. Por defecto: 3 (Res. 0330/2017 Art. 139). ' +
            'Afecta directamente el volumen de lodos V_S y por tanto el V_diseño total.',
          minimum: 1,
          maximum: 10,
        },
        norm_code: {
          type: 'string',
          enum: ['ras', 'cte', 'epa', 'uk', 'asnzs'],
          description:
            'Código normativo. "ras" = Colombia (Res. 0330/2017, default). "cte" = España. "epa" = EE.UU.',
        },
        numero_compartimentos: {
          type: 'integer',
          enum: [2, 3],
          description: 'Número de cámaras de sedimentación. Por defecto: 2. Usar 3 para cargas altas (>10 h-e).',
        },
      },
      required: ['habitantes_equivalentes', 'tipo_uso'],
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Execution function (validation + call to pure function)
// ─────────────────────────────────────────────────────────────────────────

export interface ExecuteToolInput {
  habitantes_equivalentes?: number;
  tipo_uso?: string;
  dotacion_litros_hab_dia?: number;
  tiempo_retencion_dias?: number;
  coeficiente_retorno?: number;
  temperatura_agua_c?: number;
  intervalo_limpieza_anos?: number;
  norm_code?: string;
  numero_compartimentos?: number;
}

export async function executeCalculateSepticTank(input: ExecuteToolInput): Promise<SepticTankResult> {
  // Validate required fields
  if (input.habitantes_equivalentes === undefined || input.habitantes_equivalentes === null) {
    throw new Error('habitantes_equivalentes es requerido.');
  }

  if (!input.tipo_uso) {
    throw new Error('tipo_uso es requerido.');
  }

  // Validate tipo_uso enum
  const validTipos = [
    'vivienda_unifamiliar',
    'vivienda_colectiva',
    'restaurante',
    'hotel',
    'camping',
    'oficina',
    'industrial',
  ];
  if (!validTipos.includes(input.tipo_uso)) {
    throw new Error(
      `tipo_uso inválido: "${input.tipo_uso}". Opciones: ${validTipos.join(', ')}`
    );
  }

  // Validate numeric ranges
  if (typeof input.habitantes_equivalentes !== 'number' || input.habitantes_equivalentes < 1) {
    throw new Error('habitantes_equivalentes debe ser un número ≥ 1.');
  }

  if (input.habitantes_equivalentes > 500) {
    throw new Error('habitantes_equivalentes no debe exceder 500.');
  }

  if (input.dotacion_litros_hab_dia !== undefined) {
    if (typeof input.dotacion_litros_hab_dia !== 'number') {
      throw new Error('dotacion_litros_hab_dia debe ser un número.');
    }
    if (input.dotacion_litros_hab_dia < 50 || input.dotacion_litros_hab_dia > 500) {
      throw new Error('dotacion_litros_hab_dia debe estar entre 50 y 500 L/hab·día.');
    }
  }

  if (input.tiempo_retencion_dias !== undefined) {
    if (typeof input.tiempo_retencion_dias !== 'number') {
      throw new Error('tiempo_retencion_dias debe ser un número.');
    }
    if (input.tiempo_retencion_dias < 1 || input.tiempo_retencion_dias > 5) {
      throw new Error('tiempo_retencion_dias debe estar entre 1 y 5 días.');
    }
  }

  if (input.numero_compartimentos !== undefined) {
    if (![2, 3].includes(input.numero_compartimentos)) {
      throw new Error('numero_compartimentos debe ser 2 o 3.');
    }
  }

  // Validate new Phase 1 fields
  if (input.coeficiente_retorno !== undefined) {
    if (typeof input.coeficiente_retorno !== 'number' ||
        input.coeficiente_retorno < 0.5 || input.coeficiente_retorno > 1.0) {
      throw new Error('coeficiente_retorno debe estar entre 0.5 y 1.0.');
    }
  }

  if (input.temperatura_agua_c !== undefined) {
    if (typeof input.temperatura_agua_c !== 'number' ||
        input.temperatura_agua_c < 5 || input.temperatura_agua_c > 35) {
      throw new Error('temperatura_agua_c debe estar entre 5 y 35 °C.');
    }
  }

  if (input.intervalo_limpieza_anos !== undefined) {
    if (typeof input.intervalo_limpieza_anos !== 'number' ||
        input.intervalo_limpieza_anos < 1 || input.intervalo_limpieza_anos > 10) {
      throw new Error('intervalo_limpieza_anos debe estar entre 1 y 10 años.');
    }
  }

  // Call the pure calculation function
  const result = calculateSepticTank({
    habitantes_equivalentes: input.habitantes_equivalentes,
    tipo_uso: input.tipo_uso as
      | 'vivienda_unifamiliar'
      | 'vivienda_colectiva'
      | 'restaurante'
      | 'hotel'
      | 'camping'
      | 'oficina'
      | 'industrial',
    dotacion_litros_hab_dia: input.dotacion_litros_hab_dia,
    tiempo_retencion_dias: input.tiempo_retencion_dias,
    coeficiente_retorno: input.coeficiente_retorno,
    temperatura_agua_c: input.temperatura_agua_c,
    intervalo_limpieza_anos: input.intervalo_limpieza_anos,
    norm_code: input.norm_code,
    numero_compartimentos: input.numero_compartimentos as 2 | 3 | undefined,
  });

  return result;
}
