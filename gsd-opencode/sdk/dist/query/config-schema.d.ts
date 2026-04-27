/**
 * SDK-side mirror of get-shit-done/bin/lib/config-schema.cjs.
 *
 * Single source of truth for valid config key paths accepted by
 * `config-set`. MUST stay in sync with the CJS schema — enforced
 * by tests/config-schema-sdk-parity.test.cjs (CI drift guard).
 *
 * If you add/remove a key here, make the identical change in
 * get-shit-done/bin/lib/config-schema.cjs (and vice versa). The
 * parity test asserts the two allowlists are set-equal and that
 * DYNAMIC_KEY_PATTERN_SOURCES produce identical regex source strings.
 *
 * See #2653 — CJS/SDK drift caused config-set to reject documented
 * keys. #2479 added CJS↔docs parity; #2653 adds CJS↔SDK parity.
 */
/** Exact-match config key paths accepted by config-set. */
export declare const VALID_CONFIG_KEYS: ReadonlySet<string>;
/**
 * Dynamic-pattern validators — keys matching these regexes are also accepted.
 * Each entry's `source` MUST equal the corresponding CJS regex `.source`
 * (the parity test enforces this).
 */
export interface DynamicKeyPattern {
    readonly test: (k: string) => boolean;
    readonly description: string;
    readonly source: string;
}
export declare const DYNAMIC_KEY_PATTERNS: readonly DynamicKeyPattern[];
/** Returns true if keyPath is a valid config key (exact or dynamic pattern). */
export declare function isValidConfigKeyPath(keyPath: string): boolean;
//# sourceMappingURL=config-schema.d.ts.map