/**
 * UAT query handlers — checkpoint rendering and audit scanning.
 *
 * Ported from get-shit-done/bin/lib/uat.cjs.
 * Provides UAT checkpoint rendering for verify-work workflows and
 * audit scanning for UAT/VERIFICATION files across phases.
 *
 * @example
 * ```typescript
 * import { uatRenderCheckpoint, auditUat } from './uat.js';
 *
 * await uatRenderCheckpoint(['--file', 'path/to/UAT.md'], '/project');
 * // { data: { test_number: 1, test_name: 'Login', checkpoint: '...' } }
 *
 * await auditUat([], '/project');
 * // { data: { results: [...], summary: { total_files: 2, total_items: 5 } } }
 * ```
 */
import type { QueryHandler } from './utils.js';
/**
 * Render the current UAT checkpoint — reads a UAT file, parses the
 * "Current Test" section, and returns a formatted checkpoint prompt.
 *
 * Port of `cmdRenderCheckpoint` from `uat.cjs` (paths via `requireSafePath`,
 * checkpoint via `buildCheckpoint`, name/expected via `sanitizeForDisplay`).
 *
 * Args: --file <path>
 */
export declare const uatRenderCheckpoint: QueryHandler;
/**
 * Cross-phase UAT / VERIFICATION audit — port of `cmdAuditUat` (`uat.cjs`).
 */
export declare const auditUat: QueryHandler;
//# sourceMappingURL=uat.d.ts.map