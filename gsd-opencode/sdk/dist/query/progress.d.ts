/**
 * Progress query handlers — milestone progress rendering in JSON format.
 *
 * Ported from get-shit-done/bin/lib/commands.cjs (cmdProgressRender, determinePhaseStatus).
 * Provides progress handler that scans disk for plan/summary counts per phase
 * and determines status via VERIFICATION.md inspection.
 *
 * @example
 * ```typescript
 * import { progressJson } from './progress.js';
 *
 * const result = await progressJson([], '/project');
 * // { data: { milestone_version: 'v3.0', phases: [...], total_plans: 6, percent: 83 } }
 * ```
 */
import type { QueryHandler } from './utils.js';
/**
 * Determine the status of a phase based on plan/summary counts and verification state.
 *
 * Port of determinePhaseStatus from commands.cjs lines 15-36.
 *
 * @param plans - Number of PLAN.md files in the phase directory
 * @param summaries - Number of SUMMARY.md files in the phase directory
 * @param phaseDir - Absolute path to the phase directory
 * @returns Status string: Pending, Planned, In Progress, Executed, Complete, Needs Review
 */
export declare function determinePhaseStatus(plans: number, summaries: number, phaseDir: string, defaultWhenNoPlans?: string): Promise<string>;
/**
 * Query handler for progress / progress.json.
 *
 * Port of cmdProgressRender (JSON format) from commands.cjs lines 535-597.
 * Scans phases directory, counts plans/summaries, determines status per phase.
 *
 * @param args - Unused
 * @param projectDir - Project root directory
 * @returns QueryResult with milestone progress data
 */
export declare const progressJson: QueryHandler;
/**
 * Progress bar line — port of `cmdProgressRender` `format === 'bar'` from commands.cjs (lines 588–593).
 * Uses the same plan/summary counts as `progressJson` / CJS (not `roadmap.analyze` percent).
 */
export declare const progressBar: QueryHandler;
/**
 * Markdown progress table — port of `cmdProgressRender` `format === 'table'` from commands.cjs (lines 575–587).
 */
export declare const progressTable: QueryHandler;
/**
 * Statistics aggregate — port of `cmdStats` JSON/table output from commands.cjs lines 816–971.
 */
export declare const statsJson: QueryHandler;
/**
 * Markdown statistics table — port of `cmdStats` `format === 'table'` from commands.cjs (lines 942–967).
 * Delegates to `statsJson` with `['table']` (same `rendered` string as CJS).
 */
export declare const statsTable: QueryHandler;
/**
 * Match pending todos against a phase — port of `cmdTodoMatchPhase` from commands.cjs lines 612–729.
 */
export declare const todoMatchPhase: QueryHandler;
/**
 * List pending todos from .planning/todos/pending/, optionally filtered by area.
 *
 * Port of `cmdListTodos` from commands.cjs lines 74-109.
 *
 * @param args - args[0]: optional area filter
 */
export declare const listTodos: QueryHandler;
/**
 * Move a todo from pending to completed, adding a completion timestamp.
 *
 * Port of `cmdTodoComplete` from commands.cjs lines 724-749.
 *
 * @param args - args[0]: filename (required)
 */
export declare const todoComplete: QueryHandler;
//# sourceMappingURL=progress.d.ts.map