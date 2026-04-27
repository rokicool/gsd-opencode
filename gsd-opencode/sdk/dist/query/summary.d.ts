/**
 * Summary query handlers — extract sections and history from SUMMARY.md files.
 *
 * Ported from get-shit-done/bin/lib/commands.cjs (cmdSummaryExtract, cmdHistoryDigest).
 * Uses `extractFrontmatterLeading` for parity with `frontmatter.cjs` (first `---` block only).
 *
 * @example
 * ```typescript
 * import { summaryExtract, historyDigest } from './summary.js';
 *
 * await summaryExtract(['path/to/SUMMARY.md'], '/project');
 * await historyDigest([], '/project');
 * ```
 */
import type { QueryHandler } from './utils.js';
export declare const summaryExtract: QueryHandler;
export declare const historyDigest: QueryHandler;
//# sourceMappingURL=summary.d.ts.map