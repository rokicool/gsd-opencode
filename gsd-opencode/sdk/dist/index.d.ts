/**
 * GSD SDK — Public API for running GSD plans programmatically.
 *
 * The GSD class composes plan parsing, config loading, prompt building,
 * and session running into a single `executePlan()` call.
 *
 * @example
 * ```typescript
 * import { GSD } from '@gsd-build/sdk';
 *
 * const gsd = new GSD({ projectDir: '/path/to/project' });
 * const result = await gsd.executePlan('.planning/phases/01-auth/01-auth-01-PLAN.md');
 *
 * if (result.success) {
 *   console.log(`Plan completed in ${result.durationMs}ms, cost: $${result.totalCostUsd}`);
 * } else {
 *   console.error(`Plan failed: ${result.error?.messages.join(', ')}`);
 * }
 * ```
 */
import type { GSDOptions, PlanResult, SessionOptions, GSDEvent, TransportHandler, PhaseRunnerOptions, PhaseRunnerResult, MilestoneRunnerOptions, MilestoneRunnerResult } from './types.js';
import { GSDTools } from './gsd-tools.js';
import { GSDEventStream } from './event-stream.js';
export declare class GSD {
    private readonly projectDir;
    private readonly gsdToolsPath;
    private readonly sessionId?;
    private readonly defaultModel?;
    private readonly defaultMaxBudgetUsd;
    private readonly defaultMaxTurns;
    private readonly autoMode;
    private readonly workstream?;
    readonly eventStream: GSDEventStream;
    constructor(options: GSDOptions);
    /**
     * Execute a single GSD plan file.
     *
     * Reads the plan from disk, parses it, loads project config,
     * optionally reads the agent definition, then runs a query() session.
     *
     * @param planPath - Path to the PLAN.md file (absolute or relative to projectDir)
     * @param options - Per-execution overrides
     * @returns PlanResult with cost, duration, success/error status
     */
    executePlan(planPath: string, options?: SessionOptions): Promise<PlanResult>;
    /**
     * Subscribe a simple handler to receive all GSD events.
     */
    onEvent(handler: (event: GSDEvent) => void): void;
    /**
     * Subscribe a transport handler to receive all GSD events.
     * Transports provide structured onEvent/close lifecycle.
     */
    addTransport(handler: TransportHandler): void;
    /**
     * Create a GSDTools instance for state management operations.
     */
    createTools(): GSDTools;
    /**
     * Run a full phase lifecycle: discuss → research → plan → execute → verify → advance.
     *
     * Creates the necessary collaborators (GSDTools, PromptFactory, ContextEngine),
     * loads project config, instantiates a PhaseRunner, and delegates to `runner.run()`.
     *
     * @param phaseNumber - The phase number to execute (e.g. "01", "02")
     * @param options - Per-phase overrides for budget, turns, model, and callbacks
     * @returns PhaseRunnerResult with per-step results, overall success, cost, and timing
     */
    runPhase(phaseNumber: string, options?: PhaseRunnerOptions): Promise<PhaseRunnerResult>;
    /**
     * Run a full milestone: discover phases, execute each incomplete one in order,
     * re-discover after each completion to catch dynamically inserted phases.
     *
     * @param prompt - The user prompt describing the milestone goal
     * @param options - Per-milestone overrides for budget, turns, model, and callbacks
     * @returns MilestoneRunnerResult with per-phase results, overall success, cost, and timing
     */
    run(prompt: string, options?: MilestoneRunnerOptions): Promise<MilestoneRunnerResult>;
    /**
     * Filter to incomplete phases and sort numerically.
     * Uses parseFloat to handle decimal phase numbers (e.g. '5.1').
     */
    private filterAndSortPhases;
    /**
     * Load the gsd-executor agent definition if available.
     * Falls back gracefully — returns undefined if not found.
     */
    private loadAgentDefinition;
}
export { parsePlan, parsePlanFile } from './plan-parser.js';
export { loadConfig } from './config.js';
export type { GSDConfig } from './config.js';
export { GSDTools, GSDToolsError, resolveGsdToolsPath } from './gsd-tools.js';
export { runPlanSession, runPhaseStepSession } from './session-runner.js';
export { buildExecutorPrompt, parseAgentTools } from './prompt-builder.js';
export type { ExecutorPromptOptions } from './prompt-builder.js';
export * from './types.js';
export { GSDEventStream } from './event-stream.js';
export type { EventStreamContext } from './event-stream.js';
export { ContextEngine, PHASE_FILE_MANIFEST } from './context-engine.js';
export type { FileSpec } from './context-engine.js';
export { truncateMarkdown, extractCurrentMilestone, DEFAULT_TRUNCATION_OPTIONS } from './context-truncation.js';
export type { TruncationOptions } from './context-truncation.js';
export { getToolsForPhase, PHASE_AGENT_MAP, PHASE_DEFAULT_TOOLS } from './tool-scoping.js';
export { checkResearchGate } from './research-gate.js';
export type { ResearchGateResult } from './research-gate.js';
export { PromptFactory, extractBlock, extractSteps, PHASE_WORKFLOW_MAP } from './phase-prompt.js';
export { GSDLogger } from './logger.js';
export type { LogLevel, LogEntry, GSDLoggerOptions } from './logger.js';
export { PhaseRunner, PhaseRunnerError } from './phase-runner.js';
export type { PhaseRunnerDeps, VerificationOutcome } from './phase-runner.js';
export { CLITransport } from './cli-transport.js';
export { WSTransport } from './ws-transport.js';
export type { WSTransportOptions } from './ws-transport.js';
export { createRegistry, normalizeQueryCommand } from './query/index.js';
export { validateWorkstreamName, relPlanningPath } from './workstream-utils.js';
export { InitRunner } from './init-runner.js';
export type { InitRunnerDeps } from './init-runner.js';
export type { InitConfig, InitResult, InitStepResult, InitStepName } from './types.js';
//# sourceMappingURL=index.d.ts.map