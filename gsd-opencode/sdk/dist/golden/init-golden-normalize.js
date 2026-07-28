/**
 * Normalize `init quick` payloads for golden parity: CJS runs in a subprocess with a
 * different clock than the in-process SDK, so time-derived fields cannot match exactly.
 */
/** Keys derived from `Date` / `quick_id` generation (init.cjs cmdInitQuick). */
export const INIT_QUICK_VOLATILE_KEYS = ['quick_id', 'timestamp', 'branch_name', 'task_dir'];
export function omitInitQuickVolatile(data) {
    const o = { ...data };
    for (const k of INIT_QUICK_VOLATILE_KEYS) {
        delete o[k];
    }
    return o;
}
//# sourceMappingURL=init-golden-normalize.js.map