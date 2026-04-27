/**
 * Schema drift detection — ports `get-shit-done/bin/lib/schema-detect.cjs`.
 * Used by `verify.schema-drift` to match gsd-tools.cjs JSON output.
 */
export declare function detectSchemaFiles(files: string[]): {
    detected: boolean;
    matches: string[];
    orms: string[];
};
export declare function checkSchemaDrift(changedFiles: string[], executionLog: string, options?: {
    skipCheck?: boolean;
}): {
    driftDetected: boolean;
    blocking: boolean;
    schemaFiles: string[];
    orms: string[];
    unpushedOrms: string[];
    message: string;
    skipped?: boolean;
};
//# sourceMappingURL=schema-detect.d.ts.map