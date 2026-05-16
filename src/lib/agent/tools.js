// Tool definitions exposed to Hydro_Agent via Groq tool-use (OpenAI-compatible schema).

import { sizeSepticTank } from "@/src/lib/calc/septic";
import { evaluateSoilInfiltration, SOIL_KEYS } from "@/src/lib/calc/infiltration";

export const TOOL_DEFS = [
  {
    type: "function",
    function: {
      name: "size_septic_tank",
      description:
        "Dimensiona una fosa séptica según la normativa indicada (RAS Colombia, España CTE DB-HS 5, " +
        "Europa EN 12566, o EPA EE.UU.). Devuelve volumen líquido, lodos, natas, total, " +
        "dimensiones (L × W × profundidad), número de cámaras, SRT y verificaciones normativas. " +
        "Úsalo cuando el usuario pida un dimensionamiento concreto y haya dado al menos el número " +
        "de habitantes equivalentes. Si falta la norma o la temperatura, asume valores por defecto " +
        "razonables (esp / 18 °C) e indícalo en la respuesta.",
      parameters: {
        type: "object",
        properties: {
          users: {
            type: "number",
            description: "Habitantes equivalentes (personas). Requerido. Debe ser > 0.",
          },
          norm: {
            type: "string",
            enum: ["ras", "esp", "eu", "epa"],
            description:
              "Normativa: 'ras' (Colombia), 'esp' (España CTE DB-HS 5), 'eu' (EN 12566), " +
              "'epa' (EE.UU.). Por defecto 'esp'.",
          },
          temp_c: {
            type: "number",
            description: "Temperatura media ambiente en °C. Por defecto 18.",
          },
          dotacion_lpd: {
            type: "number",
            description:
              "Dotación per cápita en L/persona/día. Si se omite se usa la dotación por defecto " +
              "de la norma (esp: 160, ras: 120, eu: 150, epa: 190).",
          },
          return_coef: {
            type: "number",
            description: "Coeficiente de retorno de aguas residuales (0.75–0.85). Por defecto 0.80.",
          },
          clean_years: {
            type: "number",
            description: "Intervalo de limpieza de lodos en años. Por defecto 2.",
          },
          depth_m: {
            type: "number",
            description: "Profundidad útil de líquido en metros. Por defecto 1.5.",
          },
        },
        required: ["users"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "evaluate_soil_infiltration",
      description:
        "Dimensiona el campo de infiltración (zanjas filtrantes) para el efluente de una fosa séptica. " +
        "Devuelve la tasa hidráulica del suelo, el área de infiltración requerida (m²) y la longitud " +
        "total de zanjas (m) a un ancho dado. Usa esta herramienta cuando el usuario pregunte por el " +
        "campo de infiltración, zanjas filtrantes, pozos de absorción, área necesaria de terreno, o " +
        "qué pasa con suelos poco permeables. Puede invocarse antes o después de size_septic_tank: si " +
        "no tienes el caudal Qd, pásale 'users' (habitantes equivalentes) y se calcula. Si el usuario " +
        "ha hecho test de percolación in situ, usa soil_type='manual' y perc_test_min_per_cm.",
      parameters: {
        type: "object",
        properties: {
          Qd_m3_day: {
            type: "number",
            description:
              "Caudal diario de aguas residuales en m³/día. Si lo conoces (por ejemplo de un " +
              "size_septic_tank previo), pásalo directamente. Si no, omítelo y proporciona 'users'.",
          },
          users: {
            type: "number",
            description:
              "Habitantes equivalentes. Se usa para calcular Qd si Qd_m3_day no se proporciona.",
          },
          dotacion_lpd: {
            type: "number",
            description: "Dotación per cápita en L/persona/día. Por defecto 160.",
          },
          return_coef: {
            type: "number",
            description: "Coeficiente de retorno (0.75–0.85). Por defecto 0.80.",
          },
          soil_type: {
            type: "string",
            enum: [...SOIL_KEYS, "manual"],
            description:
              "Tipo de suelo. Opciones: 'gravel' (grava), 'sand' (arena), 'loamy_sand' (arena " +
              "limosa), 'sandy_loam' (limo arenoso), 'loam' (limo/franco), 'silty_clay' (arcilla " +
              "limosa), 'clay' (arcilla, no apta), o 'manual' si hay test de percolación in situ.",
          },
          perc_test_min_per_cm: {
            type: "number",
            description:
              "Resultado del test de percolación en minutos/cm. Requerido si soil_type='manual'. " +
              "Valores típicos: < 5 muy permeable, 5–18 apto, 18–30 marginal, > 30 no apto.",
          },
          trench_width_m: {
            type: "number",
            description: "Ancho de zanja en metros. Por defecto 0.6.",
          },
        },
        required: ["soil_type"],
      },
    },
  },
];

const EXECUTORS = {
  size_septic_tank:          (args) => sizeSepticTank(args),
  evaluate_soil_infiltration: (args) => evaluateSoilInfiltration(args),
};

/**
 * Run a tool call. Returns the JSON-serializable result (or error object).
 */
export function runTool(name, argsJson) {
  const exec = EXECUTORS[name];
  if (!exec) {
    return { ok: false, error: `Unknown tool: ${name}` };
  }
  let args = {};
  try {
    args = typeof argsJson === "string" ? JSON.parse(argsJson || "{}") : (argsJson || {});
  } catch (e) {
    return { ok: false, error: `Invalid JSON arguments: ${e?.message || e}` };
  }
  try {
    return exec(args);
  } catch (e) {
    return { ok: false, error: `Tool execution failed: ${e?.message || e}` };
  }
}
