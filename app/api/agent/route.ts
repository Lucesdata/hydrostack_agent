/**
 * Hydro_Agent endpoint — tool use loop implementation
 *
 * POST /api/agent
 * Body: { message: string }
 *
 * Returns: { reply: string, toolCalls: Array<{name, input, output}> }
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { tools, executeTool } from '@/lib/agent/tools';

// ─────────────────────────────────────────────────────────────────────────
// Initialize Anthropic client
// ─────────────────────────────────────────────────────────────────────────

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY not set. Agent endpoint will fail.');
}

// ─────────────────────────────────────────────────────────────────────────
// System prompt for Hydro_Agent
// ─────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
Eres Hydro_Agent, un asistente técnico especializado en sistemas individuales de tratamiento de aguas residuales (SITARD) en España.

Tu objetivo es ayudar a propietarios, profesionales y contratistas a:
1. Dimensionar fosas sépticas según CTE DB-HS 5 y RD 1620/2007
2. Diseñar campos de drenaje/infiltración
3. Entender la normativa y requisitos técnicos

Comportamiento:
- Responde en el idioma del usuario (español o inglés detectado automáticamente).
- Cita siempre la normativa aplicable (CTE DB-HS 5, RD 1620/2007, Confederación Hidrográfica).
- Usa los tools disponibles para hacer cálculos reales, no recomendaciones vagas.
- Cuando el usuario describa un caso en lenguaje natural, extrae los parámetros y llama al tool apropiado.
- Interpreta el resultado del tool y explica qué significa en contexto del caso del usuario.

Tono:
- Profesional pero accesible.
- Sin jerga innecesaria; si la usas, define términos.
- Proporciona contexto: por qué se calcula así, qué significa el resultado, próximos pasos.
`;

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

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
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
// Agent loop with tool use
// ─────────────────────────────────────────────────────────────────────────

async function runAgentLoop(userMessage: string): Promise<AgentResponse> {
  const messages: Anthropic.Messages.MessageParam[] = [
    {
      role: 'user',
      content: userMessage,
    },
  ];

  const toolCalls: ToolCall[] = [];

  // Tool use loop (max 10 iterations to prevent infinite loops)
  for (let iteration = 0; iteration < 10; iteration++) {
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: tools as unknown as Anthropic.Messages.Tool[],
      messages,
    });

    // If response ends with text, add it to messages for context
    let assistantContent: Anthropic.Messages.ContentBlockParam[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        assistantContent.push({
          type: 'text',
          text: block.text,
        });
      } else if (block.type === 'tool_use') {
        assistantContent.push({
          type: 'tool_use',
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        });
      }
    }

    // Add assistant's response to message history
    messages.push({
      role: 'assistant',
      content: assistantContent,
    });

    // Check if we need to process tool calls
    if (response.stop_reason === 'tool_use') {
      // Find all tool_use blocks and execute them
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === 'tool_use') {
          try {
            const result = await executeTool(block.name, block.input as Record<string, unknown>);

            // Record the tool call for the response
            toolCalls.push({
              name: block.name,
              input: block.input as Record<string, unknown>,
              output: result,
            });

            // Add tool result to message history
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result),
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: `Error executing tool: ${errorMessage}`,
              is_error: true,
            });
          }
        }
      }

      // Add tool results to message history
      messages.push({
        role: 'user',
        content: toolResults,
      });
    } else {
      // Model finished (stop_reason === 'end_turn')
      // Extract final text reply
      let reply = '';
      for (const block of response.content) {
        if (block.type === 'text') {
          reply += block.text;
        }
      }

      return {
        reply: reply.trim(),
        toolCalls,
      };
    }
  }

  // If we exit the loop without an end_turn, return what we have
  return {
    reply: '(Agent loop exceeded max iterations)',
    toolCalls,
  };
}
