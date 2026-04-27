/**
 * InitRunner — orchestrates the GSD new-project init workflow.
 *
 * Workflow: setup → config → PROJECT.md → parallel research (4 sessions)
 *         → synthesis → requirements → roadmap
 *
 * Each step calls Agent SDK `query()` via `runPhaseStepSession()` with
 * prompts derived from GSD-1 workflow/agent/template files on disk.
 */
import type { InitConfig, InitResult } from './types.js';
import type { GSDTools } from './gsd-tools.js';
import type { GSDEventStream } from './event-stream.js';
export interface InitRunnerDeps {
    projectDir: string;
    tools: GSDTools;
    eventStream: GSDEventStream;
    config?: Partial<InitConfig>;
    /** Override for SDK prompts directory. Defaults to package-relative sdk/prompts/. */
    sdkPromptsDir?: string;
}
export declare class InitRunner {
    private readonly projectDir;
    private readonly tools;
    private readonly eventStream;
    private readonly config;
    private readonly sessionId;
    private readonly sdkPromptsDir;
    constructor(deps: InitRunnerDeps);
    /**
     * Run the full init workflow.
     *
     * @param input - User input: PRD content, project description, etc.
     * @returns InitResult with per-step results, artifacts, and totals.
     */
    run(input: string): Promise<InitResult>;
    private runStep;
    private runParallelResearch;
    /**
     * Build the PROJECT.md synthesis prompt.
     * Reads the project template and combines with user input.
     */
    private buildProjectPrompt;
    /**
     * Build a research prompt for a specific research type.
     * Reads the agent definition and research template.
     */
    private buildResearchPrompt;
    /**
     * Build the synthesis prompt.
     * Reads synthesizer agent def and all 4 research outputs.
     */
    private buildSynthesisPrompt;
    /**
     * Build the requirements prompt.
     * Reads PROJECT.md + FEATURES.md for requirement derivation.
     */
    private buildRequirementsPrompt;
    /**
     * Build the roadmap prompt.
     * Reads PROJECT.md + REQUIREMENTS.md + research/SUMMARY.md + config.json.
     */
    private buildRoadmapPrompt;
    /**
     * Run a single Agent SDK session via runPhaseStepSession.
     */
    private runSession;
    /**
     * read a file from the GSD templates directory.
     * Tries sdk/prompts/{relativePath} first (headless versions), then
     * falls back to GSD-1 originals ($HOME/.config/opencode/get-shit-done/).
     */
    private readGSDFile;
    /**
     * read an agent definition.
     * Tries installed agents first (complete, up-to-date versions), then
     * falls back to SDK bundled copies.
     */
    private readAgentFile;
    /**
     * Execute a git command in the project directory.
     */
    private execGit;
    private emitEvent;
    private buildResult;
    /**
     * Extract cost from a step return value if it's a PlanResult.
     */
    private extractCost;
}
//# sourceMappingURL=init-runner.d.ts.map