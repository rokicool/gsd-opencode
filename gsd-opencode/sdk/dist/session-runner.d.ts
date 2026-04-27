/**
 * Session runner — orchestrates Agent SDK query() calls for plan execution.
 *
 * Takes a parsed plan, builds the executor prompt, configures query() options,
 * processes the message stream, and extracts results into a typed PlanResult.
 */
import type { ParsedPlan, PlanResult, SessionOptions, PhaseStepType } from './types.js';
import type { GSDConfig } from './config.js';
import type { GSDEventStream, EventStreamContext } from './event-stream.js';
/**
 * Run a plan execution session via the Agent SDK query() function.
 *
 * Builds the executor prompt from the parsed plan, configures query() with
 * appropriate permissions, tool restrictions, and budget limits, then iterates
 * the message stream to extract the result.
 *
 * @param plan - Parsed plan structure
 * @param config - GSD project configuration
 * @param options - Session overrides (maxTurns, budget, model, etc.)
 * @param agentDef - Raw agent definition content (optional, for tool/role extraction)
 * @returns Typed PlanResult with cost, duration, success/error status
 */
export declare function runPlanSession(plan: ParsedPlan, config: GSDConfig, options?: SessionOptions, agentDef?: string, eventStream?: GSDEventStream, streamContext?: EventStreamContext, phaseDir?: string): Promise<PlanResult>;
/**
 * Run a phase step session via the Agent SDK query() function.
 *
 * Unlike runPlanSession which takes a ParsedPlan, this accepts a raw prompt
 * string and a phase step type. The prompt becomes the system prompt append,
 * and tools are scoped by phase type.
 *
 * @param prompt - Raw prompt string to append to the system prompt
 * @param phaseStep - Phase step type (determines tool scoping)
 * @param config - GSD project configuration
 * @param options - Session overrides (maxTurns, budget, model, etc.)
 * @param eventStream - Optional event stream for observability
 * @param streamContext - Optional context for event tagging
 * @returns Typed PlanResult with cost, duration, success/error status
 */
export declare function runPhaseStepSession(prompt: string, phaseStep: PhaseStepType, config: GSDConfig, options?: SessionOptions, eventStream?: GSDEventStream, streamContext?: EventStreamContext): Promise<PlanResult>;
//# sourceMappingURL=session-runner.d.ts.map