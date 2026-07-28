export type ProfileSampleResult = {
    output_file: string;
    projects_sampled: number;
    messages_sampled: number;
    per_project_cap: number;
    message_char_limit: number;
    skipped_context_dumps: number;
    project_breakdown: Array<{
        project: string;
        messages: number;
        sessions: number;
    }>;
};
/**
 * Port of `cmdProfileSample` — same JSON + JSONL file shape as `gsd-tools profile-sample`.
 */
export declare function runProfileSample(overridePath: string | null, options: {
    limit: number;
    maxPerProject: number | null;
    maxChars: number;
}): Promise<ProfileSampleResult>;
//# sourceMappingURL=profile-sample.d.ts.map