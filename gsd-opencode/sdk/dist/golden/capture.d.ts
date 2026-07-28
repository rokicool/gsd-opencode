/**
 * Golden test helpers — run `gsd-tools.cjs` as a subprocess and capture JSON or raw stdout.
 *
 * Used by `golden.integration.test.ts` and `read-only-parity.integration.test.ts` to assert
 * SDK `createRegistry()` output matches the legacy CJS CLI.
 */
/**
 * Run `node gsd-tools.cjs <command> [...args]` in `projectDir` and parse stdout as JSON.
 */
export declare function captureGsdToolsOutput(command: string, args: string[], projectDir: string): Promise<unknown>;
/**
 * Run `node gsd-tools.cjs <command> [...args]` and return raw stdout (no JSON parse).
 */
export declare function captureGsdToolsStdout(command: string, args: string[], projectDir: string): Promise<string>;
//# sourceMappingURL=capture.d.ts.map