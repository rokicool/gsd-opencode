export type ExtractMessagesResult = {
    output_file: string;
    project: string;
    sessions_processed: number;
    sessions_skipped: number;
    messages_extracted: number;
    messages_truncated: number;
};
/** JSONL line shape from session exports — shared by filters and stream parser. */
export type SessionJsonlRecord = {
    type?: string;
    userType?: string;
    isMeta?: boolean;
    isSidechain?: boolean;
    message?: {
        content?: string;
    };
    cwd?: string;
    timestamp?: string | number;
};
/** Same filter as CJS `isGenuineUserMessage` in profile-pipeline.cjs. */
export declare function isGenuineUserMessage(record: SessionJsonlRecord): boolean;
/** Default maxLen 2000 matches CJS `truncateContent` for stream extraction. */
export declare function truncateContent(content: string, maxLen?: number): string;
/** Line-delimited JSONL reader — same behavior as CJS `streamExtractMessages`. */
export declare function streamExtractMessages(filePath: string, filterFn: (r: SessionJsonlRecord) => boolean, maxMessages: number): Promise<Array<{
    sessionId: string;
    projectPath: string | null;
    timestamp: string | number | null;
    content: string;
}>>;
/**
 * Port of `cmdExtractMessages` — same JSON result as `gsd-tools extract-messages` (stdout object;
 * message lines are in `output_file` JSONL, not inlined).
 */
export declare function runExtractMessages(projectArg: string, options: {
    sessionId: string | null;
    limit: number | null;
}, overridePath: string | null): Promise<ExtractMessagesResult>;
//# sourceMappingURL=profile-extract-messages.d.ts.map