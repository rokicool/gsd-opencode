/**
 * Query module entry point — factory and re-exports.
 *
 * The `createRegistry()` factory creates a fully-wired `QueryRegistry`
 * with all native handlers registered. New handlers are added here
 * as they are migrated from gsd-tools.cjs.
 *
 * @example
 * ```typescript
 * import { createRegistry } from './query/index.js';
 *
 * const registry = createRegistry();
 * const result = await registry.dispatch('generate-slug', ['My Phase'], projectDir);
 * ```
 */
import { QueryRegistry } from './registry.js';
import { GSDEventStream } from '../event-stream.js';
export type { QueryResult, QueryHandler } from './utils.js';
export { extractField } from './registry.js';
/** Same argv normalization as `gsd-sdk query` — use when calling `registry.dispatch()` with CLI-style `command` + `args`. */
export { normalizeQueryCommand } from './normalize-query-command.js';
/**
 * Command names that perform durable writes (disk, git, or global profile store).
 * Used to wire event emission after successful dispatch. Both dotted and
 * space-delimited aliases must be listed when both exist.
 *
 * See QUERY-HANDLERS.md for semantics. Init composition handlers are omitted
 * (they emit JSON for workflows; agents perform writes).
 */
export declare const QUERY_MUTATION_COMMANDS: Set<string>;
/**
 * Create a fully-wired QueryRegistry with all native handlers registered.
 *
 * @param eventStream - Optional event stream for mutation event emission
 * @param correlationSessionId - Optional session id threaded into mutation-related events
 * @returns A QueryRegistry instance with all handlers registered
 */
export declare function createRegistry(eventStream?: GSDEventStream, correlationSessionId?: string): QueryRegistry;
//# sourceMappingURL=index.d.ts.map