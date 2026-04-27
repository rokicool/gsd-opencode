/** True if this canonical command participates in mutation event wiring (see QUERY_MUTATION_COMMANDS). */
export declare function isMutationCanonicalCmd(canonical: string): boolean;
/**
 * Canonical commands with an explicit subprocess JSON check vs gsd-tools.cjs
 * (golden.integration.test.ts + read-only-parity.integration.test.ts).
 */
export declare const GOLDEN_PARITY_INTEGRATION_COVERED: Set<string>;
export declare const GOLDEN_PARITY_EXCEPTIONS: Record<string, string>;
export declare function verifyGoldenPolicyComplete(): void;
//# sourceMappingURL=golden-policy.d.ts.map