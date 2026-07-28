/**
 * Frontmatter mutation handlers — write operations for YAML frontmatter.
 *
 * Ported from get-shit-done/bin/lib/frontmatter.cjs.
 * Provides reconstructFrontmatter (serialization), spliceFrontmatter (replacement),
 * and query handlers for frontmatter.set, frontmatter.merge, frontmatter.validate.
 *
 * @example
 * ```typescript
 * import { reconstructFrontmatter, spliceFrontmatter } from './frontmatter-mutation.js';
 *
 * const yaml = reconstructFrontmatter({ phase: '10', tags: ['a', 'b'] });
 * // 'phase: 10\ntags: [a, b]'
 *
 * const updated = spliceFrontmatter('---\nold: val\n---\nbody', { new: 'val' });
 * // '---\nnew: val\n---\nbody'
 * ```
 */
import type { QueryHandler } from './utils.js';
/** Schema definitions for frontmatter validation. */
export declare const FRONTMATTER_SCHEMAS: Record<string, {
    required: string[];
}>;
/**
 * Serialize a flat/nested object into YAML frontmatter lines.
 *
 * Port of `reconstructFrontmatter` from frontmatter.cjs lines 122-183.
 * Handles arrays (inline/dash), nested objects (2 levels), and quoting.
 *
 * @param obj - Object to serialize
 * @returns YAML string (without --- delimiters)
 */
export declare function reconstructFrontmatter(obj: Record<string, unknown>): string;
/**
 * Replace or prepend frontmatter in content.
 *
 * Port of `spliceFrontmatter` from frontmatter.cjs lines 186-193.
 *
 * @param content - File content with potential existing frontmatter
 * @param newObj - New frontmatter object to serialize
 * @returns Content with updated frontmatter
 */
export declare function spliceFrontmatter(content: string, newObj: Record<string, unknown>): string;
/**
 * Query handler for frontmatter.set command.
 *
 * Reads a file, sets a single frontmatter field, writes back with normalization.
 * Port of `cmdFrontmatterSet` from frontmatter.cjs lines 328-342.
 *
 * @param args - args[0]: file path, args[1]: field name, args[2]: value
 * @param projectDir - Project root directory
 * @returns QueryResult with { updated: true, field, value }
 */
export declare const frontmatterSet: QueryHandler;
/**
 * Query handler for frontmatter.merge command.
 *
 * Reads a file, merges JSON object into existing frontmatter, writes back.
 * Port of `cmdFrontmatterMerge` from frontmatter.cjs lines 344-356.
 *
 * @param args - `file --data <json>` (gsd-tools) or `[file, jsonString]` (SDK)
 * @param projectDir - Project root directory
 * @returns QueryResult with { merged: true, fields: [...] }
 */
export declare const frontmatterMerge: QueryHandler;
/**
 * Query handler for frontmatter.validate command.
 *
 * Reads a file and checks its frontmatter against a known schema.
 * Port of `cmdFrontmatterValidate` from frontmatter.cjs lines 358-369.
 *
 * @param args - args[0]: file path, args[1]: '--schema', args[2]: schema name
 * @param projectDir - Project root directory
 * @returns QueryResult with { valid, missing, present, schema }
 */
export declare const frontmatterValidate: QueryHandler;
//# sourceMappingURL=frontmatter-mutation.d.ts.map