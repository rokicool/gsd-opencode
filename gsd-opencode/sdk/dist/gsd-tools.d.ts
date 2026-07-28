/**
 * GSD Tools Bridge — programmatic access to GSD planning operations.
 *
 * By default routes commands through the SDK **query registry** (same handlers as
 * `gsd-sdk query`) so `PhaseRunner`, `InitRunner`, and `GSD` share contracts with
 * the typed CLI. Runner hot-path helpers (`initPhaseOp`, `phasePlanIndex`,
 * `phaseComplete`, `initNewProject`, `configSet`, `commit`) call
 * `registry.dispatch()` with canonical keys when native query is active, avoiding
 * repeated argv resolution. When a workstream is set, dispatches to `gsd-tools.cjs` so
 * workstream env stays aligned with CJS.
 */
import type { InitNewProjectInfo, PhaseOpInfo, PhasePlanIndex, RoadmapAnalysis } from './types.js';
import type { GSDEventStream } from './event-stream.js';
export declare class GSDToolsError extends Error {
    readonly command: string;
    readonly args: string[];
    readonly exitCode: number | null;
    readonly stderr: string;
    constructor(message: string, command: string, args: string[], exitCode: number | null, stderr: string, options?: {
        cause?: unknown;
    });
}
export declare class GSDTools {
    private readonly projectDir;
    private readonly gsdToolsPath;
    private readonly timeoutMs;
    private readonly workstream?;
    private readonly registry;
    private readonly preferNativeQuery;
    constructor(opts: {
        projectDir: string;
        gsdToolsPath?: string;
        timeoutMs?: number;
        workstream?: string;
        /** When set, mutation handlers emit the same events as `gsd-sdk query`. */
        eventStream?: GSDEventStream;
        /** Correlation id for mutation events when `eventStream` is set. */
        sessionId?: string;
        /**
         * When true (default), route known commands through the SDK query registry.
         * Set false in tests that substitute a mock `gsdToolsPath` script.
         */
        preferNativeQuery?: boolean;
    });
    private shouldUseNativeQuery;
    private nativeMatch;
    private toToolsError;
    /**
     * Enforce {@link GSDTools.timeoutMs} for in-process registry dispatches so native
     * routing cannot hang indefinitely (subprocess path already uses `execFile` timeout).
     */
    private withRegistryDispatchTimeout;
    /**
     * Direct registry dispatch for a known handler key — skips `resolveQueryArgv` on the hot path
     * used by PhaseRunner / InitRunner (`initPhaseOp`, `phasePlanIndex`, etc.).
     * When native query is off (e.g. workstream or tests with `preferNativeQuery: false`), delegates to `exec`.
     *
     * When native query is on, `registry.dispatch` failures are wrapped as {@link GSDToolsError} and
     * **not** retried via the legacy `gsd-tools.cjs` subprocess — callers see the handler error
     * explicitly. Only commands with no registry match fall through to subprocess routing in {@link exec}.
     */
    private dispatchNativeJson;
    /**
     * Same as {@link dispatchNativeJson} for handlers whose CLI contract is raw stdout (`execRaw`),
     * including the same “no silent fallback to CJS on handler failure” behaviour.
     */
    private dispatchNativeRaw;
    /**
     * Execute a gsd-tools command and return parsed JSON output.
     * Handles the `@file:` prefix pattern for large results.
     *
     * With native query enabled, a matching registry handler runs in-process;
     * if that handler throws, the error is surfaced (no automatic fallback to `gsd-tools.cjs`).
     */
    exec(command: string, args?: string[]): Promise<unknown>;
    /**
     * Parse gsd-tools output, handling `@file:` prefix.
     */
    private parseOutput;
    /**
     * Execute a gsd-tools command and return raw stdout without JSON parsing.
     * Use for commands like `config-set` that return plain text, not JSON.
     */
    execRaw(command: string, args?: string[]): Promise<string>;
    stateLoad(): Promise<string>;
    roadmapAnalyze(): Promise<RoadmapAnalysis>;
    phaseComplete(phase: string): Promise<string>;
    commit(message: string, files?: string[]): Promise<string>;
    verifySummary(path: string): Promise<string>;
    initExecutePhase(phase: string): Promise<string>;
    /**
     * Query phase state from gsd-tools.cjs `init phase-op`.
     * Returns a typed PhaseOpInfo describing what exists on disk for this phase.
     */
    initPhaseOp(phaseNumber: string): Promise<PhaseOpInfo>;
    /**
     * Get a config value via the `config-get` surface (CJS and registry use the same key path).
     */
    configGet(key: string): Promise<string | null>;
    /**
     * Begin phase state tracking in gsd-tools.cjs.
     */
    stateBeginPhase(phaseNumber: string): Promise<string>;
    /**
     * Get the plan index for a phase, grouping plans into dependency waves.
     * Returns typed PhasePlanIndex with wave assignments and completion status.
     */
    phasePlanIndex(phaseNumber: string): Promise<PhasePlanIndex>;
    /**
     * Query new-project init state from gsd-tools.cjs `init new-project`.
     * Returns project metadata, model configs, brownfield detection, etc.
     */
    initNewProject(): Promise<InitNewProjectInfo>;
    /**
     * Set a config value via gsd-tools.cjs `config-set`.
     * Handles type coercion (booleans, numbers, JSON) on the gsd-tools side.
     * Note: config-set returns `key=value` text, not JSON, so we use execRaw.
     */
    configSet(key: string, value: string): Promise<string>;
}
/**
 * Run `gsd-sdk query` semantics in-process: normalize argv, resolve registry, dispatch.
 * Returns handler JSON payload (same as stdout from the `gsd-sdk query` CLI without `--pick`).
 */
export declare function runGsdToolsQuery(projectDir: string, queryArgv: string[]): Promise<unknown>;
/**
 * Resolve gsd-tools.cjs path.
 * Probe order: SDK-bundled repo copy → `project/.claude/get-shit-done/` →
 * `$HOME/.config/opencode/get-shit-done/`.
 */
export declare function resolveGsdToolsPath(projectDir: string): string;
//# sourceMappingURL=gsd-tools.d.ts.map