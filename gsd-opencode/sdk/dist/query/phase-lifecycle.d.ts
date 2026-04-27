/**
 * Phase lifecycle handlers — add, insert, scaffold operations.
 *
 * Ported from get-shit-done/bin/lib/phase.cjs and commands.cjs.
 * Provides phaseAdd (append phase), phaseAddBatch (append multiple phases),
 * phaseInsert (decimal phase insertion), and phaseScaffold (template file/directory creation).
 *
 * Shared helpers replaceInCurrentMilestone and readModifyWriteRoadmapMd
 * are exported for use by downstream handlers (phaseComplete in Plan 03).
 *
 * @example
 * ```typescript
 * import { phaseAdd, phaseInsert, phaseScaffold } from './phase-lifecycle.js';
 *
 * await phaseAdd(['New Feature'], '/project');
 * await phaseInsert(['10', 'Urgent Fix'], '/project');
 * await phaseScaffold(['context', '9'], '/project');
 * ```
 */
import type { QueryHandler } from './utils.js';
/**
 * Replace a pattern only in the current milestone section of ROADMAP.md.
 *
 * Port of replaceInCurrentMilestone from core.cjs line 1197-1206.
 * If no `</details>` blocks exist, replaces in the entire content.
 * Otherwise, only replaces in content after the last `</details>` close tag.
 *
 * @param content - Full ROADMAP.md content
 * @param pattern - Regex or string pattern to match
 * @param replacement - Replacement string
 * @returns Modified content
 */
export declare function replaceInCurrentMilestone(content: string, pattern: string | RegExp, replacement: string): string;
/**
 * Atomic read-modify-write for ROADMAP.md.
 *
 * Holds a lockfile across the entire read -> transform -> write cycle.
 * Uses the same acquireStateLock/releaseStateLock mechanism as STATE.md
 * but with a ROADMAP.md-specific lock path.
 *
 * @param projectDir - Project root directory
 * @param modifier - Function to transform ROADMAP.md content
 * @returns The final written content
 */
export declare function readModifyWriteRoadmapMd(projectDir: string, modifier: (content: string) => string | Promise<string>, workstream?: string): Promise<string>;
/**
 * Query handler for phase.add.
 *
 * Port of cmdPhaseAdd from phase.cjs lines 312-392.
 * Creates a new phase directory with .gitkeep, appends a phase section
 * to ROADMAP.md before the last "---" separator.
 *
 * @param args - args[0]: description (required), args[1]: customId (optional)
 * @param projectDir - Project root directory
 * @returns QueryResult with { phase_number, padded, name, slug, directory, naming_mode }
 */
export declare const phaseAdd: QueryHandler;
/**
 * Query handler for phase.add-batch.
 *
 * Port of cmdPhaseAddBatch from phase.cjs lines 411-478.
 * Appends multiple phases in one locked ROADMAP pass (sequential or custom naming).
 *
 * @param args - Either `--descriptions` followed by a JSON array string, or one description per arg (`--raw` ignored)
 */
export declare const phaseAddBatch: QueryHandler;
/**
 * Query handler for phase.insert.
 *
 * Port of cmdPhaseInsert from phase.cjs lines 394-492.
 * Creates a decimal phase directory after a target phase, inserting
 * the phase section in ROADMAP.md after the target.
 *
 * @param args - args[0]: afterPhase (required), args[1]: description (required)
 * @param projectDir - Project root directory
 * @returns QueryResult with { phase_number, after_phase, name, slug, directory }
 */
export declare const phaseInsert: QueryHandler;
export declare const phaseScaffold: QueryHandler;
/**
 * Query handler for phase.remove.
 *
 * Port of cmdPhaseRemove from phase.cjs lines 597-661.
 * Deletes phase directory, renumbers subsequent phases on disk,
 * updates ROADMAP.md (removes section + renumbers), and decrements
 * STATE.md total_phases count.
 *
 * @param args - args[0]: targetPhase (required), args[1]: '--force' (optional)
 * @param projectDir - Project root directory
 * @returns QueryResult with { removed, directory_deleted, renamed_directories, renamed_files, roadmap_updated, state_updated }
 */
export declare const phaseRemove: QueryHandler;
/**
 * Query handler for phase.complete.
 *
 * Port of cmdPhaseComplete from phase.cjs lines 663-932.
 * Marks a phase as done — updates ROADMAP.md (checkbox, progress table,
 * plan count, plan checkboxes), REQUIREMENTS.md (requirement checkboxes,
 * traceability table), and STATE.md (current phase, status, progress,
 * performance metrics) atomically with per-file locks.
 *
 * @param args - args[0]: phaseNum (required)
 * @param projectDir - Project root directory
 * @returns QueryResult with completion details and warnings
 */
export declare const phaseComplete: QueryHandler;
/**
 * Query handler for phases.clear.
 *
 * Port of cmdPhasesClear from milestone.cjs lines 250-277.
 * Deletes all phase directories except 999.x backlog phases.
 * Requires --confirm flag to proceed.
 *
 * @param args - args[0]: '--confirm' to proceed (optional)
 * @param projectDir - Project root directory
 * @returns QueryResult with { cleared: count }
 */
export declare const phasesClear: QueryHandler;
/**
 * Query handler for phases.archive.
 *
 * Extracted from cmdMilestoneComplete, milestone.cjs lines 210-227.
 * Moves milestone phase directories to milestones/{version}-phases/.
 *
 * @param args - args[0]: version string (e.g., "v3.0")
 * @param projectDir - Project root directory
 * @returns QueryResult with { archived: count, version, archive_directory }
 */
export declare const phasesList: QueryHandler;
export declare const phaseNextDecimal: QueryHandler;
export declare const phasesArchive: QueryHandler;
/**
 * Query handler for `milestone.complete` — port of `cmdMilestoneComplete` from `milestone.cjs`.
 */
export declare const milestoneComplete: QueryHandler;
//# sourceMappingURL=phase-lifecycle.d.ts.map