/**
 * Query command registry — routes commands to native SDK handlers.
 *
 * The registry is a flat `Map<string, QueryHandler>` that maps command names
 * to handler functions. Unknown keys passed to `dispatch()` throw `GSDError`.
 * The `gsd-sdk query` CLI resolves argv with `resolveQueryArgv()` before dispatch;
 * there is no automatic delegation to `gsd-tools.cjs`.
 *
 * Also exports `extractField` — a TypeScript port of the `--pick` field
 * extraction logic from gsd-tools.cjs (lines 365-382).
 *
 * @example
 * ```typescript
 * import { QueryRegistry, extractField } from './registry.js';
 *
 * const registry = new QueryRegistry();
 * registry.register('generate-slug', generateSlug);
 * const result = await registry.dispatch('generate-slug', ['My Phase'], '/project');
 * const slug = extractField(result.data, 'slug'); // 'my-phase'
 * ```
 */
import type { QueryResult, QueryHandler } from './utils.js';
/**
 * Extract a nested field from an object using dot-notation and bracket syntax.
 *
 * Direct port of `extractField()` from gsd-tools.cjs (lines 365-382).
 * Supports `a.b.c` dot paths, `items[0]` array indexing, and `items[-1]`
 * negative indexing.
 *
 * @param obj - The object to extract from
 * @param fieldPath - Dot-separated path with optional bracket notation
 * @returns The extracted value, or undefined if the path doesn't resolve
 */
export declare function extractField(obj: unknown, fieldPath: string): unknown;
/**
 * Flat command registry that routes query commands to native handlers.
 *
 * `dispatch()` throws `GSDError` for unknown command keys. The `gsd-sdk query`
 * CLI uses `resolveQueryArgv()` first; when no handler matches, it may shell out
 * to `gsd-tools.cjs` (see `cli.ts` and `QUERY-HANDLERS.md` fallback policy).
 */
export declare class QueryRegistry {
    private handlers;
    /**
     * Register a native handler for a command name.
     *
     * @param command - The command name (e.g., 'generate-slug', 'state.load')
     * @param handler - The handler function to invoke
     */
    register(command: string, handler: QueryHandler): void;
    /**
     * Check if a command has a registered native handler.
     *
     * @param command - The command name to check
     * @returns True if the command has a native handler
     */
    has(command: string): boolean;
    /**
     * List all registered command names (for tooling, pipelines, and tests).
     */
    commands(): string[];
    /**
     * Get the handler for a command without dispatching.
     *
     * @param command - The command name to look up
     * @returns The handler function, or undefined if not registered
     */
    getHandler(command: string): QueryHandler | undefined;
    /**
     * Dispatch a command to its registered native handler.
     *
     * @param command - The command name to dispatch
     * @param args - Arguments to pass to the handler
     * @param projectDir - The project directory for context
     * @param workstream - Optional workstream name to scope .planning paths
     * @returns The query result from the handler
     * @throws GSDError if no handler is registered for the command
     */
    dispatch(command: string, args: string[], projectDir: string, workstream?: string): Promise<QueryResult>;
}
/**
 * Map argv after `gsd-sdk query` to a registered handler key and remaining args.
 * Longest-prefix match on dotted (`a.b.c`) and spaced (`a b c`) keys; if no match,
 * expands a single dotted token (`state.validate` → `state`, `validate`) and retries.
 */
export declare function resolveQueryArgv(tokens: string[], registry: QueryRegistry): {
    cmd: string;
    args: string[];
} | null;
//# sourceMappingURL=registry.d.ts.map