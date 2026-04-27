/**
 * Shared query helpers — cross-cutting utility functions used across query modules.
 *
 * Ported from get-shit-done/bin/lib/core.cjs and state.cjs.
 * Provides phase name normalization, path handling, regex escaping,
 * and STATE.md field extraction.
 *
 * @example
 * ```typescript
 * import { normalizePhaseName, planningPaths } from './helpers.js';
 *
 * normalizePhaseName('9');     // '09'
 * normalizePhaseName('CK-01'); // '01'
 *
 * const paths = planningPaths('/project');
 * // { planning: '/project/.planning', state: '/project/.planning/STATE.md', ... }
 * ```
 */
/**
 * Supported GSD runtimes. Kept in sync with `bin/install.js:getGlobalDir()`.
 */
export declare const SUPPORTED_RUNTIMES: readonly ["claude", "opencode", "kilo", "gemini", "codex", "copilot", "antigravity", "cursor", "windsurf", "augment", "trae", "qwen", "codebuddy", "cline"];
export type Runtime = (typeof SUPPORTED_RUNTIMES)[number];
/**
 * Resolve the per-runtime config directory, mirroring
 * `bin/install.js:getGlobalDir()`. Agents live at `<configDir>/agents`.
 */
export declare function getRuntimeConfigDir(runtime: Runtime): string;
/**
 * Detect the invoking runtime using issue #2402 precedence:
 *   1. `GSD_RUNTIME` env var
 *   2. `config.runtime` field (from `.planning/config.json` when loaded)
 *   3. Fallback to `'claude'`
 *
 * Unknown values fall through to the next tier rather than throwing, so
 * stale env values don't hard-block workflows.
 */
export declare function detectRuntime(config?: {
    runtime?: unknown;
}): Runtime;
/**
 * Resolve the GSD agents directory for a given runtime.
 *
 * Precedence:
 *   1. `GSD_AGENTS_DIR` — explicit SDK override (wins over runtime selection)
 *   2. `<getRuntimeConfigDir(runtime)>/agents` — installer-parity default
 *
 * Defaults to Claude when no runtime is passed, matching prior behavior
 * (see `init-runner.ts`, which is Claude-only by design).
 */
export declare function resolveAgentsDir(runtime?: Runtime): string;
/** Paths to common .planning files. */
export interface PlanningPaths {
    planning: string;
    state: string;
    roadmap: string;
    project: string;
    config: string;
    phases: string;
    requirements: string;
}
/**
 * Escape regex special characters in a string.
 *
 * @param value - String to escape
 * @returns String with regex special characters escaped
 */
export declare function escapeRegex(value: string): string;
/**
 * Normalize a phase identifier to a canonical form.
 *
 * Strips optional project code prefix (e.g., 'CK-01' -> '01'),
 * pads numeric part to 2 digits, preserves letter suffix and decimal parts.
 *
 * @param phase - Phase identifier string
 * @returns Normalized phase name
 */
export declare function normalizePhaseName(phase: string): string;
/**
 * Compare two phase directory names for sorting.
 *
 * Handles numeric, letter-suffixed, and decimal phases.
 * Falls back to string comparison for custom IDs.
 *
 * @param a - First phase directory name
 * @param b - Second phase directory name
 * @returns Negative if a < b, positive if a > b, 0 if equal
 */
export declare function comparePhaseNum(a: string, b: string): number;
/**
 * Extract the phase token from a directory name.
 *
 * Supports: '01-name', '1009A-name', '999.6-name', 'CK-01-name', 'PROJ-42-name'.
 *
 * @param dirName - Directory name to extract token from
 * @returns The token portion (e.g. '01', '1009A', '999.6', 'PROJ-42')
 */
export declare function extractPhaseToken(dirName: string): string;
/**
 * Check if a directory name's phase token matches the normalized phase exactly.
 *
 * Case-insensitive comparison for the token portion.
 *
 * @param dirName - Directory name to check
 * @param normalized - Normalized phase name to match against
 * @returns True if the directory matches the phase
 */
export declare function phaseTokenMatches(dirName: string, normalized: string): boolean;
/**
 * Convert a path to POSIX format (forward slashes).
 *
 * @param p - Path to convert
 * @returns Path with all separators as forward slashes
 */
export declare function toPosixPath(p: string): string;
/**
 * Extract a field value from STATE.md content.
 *
 * Supports both **bold:** and plain: formats, case-insensitive.
 *
 * @param content - STATE.md content string
 * @param fieldName - Field name to extract
 * @returns The field value, or null if not found
 */
export declare function stateExtractField(content: string, fieldName: string): string | null;
/**
 * Normalize markdown content for consistent formatting.
 *
 * Port of `normalizeMd` from core.cjs lines 434-529.
 * Applies: CRLF normalization, blank lines around headings/fences/lists,
 * blank line collapsing (3+ to 2), terminal newline.
 *
 * @param content - Markdown content to normalize
 * @returns Normalized markdown string
 */
export declare function normalizeMd(content: string): string;
/**
 * Get common .planning file paths for a project directory.
 *
 * When `workstream` is provided, all paths are rooted under
 * `.planning/workstreams/<workstream>` instead of `.planning`.
 * All paths returned in POSIX format.
 *
 * @param projectDir - Root project directory
 * @param workstream - Optional workstream name (see relPlanningPath)
 * @returns Object with paths to common .planning files
 */
export declare function planningPaths(projectDir: string, workstream?: string): PlanningPaths;
/**
 * Walk up from `startDir` to find the project root that owns `.planning/`.
 *
 * Ported from `get-shit-done/bin/lib/core.cjs:findProjectRoot` so that
 * `gsd-sdk query` resolves the same parent `.planning/` root as the legacy
 * `gsd-tools.cjs` CLI when invoked inside a `sub_repos`-listed child repo.
 *
 * Detection strategy (checked in order for each ancestor, up to
 * `FIND_PROJECT_ROOT_MAX_DEPTH` levels):
 *   1. `startDir` itself has `.planning/` — return it unchanged (#1362).
 *   2. Parent has `.planning/config.json` with `sub_repos` listing the
 *      immediate child segment of the starting directory.
 *   3. Parent has `.planning/config.json` with `multiRepo: true` (legacy).
 *   4. Parent has `.planning/` AND an ancestor of `startDir` (up to the
 *      candidate parent) contains `.git` — heuristic fallback.
 *
 * Returns `startDir` unchanged when no ancestor `.planning/` is found
 * (first-run or single-repo projects). Never walks above the user's home
 * directory.
 *
 * All filesystem errors are swallowed — a missing or unparseable
 * `config.json` falls back to the `.git` heuristic, and unreadable
 * directories terminate the walk at that level.
 */
export declare function findProjectRoot(startDir: string): string;
/**
 * Resolve a user-supplied path against the project and ensure it cannot escape
 * the real project root (prefix checks are insufficient; symlinks are handled
 * via realpath).
 *
 * @param projectDir - Project root directory
 * @param userPath - Relative or absolute path from user input
 * @returns Canonical resolved path within the project
 */
export declare function resolvePathUnderProject(projectDir: string, userPath: string): Promise<string>;
/** Port of `sanitizeForPrompt` from `security.cjs`. */
export declare function sanitizeForPrompt(text: string): string;
/** Port of `sanitizeForDisplay` from `security.cjs` (matches CLI JSON). */
export declare function sanitizeForDisplay(text: string): string;
//# sourceMappingURL=helpers.d.ts.map