/**
 * Normalize `gsd-sdk query <argv...>` command tokens to match `createRegistry()` keys.
 *
 * `gsd-tools` takes a top-level command plus a subcommand (`state json`, `init execute-phase 9`).
 * The SDK CLI originally passed only argv[0] as the registry key, so `query state json` dispatched
 * `state` (unknown) instead of `state.json`. This module merges the same prefixes gsd-tools nests
 * under `runCommand()` so two-token (and longer) invocations resolve to dotted registry names.
 */
/**
 * @param command - First token after `query` (e.g. `state`, `init`, `config-get`)
 * @param args - Remaining tokens (flags like `--pick` should already be stripped)
 * @returns Registry command string and handler args
 */
export declare function normalizeQueryCommand(command: string, args: string[]): [string, string[]];
//# sourceMappingURL=normalize-query-command.d.ts.map