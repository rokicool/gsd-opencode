/** One project entry in the JSON array emitted by `scan-sessions --json`. */
export type ScanSessionsProject = {
    name: string;
    directory: string;
    sessionCount: number;
    totalSize: number;
    totalSizeHuman: string;
    lastActive: string;
    dateRange: {
        first: string;
        last: string;
    };
    sessions?: Array<{
        sessionId: string;
        size: number;
        sizeHuman: string;
        /** Full ISO-8601, same as CJS `scan-sessions --json --verbose`. */
        modified: string;
        summary?: string;
        messageCount?: number;
        created?: string;
    }>;
};
/** Same as CJS `scanProjectDir` in profile-pipeline.cjs (sessions sorted newest-first). */
export declare function scanProjectDir(projectDirPath: string): Array<{
    sessionId: string;
    filePath: string;
    size: number;
    modified: Date;
}>;
export declare function readSessionIndex(projectDirPath: string): {
    originalPath: string | null;
    entries: Map<string, {
        sessionId?: string;
        summary?: string;
        messageCount?: number;
        created?: string;
    }>;
};
export declare function getProjectName(projectDirName: string, indexData: ReturnType<typeof readSessionIndex>): string;
/** Same resolution as CJS `getSessionsDir` in profile-pipeline.cjs. */
export declare function getScanSessionsRoot(overridePath: string | null): string | null;
/**
 * Build the same project array as CJS `cmdScanSessions` (stdout JSON when `--json`).
 */
export declare function buildScanSessionsProjects(overridePath: string | null, options: {
    verbose: boolean;
}): ScanSessionsProject[];
//# sourceMappingURL=profile-scan-sessions.d.ts.map