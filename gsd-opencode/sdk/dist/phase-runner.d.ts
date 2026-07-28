/**
 * Phase Runner — core state machine driving the full phase lifecycle.
 *
 * Orchestrates: discuss → research → plan → execute → verify → advance
 * with config-driven step skipping, human gate callbacks, event emission,
 * and structured error handling per step.
 */
import type { PhaseRunnerResult, PhaseRunnerOptions } from './types.js';
import { PhaseStepType } from './types.js';
import type { GSDConfig } from './config.js';
import type { GSDTools } from './gsd-tools.js';
import type { GSDEventStream } from './event-stream.js';
import type { PromptFactory } from './phase-prompt.js';
import type { ContextEngine } from './context-engine.js';
import type { GSDLogger } from './logger.js';
export declare class PhaseRunnerError extends Error {
    readonly phaseNumber: string;
    readonly step: PhaseStepType;
    readonly cause?: Error | undefined;
    constructor(message: string, phaseNumber: string, step: PhaseStepType, cause?: Error | undefined);
}
export type VerificationOutcome = 'passed' | 'human_needed' | 'gaps_found';
export interface PhaseRunnerDeps {
    projectDir: string;
    tools: GSDTools;
    promptFactory: PromptFactory;
    contextEngine: ContextEngine;
    eventStream: GSDEventStream;
    config: GSDConfig;
    logger?: GSDLogger;
}
export declare class PhaseRunner {
    private readonly projectDir;
    private readonly tools;
    private readonly promptFactory;
    private readonly contextEngine;
    private readonly eventStream;
    private readonly config;
    private readonly logger?;
    constructor(deps: PhaseRunnerDeps);
    /**
     * Run a full phase lifecycle: discuss → research → plan → plan-check → execute → verify → advance.
     *
     * Each step is gated by config flags and phase state. Human gate callbacks
     * are invoked at decision points; when not provided, auto-approve is used.
     */
    run(phaseNumber: string, options?: PhaseRunnerOptions): Promise<PhaseRunnerResult>;
    /**
     * Retry a step function once on failure.
     * On first error/failure, logs a warning and calls the function once more.
     * Returns the result from the last attempt.
     */
    private retryOnce;
    /**
     * Run the plan-check step.
     * Loads the gsd-plan-checker agent definition, runs a Verify-scoped session,
     * and parses output for PASS/FAIL signals.
     */
    private runPlanCheckStep;
    /**
     * Run the self-discuss step for auto-mode.
     * When auto_advance is true and no context exists, run an AI self-discuss
     * session that identifies gray areas and makes opinionated decisions.
     */
    private runSelfDiscussStep;
    /**
     * Run a single phase step session (discuss, research, plan).
     * Emits step start/complete events and captures errors.
     */
    private runStep;
    /**
     * Run the execute step — uses phase-plan-index for wave-grouped parallel execution.
     * Plans in the same wave run concurrently via Promise.allSettled().
     * Waves execute sequentially (wave 1 completes before wave 2 starts).
     * Respects config.parallelization: false to fall back to sequential execution.
     * Filters out plans with has_summary: true (already completed).
     */
    private runExecuteStep;
    /**
     * Execute a single plan by ID within the execute step.
     * Loads the plan file, parses it, and passes the parsed plan to the prompt
     * builder so the executor gets the full plan content (tasks, objectives, etc.).
     */
    private executeSinglePlan;
    /**
     * Run the verify step with full gap closure cycle.
     * Verification outcome routing:
     * - passed → proceed to advance
     * - human_needed → invoke onVerificationReview callback
     * - gaps_found → plan (create gap plans) → execute (run gap plans) → re-verify
     * Gap closure retries are capped at configurable maxGapRetries (default 1).
     */
    private runVerifyStep;
    /**
     * Run the advance step — mark phase complete.
     * Gated by config.workflow.auto_advance or callback approval.
     */
    private runAdvanceStep;
    /**
     * Map PhaseStepType to PhaseType for prompt/context resolution.
     */
    private stepToPhaseType;
    /**
     * Parse the verification outcome by checking VERIFICATION.md on disk.
     * The verify session may succeed (no runtime errors) while writing
     * status: gaps_found to VERIFICATION.md — we need to check the file,
     * not just the session exit code.
     *
     * Falls back to session result if VERIFICATION.md can't be parsed.
     */
    private parseVerificationOutcome;
    /**
     * Check RESEARCH.md for unresolved open questions (#1602).
     * Returns the gate result — pass means safe to proceed to planning.
     */
    private checkResearchGate;
    /**
     * Invoke the onBlockerDecision callback, falling back to auto-approve.
     */
    private invokeBlockerCallback;
    /**
     * Invoke the onVerificationReview callback, falling back to auto-accept.
     */
    private invokeVerificationCallback;
}
//# sourceMappingURL=phase-runner.d.ts.map