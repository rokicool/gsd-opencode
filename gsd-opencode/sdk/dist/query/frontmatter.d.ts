/**
 * Frontmatter parser and query handler.
 *
 * Ported from get-shit-done/bin/lib/frontmatter.cjs and state.cjs.
 * Provides YAML frontmatter extraction from .planning/ artifacts.
 *
 * @example
 * ```typescript
 * import { extractFrontmatter, frontmatterGet } from './frontmatter.js';
 *
 * const fm = extractFrontmatter('---\nphase: 10\nplan: 01\n---\nbody');
 * // { phase: '10', plan: '01' }
 *
 * const result = await frontmatterGet(['STATE.md'], '/project');
 * // { data: { gsd_state_version: '1.0', milestone: 'v3.0', ... } }
 * ```
 */
import type { QueryHandler } from './utils.js';
/**
 * Quote-aware CSV splitting for inline YAML arrays.
 *
 * Handles both single and double quotes, preserving commas inside quotes.
 *
 * @param body - The content inside brackets, e.g. 'a, "b, c", d'
 * @returns Array of trimmed values
 */
export declare function splitInlineArray(body: string): string[];
/**
 * First leading frontmatter block only — parity with `get-shit-done/bin/lib/frontmatter.cjs`
 * `extractFrontmatter` (used by `summary-extract` and `history-digest` in gsd-tools.cjs).
 */
export declare function extractFrontmatterLeading(content: string): Record<string, unknown>;
/**
 * Parse YAML frontmatter from file content.
 *
 * Full stack-based parser supporting:
 * - Simple key: value pairs
 * - Nested objects via indentation
 * - Inline arrays: key: [a, b, c]
 * - Dash arrays with auto-conversion from empty objects
 * - Multiple stacked blocks (uses the LAST match)
 * - CRLF line endings
 * - Quoted value stripping
 *
 * @param content - File content potentially containing frontmatter
 * @returns Parsed frontmatter as a record, or empty object if none found
 */
export declare function extractFrontmatter(content: string): Record<string, unknown>;
/**
 * Strip all frontmatter blocks from the start of content.
 *
 * Handles CRLF line endings and multiple stacked blocks (corruption recovery).
 * Greedy: keeps stripping ---...--- blocks separated by optional whitespace.
 *
 * @param content - File content with potential frontmatter
 * @returns Content with frontmatter removed
 */
export declare function stripFrontmatter(content: string): string;
/**
 * Result of parsing a must_haves block from frontmatter.
 */
export interface MustHavesBlockResult {
    items: unknown[];
    warnings: string[];
}
/**
 * Parse a named block from must_haves in raw frontmatter YAML.
 *
 * Port of `parseMustHavesBlock` from `get-shit-done/bin/lib/frontmatter.cjs` lines 195-301.
 * Handles 3-level nesting: `must_haves > blockName > [{key: value, ...}]`.
 * Supports simple string items, structured objects with key-value pairs,
 * and nested arrays within items.
 *
 * @param content - File content with frontmatter
 * @param blockName - Block name under must_haves (e.g. 'artifacts', 'key_links', 'truths')
 * @returns Structured result with items array and warnings
 */
export declare function parseMustHavesBlock(content: string, blockName: string): MustHavesBlockResult;
/**
 * Query handler for frontmatter.get command.
 *
 * Reads a file, extracts frontmatter, and optionally returns a single field.
 * Rejects null bytes in path (security: path traversal guard).
 *
 * @param args - args[0]: file path, args[1]: optional field name
 * @param projectDir - Project root directory
 * @returns QueryResult with parsed frontmatter or single field value
 */
export declare const frontmatterGet: QueryHandler;
//# sourceMappingURL=frontmatter.d.ts.map