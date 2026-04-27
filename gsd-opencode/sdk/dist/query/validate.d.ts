/**
 * Validation query handlers — key-link verification and consistency checking.
 *
 * Ported from get-shit-done/bin/lib/verify.cjs.
 * Provides key-link integration point verification and cross-file consistency
 * detection as native TypeScript query handlers registered in the SDK query registry.
 *
 * @example
 * ```typescript
 * import { verifyKeyLinks, validateConsistency } from './validate.js';
 *
 * const result = await verifyKeyLinks(['path/to/plan.md'], '/project');
 * // { data: { all_verified: true, verified: 1, total: 1, links: [...] } }
 * ```
 */
import type { QueryHandler } from './utils.js';
/**
 * Build a RegExp for must_haves key_links pattern matching.
 * Long or nested-quantifier patterns fall back to a literal match via escapeRegex.
 */
export declare function regexForKeyLinkPattern(pattern: string): RegExp;
/**
 * Verify key-link integration points from must_haves.key_links.
 *
 * Port of `cmdVerifyKeyLinks` from `verify.cjs` lines 338-396.
 * Reads must_haves.key_links from plan frontmatter, checks source/target
 * files for pattern matching or target reference presence.
 *
 * @param args - args[0]: plan file path (required)
 * @param projectDir - Project root directory
 * @returns QueryResult with { all_verified, verified, total, links }
 * @throws GSDError with Validation classification if file path missing
 */
export declare const verifyKeyLinks: QueryHandler;
/**
 * Validate consistency between ROADMAP.md, disk phases, and plan frontmatter.
 *
 * Port of `cmdValidateConsistency` from `verify.cjs` lines 398-519.
 * Checks ROADMAP/disk phase sync, sequential numbering, plan numbering gaps,
 * summary/plan orphans, and frontmatter completeness.
 *
 * @param _args - No required args (operates on projectDir)
 * @param projectDir - Project root directory
 * @returns QueryResult with { passed, errors, warnings, warning_count }
 */
export declare const validateConsistency: QueryHandler;
/**
 * Health check with optional repair mode.
 *
 * Port of `cmdValidateHealth` from `verify.cjs` lines 522-921.
 * Performs 10+ checks on .planning/ directory structure, config, state,
 * and cross-file consistency. With `--repair` flag, can fix missing
 * config.json, STATE.md, and nyquist key.
 *
 * @param args - Optional: '--repair' to perform repairs
 * @param projectDir - Project root directory
 * @returns QueryResult with { status, errors, warnings, info, repairable_count, repairs_performed? }
 */
export declare const validateHealth: QueryHandler;
/**
 * Validate GSD agent file installation under the managed agents directory.
 *
 * Port of `cmdValidateAgents` from `verify.cjs` lines 997–1009 (uses `checkAgentsInstalled` from core).
 */
export declare const validateAgents: QueryHandler;
//# sourceMappingURL=validate.d.ts.map