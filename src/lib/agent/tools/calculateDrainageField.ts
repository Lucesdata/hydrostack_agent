/**
 * Tool definition for calculate_drainage_field in OpenAI format (Groq compatible).
 *
 * Fase 3 — Campo de drenaje mejorado:
 * - Perc test input (25mm descent or min/cm → Ka via Crites & Tchobanoglous)
 * - Evapotranspiration correction for high-altitude sites (Bogotá)
 * - Configurable safety factor FS (1.10–1.50)
 * - New system types: monticulo_filtrante, camara_infiltracion, campo_aspersion
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
**Qué hace:** Dimensiona el campo de infiltración que recibe el efluente de la fosa séptica. Calcula superficie neta y de diseño (con factor de seguridad), longitud de zanjas, número de zanjas y separación. Soporta 6 tipos de sistema.

**Novedades Fase 3:**
- Perc test ASTM D6391: acepta tiempo de descenso de 25 mm (minutos) → Ka vía Crites & Tchobanoglous
- Corrección por evapotranspiración para altiplanos fríos (Bogotá ~3.5 mm/día)
- Factor de seguridad configurable (1.10–1.50, default 1.20)
- Tipos de sistema: zanjas_filtrantes, lecho_filtrante, pozo_filtrante, monticulo_filtrante, camara_infiltracion, campo_aspersion

**Cuándo USAR:**
- DESPUÉS de calculate_septic_tank, usando su output \`caudal_diario_litros\` como \`caudal_diario_l\`.
- Cuando el usuario menciona "drenaje", "infiltración", "zanjas", "campo de drenaje", "perc test", "prueba de percolación", "montículo", "cámara de infiltración".
- Cuando se dispone de perc test (tiempo 25 mm) O permeabilidad K (m/día).

**Jerarquía de Ka:**
1. \`tiempo_descenso_25mm_min\` (preferido) → Ka = 70/√(T_perc) [Crites & Tchobanoglous]
2. \`permeabilidad_suelo_m_dia\` → Ka estimado de K
3. Sin datos → Ka conservador = 15 L/m²·día con aviso

**Cuándo NO USAR:**
- Si solo se pide dimensionar la fosa séptica (usar calculate_septic_tank).
- Si el usuario pregunta por temas normativos sin datos concretos.
`,
    parameters: {
      type: 'object',
      properties: {
        caudal_diario_l: {
          type: 'number',
          description:
            'Caudal diario en litros/día. Típicamente el campo "caudal_diario_litros" del output de calculate_septic_tank.',
          minimum: 100,
          maximum: 100000,
        },
        permeabilidad_suelo_m_dia: {
          type: 'number',
          description:
            'Permeabilidad del suelo K en m/día (del estudio de suelo). Conversión: 1 m/día ≈ 1.16×10⁻⁵ m/s. ' +
            'Opcional si se proporciona tiempo_descenso_25mm_min.',
          minimum: 0.001,
          maximum: 1000,
        },
        tiempo_descenso_25mm_min: {
          type: 'number',
          description:
            'Prueba de percolación ASTM D6391: tiempo en minutos para que el agua descienda 25 mm en el hoyo. ' +
            'Rango válido: 2.5–75 min (T_perc = tiempo/2.5 → Ka = 70/√T_perc). ' +
            'Si es < 2.5 min → suelo muy rápido (aviso). Si es > 75 min → suelo no apto (bloqueante). ' +
            'Cuando se proporciona, tiene prioridad sobre permeabilidad_suelo_m_dia para Ka.',
          minimum: 0.5,
          maximum: 200,
        },
        etp_media_mm_dia: {
          type: 'number',
          description:
            'Evapotranspiración media diaria del sitio (mm/día). Reduce Ka efectiva hasta un 20%. ' +
            'Usar para Bogotá (~3.5), Medellín (~4.2), Cali (~5.0), costa (~7.0). ' +
            'Opcional; si se omite, no se aplica corrección.',
          minimum: 0.5,
          maximum: 12,
        },
        factor_seguridad: {
          type: 'number',
          description:
            'Factor de seguridad aplicado al área de infiltración. A_diseño = A_neta × FS. ' +
            'Default 1.20 (RAS 2017 Art. 135). Rango: 1.10 (suelo muy bien caracterizado) a 1.50 (suelo marginal o un solo ensayo).',
          minimum: 1.10,
          maximum: 1.50,
        },
        tipo_sistema: {
          type: 'string',
          enum: [
            'zanjas_filtrantes',
            'lecho_filtrante',
            'pozo_filtrante',
            'monticulo_filtrante',
            'camara_infiltracion',
            'campo_aspersion',
          ],
          description:
            'Tipo de sistema de infiltración. Si se omite, se auto-selecciona: ' +
            'zanjas (K media, N.F. > 1.5 m), lecho (K alta), montículo (N.F. < 1.5 m o T_perc > 20 min/cm), ' +
            'cámara (alternativa eficiente sin grava), aspersión (solo con tratamiento secundario y permiso).',
        },
        nivel_freatico_m: {
          type: 'number',
          description:
            'Profundidad del nivel freático desde la superficie (metros). Mínimo 1.0 m bajo el fondo del sistema. ' +
            'Si < 1.5 m, se recomienda montículo filtrante.',
          minimum: 0,
          maximum: 50,
        },
        distancia_pozo_agua_m: {
          type: 'number',
          description:
            'Distancia a pozo o captación de agua (metros). Mínimo 30 m (Res. 0330/2017 Art. 143).',
          minimum: 0,
          maximum: 1000,
        },
      },
      required: ['caudal_diario_l'],
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Execution function (validation + call to pure function)
// ─────────────────────────────────────────────────────────────────────────

export interface ExecuteDrainageFieldInput {
  caudal_diario_l?: number;
  permeabilidad_suelo_m_dia?: number;
  tiempo_descenso_25mm_min?: number;
  etp_media_mm_dia?: number;
  factor_seguridad?: number;
  tipo_sistema?: string;
  nivel_freatico_m?: number;
  distancia_pozo_agua_m?: number;
}

const VALID_TIPOS = [
  'zanjas_filtrantes',
  'lecho_filtrante',
  'pozo_filtrante',
  'monticulo_filtrante',
  'camara_infiltracion',
  'campo_aspersion',
];

export async function executeCalculateDrainageField(
  input: ExecuteDrainageFieldInput
): Promise<DrainageFieldResult> {
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
    input.permeabilidad_suelo_m_dia !== undefined &&
    (typeof input.permeabilidad_suelo_m_dia !== 'number' || input.permeabilidad_suelo_m_dia <= 0)
  ) {
    throw new Error('permeabilidad_suelo_m_dia debe ser un número > 0.');
  }

  if (
    input.tiempo_descenso_25mm_min !== undefined &&
    (typeof input.tiempo_descenso_25mm_min !== 'number' || input.tiempo_descenso_25mm_min <= 0)
  ) {
    throw new Error('tiempo_descenso_25mm_min debe ser un número > 0.');
  }

  if (
    input.etp_media_mm_dia !== undefined &&
    (typeof input.etp_media_mm_dia !== 'number' || input.etp_media_mm_dia <= 0)
  ) {
    throw new Error('etp_media_mm_dia debe ser un número > 0.');
  }

  if (
    input.factor_seguridad !== undefined &&
    (typeof input.factor_seguridad !== 'number' ||
      input.factor_seguridad < 1.10 ||
      input.factor_seguridad > 1.50)
  ) {
    throw new Error('factor_seguridad debe estar entre 1.10 y 1.50.');
  }

  if (input.tipo_sistema !== undefined && !VALID_TIPOS.includes(input.tipo_sistema)) {
    throw new Error(`tipo_sistema inválido. Opciones: ${VALID_TIPOS.join(', ')}`);
  }

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
    tiempo_descenso_25mm_min: input.tiempo_descenso_25mm_min,
    etp_media_mm_dia: input.etp_media_mm_dia,
    factor_seguridad: input.factor_seguridad,
    tipo_sistema: input.tipo_sistema as DrainageFieldInput['tipo_sistema'],
    nivel_freatico_m: input.nivel_freatico_m,
    distancia_pozo_agua_m: input.distancia_pozo_agua_m,
  });

  return result;
}
