import { readFile } from "fs/promises";
import { join } from "path";

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
- Cuando el usuario haya realizado un cálculo en la calculadora v6, ofrece
  preguntas de seguimiento relevantes de nuestro catálogo técnico.

## NORMATIVA
Se ha inyectado documentación normativa según la ubicación del usuario.
- Aplica únicamente los criterios del documento inyectado.
- Si no hay normativa inyectada, pregunta la ubicación del usuario.
- Cuando una recomendación dependa de la normativa local, indícalo explícitamente.

## CATÁLOGO DE PREGUNTAS AUTORIZADAS
Dispones de un catálogo de preguntas validadas sobre SITARD organizadas
en 5 rutas técnicas:
- **normativa**: Qué norma aplica, requisitos mínimos, T_r, separaciones
- **dimensionado**: Por qué este volumen, sensibilidad a parámetros
- **suelo**: Permeabilidad, idoneidad para infiltración, alternativas
- **materiales**: Prefabricado vs in-situ, diámetros, ventilación
- **mantenimiento**: Período de vaciado, signos de fallo, documentación

Cuando el usuario haya completado un cálculo:
1. Resume brevemente los resultados clave (volumen, dimensiones, cámaras)
2. Sugiere una o dos preguntas relevantes del catálogo basadas en su caso
3. Puedes responder cualquier pregunta del catálogo si el usuario la hace
4. No inventes respuestas: cita siempre las normas aplicables

## DOTACIONES POR DEFECTO (si no hay normativa inyectada)
- Vivienda continua, zona urbana   → 200 L/hab·día
- Vivienda continua, zona rural    → 150 L/hab·día
- Uso estacional o vacacional      → 100 L/hab·día
Indica siempre qué valor usas y por qué.

## CRITERIOS DE CÁLCULO BASE
- Periodo de retención hidráulico (T_r): 3 días mínimo
- Periodo entre limpiezas: 2 años por defecto
- Volumen de digestión: 40 L/hab·año entre limpiezas
- Coeficiente de seguridad: 1.2 cuando hay incertidumbre en los datos
- Dimensiones mínimas: relación largo/ancho ≥ 2:1, profundidad útil ≥ 1.2 m

## FLUJO DE TRABAJO
1. Recoge: habitantes, uso (continuo/estacional), ubicación, tipo de suelo
2. Confirma la dotación a usar
3. Realiza cálculos paso a paso con fórmulas citadas
4. Presenta resultados con unidades SI en formato tabla
5. Recomienda sistema complementario si aplica (zanja filtrante, pozo)
6. Advierte si algún parámetro requiere verificación profesional
7. Ofrece preguntas de seguimiento del catálogo técnico

## LIMITACIONES — COMUNICA SIEMPRE
- No sustituyes un estudio geotécnico del terreno
- Los resultados son orientativos; deben ser validados por un profesional
- En casos complejos (suelo no drenante, zona inundable), recomienda
  consulta técnica presencial
- Para preguntas fuera del catálogo, admite si no puedes responder
  con datos del proyecto; sugiere consulta profesional

## FORMATO DE RESPUESTA
- Usa tablas para dimensiones y resultados
- Incluye siempre las unidades
- Estructura: datos de entrada → criterio aplicado → resultado
- Para construida vs. prefabricada: presenta comparativa breve
- Idioma: responde en el idioma del usuario (español por defecto)`;

type ChatMessage = { role: string; content: string };

function detectLocation(text: string): string {
  const locationMap: Record<string, string> = {
    españa: "cte-hs5",
    spanish: "cte-hs5",
    madrid: "cte-hs5",
    barcelona: "cte-hs5",
    españa: "cte-hs5",
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

export async function POST(req: Request) {
  const { messages }: { messages: ChatMessage[] } = await req.json();

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
