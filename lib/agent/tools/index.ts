/**
 * Central registry for all Hydro_Agent tools.
 *
 * - Exports all tool definitions for Groq (OpenAI format)
 * - Provides a toolExecutors map for dynamic tool invocation by name
 * - Scales easily as more tools are added in future phases
 */

import {
  calculateSepticTankTool,
  executeCalculateSepticTank,
  ExecuteToolInput as CalculateSepticTankInput,
} from './calculateSepticTank';

import {
  calculateDrainageFieldTool,
  executeCalculateDrainageField,
  ExecuteDrainageFieldInput,
} from './calculateDrainageField';

import {
  validateAgainstCteTool,
  executeValidateAgainstCte,
  ExecuteValidateAgainstCteInput,
} from './validateAgainstCte';

import {
  generatePdfReportTool,
  executeGeneratePdfReport,
  ExecuteGeneratePdfReportInput,
} from './generatePdfReport';

// ─────────────────────────────────────────────────────────────────────────
// Tool definitions for Groq (OpenAI format)
// ─────────────────────────────────────────────────────────────────────────

export const tools = [
  calculateSepticTankTool,
  calculateDrainageFieldTool,
  validateAgainstCteTool,
  generatePdfReportTool,
];

// Re-export individual tools for direct access
export {
  calculateSepticTankTool,
  calculateDrainageFieldTool,
  validateAgainstCteTool,
  generatePdfReportTool,
};

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
  calculate_drainage_field: async (input: ToolInput) => {
    return executeCalculateDrainageField(input as ExecuteDrainageFieldInput);
  },
  validate_against_cte: async (input: ToolInput) => {
    return executeValidateAgainstCte(input as ExecuteValidateAgainstCteInput);
  },
  generate_pdf_report: async (input: ToolInput) => {
    return executeGeneratePdfReport(input as ExecuteGeneratePdfReportInput);
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
    throw new Error(
      `Tool not found: ${toolName}. Available: ${Object.keys(toolExecutors).join(', ')}`
    );
  }
  return executor(input);
}

/**
 * List all registered tool names. Useful for diagnostics and testing.
 */
export function listToolNames(): string[] {
  return Object.keys(toolExecutors);
}
