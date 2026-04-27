/**
 * Complex init composition handlers — the 3 heavyweight init commands
 * that require deep filesystem scanning and ROADMAP.md parsing.
 *
 * Composes existing atomic SDK queries into the same flat JSON bundles
 * that CJS init.cjs produces for the new-project, progress, and manager
 * workflows.
 *
 * Port of get-shit-done/bin/lib/init.cjs cmdInitNewProject (lines 296-399),
 * cmdInitProgress (lines 1139-1284), cmdInitManager (lines 854-1137).
 *
 * @example
 * ```typescript
 * import { initProgress, initManager } from './init-complex.js';
 *
 * const result = await initProgress([], '/project');
 * // { data: { phases: [...], milestone_version: 'v3.0', ... } }
 * ```
 */
import type { QueryHandler } from './utils.js';
/**
 * Init handler for new-project workflow.
 *
 * Detects brownfield state (existing code, package files, git), checks
 * search API availability, and resolves project researcher models.
 *
 * Port of cmdInitNewProject from init.cjs lines 296-399.
 */
export declare const initNewProject: QueryHandler;
/**
 * Init handler for progress workflow.
 *
 * Builds phase list with plan/summary counts and paused state detection.
 *
 * Port of cmdInitProgress from init.cjs lines 1139-1284.
 */
export declare const initProgress: QueryHandler;
/**
 * Init handler for manager workflow.
 *
 * Parses ROADMAP.md for all phases, computes disk status, dependency
 * graph, and recommended actions per phase.
 *
 * Port of cmdInitManager from init.cjs lines 854-1137.
 */
export declare const initManager: QueryHandler;
//# sourceMappingURL=init-complex.d.ts.map