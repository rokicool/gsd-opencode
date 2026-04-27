/**
 * Context truncation — reduces large .planning/ files to cache-friendly sizes.
 *
 * Two strategies:
 * 1. Markdown-aware truncation: keeps headings + first paragraph per section,
 *    replaces the rest with a pointer to the full file.
 * 2. Milestone extraction: pulls only the current milestone from ROADMAP.md.
 *
 * All functions are pure — no I/O, no side effects.
 */
export interface TruncationOptions {
    /** Max content length in characters before truncation kicks in. Default: 8192 */
    maxContentLength: number;
}
export declare const DEFAULT_TRUNCATION_OPTIONS: TruncationOptions;
/**
 * Truncate markdown content while preserving structure.
 *
 * Strategy: keep YAML frontmatter, all headings, and the first paragraph under
 * each heading. Collapse everything else with a line count summary.
 *
 * Returns the original content unchanged if below maxContentLength.
 */
export declare function truncateMarkdown(content: string, filename: string, options?: TruncationOptions): string;
/**
 * Extract the current milestone section from a ROADMAP.md.
 *
 * Parses STATE.md to find the current milestone name, then extracts only
 * that milestone's section from the roadmap. Falls back to full content
 * if the milestone can't be identified or found.
 */
export declare function extractCurrentMilestone(roadmapContent: string, stateContent?: string): string;
//# sourceMappingURL=context-truncation.d.ts.map