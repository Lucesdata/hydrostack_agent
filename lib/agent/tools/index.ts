/**
 * Central registry for all Hydro_Agent tools.
 *
 * This module:
 * - Exports all tool definitions for Groq (OpenAI format)
 * - Provides a toolExecutors map for dynamic tool invocation by name
 * - Scales easily as more tools are added in future phases
 */

import {
  calculateSepticTankTool,
  executeCalculateSepticTank,
  ExecuteToolInput as CalculateSepticTankInput,
} from './calculateSepticTank';

// ─────────────────────────────────────────────────────────────────────────
// Tool definitions for Groq (OpenAI format)
// ─────────────────────────────────────────────────────────────────────────

export const tools = [calculateSepticTankTool];

// ─────────────────────────────────────────────────────────────────────────
// Tool executor registry
// ─────────────────────────────────────────────────────────────────────────

export interface ToolInput {
  [key: string]: unknown;
}

export interface ToolExecutor {
  (input: ToolInput): Promise<unknown>;
}

export const toolExecutors: Record<string, ToolExecutor> = {
  calculate_septic_tank: async (input: ToolInput) => {
    return executeCalculateSepticTank(input as CalculateSepticTankInput);
  },
};

/**
 * Execute a tool by name.
 *
 * @param toolName - The name of the tool to execute
 * @param input - The input object for the tool
 * @returns The result of executing the tool
 * @throws Error if tool is not found
 */
export async function executeTool(toolName: string, input: ToolInput): Promise<unknown> {
  const executor = toolExecutors[toolName];
  if (!executor) {
    throw new Error(`Tool not found: ${toolName}. Available tools: ${Object.keys(toolExecutors).join(', ')}`);
  }
  return executor(input);
}
