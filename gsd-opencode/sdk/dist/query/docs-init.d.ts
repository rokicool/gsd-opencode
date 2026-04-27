/**
 * Docs-init — context bundle for the docs-update workflow.
 *
 * Full port of `cmdDocsInit` and helpers from `get-shit-done/bin/lib/docs.cjs`.
 */
import type { QueryHandler } from './utils.js';
/**
 * Recursively scan project root `.md` files and `docs/` (or fallbacks) up to depth 4.
 * Port of `scanExistingDocs` from docs.cjs.
 */
export declare function scanExistingDocs(cwd: string): Array<{
    path: string;
    has_gsd_marker: boolean;
}>;
/** Port of `detectProjectType` from docs.cjs. */
export declare function detectProjectType(cwd: string): Record<string, boolean>;
/** Port of `detectDocTooling` from docs.cjs. */
export declare function detectDocTooling(cwd: string): Record<string, boolean>;
/** Port of `detectMonorepoWorkspaces` from docs.cjs. */
export declare function detectMonorepoWorkspaces(cwd: string): string[];
/**
 * Init payload for docs-update workflow — matches `gsd-tools docs-init` JSON.
 * Port of `cmdDocsInit` from docs.cjs.
 */
export declare const docsInit: QueryHandler;
//# sourceMappingURL=docs-init.d.ts.map