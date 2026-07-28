/**
 * Utility query handlers — pure SDK implementations of simple commands.
 *
 * These handlers are direct TypeScript ports of gsd-tools.cjs functions:
 * - `generateSlug` ← `cmdGenerateSlug` (commands.cjs lines 38-48)
 * - `currentTimestamp` ← `cmdCurrentTimestamp` (commands.cjs lines 50-71)
 *
 * @example
 * ```typescript
 * import { generateSlug, currentTimestamp } from './utils.js';
 *
 * const slug = await generateSlug(['My Phase Name'], '/path/to/project');
 * // { data: { slug: 'my-phase-name' } }
 *
 * const ts = await currentTimestamp(['date'], '/path/to/project');
 * // { data: { timestamp: '2026-04-08' } }
 * ```
 */
/** Structured result returned by all query handlers. */
export interface QueryResult<T = unknown> {
    data: T;
}
/** Signature for a query handler function. */
export type QueryHandler<T = unknown> = (args: string[], projectDir: string, workstream?: string) => Promise<QueryResult<T>>;
/**
 * Converts text into a URL-safe kebab-case slug.
 *
 * Port of `cmdGenerateSlug` from `get-shit-done/bin/lib/commands.cjs`.
 * Algorithm: lowercase, replace non-alphanumeric with hyphens,
 * strip leading/trailing hyphens, truncate to 60 characters.
 *
 * @param args - `args[0]` is the text to slugify
 * @param _projectDir - Unused (pure function)
 * @returns Query result with `{ slug: string }`
 * @throws GSDError with Validation classification if text is missing or empty
 */
export declare const generateSlug: QueryHandler;
/**
 * Returns the current timestamp in the requested format.
 *
 * Port of `cmdCurrentTimestamp` from `get-shit-done/bin/lib/commands.cjs`.
 * Formats: `'full'` (ISO 8601), `'date'` (YYYY-MM-DD), `'filename'` (colons replaced).
 *
 * @param args - `args[0]` is the format (`'full'` | `'date'` | `'filename'`), defaults to `'full'`
 * @param _projectDir - Unused (pure function)
 * @returns Query result with `{ timestamp: string }`
 */
export declare const currentTimestamp: QueryHandler;
//# sourceMappingURL=utils.d.ts.map