/**
 * Workspace-aware state resolution — scopes .planning/ paths to a
 * GSD_WORKSTREAM or GSD_PROJECT environment context.
 *
 * Port of planningDir() workspace logic from get-shit-done/bin/lib/core.cjs
 * (line 669+). Provides WorkspaceContext reading and validated path scoping.
 *
 * Security: workspace names are validated to reject path traversal (T-14-05).
 *
 * @example
 * ```typescript
 * import { resolveWorkspaceContext, workspacePlanningPaths } from './workspace.js';
 *
 * const ctx = resolveWorkspaceContext();
 * // { workstream: 'backend', project: null }
 *
 * const paths = workspacePlanningPaths('/my/project', ctx);
 * // paths.state → '/my/project/.planning/workstreams/backend/STATE.md'
 * ```
 */
import type { PlanningPaths } from './helpers.js';
/**
 * Resolved workspace context from environment variables.
 */
export interface WorkspaceContext {
    /** Active workstream name (from GSD_WORKSTREAM env var), or null */
    workstream: string | null;
    /** Active project name (from GSD_PROJECT env var), or null */
    project: string | null;
}
/**
 * read GSD_WORKSTREAM and GSD_PROJECT environment variables.
 *
 * Returns a WorkspaceContext with null values when the env vars are not set.
 *
 * @returns Resolved workspace context
 */
export declare function resolveWorkspaceContext(): WorkspaceContext;
/**
 * Return PlanningPaths scoped to the active workspace or project.
 *
 * When context has a workstream set: base = .planning/workstreams/<ws>/
 * When context has a project set: base = .planning/projects/<project>/
 * When context is null or empty: base = .planning/ (default)
 *
 * Workspace and project names are validated before path construction.
 *
 * @param projectDir - Absolute project root path
 * @param context - Optional workspace context (defaults to no scoping)
 * @returns PlanningPaths scoped to the active workspace
 * @throws GSDError if workspace/project name fails validation
 */
export declare function workspacePlanningPaths(projectDir: string, context?: WorkspaceContext): PlanningPaths;
//# sourceMappingURL=workspace.d.ts.map