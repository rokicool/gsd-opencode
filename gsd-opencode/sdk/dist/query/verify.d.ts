/**
 * Verification query handlers — plan structure, phase completeness, artifact checks.
 *
 * Ported from get-shit-done/bin/lib/verify.cjs.
 * Provides plan validation, phase completeness checking, and artifact verification
 * as native TypeScript query handlers registered in the SDK query registry.
 *
 * @example
 * ```typescript
 * import { verifyPlanStructure, verifyPhaseCompleteness, verifyArtifacts } from './verify.js';
 *
 * const result = await verifyPlanStructure(['path/to/plan.md'], '/project');
 * // { data: { valid: true, errors: [], warnings: [], task_count: 2, ... } }
 * ```
 */
import type { QueryHandler } from './utils.js';
/**
 * Validate plan structure against required schema.
 *
 * Port of `cmdVerifyPlanStructure` from `verify.cjs` lines 108-167.
 * Checks required frontmatter fields, task XML elements, wave/depends_on
 * consistency, and autonomous/checkpoint consistency.
 *
 * @param args - args[0]: file path (required)
 * @param projectDir - Project root directory
 * @returns QueryResult with { valid, errors, warnings, task_count, tasks, frontmatter_fields }
 * @throws GSDError with Validation classification if file path missing
 */
export declare const verifyPlanStructure: QueryHandler;
/**
 * Check phase completeness by matching PLAN files to SUMMARY files.
 *
 * Port of `cmdVerifyPhaseCompleteness` from `verify.cjs` lines 169-213.
 * Scans a phase directory for PLAN and SUMMARY files, identifies incomplete
 * plans (no summary) and orphan summaries (no plan).
 *
 * @param args - args[0]: phase number (required)
 * @param projectDir - Project root directory
 * @returns QueryResult with { complete, phase, plan_count, summary_count, incomplete_plans, orphan_summaries, errors, warnings }
 * @throws GSDError with Validation classification if phase number missing
 */
export declare const verifyPhaseCompleteness: QueryHandler;
/**
 * Verify artifact file existence and content from must_haves.artifacts.
 *
 * Port of `cmdVerifyArtifacts` from `verify.cjs` lines 283-336.
 * Reads must_haves.artifacts from plan frontmatter and checks each artifact
 * for file existence, min_lines, contains, and exports.
 *
 * @param args - args[0]: plan file path (required)
 * @param projectDir - Project root directory
 * @returns QueryResult with { all_passed, passed, total, artifacts }
 * @throws GSDError with Validation classification if file path missing
 */
export declare const verifyArtifacts: QueryHandler;
/**
 * Verify that commit hashes referenced in SUMMARY.md files actually exist.
 *
 * Port of `cmdVerifyCommits` from `verify.cjs` lines 262-282.
 * Used by gsd-verifier agent to confirm commits mentioned in summaries
 * are real commits in the git history.
 *
 * @param args - One or more commit hashes
 * @param projectDir - Project root directory
 * @returns QueryResult with { all_valid, valid, invalid, total }
 */
export declare const verifyCommits: QueryHandler;
/**
 * Verify that @-references and backtick file paths in a document resolve.
 *
 * Port of `cmdVerifyReferences` from `verify.cjs` lines 217-260.
 *
 * @param args - args[0]: file path (required)
 * @param projectDir - Project root directory
 * @returns QueryResult with { valid, found, missing }
 */
export declare const verifyReferences: QueryHandler;
/**
 * Verify a SUMMARY.md file: existence, file spot-checks, commit refs, self-check section.
 *
 * Port of `cmdVerifySummary` from verify.cjs lines 13-107.
 *
 * @param args - args[0]: summary path (required), args[1]: optional --check-count N
 */
export declare const verifySummary: QueryHandler;
/**
 * Check file/directory existence and return type.
 *
 * Port of `cmdVerifyPathExists` from commands.cjs lines 111-132.
 *
 * @param args - args[0]: path to check (required)
 */
export declare const verifyPathExists: QueryHandler;
/**
 * Detect schema drift for a phase — port of `cmdVerifySchemaDrift` from verify.cjs lines 1013–1086.
 */
export declare const verifySchemaDrift: QueryHandler;
/**
 * verify.codebase-drift — structural drift detector (#2003).
 *
 * Non-blocking by contract: every failure mode returns a successful response
 * with `{ skipped: true, reason }`. The post-execute drift gate in
 * `/gsd-execute-phase` relies on this guarantee.
 *
 * Delegates to the Node-side implementation in `bin/lib/drift.cjs` and
 * `bin/lib/verify.cjs` via a child process so the drift logic stays in one
 * canonical place (see `cmdVerifyCodebaseDrift`).
 */
export declare const verifyCodebaseDrift: QueryHandler;
//# sourceMappingURL=verify.d.ts.map