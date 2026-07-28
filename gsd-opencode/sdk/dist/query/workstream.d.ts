/**
 * Workstream query handlers — list, get, create, set, status, complete, progress.
 *
 * Ported from get-shit-done/bin/lib/workstream.cjs.
 * Manages .planning/workstreams/ directory for multi-workstream projects.
 *
 * @example
 * ```typescript
 * import { workstreamList, workstreamCreate } from './workstream.js';
 *
 * await workstreamList([], '/project');
 * // { data: { workstreams: ['backend', 'frontend'], count: 2 } }
 *
 * await workstreamCreate(['api'], '/project');
 * // { data: { created: true, name: 'api', path: '.planning/workstreams/api' } }
 * ```
 */
import type { QueryHandler } from './utils.js';
/**
 * Current active workstream and mode (flat vs workstream).
 *
 * Port of `cmdWorkstreamGet` from `workstream.cjs` lines 367–371.
 */
export declare const workstreamGet: QueryHandler;
export declare const workstreamList: QueryHandler;
export declare const workstreamCreate: QueryHandler;
export declare const workstreamSet: QueryHandler;
export declare const workstreamStatus: QueryHandler;
export declare const workstreamComplete: QueryHandler;
/**
 * Port of `cmdWorkstreamProgress` from `workstream.cjs` — aggregate status for each workstream.
 * (Not the same as roadmap `progress` / `progressBar`.)
 */
export declare const workstreamProgress: QueryHandler;
//# sourceMappingURL=workstream.d.ts.map