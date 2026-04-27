/**
 * Config reader — loads `.planning/config.json` and merges with defaults.
 *
 * Mirrors the default structure from `get-shit-done/bin/lib/config.cjs`
 * `buildNewProjectConfig()`.
 */
export interface GitConfig {
    branching_strategy: string;
    phase_branch_template: string;
    milestone_branch_template: string;
    quick_branch_template: string | null;
}
export interface WorkflowConfig {
    research: boolean;
    plan_check: boolean;
    verifier: boolean;
    nyquist_validation: boolean;
    /** Mirrors gsd-tools flat `config.tdd_mode` (from `workflow.tdd_mode`). */
    tdd_mode: boolean;
    auto_advance: boolean;
    node_repair: boolean;
    node_repair_budget: number;
    ui_phase: boolean;
    ui_safety_gate: boolean;
    text_mode: boolean;
    research_before_questions: boolean;
    discuss_mode: string;
    skip_discuss: boolean;
    /** Maximum self-discuss passes in auto/headless mode before forcing proceed. Default: 3. */
    max_discuss_passes: number;
    /** Subagent timeout in ms (matches `get-shit-done/bin/lib/core.cjs` default 300000). */
    subagent_timeout: number;
    /**
     * Issue #2492. When true (default), enforces that every trackable decision in
     * CONTEXT.md `<decisions>` is referenced by at least one plan (translation
     * gate, blocking) and reports decisions not honored by shipped artifacts at
     * verify-phase (validation gate, non-blocking). Set false to disable both.
     */
    context_coverage_gate: boolean;
}
export interface HooksConfig {
    context_warnings: boolean;
}
export interface GSDConfig {
    model_profile: string;
    commit_docs: boolean;
    parallelization: boolean;
    search_gitignored: boolean;
    brave_search: boolean;
    firecrawl: boolean;
    exa_search: boolean;
    git: GitConfig;
    workflow: WorkflowConfig;
    hooks: HooksConfig;
    agent_skills: Record<string, unknown>;
    /** Project slug for branch templates; mirrors gsd-tools `config.project_code`. */
    project_code?: string | null;
    /** Interactive vs headless; mirrors gsd-tools flat `config.mode`. */
    mode?: string;
    /** Internal auto-chain flag; mirrors gsd-tools `config._auto_chain_active`. */
    _auto_chain_active?: boolean;
    [key: string]: unknown;
}
export declare const CONFIG_DEFAULTS: GSDConfig;
export declare function loadConfig(projectDir: string, workstream?: string): Promise<GSDConfig>;
//# sourceMappingURL=config.d.ts.map