/**
 * plan-parser.ts — Parse GSD-1 PLAN.md files into structured data.
 *
 * Extracts YAML frontmatter, XML task bodies, and markdown sections
 * (<objective>, <execution_context>, <context>) from plan files.
 *
 * Ported from get-shit-done/bin/lib/frontmatter.cjs with TypeScript types.
 */
import type { PlanTask, ParsedPlan } from './types.js';
/**
 * Extract frontmatter from a PLAN.md content string.
 *
 * Uses a stack-based parser that handles nested objects, inline arrays,
 * multi-line arrays, and boolean/numeric coercion. Ported from the CJS
 * reference implementation with the same edge-case coverage.
 */
export declare function extractFrontmatter(content: string): Record<string, unknown>;
/**
 * Parse XML task blocks from the <tasks> section.
 *
 * Uses a regex to match <task ...>...</task> blocks, then extracts
 * inner elements (name, files, read_first, action, verify,
 * acceptance_criteria, done).
 *
 * Handles:
 * - Multiline <action> blocks (including code snippets with angle brackets)
 * - Optional elements (missing elements → empty string/array)
 * - Both auto and checkpoint task types
 */
export declare function parseTasks(content: string): PlanTask[];
/**
 * Parse a GSD-1 PLAN.md content string into a structured ParsedPlan.
 *
 * Extracts:
 * - YAML frontmatter (phase, wave, depends_on, must_haves, etc.)
 * - <objective> section
 * - <execution_context> references
 * - <context> file references
 * - <task> blocks with all inner elements
 *
 * Handles edge cases:
 * - Empty input → empty frontmatter, no tasks
 * - Missing frontmatter → empty object with defaults
 * - Malformed XML → partial extraction, no crash
 */
export declare function parsePlan(content: string): ParsedPlan;
/**
 * Convenience wrapper — reads a PLAN.md file from disk and parses it.
 */
export declare function parsePlanFile(filePath: string): Promise<ParsedPlan>;
//# sourceMappingURL=plan-parser.d.ts.map