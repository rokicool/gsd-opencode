/**
 * Staged execution pipeline — registry-level middleware for pre/post hooks
 * and full in-memory dry-run support.
 *
 * Wraps all registry handlers with prepare/execute/finalize stages.
 * When dryRun=true and the command is a mutation, the mutation executes
 * against a temporary directory clone of .planning/ instead of the real
 * project, and the before/after diff is returned without writing to disk.
 *
 * Read commands are always executed normally — they are side-effect-free.
 *
 * @example
 * ```typescript
 * import { createRegistry } from './index.js';
 * import { wrapWithPipeline } from './pipeline.js';
 *
 * const registry = createRegistry();
 * wrapWithPipeline(registry, MUTATION_COMMANDS, { dryRun: true });
 * // mutations now return { data: { dry_run: true, diff: { ... } } }
 * ```
 */
import type { QueryResult } from './utils.js';
import type { QueryRegistry } from './registry.js';
/**
 * Configuration for the pipeline middleware.
 */
export interface PipelineOptions {
    /** When true, mutations execute against a temp clone and return a diff */
    dryRun?: boolean;
    /** Called before each handler invocation */
    onPrepare?: (command: string, args: string[], projectDir: string) => Promise<void>;
    /** Called after each handler invocation */
    onFinalize?: (command: string, args: string[], result: QueryResult) => Promise<void>;
}
/**
 * A single stage in the execution pipeline.
 */
export type PipelineStage = 'prepare' | 'execute' | 'finalize';
/**
 * Wrap all registered handlers with prepare/execute/finalize pipeline stages.
 *
 * When dryRun=true and a mutation command is dispatched, the real projectDir
 * is cloned (only .planning/ subtree) into a temp directory. The mutation
 * runs against the clone, a before/after diff is computed, and the temp
 * directory is cleaned up in a finally block. The real project is never
 * touched during a dry run.
 *
 * @param registry - The registry whose handlers to wrap
 * @param mutationCommands - Set of command names that perform mutations
 * @param options - Pipeline configuration
 */
export declare function wrapWithPipeline(registry: QueryRegistry, mutationCommands: Set<string>, options: PipelineOptions): void;
//# sourceMappingURL=pipeline.d.ts.map