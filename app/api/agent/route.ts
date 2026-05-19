/**
 * Hydro_Agent endpoint with Groq (OpenAI-compatible API)
 *
 * POST /api/agent
 * Body: { message: string }
 *
 * Returns: { reply: string, toolCalls: Array<{name, input, output}> }
 */

import { tools, executeTool } from '@/lib/agent/tools';

export const runtime = 'nodejs';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const MAX_TOOL_ROUNDS = 3;
const MAX_TOKENS = 1024;

// ─────────────────────────────────────────────────────────────────────────
// System prompt for Hydro_Agent
// ─────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Hydro_Agent, a technical assistant specialized in individual wastewater treatment systems (SITARD) in Spain.

Your objective is to help homeowners, professionals, and contractors to:
1. Size septic tanks according to CTE DB-HS 5 and RD 1620/2007
2. Design drainage/infiltration fields
3. Understand regulations and technical requirements

Behavior:
- Detect user language (Spanish or English) automatically; respond in the same language
- Always cite applicable standards (CTE DB-HS 5, RD 1620/2007, Confederación Hidrográfica)
- Use available tools for real calculations, not vague recommendations
- When user describes a case in natural language, extract parameters and call the appropriate tool
- Interpret tool results and explain what they mean in context

Tone:
- Professional but accessible
- No unnecessary jargon; if used, define terms
- Provide context: why calculated this way, what the result means, next steps`;

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  output: unknown;
}

interface AgentResponse {
  reply: string;
  toolCalls: ToolCall[];
}

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
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

    // Run the agent loop
    const response = await runAgentLoop(message);

    return Response.json(response);
  } catch (error) {
    console.error('Agent error:', error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Agent loop with tool use (Groq OpenAI format)
// ─────────────────────────────────────────────────────────────────────────

async function runAgentLoop(userMessage: string): Promise<AgentResponse> {
  const messages: GroqMessage[] = [
    {
      role: 'user',
      content: userMessage,
    },
  ];

  const toolCalls: ToolCall[] = [];

  // Tool use loop (max iterations to prevent infinite loops)
  for (let iteration = 0; iteration < MAX_TOOL_ROUNDS; iteration++) {
    const response = await callGroqAPI(messages);

    if (!response.ok) {
      throw new Error(
        `Groq API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (!choice) {
      throw new Error('No choice in Groq response');
    }

    const assistantMessage = choice.message;

    // Add assistant message to history
    messages.push({
      role: 'assistant',
      content: assistantMessage.content || '',
    });

    // Check for tool calls
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolResults: string[] = [];

      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolInput = JSON.parse(toolCall.function.arguments);

        try {
          const result = await executeTool(toolName, toolInput);

          // Record the tool call
          toolCalls.push({
            name: toolName,
            input: toolInput,
            output: result,
          });

          // Add tool result to message history (Groq format)
          toolResults.push(
            `{"tool_call_id": "${toolCall.id}", "role": "tool", "name": "${toolName}", "content": ${JSON.stringify(result)}}`
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          toolResults.push(
            `{"tool_call_id": "${toolCall.id}", "role": "tool", "name": "${toolName}", "content": "Error: ${errorMessage}"}`
          );
        }
      }

      // Add tool results as user message (Groq format)
      messages.push({
        role: 'user',
        content: `[Tool Results]\n${toolResults.join('\n')}`,
      });
    } else {
      // No tool calls → model finished with text response
      const reply = assistantMessage.content || '';
      return {
        reply: reply.trim(),
        toolCalls,
      };
    }
  }

  // If we exit the loop without a final text response
  return {
    reply:
      '(Agent reached max tool use rounds. Please check logs for details.)',
    toolCalls,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Groq API call
// ─────────────────────────────────────────────────────────────────────────

async function callGroqAPI(messages: GroqMessage[]): Promise<Response> {
  return fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: MAX_TOKENS,
      messages,
      tools: tools as unknown[],
      tool_choice: 'auto',
      temperature: 0.7,
    }),
  });
}
