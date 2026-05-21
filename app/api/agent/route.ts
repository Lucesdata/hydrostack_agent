import { readFile } from "fs/promises";
import { join } from "path";
import { suggestNextQuestions } from "@/src/lib/agent/filter"
import type { FormState } from "@/src/lib/agent/filter"
import { tools, executeTool } from "@/src/lib/agent/tools";
import { detectSubscenario } from "@/src/lib/agent/subscenario-detector";

export const runtime = "nodejs";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
// llama-3.3-70b-versatile respects the OpenAI tool-calls protocol reliably.
// llama-3.1-8b-instant emits tool calls as pseudo-XML text instead of structured
// tool_calls, which breaks the streaming flow.
const GROQ_MODEL   = "llama-3.3-70b-versatile";
const MAX_TOOL_ROUNDS     = 6;    // allows chaining the 4 modular tools (tank → drainage → validation → PDF)
const MAX_TOKENS_ROUND0   = 700;  // input round; bigger budget for the initial reasoning
const MAX_TOKENS_FOLLOWUP = 500;  // post-tool round; summarises results across the tool chain
const MAX_NORMATIVA_CHARS = 2200; // ~550 tokens — keeps total request under Groq free-tier TPM

function getSystemPrompt(userProfile?: string): string {
  const basePrompt = `You are HydroStack Assistant, a sanitary and hydraulic engineer specialized
in on-site wastewater treatment systems (OWTS): septic tanks, leach fields,
absorption wells, and decentralized wastewater treatment.`;

  const profileRoles = {
    owner: `
## ROLE AND TONE (HOMEOWNER)
- Use plain, conversational language. Avoid jargon like "percolation", "SRT", "infiltration field"
- Start by asking about their situation in simple terms: "Tell me about your house and where it's located"
- Explain what's happening before diving into numbers
- Guide them step-by-step without assuming technical knowledge
- After giving advice, check if they understand

## ORIENTATION FLOW FOR HOMEOWNERS
After diagnosis and optional explanation, move to practical next steps guidance:

1. **Identify the subscenario**: Installation, active failure, preventive maintenance, or abandoned house
2. **Ask clarifying questions if needed**: Use the single 4-option question (see orientation context below)
3. **Deliver step-by-step guidance**: Specific to their situation and country
4. **Adapt by country**: Name correct professionals and regulatory requirements per jurisdiction
5. **End with control question**: "Want details on any of these steps, or help preparing questions for the [professional]?"

Never push the user to the next phase. They decide when to deepen or move forward.
If the user doesn't fit the 4 subscenarios, ask clarifying questions before forcing orientation.`,

    professional: `
## ROLE AND TONE (PROFESSIONAL/ENGINEER)
- Use full technical terminology and regulatory references
- Dive directly into calculations, design criteria, and verification checks
- Assume familiarity with concepts like SRT, percolation rates, hydraulic loads
- Reference specific code sections and design standards`,

    contractor: `
## ROLE AND TONE (CONTRACTOR/INSTALLER)
- Use practical, hands-on language focused on execution
- Provide specific technical guidance for design verification
- Include material specs, installation details, and common gotchas
- Answer concrete questions about field conditions and troubleshooting`,

    exploring: `
## ROLE AND TONE (EXPLORING)
- Start with a 3-sentence explanation of what HydroStack does
- Keep explanations high-level and conceptual
- Offer to dive deeper into specific areas if they're curious
- Invite them to explore specific topics`,
  };

  const defaultRole = `
## ROLE AND TONE
- Adapt your technical level to the user: use professional terminology with engineers;
  explain clearly without unnecessary jargon for non-technical users.
- Be direct and concise. Don't repeat information already provided in the conversation.
- Ask one question at a time, starting with the most important.`;

  const roleSection = profileRoles[userProfile as keyof typeof profileRoles] || defaultRole;

  const restOfPrompt = `
## TOOLS (FUNCTION CALLING)
You have 4 tools that can be CHAINED to solve a complete septic system design
per Spanish regulations (CTE DB-HS 5, RD 1620/2007). Use them when the user
asks for a concrete sizing instead of calculating by hand.

**\`calculate_septic_tank\`** — sizes the septic tank (volume, dimensions,
chambers, retention) per CTE DB-HS 5.
- Use it when the user describes a new case with the number of residents
  (habitantes_equivalentes) and a use type (tipo_uso: vivienda_unifamiliar,
  vivienda_colectiva, restaurante, hotel, camping, oficina, industrial).
- If data is missing, CTE minimums are applied automatically and reported
  in validacion_cte.avisos.
- Its output includes the daily flow, reused as input for the next tool.

**\`calculate_drainage_field\`** — sizes the infiltration / drainage field
that receives the tank effluent.
- Use it AFTER calculate_septic_tank, passing the daily flow.
- Requires soil permeability (K). If the user has not provided it, ASK.

**\`validate_against_cte\`** — validates the tank + drainage results against
CTE DB-HS 5 and RD 1620/2007 (read-only check).
- Use it AFTER the two calculation tools, passing their outputs.
- Returns blocking issues and warnings with article references.

**\`generate_pdf_report\`** — generates an A4 technical report PDF.
- Use it AT THE END, only when the user explicitly asks for a "memoria",
  "PDF", "informe" or "report".
- Requires proyecto.nombre and proyecto.ubicacion.

**Common rules**:
- Chain tools in sequence when the user asks for a full design
  (tank → drainage → validation → PDF).
- If validation returns BLOCKING issues, DO NOT generate the PDF — explain
  the problem to the user first.
- If critical data is missing, ASK the user; do not invent values.
- After receiving a result, DO NOT repeat the full numeric table — the user
  already sees it rendered. Interpret the results: explain what they mean,
  flag checks and warnings, and suggest next steps.

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

  return basePrompt + roleSection + restOfPrompt;
}

const SYSTEM_PROMPT = getSystemPrompt();

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
  userProfile?: string;
  ownerState?: {
    phase: string | null;
    subscenario: string | null;
    explanationOffered: boolean;
    country: string | null;
    occupants: number | null;
    systemAge: number | null;
    lastUpdated: string;
  };
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
    "new york": "epa-onsite",
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
      "epa-onsite":       "docs/normativa/epa-onsite.md",
      "uk-building-regs": "docs/normativa/uk-building-regs.md",
      "as-nzs-1547":      "docs/normativa/as-nzs-1547.md",
      "cte-hs5":          "docs/normativa/cte-hs5.md",
      "ras-2000":         "docs/normativa/ras-2000.md",
    };
    const path = map[ubicacion];
    if (!path) return "";
    const fullPath = join(process.cwd(), path);
    const raw = await readFile(fullPath, "utf-8");
    if (raw.length <= MAX_NORMATIVA_CHARS) return raw;
    return raw.slice(0, MAX_NORMATIVA_CHARS) + "\n\n[…regulation excerpt truncated; ask for specific sections if needed…]";
  } catch {
    return "";
  }
}

async function getOrientationGuidance(userProfile?: string): Promise<string> {
  // Only inject orientation guidance for homeowner profile
  if (userProfile !== "owner") return "";
  try {
    // Use compact version to stay within token budget
    const fullPath = join(process.cwd(), "docs/orientation-guidance-compact.md");
    const raw = await readFile(fullPath, "utf-8");
    return raw;
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
      suggestions.map((q, i) => `${i + 1}. ${q.text}`).join('\n')
    }`;
  } catch {
    return "";
  }
}

// Strip the heavy regulatory context block once the model has already seen
// it (depth > 0). The model can recall standards from the round-0 system /
// tool exchange without re-reading the full doc each turn. Keeps us under
// Groq's free-tier TPM (6000) on multi-round tool flows.
function stripNormativaContext(messages: ChatMessage[]): ChatMessage[] {
  return messages.filter(m => {
    if (m.role !== "user" || typeof m.content !== "string") return true;
    return !m.content.startsWith("[REGULATORY STANDARDS]");
  }).filter((m, _i, arr) => {
    // Also drop the auto-reply that paired with the now-removed regulatory block.
    if (m.role !== "assistant" || typeof m.content !== "string") return true;
    return !m.content.startsWith("Standards loaded.");
  });
}

/**
 * Stream one round of Groq completion. If the model returns tool_calls,
 * recursively run them and stream the follow-up. Returns when the model
 * finishes with stop / length.
 */
const MAX_RATE_LIMIT_RETRIES = 3;  // Groq free-tier TPM bursts on multi-tool chains

/**
 * The LLM relays structured data between tools unreliably — it often passes a
 * tool's INPUT instead of its OUTPUT, or hallucinates field names. For the
 * validate_against_cte and generate_pdf_report tools we therefore ALWAYS replace
 * the septic_tank / drainage_field / validation fields with the real outputs of
 * the previous tool calls, recovered from the conversation history.
 */
function injectPreviousOutputs(
  toolName: string,
  input: Record<string, unknown>,
  history: ChatMessage[],
): Record<string, unknown> {
  if (toolName !== "validate_against_cte" && toolName !== "generate_pdf_report") {
    return input;
  }
  const result = { ...input };

  const findOutput = (name: string): unknown => {
    for (let i = history.length - 1; i >= 0; i--) {
      const m = history[i];
      if (m.role === "tool" && m.name === name && typeof m.content === "string") {
        try {
          const out = JSON.parse(m.content);
          if (out && typeof out === "object" && !("error" in out)) return out;
        } catch { /* skip malformed tool message */ }
      }
    }
    return null;
  };

  const septicTank = findOutput("calculate_septic_tank");
  if (septicTank) result.septic_tank = septicTank;

  const drainageField = findOutput("calculate_drainage_field");
  if (drainageField) result.drainage_field = drainageField;

  if (toolName === "generate_pdf_report") {
    const validation = findOutput("validate_against_cte");
    if (validation) result.validation = validation;
  }

  return result;
}

async function streamRound(
  messages: ChatMessage[],
  send: (data: string) => void,
  depth: number,
  retriesLeft: number = MAX_RATE_LIMIT_RETRIES,
): Promise<void> {
  const outboundMessages = depth === 0 ? messages : stripNormativaContext(messages);

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: outboundMessages,
      stream: true,
      // Tools stay available in EVERY round so the 4-tool chain
      // (tank → drainage → validation → PDF) can progress step by step.
      // stripNormativaContext drops the heavy regulatory block on depth>0,
      // which offsets the tool-def tokens and keeps us within Groq's TPM.
      max_tokens: depth === 0 ? MAX_TOKENS_ROUND0 : MAX_TOKENS_FOLLOWUP,
      tools,
      tool_choice: "auto",
    }),
  });

  // Groq rate limit (HTTP 429). The per-minute TPM limit clears in seconds and
  // is worth retrying; the per-day TPD quota does not, so retrying is pointless.
  if (res.status === 429) {
    const errText = await res.text();
    const m = errText.match(/try again in (?:(\d+)m)?([\d.]+)s/);
    const waitSec = m ? parseInt(m[1] || "0") * 60 + parseFloat(m[2]) : 5;

    if (waitSec <= 30 && retriesLeft > 0) {
      await new Promise(r => setTimeout(r, Math.ceil(waitSec * 1000) + 600));
      return streamRound(messages, send, depth, retriesLeft - 1);
    }

    send(JSON.stringify({
      type: "error",
      error: `Groq rate limit reached — try again in ~${Math.ceil(waitSec / 60)} min `
        + `(free-tier daily token quota). ${errText}`,
    }));
    return;
  }

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

    const toolMsgs: ChatMessage[] = [];
    for (const tc of toolCalls) {
      let parsedArgs: any = {};
      try { parsedArgs = JSON.parse(tc.function.arguments || "{}"); } catch { /* keep raw */ }

      // The LLM relays structured tool data unreliably; for the validation and
      // PDF tools, substitute the real outputs of previous tool calls — including
      // tools resolved earlier in THIS round (toolMsgs), since the model often
      // emits the whole chain as parallel tool_calls in a single round.
      parsedArgs = injectPreviousOutputs(
        tc.function.name,
        parsedArgs,
        [...messages, ...toolMsgs],
      );

      let result: any;
      try {
        result = await executeTool(tc.function.name, parsedArgs);
      } catch (e: any) {
        result = { error: e?.message ?? "Tool execution failed" };
      }

      // Emit custom event so the UI can render a structured calculation card.
      send(JSON.stringify({
        type:   "tool_result",
        tool:   tc.function.name,
        args:   parsedArgs,
        result,
      }));

      toolMsgs.push({
        role: "tool",
        tool_call_id: tc.id,
        name: tc.function.name,
        content: JSON.stringify(result),
      });
    }

    await streamRound([...messages, assistantMsg, ...toolMsgs], send, depth + 1);
  }
}

export async function POST(req: Request) {
  const { messages, formState, userProfile, ownerState }: ChatRequest = await req.json();

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data: string) =>
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));

      try {
        const lastMessage  = messages[messages.length - 1]?.content || "";
        const locationKey  = detectLocation(lastMessage);
        const normativaMD  = await getNormativaMD(locationKey);
        const orientationMD = await getOrientationGuidance(userProfile);
        const catalogSuggs = await getCatalogSuggestions(formState);

        // Auto-detect subscenario for homeowners (only if not already set)
        let detectedSubscenario = null;
        if (userProfile === "owner" && !formState?.subscenario) {
          const detection = detectSubscenario(lastMessage);
          if (detection.subscenario && detection.confidence > 50) {
            detectedSubscenario = detection.subscenario;
          }
        }

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

        if (orientationMD) {
          contextMessages.push({
            role: "user",
            content: `[ORIENTATION GUIDANCE FOR HOMEOWNERS]\n${orientationMD}`,
          });
          contextMessages.push({
            role: "assistant",
            content: "Orientation guidance loaded. I'll structure advice around the homeowner's specific situation and provide country-specific next steps.",
          });
        }

        // Inject previous session context (ownerState)
        if (ownerState && ownerState.subscenario) {
          const subscenarioLabels = {
            installation: "planning a new installation",
            active_failure: "dealing with an active failure",
            preventive: "doing preventive maintenance",
            abandoned: "reopening an abandoned property",
          };
          const label = subscenarioLabels[ownerState.subscenario as keyof typeof subscenarioLabels] || "working on their septic system";
          contextMessages.push({
            role: "user",
            content: `[PREVIOUS SESSION CONTEXT]\nThis homeowner was ${label}. They may have already received some guidance or explanations. Continue from where we left off, but be ready to clarify or expand if they ask.`,
          });
          contextMessages.push({
            role: "assistant",
            content: `I see we've been working on this together. Let me continue helping with your ${ownerState.subscenario} situation.`,
          });
        }

        // Inject auto-detected subscenario context
        if (detectedSubscenario) {
          const subscenarioDescriptions: Record<string, string> = {
            installation: "The homeowner is planning a NEW INSTALLATION on virgin land. They need guidance on soil evaluation, permitting, site planning, and design criteria.",
            active_failure: "The homeowner is experiencing an ACTIVE FAILURE or critical issue (odors, backups, pooling). This is URGENT. Prioritize immediate troubleshooting and emergency steps.",
            preventive: "The homeowner wants PREVENTIVE MAINTENANCE or routine inspection of an existing system that's working. Focus on inspection frequency, pumping schedules, and care practices.",
            abandoned: "The homeowner owns a CLOSED/ABANDONED property and is preparing to REOCCUPY it. The system likely needs inspection before reuse. Focus on assessing current condition and readiness.",
          };
          contextMessages.push({
            role: "user",
            content: `[DETECTED HOMEOWNER SITUATION]\nSubscenario: ${detectedSubscenario.toUpperCase()}\n${subscenarioDescriptions[detectedSubscenario]}\n\nUse this context to tailor your guidance specifically to this situation. Do NOT ask what situation they're in—you already know.`,
          });
          contextMessages.push({
            role: "assistant",
            content: `Understood. I've identified that you're in a ${detectedSubscenario} situation. I'll tailor my guidance accordingly.`,
          });
          // Update formState to persist the detection
          if (formState) {
            formState.subscenario = detectedSubscenario as any;
          }
        }

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

        const systemPrompt = getSystemPrompt(userProfile);
        const initialMessages: ChatMessage[] = [
          { role: "system", content: systemPrompt },
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
        send(JSON.stringify({ type: "error", error: err?.message ?? "API error" }));
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
