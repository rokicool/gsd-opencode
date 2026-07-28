/**
 * Research gate — validates RESEARCH.md for unresolved open questions
 * before allowing plan-phase to proceed (#1602).
 *
 * Pure functions: no I/O, no side effects. The caller reads the file
 * and passes the content string.
 */
export interface ResearchGateResult {
    /** Whether research is clear to proceed to planning */
    pass: boolean;
    /** Unresolved questions found (empty if pass=true) */
    unresolvedQuestions: string[];
}
/**
 * Check RESEARCH.md content for unresolved open questions.
 *
 * Rules:
 * - If no "## Open Questions" section exists → pass
 * - If section header has "(RESOLVED)" suffix → pass
 * - If section exists but is empty (only whitespace before next heading) → pass
 * - Otherwise → fail with list of unresolved questions
 */
export declare function checkResearchGate(researchContent: string): ResearchGateResult;
//# sourceMappingURL=research-gate.d.ts.map