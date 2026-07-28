/**
 * Decision-coverage gates — issue #2492.
 *
 * Two handlers, two semantics:
 *
 *   - `check.decision-coverage-plan`  — translation gate, BLOCKING.
 *     Plan-phase calls this after the existing requirements coverage gate.
 *     Each trackable CONTEXT.md decision must appear (by id or normalized
 *     phrase) in at least one PLAN.md `must_haves` / `truths` block or in
 *     the plan body. A miss returns `passed: false` with a clear message
 *     naming the missed decision; the workflow surfaces this to the user
 *     and refuses to mark the phase planned.
 *
 *   - `check.decision-coverage-verify` — validation gate, NON-BLOCKING.
 *     Verify-phase calls this. Each trackable decision is searched in the
 *     phase's shipped artifacts (PLAN.md, SUMMARY.md, files_modified, recent
 *     commit subjects). Misses are reported but do NOT change verification
 *     status. Rationale: by verification time the work is done; a fuzzy
 *     "honored" check is a soft signal, not a blocker.
 *
 * Both gates short-circuit when `workflow.context_coverage_gate` is `false`.
 *
 * Match strategy (used by both gates):
 *   1. Strict id match — `D-NN` appears verbatim somewhere in the searched
 *      text. This is the path users should aim for.
 *   2. Soft phrase match — a normalized 6+-word slice of the decision text
 *      appears as a substring. Catches plans/summaries that paraphrase but
 *      forget the id.
 */
import type { QueryHandler } from './utils.js';
export declare const checkDecisionCoveragePlan: QueryHandler;
export declare const checkDecisionCoverageVerify: QueryHandler;
//# sourceMappingURL=check-decision-coverage.d.ts.map