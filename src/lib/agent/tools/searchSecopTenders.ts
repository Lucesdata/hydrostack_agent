/**
 * Tool del Hydro_Agent:  search_secop_tenders
 *
 * Permite al agente consultar licitaciones / contratos del sector agua en
 * Colombia (SECOP II) y resumir oportunidades. Reutiliza el mismo client.ts
 * que la UI de /licitaciones, así que comparten lógica, filtros y normalización.
 *
 * Formato: OpenAI tool-call (el repo usa Groq llama-3.3-70b-versatile), NO
 * Anthropic. El registro ocurre en src/lib/agent/tools/index.ts.
 */

import { searchProcesos, searchContratos } from '@/src/lib/secop/client';
import type { SecopQuery } from '@/src/lib/secop/types';

// ─────────────────────────────────────────────────────────────────────────
// Tool definition (formato OpenAI / Groq)
// ─────────────────────────────────────────────────────────────────────────

export const searchSecopTendersTool = {
  type: 'function',
  function: {
    name: 'search_secop_tenders',
    description:
      "Consulta licitaciones/contratos del sector agua y saneamiento en Colombia (SECOP II). " +
      "Úsala cuando el usuario pregunte por oportunidades, procesos adjudicados o por adjudicar, " +
      "contratación de acueducto/alcantarillado/PTAP/PTAR. Filtra agua por defecto. " +
      "NO la uses para diseño técnico ni preguntas conceptuales.",
    parameters: {
      type: 'object',
      properties: {
        tipo: {
          type: 'string',
          enum: ['procesos', 'contratos'],
          description:
            "'procesos' = licitaciones (incluye adjudicados y por adjudicar). " +
            "'contratos' = contratos ya formalizados. Por defecto 'procesos'.",
        },
        q: {
          type: 'string',
          description:
            'Texto libre para afinar (p.ej. nombre de municipio, "planta de tratamiento", una entidad concreta).',
        },
        departamento: {
          type: 'string',
          description: "Departamento en MAYÚSCULAS, p.ej. 'VALLE DEL CAUCA', 'ANTIOQUIA', 'CUNDINAMARCA'.",
        },
        estado: {
          type: 'string',
          description:
            "Estado del proceso, p.ej. 'Adjudicado', 'Convocado', 'En evaluación y selección', 'Celebrado', 'Desierto', 'Cancelado'. Solo aplica a tipo='procesos'.",
        },
        valorMin: {
          type: 'number',
          description: 'Valor mínimo en pesos colombianos (COP). Ejemplo: 100000000 para filtrar a partir de 100 millones.',
          minimum: 0,
        },
        desde: {
          type: 'string',
          description: 'Fecha mínima de publicación, formato YYYY-MM-DD.',
        },
        pageSize: {
          type: 'number',
          description: 'Número de resultados a devolver (máx 100, recomendado 10–25).',
          minimum: 1,
          maximum: 100,
        },
      },
      required: [],
    },
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────
// Executor
// ─────────────────────────────────────────────────────────────────────────

export interface ExecuteSearchSecopTendersInput extends SecopQuery {
  tipo?: 'procesos' | 'contratos';
}

/**
 * Ejecuta la búsqueda y devuelve un payload compacto para el modelo
 * (lo justo para razonar sin saturar el contexto).
 */
export async function executeSearchSecopTenders(
  input: ExecuteSearchSecopTendersInput,
) {
  const { tipo = 'procesos', ...query } = input;
  // El agente opera por defecto en sector agua; el caller puede sobreescribir
  // pasando soloAgua=false explícitamente.
  // pageSize: 5 mantiene el payload bajo el TPM de Groq (free tier) en round 1.
  const q: SecopQuery = { soloAgua: true, pageSize: 5, ...query };

  const result =
    tipo === 'contratos'
      ? await searchContratos(q)
      : await searchProcesos(q);

  return {
    tipo,
    encontrados: result.items.length,
    resultados: result.items.map((it) => {
      const isProceso = 'nombre' in it;
      return {
        entidad: it.entidad,
        objeto: (isProceso ? it.nombre : it.objeto).slice(0, 160),
        ubicacion: [it.departamento, it.ciudad].filter(Boolean).join(' · '),
        estado: it.estado,
        valorCOP: isProceso
          ? (it.valorAdjudicacion ?? it.precioBase ?? null)
          : (it.valor ?? null),
        enlace: it.url,
      };
    }),
  };
}
