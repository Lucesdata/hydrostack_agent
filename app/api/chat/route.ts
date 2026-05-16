import { readFile } from "fs/promises";
import { join } from "path";
import { suggestNextQuestions } from "@/src/lib/agent/filter"
import type { FormState } from "@/src/lib/agent/filter"
import { TOOL_DEFS, runTool } from "@/src/lib/agent/tools";

export const runtime = "nodejs";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL   = "llama-3.1-8b-instant";
const MAX_TOOL_ROUNDS = 3; // safety: max recursive tool-use rounds (fosa → infiltración → texto final)

const SYSTEM_PROMPT = `Eres HydroStack Assistant, un ingeniero sanitario e hidráulico especializado
en sistemas individuales de tratamiento de aguas residuales (SITARD): fosas
sépticas, zanjas filtrantes, pozos de absorción y saneamiento autónomo.

## ROL Y TONO
- Adapta tu nivel técnico al usuario: si es ingeniero usa terminología
  profesional; si es particular explica sin tecnicismos innecesarios.
- Sé directo y conciso. No repitas información ya dada en la conversación.
- Haz una sola pregunta a la vez, la más importante primero.

## HERRAMIENTAS (TOOL USE)
Tienes acceso a estas herramientas. Úsalas cuando el usuario pida un
dimensionamiento concreto en lugar de calcular a mano.

**\`size_septic_tank\`** — dimensiona la fosa séptica (volúmenes, dimensiones,
SRT, cámaras) según RAS Colombia, España (CTE DB-HS 5), Europa (EN 12566) o
EPA (EE.UU.).
- Úsala cuando el usuario pida un dimensionamiento de fosa y haya dado al
  menos el número de habitantes equivalentes.
- Si faltan parámetros, asume valores por defecto razonables (norm='esp',
  temp_c=18, return_coef=0.80, clean_years=2, depth_m=1.5) y dilo en la respuesta.

**\`evaluate_soil_infiltration\`** — dimensiona el campo de infiltración
(zanjas filtrantes) que recibe el efluente de la fosa.
- Úsala cuando el usuario pregunte por el área de terreno necesaria, zanjas
  filtrantes, pozo de absorción, o el efecto de la permeabilidad del suelo.
- Si tienes Qd de una llamada previa a size_septic_tank, pásalo directo.
  Si no, pasa 'users' y se estima el caudal.
- Si el usuario hizo test de percolación in situ, usa soil_type='manual'
  con perc_test_min_per_cm. Si el usuario describe el suelo con palabras
  (grava, arena, arcilla...), elige la clave más cercana del enum.
- Si soil_type='clay' o perc_test > 30 min/cm, el suelo NO es apto y la
  herramienta devolverá recomendaciones de alternativas (filtro de arena,
  humedal, vertido controlado). Comunícalo claramente al usuario.

**Reglas comunes**:
- Puedes invocar varias herramientas en secuencia (por ejemplo, dimensionar
  fosa → evaluar infiltración) si el usuario lo pide en un mismo mensaje.
- Tras recibir el resultado, NO repitas la tabla numérica completa — el
  usuario ya la ve renderizada. Interpreta los resultados: explica qué
  significan, señala verificaciones y advertencias, y sugiere siguientes pasos.

## CATÁLOGO DE PREGUNTAS AUTORIZADAS
Tienes acceso a un catálogo de preguntas validadas organizadas en 5 rutas:
- **normativa**: Normas, requisitos mínimos, T_r, separaciones
- **dimensionado**: Volumen, sensibilidad a parámetros
- **suelo**: Permeabilidad, idoneidad, alternativas
- **materiales**: Prefabricado vs in-situ, diámetros, ventilación
- **mantenimiento**: Vaciado, signos de fallo, inspección

## FLUJO CON CATÁLOGO
1. Si tienes datos del usuario (FormState), consulta qué preguntas sugerir
2. Ofrece las preguntas relevantes del catálogo después de tu respuesta
3. Responde SOLO preguntas que estén en el catálogo
4. Si pregunta no está en catálogo, sugiere alternativas del catálogo
5. Usa datos reales del cálculo para personalizar respuestas

## NORMATIVA
Se ha inyectado documentación normativa según la ubicación del usuario.
- Aplica únicamente los criterios del documento inyectado.
- Si no hay normativa inyectada, pregunta la ubicación del usuario.
- Cuando una recomendación dependa de la normativa local, indícalo explícitamente.

## DOTACIONES POR DEFECTO
- Vivienda continua, zona urbana   → 200 L/hab·día
- Vivienda continua, zona rural    → 150 L/hab·día
- Uso estacional o vacacional      → 100 L/hab·día
Indica siempre qué valor usas y por qué.

## FORMATO DE RESPUESTA
- Usa tablas para dimensiones y resultados
- Incluye siempre las unidades
- Estructura: datos de entrada → criterio aplicado → resultado
- Para construida vs. prefabricada: presenta comparativa breve
- Idioma: responde en el idioma del usuario (español por defecto)`;

type ChatMessage = {
  role: string;
  content: string | null;
  tool_call_id?: string;
  tool_calls?: any[];
  name?: string;
};

interface ChatRequest {
  messages: ChatMessage[];
  formState?: FormState;
}

function detectLocation(text: string): string {
  const locationMap: Record<string, string> = {
    españa: "cte-hs5",
    spanish: "cte-hs5",
    madrid: "cte-hs5",
    barcelona: "cte-hs5",
    colombia: "ras-2000",
    bogotá: "ras-2000",
    bogota: "ras-2000",
    medellín: "ras-2000",
    medellin: "ras-2000",
    eeuu: "epa-onsite",
    usa: "epa-onsite",
    "united states": "epa-onsite",
    texas: "epa-onsite",
    california: "epa-onsite",
    florida: "epa-onsite",
  };

  const lowerText = text.toLowerCase();
  for (const [keyword, norm] of Object.entries(locationMap)) {
    if (lowerText.includes(keyword)) return norm;
  }
  return "";
}

async function getNormativaMD(ubicacion: string): Promise<string> {
  if (!ubicacion) return "";
  try {
    const map: Record<string, string> = {
      "cte-hs5": "docs/normativa/cte-hs5.md",
      "ras-2000": "docs/normativa/ras-2000.md",
      "epa-onsite": "docs/normativa/epa-onsite.md",
    };
    const path = map[ubicacion];
    if (!path) return "";
    const fullPath = join(process.cwd(), path);
    return await readFile(fullPath, "utf-8");
  } catch {
    return "";
  }
}

async function getCatalogSuggestions(formState: FormState | undefined): Promise<string> {
  if (!formState) return "";
  try {
    const suggestions = suggestNextQuestions(formState);
    if (suggestions.length === 0) return "";
    return `\n\n[PREGUNTAS RELEVANTES DEL CATÁLOGO PARA TU CASO]\nPuede que también te interese:\n${
      suggestions.map((q, i) => `${i + 1}. ${q.text}`).join('\n')
    }`;
  } catch {
    return "";
  }
}

/**
 * Stream one round of Groq completion. If the model returns tool_calls,
 * recursively run them and stream the follow-up. Returns when the model
 * finishes with stop / length.
 */
async function streamRound(
  messages: ChatMessage[],
  send: (data: string) => void,
  depth: number,
): Promise<void> {
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      stream: true,
      max_tokens: 2048,
      tools: TOOL_DEFS,
      tool_choice: depth >= MAX_TOOL_ROUNDS ? "none" : "auto",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    send(JSON.stringify({ type: "error", error: err }));
    return;
  }

  const reader  = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finishReason: string | null = null;
  const toolCalls: any[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      if (!part.startsWith("data: ")) continue;
      const raw = part.slice(6).trim();
      if (raw === "[DONE]") continue;

      try {
        const chunk  = JSON.parse(raw);
        const choice = chunk.choices?.[0];
        const delta  = choice?.delta;

        if (delta?.content) {
          send(JSON.stringify({
            type:  "content_block_delta",
            delta: { type: "text_delta", text: delta.content },
          }));
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCalls[idx]) {
              toolCalls[idx] = {
                id:   tc.id ?? `call_${idx}`,
                type: "function",
                function: { name: "", arguments: "" },
              };
            }
            if (tc.id)                  toolCalls[idx].id = tc.id;
            if (tc.function?.name)      toolCalls[idx].function.name      = tc.function.name;
            if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments;
          }
        }

        if (choice?.finish_reason) finishReason = choice.finish_reason;
      } catch { /* skip malformed chunk */ }
    }
  }

  if (finishReason === "tool_calls" && toolCalls.length > 0 && depth < MAX_TOOL_ROUNDS) {
    const assistantMsg: ChatMessage = {
      role: "assistant",
      content: null,
      tool_calls: toolCalls,
    };

    const toolMsgs: ChatMessage[] = toolCalls.map(tc => {
      const result = runTool(tc.function.name, tc.function.arguments);
      let parsedArgs: any = {};
      try { parsedArgs = JSON.parse(tc.function.arguments || "{}"); } catch { /* keep raw */ }

      // Emit custom event so the UI can render a structured calculation card.
      send(JSON.stringify({
        type:   "tool_result",
        tool:   tc.function.name,
        args:   parsedArgs,
        result,
      }));

      return {
        role: "tool",
        tool_call_id: tc.id,
        name: tc.function.name,
        content: JSON.stringify(result),
      };
    });

    await streamRound([...messages, assistantMsg, ...toolMsgs], send, depth + 1);
  }
}

export async function POST(req: Request) {
  const { messages, formState }: ChatRequest = await req.json();

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data: string) =>
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));

      try {
        const lastMessage   = messages[messages.length - 1]?.content || "";
        const locationKey   = detectLocation(lastMessage);
        const normativaMD   = await getNormativaMD(locationKey);
        const catalogSuggs  = await getCatalogSuggestions(formState);

        const contextMessages: ChatMessage[] = [];
        if (normativaMD) {
          contextMessages.push({
            role: "user",
            content: `[CONTEXTO NORMATIVO]\n${normativaMD}`,
          });
          contextMessages.push({
            role: "assistant",
            content: "Normativa cargada. Listo para dimensionar según criterios locales.",
          });
        }

        if (formState && formState.calculated) {
          contextMessages.push({
            role: "user",
            content: `[DATOS DE TU CÁLCULO]\nUsuarios: ${formState.users}, Normativa: ${formState.normKey}, Temperatura: ${formState.temp}°C, Suelo: ${formState.soilPermeability}, Profundidad: ${formState.depth}m, Calculado: Sí`,
          });
          contextMessages.push({
            role: "assistant",
            content: "Datos del cálculo recibidos. Responderé basándome en estos parámetros.",
          });
        }

        const initialMessages: ChatMessage[] = [
          { role: "system", content: SYSTEM_PROMPT },
          ...contextMessages,
          ...messages.map(({ role, content }: ChatMessage) => ({ role, content })),
        ];

        await streamRound(initialMessages, send, 0);

        if (catalogSuggs) {
          send(JSON.stringify({
            type:  "content_block_delta",
            delta: { type: "text_delta", text: catalogSuggs },
          }));
        }

        send("[DONE]");
      } catch (err: any) {
        send(JSON.stringify({ type: "error", error: err?.message ?? "Error de API" }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
