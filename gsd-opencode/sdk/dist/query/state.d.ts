/**
 * State query handlers — STATE.md loading, field extraction, and snapshots.
 *
 * Ported from get-shit-done/bin/lib/state.cjs and core.cjs.
 * Provides `state json` / `state.json` (rebuilt frontmatter JSON, `stateJson`), `state.get`
 * (field/section extraction), and state-snapshot (structured snapshot).
 *
 * @example
 * ```typescript
 * import { stateJson, stateGet, stateSnapshot } from './state.js';
 *
 * const loaded = await stateJson([], '/project');
 * // { data: { gsd_state_version: '1.0', milestone: 'v3.0', ... } }
 *
 * const field = await stateGet(['Status'], '/project');
 * // { data: { Status: 'executing' } }
 *
 * const snap = await stateSnapshot([], '/project');
 * // { data: { current_phase: '10', status: 'executing', decisions: [...], ... } }
 * ```
 */
import type { QueryHandler } from './utils.js';
/**
 * Build a filter function that checks if a phase directory belongs to the current milestone.
 *
 * Port of getMilestonePhaseFilter from core.cjs lines 1409-1442.
 */
export declare function getMilestonePhaseFilter(projectDir: string, workstream?: string): Promise<((dirName: string) => boolean) & {
    phaseCount: number;
}>;
/**
 * Build state frontmatter from STATE.md body content and disk scanning.
 *
 * Port of buildStateFrontmatter from state.cjs lines 650-760.
 * HIGH complexity: extracts fields, scans disk, computes progress.
 */
export declare function buildStateFrontmatter(bodyContent: string, projectDir: string, workstream?: string): Promise<Record<string, unknown>>;
/**
 * Query handler for `state json` / `state.json` (CJS `cmdStateJson`).
 *
 * Reads STATE.md, rebuilds frontmatter from body + disk scanning.
 * Returns cached frontmatter-only fields (stopped_at, paused_at) when not in body.
 *
 * Port of cmdStateJson from state.cjs lines 872-901.
 *
 * @param args - Unused
 * @param projectDir - Project root directory
 * @returns QueryResult with rebuilt state frontmatter
 */
export declare const stateJson: QueryHandler;
/**
 * Query handler for state.get.
 *
 * Reads STATE.md and extracts a specific field or section.
 * Returns full content when no field specified.
 *
 * Port of cmdStateGet from state.cjs lines 72-113.
 *
 * @param args - args[0] is optional field/section name
 * @param projectDir - Project root directory
 * @returns QueryResult with field value or full content
 */
export declare const stateGet: QueryHandler;
/**
 * Query handler for state-snapshot.
 *
 * Returns a structured snapshot of project state with decisions, blockers, and session.
 *
 * Port of cmdStateSnapshot from state.cjs lines 546-641.
 *
 * @param args - Unused
 * @param projectDir - Project root directory
 * @returns QueryResult with structured snapshot
 */
export declare const stateSnapshot: QueryHandler;
//# sourceMappingURL=state.d.ts.map