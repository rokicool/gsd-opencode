/**
 * Intel query handlers — .planning/intel/ file management.
 *
 * Ported from get-shit-done/bin/lib/intel.cjs.
 * Provides intel status, diff, snapshot, validate, query, extract-exports,
 * and patch-meta operations for the project intelligence system.
 *
 * @example
 * ```typescript
 * import { intelStatus, intelQuery } from './intel.js';
 *
 * await intelStatus([], '/project');
 * // { data: { files: { ... }, overall_stale: false } }
 *
 * await intelQuery(['AuthService'], '/project');
 * // { data: { matches: [...], term: 'AuthService', total: 3 } }
 * ```
 */
import type { QueryHandler } from './utils.js';
/** Max recursion depth when walking JSON for intel queries (avoids stack overflow). */
export declare const MAX_JSON_SEARCH_DEPTH = 48;
export declare function searchJsonEntries(data: unknown, term: string, depth?: number): unknown[];
export declare const intelStatus: QueryHandler;
export declare const intelDiff: QueryHandler;
export declare const intelSnapshot: QueryHandler;
export declare const intelValidate: QueryHandler;
export declare const intelQuery: QueryHandler;
/**
 * Extract exports from a JS/CJS/ESM file — port of `intelExtractExports` in `intel.cjs` (lines 502–614).
 * Returns `{ file, exports, method }` with `file` as a resolved absolute path (matches `gsd-tools.cjs`).
 */
export declare const intelExtractExports: QueryHandler;
export declare const intelPatchMeta: QueryHandler;
/**
 * `gsd-tools intel update` entry point: returns the same JSON as `intel.cjs` `intelUpdate`.
 * Does not run the full graph refresh in-process — that work is done by the
 * **gsd-intel-updater** agent after spawn. When `.planning/intel/` is disabled in config,
 * returns `{ disabled: true, message }` so SDK output matches the CJS CLI.
 *
 * Port of `intelUpdate` from `intel.cjs` lines 314–321.
 */
export declare const intelUpdate: QueryHandler;
//# sourceMappingURL=intel.d.ts.map