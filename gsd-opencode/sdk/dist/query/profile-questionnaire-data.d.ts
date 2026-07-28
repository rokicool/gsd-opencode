/**
 * Synced from get-shit-done/bin/lib/profile-output.cjs (PROFILING_QUESTIONS, CLAUDE_INSTRUCTIONS).
 * Used by profileQuestionnaire for parity with cmdProfileQuestionnaire.
 */
export type ProfilingOption = {
    label: string;
    value: string;
    rating: string;
};
export type ProfilingQuestion = {
    dimension: string;
    header: string;
    context: string;
    question: string;
    options: ProfilingOption[];
};
export declare const PROFILING_QUESTIONS: ProfilingQuestion[];
export declare const CLAUDE_INSTRUCTIONS: Record<string, Record<string, string>>;
export declare function isAmbiguousAnswer(dimension: string, value: string): boolean;
export declare function generateClaudeInstruction(dimension: string, rating: string): string;
//# sourceMappingURL=profile-questionnaire-data.d.ts.map