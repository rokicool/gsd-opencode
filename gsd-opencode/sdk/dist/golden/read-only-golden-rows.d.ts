/**
 * read-only subprocess golden rows: SDK `registry.dispatch` vs `gsd-tools.cjs` JSON on stdout.
 * Imported by `read-only-parity.integration.test.ts` and `golden-policy.ts` coverage accounting.
 */
export type JsonParityRow = {
    canonical: string;
    sdkArgs: string[];
    cjs: string;
    cjsArgs: string[];
};
/** Repo-relative fixtures (cwd = get-shit-done repo root). */
export declare const GOLDEN_PLAN = ".planning/phases/09-foundation-and-test-infrastructure/09-01-PLAN.md";
/**
 * Strict `toEqual` JSON parity rows verified on this repository.
 * (Expand as more handlers are aligned with `gsd-tools.cjs`.)
 */
export declare const READ_ONLY_JSON_PARITY_ROWS: JsonParityRow[];
/** Canonicals from JSON rows plus special-case subprocess tests in read-only-parity integration. */
export declare function readOnlyGoldenCanonicals(): Set<string>;
//# sourceMappingURL=read-only-golden-rows.d.ts.map