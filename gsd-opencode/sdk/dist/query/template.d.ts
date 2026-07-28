/**
 * Template handlers — template selection and fill operations.
 *
 * Ported from get-shit-done/bin/lib/template.cjs.
 * Provides templateSelect (heuristic template type selection) and
 * templateFill (create file from template with auto-generated frontmatter).
 *
 * @example
 * ```typescript
 * import { templateSelect, templateFill } from './template.js';
 *
 * const selectResult = await templateSelect(['9'], projectDir);
 * // { data: { template: 'summary' } }
 *
 * const fillResult = await templateFill(['summary', '/path/out.md', 'phase=09'], projectDir);
 * // { data: { created: true, path: '/path/out.md', template: 'summary' } }
 * ```
 */
import type { QueryHandler } from './utils.js';
/**
 * Select the appropriate template type based on phase directory contents.
 *
 * Heuristic:
 * - Has all PLAN+SUMMARY pairs -> "verification"
 * - Has PLAN but missing SUMMARY for latest plan -> "summary"
 * - Else -> "plan" (default)
 *
 * @param args - [phaseNumber?] Optional phase number to check
 * @param projectDir - Project root directory
 * @returns QueryResult with { template: 'plan' | 'summary' | 'verification' }
 */
export declare const templateSelect: QueryHandler;
/**
 * Create a file from a template type with auto-generated frontmatter.
 *
 * Port of cmdTemplateFill from template.cjs.
 *
 * @param args - [templateType, outputPath, ...key=value overrides]
 *   templateType: "summary" | "plan" | "verification"
 *   outputPath: Absolute or relative path for output file
 *   key=value: Optional frontmatter field overrides
 * @param projectDir - Project root directory
 * @returns QueryResult with { created: true, path, template }
 */
export declare const templateFill: QueryHandler;
//# sourceMappingURL=template.d.ts.map