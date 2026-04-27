/**
 * Roadmap query handlers — ROADMAP.md analysis and phase lookup.
 *
 * Ported from get-shit-done/bin/lib/roadmap.cjs and core.cjs.
 * Provides roadmap.analyze (multi-pass parsing with disk correlation)
 * and roadmap.get-phase (single phase section extraction).
 *
 * @example
 * ```typescript
 * import { roadmapAnalyze, roadmapGetPhase } from './roadmap.js';
 *
 * const analysis = await roadmapAnalyze([], '/project');
 * // { data: { phases: [...], phase_count: 6, progress_percent: 50, ... } }
 *
 * const phase = await roadmapGetPhase(['10'], '/project');
 * // { data: { found: true, phase_number: '10', phase_name: 'read-Only Queries', ... } }
 * ```
 */
import type { QueryHandler } from './utils.js';
/**
 * Strip <details>...</details> blocks from content (shipped milestones).
 *
 * Port of stripShippedMilestones from core.cjs line 1082-1084.
 */
export declare function stripShippedMilestones(content: string): string;
/**
 * Get milestone version and name from ROADMAP.md (and optionally STATE.md).
 *
 * Port of getMilestoneInfo from core.cjs lines 1367-1402, extended for:
 * - 🟡 in-flight marker (same list shape as 🚧)
 * - milestone bullets `**vX.Y Title**` before `## Phases` (last = current when listed in semver order)
 * - STATE.md frontmatter when ROADMAP has no parseable milestone
 * - **last** bare `vX.Y` fallback (first match was often v1.0 from the shipped list)
 *
 * @param projectDir - Project root directory
 * @returns Object with version and name
 */
export declare function getMilestoneInfo(projectDir: string, workstream?: string): Promise<{
    version: string;
    name: string;
}>;
/**
 * Extract the current milestone section from ROADMAP.md.
 *
 * Port of extractCurrentMilestone from core.cjs lines 1102-1170.
 *
 * @param content - Full ROADMAP.md content
 * @param projectDir - Working directory for reading STATE.md
 * @returns Content scoped to current milestone
 */
export declare function extractCurrentMilestone(content: string, projectDir: string, workstream?: string): Promise<string>;
/**
 * Phase shape returned by extractPhasesFromSection — mirrors the fields used
 * by the current-milestone phases array in initManager so consumers can
 * render queued phases uniformly.
 */
export interface QueuedPhase {
    number: string;
    name: string;
    goal: string | null;
    depends_on: string | null;
}
/**
 * Extract phase entries from an arbitrary ROADMAP milestone section.
 *
 * Parses `#### Phase N: Name` / `### Phase N: Name` / `## Phase N: Name`
 * headings and, for each, captures goal + depends_on via the same patterns
 * used by initManager's current-milestone phase parsing. Used by
 * `initManager` to populate `queued_phases` (#2497).
 */
export declare function extractPhasesFromSection(section: string): QueuedPhase[];
/**
 * Find the milestone section that comes immediately AFTER the active one.
 *
 * Used by initManager to surface `queued_phases` without conflating the
 * active milestone's phase list with the next one (#2497). Returns null
 * when no subsequent milestone section exists (active is the last one).
 *
 * Reuses the same current-version resolution path as `getMilestoneInfo`:
 * STATE.md frontmatter first, then in-flight emoji markers in ROADMAP.
 * Shipped milestones are stripped first so they can't shadow the real
 * "next" one.
 */
export declare function extractNextMilestoneSection(content: string, projectDir: string): Promise<{
    version: string;
    name: string;
    section: string;
} | null>;
/**
 * Query handler for roadmap.get-phase.
 *
 * Port of cmdRoadmapGetPhase from roadmap.cjs lines 75-113.
 *
 * @param args - args[0] is phase number (required)
 * @param projectDir - Project root directory
 * @returns QueryResult with phase section info or { found: false }
 */
export declare const roadmapGetPhase: QueryHandler;
/**
 * Query handler for roadmap.analyze.
 *
 * Port of cmdRoadmapAnalyze from roadmap.cjs lines 115-248.
 * Multi-pass regex parsing with disk status correlation.
 *
 * @param args - Unused
 * @param projectDir - Project root directory
 * @returns QueryResult with full roadmap analysis
 */
export declare const roadmapAnalyze: QueryHandler;
/**
 * Annotate the ROADMAP.md plan list with wave dependency notes and
 * cross-cutting constraints derived from PLAN frontmatter.
 *
 * Delegates to gsd-tools.cjs which holds the full annotation logic.
 * Returns { updated, phase, waves, cross_cutting_constraints }.
 */
export declare const roadmapAnnotateDependencies: QueryHandler;
/**
 * Mark requirement IDs complete in REQUIREMENTS.md (checkbox + traceability table).
 * Port of `cmdRequirementsMarkComplete` from milestone.cjs lines 11–87.
 */
export declare const requirementsMarkComplete: QueryHandler;
//# sourceMappingURL=roadmap.d.ts.map