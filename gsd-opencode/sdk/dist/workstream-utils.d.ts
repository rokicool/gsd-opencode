/**
 * Workstream utility functions for multi-workstream project support.
 *
 * When --ws <name> is provided, all .planning/ paths are routed to
 * .planning/workstreams/<name>/ instead.
 */
/**
 * Validate a workstream name.
 * Allowed: alphanumeric, hyphens, underscores, dots.
 * Disallowed: empty, spaces, slashes, special chars, path traversal.
 */
export declare function validateWorkstreamName(name: string): boolean;
/**
 * Return the relative planning directory path.
 *
 * - Without workstream: `.planning`
 * - With workstream: `.planning/workstreams/<name>`
 */
export declare function relPlanningPath(workstream?: string): string;
//# sourceMappingURL=workstream-utils.d.ts.map