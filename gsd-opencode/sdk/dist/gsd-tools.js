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
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { GSDError, exitCodeFor } from './errors.js';
import { createRegistry } from './query/index.js';
import { resolveQueryArgv } from './query/registry.js';
import { normalizeQueryCommand } from './query/normalize-query-command.js';
import { formatStateLoadRawStdout } from './query/state-project-load.js';
// ─── Error type ──────────────────────────────────────────────────────────────
export class GSDToolsError extends Error {
    command;
    args;
    exitCode;
    stderr;
    constructor(message, command, args, exitCode, stderr, options) {
        super(message, options);
        this.command = command;
        this.args = args;
        this.exitCode = exitCode;
        this.stderr = stderr;
        this.name = 'GSDToolsError';
    }
}
// ─── GSDTools class ──────────────────────────────────────────────────────────
const DEFAULT_TIMEOUT_MS = 30_000;
const BUNDLED_GSD_TOOLS_PATH = fileURLToPath(new URL('../../get-shit-done/bin/gsd-tools.cjs', import.meta.url));
function formatRegistryRawStdout(matchedCmd, data) {
    if (matchedCmd === 'state.load') {
        return formatStateLoadRawStdout(data);
    }
    if (matchedCmd === 'commit') {
        const d = data;
        if (d.committed === true) {
            return d.hash != null ? String(d.hash) : 'committed';
        }
        if (d.committed === false) {
            const r = String(d.reason ?? '');
            if (r.includes('commit_docs') ||
                r.includes('skipped') ||
                r.includes('gitignored') ||
                r === 'skipped_commit_docs_false') {
                return 'skipped';
            }
            if (r.includes('nothing') || r.includes('nothing_to_commit')) {
                return 'nothing';
            }
            return r || 'nothing';
        }
        return JSON.stringify(data, null, 2);
    }
    if (matchedCmd === 'config-set') {
        const d = data;
        if ((d.updated === true || d.set === true) && d.key !== undefined) {
            const v = d.value;
            if (v === null || v === undefined) {
                return `${d.key}=`;
            }
            if (typeof v === 'object') {
                return `${d.key}=${JSON.stringify(v)}`;
            }
            return `${d.key}=${String(v)}`;
        }
        return JSON.stringify(data, null, 2);
    }
    if (matchedCmd === 'state.begin-phase' || matchedCmd === 'state begin-phase') {
        const d = data;
        const u = d.updated;
        return Array.isArray(u) && u.length > 0 ? 'true' : 'false';
    }
    if (typeof data === 'string') {
        return data;
    }
    return JSON.stringify(data, null, 2);
}
export class GSDTools {
    projectDir;
    gsdToolsPath;
    timeoutMs;
    workstream;
    registry;
    preferNativeQuery;
    constructor(opts) {
        this.projectDir = opts.projectDir;
        this.gsdToolsPath =
            opts.gsdToolsPath ?? resolveGsdToolsPath(opts.projectDir);
        this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        this.workstream = opts.workstream;
        this.preferNativeQuery = opts.preferNativeQuery ?? true;
        this.registry = createRegistry(opts.eventStream, opts.sessionId);
    }
    shouldUseNativeQuery() {
        return this.preferNativeQuery && !this.workstream;
    }
    nativeMatch(command, args) {
        const [normCmd, normArgs] = normalizeQueryCommand(command, args);
        const tokens = [normCmd, ...normArgs];
        return resolveQueryArgv(tokens, this.registry);
    }
    toToolsError(command, args, err) {
        if (err instanceof GSDError) {
            return new GSDToolsError(err.message, command, args, exitCodeFor(err.classification), '', { cause: err });
        }
        const msg = err instanceof Error ? err.message : String(err);
        return new GSDToolsError(msg, command, args, 1, '', err instanceof Error ? { cause: err } : undefined);
    }
    /**
     * Enforce {@link GSDTools.timeoutMs} for in-process registry dispatches so native
     * routing cannot hang indefinitely (subprocess path already uses `execFile` timeout).
     */
    async withRegistryDispatchTimeout(legacyCommand, legacyArgs, work) {
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new GSDToolsError(`gsd-tools timed out after ${this.timeoutMs}ms: ${legacyCommand} ${legacyArgs.join(' ')}`, legacyCommand, legacyArgs, null, ''));
            }, this.timeoutMs);
        });
        try {
            // Promise.race rejects when the timeout fires but does not cancel the handler promise;
            // native handlers may still run to completion (unlike subprocess + execFile timeout).
            return await Promise.race([work, timeoutPromise]);
        }
        finally {
            if (timeoutId !== undefined) {
                clearTimeout(timeoutId);
            }
        }
    }
    /**
     * Direct registry dispatch for a known handler key — skips `resolveQueryArgv` on the hot path
     * used by PhaseRunner / InitRunner (`initPhaseOp`, `phasePlanIndex`, etc.).
     * When native query is off (e.g. workstream or tests with `preferNativeQuery: false`), delegates to `exec`.
     *
     * When native query is on, `registry.dispatch` failures are wrapped as {@link GSDToolsError} and
     * **not** retried via the legacy `gsd-tools.cjs` subprocess — callers see the handler error
     * explicitly. Only commands with no registry match fall through to subprocess routing in {@link exec}.
     */
    async dispatchNativeJson(legacyCommand, legacyArgs, registryCmd, registryArgs) {
        if (!this.shouldUseNativeQuery()) {
            return this.exec(legacyCommand, legacyArgs);
        }
        try {
            const result = await this.withRegistryDispatchTimeout(legacyCommand, legacyArgs, this.registry.dispatch(registryCmd, registryArgs, this.projectDir));
            return result.data;
        }
        catch (err) {
            if (err instanceof GSDToolsError)
                throw err;
            throw this.toToolsError(legacyCommand, legacyArgs, err);
        }
    }
    /**
     * Same as {@link dispatchNativeJson} for handlers whose CLI contract is raw stdout (`execRaw`),
     * including the same “no silent fallback to CJS on handler failure” behaviour.
     */
    async dispatchNativeRaw(legacyCommand, legacyArgs, registryCmd, registryArgs) {
        if (!this.shouldUseNativeQuery()) {
            return this.execRaw(legacyCommand, legacyArgs);
        }
        try {
            const result = await this.withRegistryDispatchTimeout(legacyCommand, legacyArgs, this.registry.dispatch(registryCmd, registryArgs, this.projectDir));
            return formatRegistryRawStdout(registryCmd, result.data).trim();
        }
        catch (err) {
            if (err instanceof GSDToolsError)
                throw err;
            throw this.toToolsError(legacyCommand, legacyArgs, err);
        }
    }
    // ─── Core exec ───────────────────────────────────────────────────────────
    /**
     * Execute a gsd-tools command and return parsed JSON output.
     * Handles the `@file:` prefix pattern for large results.
     *
     * With native query enabled, a matching registry handler runs in-process;
     * if that handler throws, the error is surfaced (no automatic fallback to `gsd-tools.cjs`).
     */
    async exec(command, args = []) {
        if (this.shouldUseNativeQuery()) {
            const matched = this.nativeMatch(command, args);
            if (matched) {
                try {
                    const result = await this.withRegistryDispatchTimeout(command, args, this.registry.dispatch(matched.cmd, matched.args, this.projectDir));
                    return result.data;
                }
                catch (err) {
                    if (err instanceof GSDToolsError)
                        throw err;
                    throw this.toToolsError(command, args, err);
                }
            }
        }
        const wsArgs = this.workstream ? ['--ws', this.workstream] : [];
        const fullArgs = [this.gsdToolsPath, command, ...args, ...wsArgs];
        return new Promise((resolve, reject) => {
            const child = execFile(process.execPath, fullArgs, {
                cwd: this.projectDir,
                maxBuffer: 10 * 1024 * 1024, // 10MB
                timeout: this.timeoutMs,
                env: { ...process.env },
            }, async (error, stdout, stderr) => {
                const stderrStr = stderr?.toString() ?? '';
                if (error) {
                    if (error.killed || error.code === 'ETIMEDOUT') {
                        reject(new GSDToolsError(`gsd-tools timed out after ${this.timeoutMs}ms: ${command} ${args.join(' ')}`, command, args, null, stderrStr));
                        return;
                    }
                    reject(new GSDToolsError(`gsd-tools exited with code ${error.code ?? 'unknown'}: ${command} ${args.join(' ')}${stderrStr ? `\n${stderrStr}` : ''}`, command, args, typeof error.code === 'number' ? error.code : error.status ?? 1, stderrStr));
                    return;
                }
                const raw = stdout?.toString() ?? '';
                try {
                    const parsed = await this.parseOutput(raw);
                    resolve(parsed);
                }
                catch (parseErr) {
                    reject(new GSDToolsError(`Failed to parse gsd-tools output for "${command}": ${parseErr instanceof Error ? parseErr.message : String(parseErr)}\nRaw output: ${raw.slice(0, 500)}`, command, args, 0, stderrStr));
                }
            });
            child.on('error', (err) => {
                reject(new GSDToolsError(`Failed to execute gsd-tools: ${err.message}`, command, args, null, ''));
            });
        });
    }
    /**
     * Parse gsd-tools output, handling `@file:` prefix.
     */
    async parseOutput(raw) {
        const trimmed = raw.trim();
        if (trimmed === '') {
            return null;
        }
        let jsonStr = trimmed;
        if (jsonStr.startsWith('@file:')) {
            const filePath = jsonStr.slice(6).trim();
            try {
                jsonStr = await readFile(filePath, 'utf-8');
            }
            catch (err) {
                const reason = err instanceof Error ? err.message : String(err);
                throw new Error(`Failed to read gsd-tools @file: indirection at "${filePath}": ${reason}`);
            }
        }
        return JSON.parse(jsonStr);
    }
    // ─── Raw exec (no JSON parsing) ───────────────────────────────────────
    /**
     * Execute a gsd-tools command and return raw stdout without JSON parsing.
     * Use for commands like `config-set` that return plain text, not JSON.
     */
    async execRaw(command, args = []) {
        if (this.shouldUseNativeQuery()) {
            const matched = this.nativeMatch(command, args);
            if (matched) {
                try {
                    const result = await this.withRegistryDispatchTimeout(command, args, this.registry.dispatch(matched.cmd, matched.args, this.projectDir));
                    return formatRegistryRawStdout(matched.cmd, result.data).trim();
                }
                catch (err) {
                    if (err instanceof GSDToolsError)
                        throw err;
                    throw this.toToolsError(command, args, err);
                }
            }
        }
        const wsArgs = this.workstream ? ['--ws', this.workstream] : [];
        const fullArgs = [this.gsdToolsPath, command, ...args, ...wsArgs, '--raw'];
        return new Promise((resolve, reject) => {
            const child = execFile(process.execPath, fullArgs, {
                cwd: this.projectDir,
                maxBuffer: 10 * 1024 * 1024,
                timeout: this.timeoutMs,
                env: { ...process.env },
            }, (error, stdout, stderr) => {
                const stderrStr = stderr?.toString() ?? '';
                if (error) {
                    reject(new GSDToolsError(`gsd-tools exited with code ${error.code ?? 'unknown'}: ${command} ${args.join(' ')}${stderrStr ? `\n${stderrStr}` : ''}`, command, args, typeof error.code === 'number' ? error.code : error.status ?? 1, stderrStr));
                    return;
                }
                resolve((stdout?.toString() ?? '').trim());
            });
            child.on('error', (err) => {
                reject(new GSDToolsError(`Failed to execute gsd-tools: ${err.message}`, command, args, null, ''));
            });
        });
    }
    // ─── Typed convenience methods ─────────────────────────────────────────
    async stateLoad() {
        return this.dispatchNativeRaw('state', ['load'], 'state.load', []);
    }
    async roadmapAnalyze() {
        return this.exec('roadmap', ['analyze']);
    }
    async phaseComplete(phase) {
        return this.dispatchNativeRaw('phase', ['complete', phase], 'phase.complete', [phase]);
    }
    async commit(message, files) {
        const args = [message];
        if (files?.length) {
            args.push('--files', ...files);
        }
        return this.dispatchNativeRaw('commit', args, 'commit', args);
    }
    async verifySummary(path) {
        return this.execRaw('verify-summary', [path]);
    }
    async initExecutePhase(phase) {
        return this.execRaw('state', ['begin-phase', '--phase', phase]);
    }
    /**
     * Query phase state from gsd-tools.cjs `init phase-op`.
     * Returns a typed PhaseOpInfo describing what exists on disk for this phase.
     */
    async initPhaseOp(phaseNumber) {
        const result = await this.dispatchNativeJson('init', ['phase-op', phaseNumber], 'init.phase-op', [phaseNumber]);
        return result;
    }
    /**
     * Get a config value via the `config-get` surface (CJS and registry use the same key path).
     */
    async configGet(key) {
        const result = await this.dispatchNativeJson('config-get', [key], 'config-get', [key]);
        return result;
    }
    /**
     * Begin phase state tracking in gsd-tools.cjs.
     */
    async stateBeginPhase(phaseNumber) {
        return this.execRaw('state', ['begin-phase', '--phase', phaseNumber]);
    }
    /**
     * Get the plan index for a phase, grouping plans into dependency waves.
     * Returns typed PhasePlanIndex with wave assignments and completion status.
     */
    async phasePlanIndex(phaseNumber) {
        const result = await this.dispatchNativeJson('phase-plan-index', [phaseNumber], 'phase-plan-index', [phaseNumber]);
        return result;
    }
    /**
     * Query new-project init state from gsd-tools.cjs `init new-project`.
     * Returns project metadata, model configs, brownfield detection, etc.
     */
    async initNewProject() {
        const result = await this.dispatchNativeJson('init', ['new-project'], 'init.new-project', []);
        return result;
    }
    /**
     * Set a config value via gsd-tools.cjs `config-set`.
     * Handles type coercion (booleans, numbers, JSON) on the gsd-tools side.
     * Note: config-set returns `key=value` text, not JSON, so we use execRaw.
     */
    async configSet(key, value) {
        return this.dispatchNativeRaw('config-set', [key, value], 'config-set', [key, value]);
    }
}
/**
 * Run `gsd-sdk query` semantics in-process: normalize argv, resolve registry, dispatch.
 * Returns handler JSON payload (same as stdout from the `gsd-sdk query` CLI without `--pick`).
 */
export async function runGsdToolsQuery(projectDir, queryArgv) {
    const { createRegistry } = await import('./query/index.js');
    const { resolveQueryArgv } = await import('./query/registry.js');
    const { normalizeQueryCommand } = await import('./query/normalize-query-command.js');
    const { GSDError, ErrorClassification } = await import('./errors.js');
    if (queryArgv.length === 0 || !queryArgv[0]) {
        throw new GSDError('runGsdToolsQuery requires a command', ErrorClassification.Validation);
    }
    const queryCommand = queryArgv[0];
    const [normCmd, normArgs] = normalizeQueryCommand(queryCommand, queryArgv.slice(1));
    const registry = createRegistry();
    const tokens = [normCmd, ...normArgs];
    const matched = resolveQueryArgv(tokens, registry);
    if (!matched) {
        throw new GSDError(`Unknown command: "${tokens.join(' ')}". No native handler registered.`, ErrorClassification.Validation);
    }
    const result = await registry.dispatch(matched.cmd, matched.args, projectDir);
    return result.data;
}
// ─── Path resolution ────────────────────────────────────────────────────────
/**
 * Resolve gsd-tools.cjs path.
 * Probe order: SDK-bundled repo copy → `project/.OpenCode/get-shit-done/` →
 * `$HOME/.config/opencode/get-shit-done/`.
 */
export function resolveGsdToolsPath(projectDir) {
    const candidates = [
        BUNDLED_GSD_TOOLS_PATH,
        join(projectDir, '.OpenCode', 'get-shit-done', 'bin', 'gsd-tools.cjs'),
        join(homedir(), '.OpenCode', 'get-shit-done', 'bin', 'gsd-tools.cjs'),
    ];
    return candidates.find(candidate => existsSync(candidate)) ?? candidates[candidates.length - 1];
}
//# sourceMappingURL=gsd-tools.js.map