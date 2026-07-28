/**
 * Prompt builder — assembles executor prompts from parsed plans.
 *
 * Converts a ParsedPlan into a structured prompt that tells the
 * executor agent exactly what to do: follow the tasks sequentially,
 * verify each one, and produce a SUMMARY.md at the end.
 */
import type { ParsedPlan } from './types.js';
declare const DEFAULT_ALLOWED_TOOLS: string[];
/**
 * Extract the tools list from a gsd-executor.md agent definition.
 * Falls back to DEFAULT_ALLOWED_TOOLS if parsing fails.
 */
export declare function parseAgentTools(agentDef: string): string[];
/**
 * Extract the role instructions from a gsd-executor.md agent definition.
 * Returns the <role>...</role> block content, or empty string.
 */
export declare function parseAgentRole(agentDef: string): string;
/**
 * Options for buildExecutorPrompt beyond the required plan.
 */
export interface ExecutorPromptOptions {
    /** Raw content of gsd-executor.md agent definition. */
    agentDef?: string;
    /** Phase directory relative to project root (e.g. `.planning/phases/01-auth`). */
    phaseDir?: string;
}
/**
 * Build the executor prompt from a parsed plan and optional agent definition.
 *
 * The prompt instructs the executor to:
 * 1. Follow the plan tasks sequentially
 * 2. Run verification for each task
 * 3. Commit each task individually
 * 4. Produce a SUMMARY.md file on completion
 *
 * @param plan - Parsed plan structure from plan-parser
 * @param agentDefOrOpts - Raw agent definition string (legacy) or ExecutorPromptOptions
 * @returns Assembled prompt string
 */
export declare function buildExecutorPrompt(plan: ParsedPlan, agentDefOrOpts?: string | ExecutorPromptOptions): string;
export { DEFAULT_ALLOWED_TOOLS };
//# sourceMappingURL=prompt-builder.d.ts.map