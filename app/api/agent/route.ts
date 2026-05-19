/**
 * Hydro_Agent endpoint with Groq (OpenAI-compatible API)
 * Implements multi-tool composition for end-to-end septic system design.
 *
 * POST /api/agent
 * Body: { message: string }
 *
 * Returns: { reply: string, toolCalls: Array<{name, input, output, duration_ms}> }
 */

import { tools, executeTool, listToolNames } from '@/lib/agent/tools';

export const runtime = 'nodejs';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const MAX_TOOL_ROUNDS = 8;
const MAX_TOKENS = 2048;

// ─────────────────────────────────────────────────────────────────────────
// System prompt for Hydro_Agent
// ─────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Hydro_Agent, a technical assistant specialized in individual wastewater treatment systems (SITARD) in Spain.

## Your Role
- Size septic tanks and drainage fields per CTE DB-HS 5 and RD 1620/2007
- Validate designs against Spanish regulations
- Generate technical PDF reports
- Respond in user's language (Spanish or English, auto-detect)

## Available Tools — Composition Flow

You have 4 tools that can be CHAINED to solve a complete design:

1. **calculate_septic_tank** — Sizes the septic tank.
   - USE when: user describes a new case with residents/use type.
   - Output includes \`caudal_diario_litros\`, used as input for tool 2.

2. **calculate_drainage_field** — Sizes the infiltration field.
   - USE: AFTER tool 1, passing its \`caudal_diario_litros\` as \`caudal_diario_l\`.
   - Requires soil permeability (K). If user doesn't provide, ASK.

3. **validate_against_cte** — Validates results vs CTE/RD regulations (read-only).
   - USE: AFTER tools 1 and 2, passing their outputs as input.
   - Returns blocking issues and warnings with article codes.

4. **generate_pdf_report** — Generates A4 technical memo PDF.
   - USE: AT THE END, only when user asks for "memoria", "PDF", "informe", "report".
   - Requires \`proyecto.nombre\` and \`proyecto.ubicacion\`.

## Decision Rules

- If user asks ONLY for septic tank → call tool 1 only.
- If user asks for full design (tank + drainage + validation + PDF) → chain all 4.
- If validation has BLOCKING issues → DO NOT proceed to generate PDF; explain issue to user.
- If user asks general/normative question without data → respond from knowledge, no tools.
- If critical data is missing → ASK the user, do not invent values.

## After Tool Calls
- Interpret results in natural language
- Cite normative codes (e.g., "CTE DB-HS 5 §3.3.1") when relevant
- Be concise but complete
- If PDF was generated, include the \`download_url\` in your response`;

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

interface ToolCallRecord {
  name: string;
  input: Record<string, unknown>;
  output: unknown;
  duration_ms: number;
}

interface AgentResponse {
  reply: string;
  toolCalls: ToolCallRecord[];
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
  tool_calls?: Array<{
    id: string;
    type: string;
    function: { name: string; arguments: string };
  }>;
}

// ─────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { message } = body as { message?: string };

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return Response.json(
        { error: 'Missing or invalid "message" field' },
        { status: 400 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return Response.json(
        { error: 'GROQ_API_KEY not configured' },
        { status: 500 }
      );
    }

    console.log(`[agent] tools registered: ${listToolNames().join(', ')}`);
    console.log(`[agent] user message: "${message.substring(0, 100)}..."`);

    const response = await runAgentLoop(message);

    console.log(`[agent] completed with ${response.toolCalls.length} tool call(s)`);

    return Response.json(response);
  } catch (error) {
    console.error('[agent] error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Agent loop with multi-tool composition
// ─────────────────────────────────────────────────────────────────────────

async function runAgentLoop(userMessage: string): Promise<AgentResponse> {
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ];

  const toolCalls: ToolCallRecord[] = [];
  let lastAssistantText = '';

  // Tool use loop with guardrail
  for (let iteration = 0; iteration < MAX_TOOL_ROUNDS; iteration++) {
    console.log(`[agent] iteration ${iteration + 1}/${MAX_TOOL_ROUNDS}`);

    const response = await callGroqAPI(messages);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Groq API error: ${response.status} ${response.statusText} ${errorText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (!choice) {
      throw new Error('No choice in Groq response');
    }

    const message = choice.message;

    // Add assistant message to history
    messages.push({
      role: 'assistant',
      content: message.content || '',
      tool_calls: message.tool_calls,
    });

    if (message.content && message.content.trim().length > 0) {
      lastAssistantText = message.content.trim();
    }

    // Check for tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolMessages: ChatMessage[] = [];

      for (const toolCall of message.tool_calls) {
        const toolName = toolCall.function.name;
        let toolInput: Record<string, unknown> = {};

        try {
          toolInput = JSON.parse(toolCall.function.arguments);
        } catch {
          toolInput = { raw: toolCall.function.arguments };
        }

        const startTime = Date.now();
        let result: unknown;
        let outcome: 'success' | 'error' = 'success';

        try {
          result = await executeTool(toolName, toolInput);
        } catch (error) {
          outcome = 'error';
          result = {
            error: error instanceof Error ? error.message : String(error),
          };
        }

        const duration_ms = Date.now() - startTime;

        // Structured log (future: Langfuse)
        console.log(
          `[agent.tool] name=${toolName} duration=${duration_ms}ms outcome=${outcome} ` +
          `input=${JSON.stringify(toolInput).substring(0, 200)}`
        );

        toolCalls.push({
          name: toolName,
          input: toolInput,
          output: result,
          duration_ms,
        });

        toolMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolName,
          content: JSON.stringify(result),
        });
      }

      messages.push(...toolMessages);
    } else {
      // No tool calls — model returned final text
      return {
        reply: lastAssistantText,
        toolCalls,
      };
    }
  }

  // Guardrail: max iterations reached
  console.warn(`[agent] guardrail triggered: max ${MAX_TOOL_ROUNDS} iterations reached`);

  return {
    reply:
      lastAssistantText ||
      `Se completaron ${toolCalls.length} cálculos pero el agente no generó respuesta final. ` +
      `Resultados disponibles en toolCalls.`,
    toolCalls,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Groq API call
// ─────────────────────────────────────────────────────────────────────────

async function callGroqAPI(messages: ChatMessage[]): Promise<Response> {
  const apiMessages = messages.map((m) => {
    const { tool_calls, tool_call_id, name, ...rest } = m;
    const apiMsg: any = rest;
    if (tool_calls) apiMsg.tool_calls = tool_calls;
    if (tool_call_id) apiMsg.tool_call_id = tool_call_id;
    if (name) apiMsg.name = name;
    return apiMsg;
  });

  return fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: MAX_TOKENS,
      messages: apiMessages,
      tools: tools as unknown[],
      tool_choice: 'auto',
      temperature: 0.5,
    }),
  });
}
