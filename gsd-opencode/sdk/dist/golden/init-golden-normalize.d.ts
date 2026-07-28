/**
 * Normalize `init quick` payloads for golden parity: CJS runs in a subprocess with a
 * different clock than the in-process SDK, so time-derived fields cannot match exactly.
 */
/** Keys derived from `Date` / `quick_id` generation (init.cjs cmdInitQuick). */
export declare const INIT_QUICK_VOLATILE_KEYS: readonly ["quick_id", "timestamp", "branch_name", "task_dir"];
export declare function omitInitQuickVolatile(data: Record<string, unknown>): Record<string, unknown>;
//# sourceMappingURL=init-golden-normalize.d.ts.map