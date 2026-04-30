import { readFile } from "fs/promises";
import { join } from "path";
import { suggestNextQuestions } from "@/src/lib/agent/filter"
import type { FormState } from "@/src/lib/agent/filter"

export const runtime = "nodejs";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `Eres HydroStack Assistant, un ingeniero sanitario e hidráulico especializado
en sistemas individuales de tratamiento de aguas residuales (SITARD): fosas
sépticas, zanjas filtrantes, pozos de absorción y saneamiento autónomo.

## ROL Y TONO
- Adapta tu nivel técnico al usuario: si es ingeniero usa terminología
  profesional; si es particular explica sin tecnicismos innecesarios.
- Sé directo y conciso. No repitas información ya dada en la conversación.
- Haz una sola pregunta a la vez, la más importante primero.

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

type ChatMessage = { role: string; content: string };

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
      suggestions
        .map((q, i) => `${i + 1}. ${q.text}`)
        .join('\n')
    }`;
  } catch {
    return "";
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
        // Detectar ubicación y cargar normativa
        const lastMessage = messages[messages.length - 1]?.content || "";
        const locationKey = detectLocation(lastMessage);
        const normativaMD = await getNormativaMD(locationKey);

        // Obtener sugerencias del catálogo basadas en FormState
        const catalogSuggestions = await getCatalogSuggestions(formState);

        // Inyectar contexto normativo si se encontró
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

        // Si hay FormState, añadir contexto del cálculo
        if (formState && formState.calculated) {
          contextMessages.push({
            role: "user",
            content: `[DATOS DE TU CÁLCULO]\nUsuarios: ${formState.users}, Normativa: ${formState.normKey}, Temperatura: ${formState.temp}°C, Suelo: ${formState.soilPermeability}, Profundidad: ${formState.depth}m, Calculado: Sí`,
          });
          contextMessages.push({
            role: "assistant",
            content: "Datos del cálculo recibidos. Respondereré basándome en estos parámetros.",
          });
        }

        const res = await fetch(GROQ_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              ...contextMessages,
              ...messages.map(({ role, content }: ChatMessage) => ({ role, content })),
            ],
            stream: true,
            max_tokens: 2048,
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          send(JSON.stringify({ type: "error", error: err }));
          controller.close();
          return;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

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
              const chunk = JSON.parse(raw);
              const text = chunk.choices?.[0]?.delta?.content;
              if (text) {
                send(
                  JSON.stringify({
                    type: "content_block_delta",
                    delta: { type: "text_delta", text },
                  })
                );
              }
            } catch {
              // skip malformed chunk
            }
          }
        }

        // Enviar sugerencias del catálogo al final
        if (catalogSuggestions) {
          send(
            JSON.stringify({
              type: "content_block_delta",
              delta: { type: "text_delta", text: catalogSuggestions },
            })
          );
        }

        send("[DONE]");
      } catch (err: any) {
        send(JSON.stringify({ type: "error", error: err.message ?? "Error de API" }));
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
