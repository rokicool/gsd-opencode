/**
 * Init composition handlers — compound init commands for workflow bootstrapping.
 *
 * Composes existing atomic SDK queries into the same flat JSON bundles
 * that CJS init.cjs produces, enabling workflow migration. Each handler
 * follows the QueryHandler signature and returns { data: <flat JSON> }.
 *
 * Port of get-shit-done/bin/lib/init.cjs (13 of 16 handlers).
 * The 3 complex handlers (new-project, progress, manager) are in init-complex.ts.
 *
 * @example
 * ```typescript
 * import { initExecutePhase, withProjectRoot } from './init.js';
 *
 * const result = await initExecutePhase(['9'], '/project');
 * // { data: { executor_model: 'opus', phase_found: true, ... } }
 * ```
 */
import type { QueryHandler } from './utils.js';
/**
 * Inject project_root, agents_installed, missing_agents, and response_language
 * into an init result object.
 *
 * Port of withProjectRoot from init.cjs lines 32-63.
 *
 * @param projectDir - Absolute project root path
 * @param result - The result object to augment
 * @param config - Optional loaded config (avoids re-reading config.json)
 * @returns The augmented result object
 */
export declare function withProjectRoot(projectDir: string, result: Record<string, unknown>, config?: Record<string, unknown>): Record<string, unknown>;
/**
 * Init handler for execute-phase workflow.
 * Port of cmdInitExecutePhase from init.cjs lines 50-171.
 */
export declare const initExecutePhase: QueryHandler;
/**
 * Init handler for plan-phase workflow.
 * Port of cmdInitPlanPhase from init.cjs lines 173-293.
 */
export declare const initPlanPhase: QueryHandler;
/**
 * Init handler for new-milestone workflow.
 * Port of cmdInitNewMilestone from init.cjs lines 401-446.
 */
export declare const initNewMilestone: QueryHandler;
/**
 * Init handler for quick workflow.
 * Port of cmdInitQuick from init.cjs lines 448-504.
 */
export declare const initQuick: QueryHandler;
/**
 * Init handler for resume-project workflow.
 * Port of cmdInitResume from init.cjs lines 506-536.
 */
export declare const initResume: QueryHandler;
/**
 * Init handler for verify-work workflow.
 * Port of cmdInitVerifyWork from init.cjs lines 538-586.
 */
export declare const initVerifyWork: QueryHandler;
/**
 * Init handler for discuss-phase and similar phase operations.
 * Port of cmdInitPhaseOp from init.cjs lines 588-697.
 */
export declare const initPhaseOp: QueryHandler;
/**
 * Init handler for check-todos and add-todo workflows.
 * Port of cmdInitTodos from init.cjs lines 699-756.
 */
export declare const initTodos: QueryHandler;
/**
 * Init handler for complete-milestone and audit-milestone workflows.
 * Port of cmdInitMilestoneOp from init.cjs lines 758-817.
 */
export declare const initMilestoneOp: QueryHandler;
/**
 * Init handler for map-codebase workflow.
 * Port of cmdInitMapCodebase from init.cjs lines 819-852.
 */
export declare const initMapCodebase: QueryHandler;
/**
 * Init handler for new-workspace workflow.
 * Port of cmdInitNewWorkspace from init.cjs lines 1311-1335.
 * T-14-01: Validates workspace name rejects path separators.
 */
export declare const initNewWorkspace: QueryHandler;
/**
 * Init handler for list-workspaces workflow.
 * Port of cmdInitListWorkspaces from init.cjs lines 1337-1381.
 */
export declare const initListWorkspaces: QueryHandler;
/**
 * Init handler for remove-workspace workflow.
 * Port of cmdInitRemoveWorkspace from init.cjs lines 1383-1443.
 * T-14-01: Validates workspace name rejects path separators and '..' sequences.
 */
export declare const initRemoveWorkspace: QueryHandler;
/**
 * Init handler for ingest-docs workflow.
 * Mirrors `initResume` shape but without current-agent-id lookup — the
 * ingest-docs workflow reads `project_exists`, `planning_exists`, `has_git`,
 * and `project_path` to branch between new-project vs merge-milestone modes.
 */
export declare const initIngestDocs: QueryHandler;
//# sourceMappingURL=init.d.ts.map