#!/usr/bin/env node
/**
 * CLI entry point for gsd-sdk.
 *
 * Usage: gsd-sdk run "<prompt>" [--project-dir <dir>] [--ws-port <port>]
 *                                [--model <model>] [--max-budget <n>]
 */
export interface ParsedCliArgs {
    command: string | undefined;
    prompt: string | undefined;
    /** For 'init' command: the raw input source (@file, text, or undefined for stdin). */
    initInput: string | undefined;
    /** For 'auto --init': bootstrap from a PRD before running the autonomous loop. */
    init: string | undefined;
    projectDir: string;
    wsPort: number | undefined;
    model: string | undefined;
    maxBudget: number | undefined;
    /** Workstream name for multi-workstream projects. Routes .planning/ to .planning/workstreams/<name>/. */
    ws: string | undefined;
    help: boolean;
    version: boolean;
    /**
     * When `command === 'query'`, tokens after `query` with only known SDK flags removed.
     * Extra flags are kept so handlers that share gsd-tools-style argv (e.g. `--pick`) still receive them.
     */
    queryArgv?: string[];
}
/**
 * Parse CLI arguments into a structured object.
 * Exported for testing — the main() function uses this internally.
 */
export declare function parseCliArgs(argv: string[]): ParsedCliArgs;
export declare const USAGE: string;
/**
 * Resolve the init command input to a string.
 *
 * - `@path/to/file.md` → reads the file contents
 * - Raw text → returns as-is
 * - No input → reads from stdin (with TTY detection)
 *
 * Exported for testing.
 */
export declare function resolveInitInput(args: ParsedCliArgs): Promise<string>;
export declare function main(argv?: string[]): Promise<void>;
//# sourceMappingURL=cli.d.ts.map