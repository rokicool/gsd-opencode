/**
 * CONTEXT.md `<decisions>` parser — shared helper for issue #2492 (decision
 * coverage gates) and #2493 (post-planning gap checker).
 *
 * Decision format (produced by `discuss-phase.md`):
 *
 *   <decisions>
 *   ## Implementation Decisions
 *
 *   ### Category Heading
 *   - **D-01:** Decision text
 *   - **D-02 [tag1, tag2]:** Tagged decision
 *
 *   ### OpenCode's Discretion
 *   - free-form, never tracked
 *   </decisions>
 *
 * A decision is "trackable" when:
 *   - it has a valid D-NN id
 *   - it is NOT under the "OpenCode's Discretion" category
 *   - it is NOT tagged `informational` or `folded`
 *
 * Trackable decisions are the ones the plan-phase translation gate and the
 * verify-phase validation gate enforce.
 */
import type { QueryHandler } from './utils.js';
export interface ParsedDecision {
    /** Stable id: `D-01`, `D-7`, `D-42`. */
    id: string;
    /** Body text (everything after `**D-NN[ tags]:**` up to next bullet/blank). */
    text: string;
    /** Most recent `### ` heading inside the decisions block. */
    category: string;
    /** Bracketed tags from `**D-NN [tag1, tag2]:**`. Lower-cased. */
    tags: string[];
    /**
     * False when under "OpenCode's Discretion" or tagged `informational` /
     * `folded`. Trackable decisions are subject to the coverage gates.
     */
    trackable: boolean;
}
/**
 * Parse trackable decisions from CONTEXT.md content.
 *
 * Returns ALL D-NN decisions found inside `<decisions>` (including
 * non-trackable ones, with `trackable: false`). Callers that only want the
 * gate-enforced decisions should filter `.filter(d => d.trackable)`.
 */
export declare function parseDecisions(content: string): ParsedDecision[];
/**
 * `decisions.parse <path>` — parse CONTEXT.md and return decisions array.
 *
 * Used by workflow shell snippets that need to enumerate decisions without
 * spawning a full Node process. Accepts either an absolute path or a path
 * relative to `projectDir` — symmetric with the gate handlers (review F14).
 */
export declare const decisionsParse: QueryHandler;
//# sourceMappingURL=decisions.d.ts.map