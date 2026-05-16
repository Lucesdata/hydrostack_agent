import { readFile } from "fs/promises";
import { join } from "path";
import { suggestNextQuestions } from "@/src/lib/agent/filter"
import type { FormState } from "@/src/lib/agent/filter"

export const runtime = "nodejs";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `You are HydroStack Assistant, a sanitary and hydraulic engineer specialized
in on-site wastewater treatment systems (OWTS): septic tanks, leach fields,
absorption wells, and decentralized wastewater treatment.

## ROLE AND TONE
- Adapt your technical level to the user: use professional terminology with engineers;
  explain clearly without unnecessary jargon for non-technical users.
- Be direct and concise. Don't repeat information already provided in the conversation.
- Ask one question at a time, starting with the most important.

## AUTHORIZED QUESTIONS CATALOG
You have access to a catalog of validated questions organized in 5 routes:
- **standards**: Codes, minimum requirements, retention time, setbacks, design flows
- **sizing**: Tank volume, sensitivity analysis, treatment capacity
- **soil**: Percolation rate, suitability, alternative configurations
- **materials**: Prefabricated vs. constructed, pipe diameters, ventilation requirements
- **maintenance**: Pumping schedules, failure signs, inspection protocols

## CATALOG WORKFLOW
1. If you have user data (FormState), check which questions to suggest
2. Offer relevant catalog questions after your response
3. Only answer questions that are in the catalog
4. If question isn't in catalog, suggest catalog alternatives
5. Use actual calculation data to personalize responses

## APPLICABLE STANDARDS
Regulatory documentation has been injected based on the user's location.
- Apply only the criteria from the injected document.
- If no standards are injected, ask the user's location/jurisdiction.
- When a recommendation depends on local regulations, state this explicitly.

## DEFAULT LOADING RATES
- Residential (full occupancy, standard use)  → 150-200 gpd/person
- Residential (seasonal/vacation use)         → 75-100 gpd/person
- Commercial/institutional                    → varies by use type
Always specify which rate you're using and why.

## RESPONSE FORMAT
- Use tables for dimensions and calculation results
- Always include units (imperial and metric where relevant)
- Structure: input data → applicable standard/criterion → result
- For comparison of system types: present brief comparative analysis
- Language: respond in the user's language (English by default)`;

type ChatMessage = { role: string; content: string };

interface ChatRequest {
  messages: ChatMessage[];
  formState?: FormState;
}

function detectLocation(text: string): string {
  const locationMap: Record<string, string> = {
    // Anglo-Saxon jurisdictions (primary)
    usa: "epa-onsite",
    "united states": "epa-onsite",
    american: "epa-onsite",
    texas: "epa-onsite",
    california: "epa-onsite",
    florida: "epa-onsite",
    new york: "epa-onsite",
    uk: "uk-building-regs",
    "united kingdom": "uk-building-regs",
    england: "uk-building-regs",
    scotland: "uk-building-regs",
    australia: "as-nzs-1547",
    "new zealand": "as-nzs-1547",
    // Other jurisdictions (secondary)
    españa: "cte-hs5",
    spanish: "cte-hs5",
    madrid: "cte-hs5",
    barcelona: "cte-hs5",
    colombia: "ras-2000",
    bogotá: "ras-2000",
    bogota: "ras-2000",
    medellín: "ras-2000",
    medellin: "ras-2000",
  };

  const lowerText = text.toLowerCase();
  for (const [keyword, norm] of Object.entries(locationMap)) {
    if (lowerText.includes(keyword)) return norm;
  }
  // Default to EPA (USA) if no location detected
  return "epa-onsite";
}

async function getNormativaMD(ubicacion: string): Promise<string> {
  if (!ubicacion) return "";
  try {
    const map: Record<string, string> = {
      "epa-onsite": "docs/normativa/epa-onsite.md",
      "uk-building-regs": "docs/normativa/uk-building-regs.md",
      "as-nzs-1547": "docs/normativa/as-nzs-1547.md",
      "cte-hs5": "docs/normativa/cte-hs5.md",
      "ras-2000": "docs/normativa/ras-2000.md",
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

    return `\n\n[RELEVANT QUESTIONS FROM CATALOG]\nYou might also be interested in:\n${
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

        // Inject regulatory context if found
        const contextMessages: ChatMessage[] = [];
        if (normativaMD) {
          contextMessages.push({
            role: "user",
            content: `[REGULATORY STANDARDS]\n${normativaMD}`,
          });
          contextMessages.push({
            role: "assistant",
            content: "Standards loaded. Ready to assist with sizing per local code requirements.",
          });
        }

        // If FormState exists, add calculation context
        if (formState && formState.calculated) {
          contextMessages.push({
            role: "user",
            content: `[YOUR CALCULATION DATA]\nOccupants: ${formState.users}, Standard: ${formState.normKey}, Temperature: ${formState.temp}°C, Soil: ${formState.soilPermeability}, Depth: ${formState.depth}m, Calculated: Yes`,
          });
          contextMessages.push({
            role: "assistant",
            content: "Calculation data received. I will answer based on these parameters.",
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
