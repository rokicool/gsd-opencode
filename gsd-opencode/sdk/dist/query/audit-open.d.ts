/**
 * Open Artifact Audit — full TypeScript port of `get-shit-done/bin/lib/audit.cjs`.
 *
 * Scans `.planning/` artifact categories for unresolved items (same JSON as gsd-tools `audit-open`).
 */
import type { QueryHandler } from './utils.js';
export interface AuditOpenResult {
    scanned_at: string;
    /** True when at least one category reported scan_error / unreadable rows (audit may be incomplete). */
    has_scan_errors: boolean;
    has_open_items: boolean;
    counts: {
        debug_sessions: number;
        quick_tasks: number;
        threads: number;
        todos: number;
        seeds: number;
        uat_gaps: number;
        verification_gaps: number;
        context_questions: number;
        total: number;
    };
    items: {
        debug_sessions: Array<Record<string, unknown>>;
        quick_tasks: Array<Record<string, unknown>>;
        threads: Array<Record<string, unknown>>;
        todos: Array<Record<string, unknown>>;
        seeds: Array<Record<string, unknown>>;
        uat_gaps: Array<Record<string, unknown>>;
        verification_gaps: Array<Record<string, unknown>>;
        context_questions: Array<Record<string, unknown>>;
    };
}
/**
 * Same structured result as `gsd-tools.cjs audit-open` (JSON).
 */
export declare function auditOpenArtifacts(projectDir: string, workstream?: string): AuditOpenResult;
/**
 * Human-readable report (same text as gsd-tools without `--json`).
 */
export declare function formatAuditReport(auditResult: AuditOpenResult): string;
/**
 * `audit-open` / `audit.open` — optional `--json` for structured JSON only (default adds formatted report string).
 */
export declare const auditOpen: QueryHandler;
//# sourceMappingURL=audit-open.d.ts.map