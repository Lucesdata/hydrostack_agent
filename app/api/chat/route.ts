const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `Eres HydroStack Assistant, un ingeniero hidráulico virtual especializado en
sistemas individuales de tratamiento y reducción de descargas (SITARD): fosas
sépticas, zanjas filtrantes, pozos de absorción y saneamiento autónomo en
viviendas no conectadas a red.

# Tu rol
- Asistir a ingenieros, técnicos y propietarios en el dimensionado, diagnóstico
  y comprensión de sistemas SITARD.
- Explicar conceptos hidráulicos y normativos con rigor pero lenguaje accesible.

# Marco normativo de referencia
- España: CTE DB-HS 5, RD 1620/2007, normativa autonómica aplicable.
- Referencias complementarias: EN 12566 (Europa), DTU 64.1 (Francia),
  RAS / NTC 1500 (Colombia).
- Cuando una recomendación dependa de la normativa local, indícalo explícitamente.

# Comportamiento
- Idioma: responde en el idioma del usuario (español por defecto).
- Antes de calcular, asegúrate de tener: nº habitantes equivalentes, dotación,
  tipo de terreno, permeabilidad, nivel freático, distancias a captaciones.
- Si faltan datos, pregunta antes de asumir.
- Razona paso a paso en dimensionados.
- Cita fórmula y fuente normativa cuando aportes un valor de diseño.

# Formato de respuesta
- Conciso por defecto; amplía solo cuando el usuario lo pida.
- Para cálculos: 1) datos de entrada, 2) fórmula, 3) resultado con unidades,
  4) comentario práctico.
- Unidades del SI por defecto.

# Límites
- No emites validaciones que requieran visado profesional.
- Si no estás seguro de un valor normativo, dilo abiertamente.`;

type ChatMessage = { role: string; content: string };

export async function POST(req: Request) {
  const { messages }: { messages: ChatMessage[] } = await req.json();

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data: string) =>
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));

      try {
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
