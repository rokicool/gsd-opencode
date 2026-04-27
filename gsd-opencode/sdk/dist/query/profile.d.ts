/**
 * Profile and learnings query handlers — session scanning, questionnaire,
 * profile generation, and knowledge store management.
 *
 * Ported from get-shit-done/bin/lib/profile-pipeline.cjs, profile-output.cjs,
 * and learnings.cjs.
 *
 * @example
 * ```typescript
 * import { scanSessions, profileQuestionnaire } from './profile.js';
 *
 * await scanSessions([], '/project');
 * // { data: { projects: [...], project_count: 5, session_count: 42 } }
 *
 * await profileQuestionnaire([], '/project');
 * // { data: { mode: 'interactive', questions: [...] } } — same shape as gsd-tools.cjs
 * ```
 */
import type { QueryHandler } from './utils.js';
/**
 * List all entries in the global learnings store (`~/.gsd/knowledge/`).
 *
 * Port of `cmdLearningsList` from learnings.cjs.
 */
export declare const learningsListHandler: QueryHandler;
/**
 * Query learnings from the global knowledge store, optionally filtered by tag.
 *
 * Port of `cmdLearningsQuery` from learnings.cjs lines 316-323.
 * Called by gsd-planner agent to inject prior learnings into plan generation.
 *
 * Args: --tag <tag> [--limit N]
 */
export declare const learningsQuery: QueryHandler;
export declare const learningsCopy: QueryHandler;
/** Port of `cmdLearningsPrune`. */
export declare const learningsPrune: QueryHandler;
/** Port of `cmdLearningsDelete`. */
export declare const learningsDelete: QueryHandler;
/**
 * Extract user messages from Claude Code session files for a given project.
 *
 * Port of `cmdExtractMessages` from profile-pipeline.cjs — JSON matches `gsd-tools extract-messages`
 * (`output_file` JSONL + metadata). Uses `--session` (CJS); `--session-id` is accepted as an alias.
 *
 * @param args - args[0]: project name/keyword (required), `--session <id>`, `--limit N`, `--path <dir>`
 */
export declare const extractMessages: QueryHandler;
export declare const scanSessions: QueryHandler;
/**
 * Multi-project session sampling for profiling — port of `cmdProfileSample` (`profile-pipeline.cjs`).
 * JSON matches `gsd-tools profile-sample` (`output_file` JSONL + metadata).
 */
export declare const profileSample: QueryHandler;
/**
 * Profile questionnaire — port of `cmdProfileQuestionnaire` from profile-output.cjs.
 * Interactive: `{ mode: 'interactive', questions }` (options omit `rating`).
 * With `--answers a,b,c,...` (8 comma-separated values, order matches questions): full analysis object (includes volatile `analyzed_at`).
 */
export declare const profileQuestionnaire: QueryHandler;
//# sourceMappingURL=profile.d.ts.map