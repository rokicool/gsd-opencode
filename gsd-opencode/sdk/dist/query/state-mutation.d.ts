/**
 * STATE.md mutation handlers — write operations with lockfile atomicity.
 *
 * Ported from get-shit-done/bin/lib/state.cjs.
 * Provides STATE.md mutation commands: update, patch, begin-phase,
 * advance-plan, record-metric, update-progress, add-decision, add-blocker,
 * resolve-blocker, record-session, validate, sync, prune, signal-waiting, signal-resume.
 *
 * All writes go through readModifyWriteStateMd which acquires a lockfile,
 * applies the modifier, syncs frontmatter, normalizes markdown, and writes.
 *
 * @example
 * ```typescript
 * import { stateUpdate, stateBeginPhase } from './state-mutation.js';
 *
 * await stateUpdate(['Status', 'executing'], '/project');
 * await stateBeginPhase(['11', 'State Mutations', '3'], '/project');
 * ```
 */
import type { QueryHandler } from './utils.js';
/**
 * Module-level set tracking held locks for process.on('exit') cleanup.
 * Exported for test access only.
 */
export declare const _heldStateLocks: Set<string>;
/**
 * Replace a field value in STATE.md content.
 *
 * Uses separate regex instances (no g flag) to avoid lastIndex persistence.
 * Supports both **bold:** and plain: formats.
 *
 * @param content - STATE.md content
 * @param fieldName - Field name to replace
 * @param newValue - New value to set
 * @returns Updated content, or null if field not found
 */
export declare function stateReplaceField(content: string, fieldName: string, newValue: string): string | null;
/**
 * Acquire a lockfile for STATE.md operations.
 *
 * Uses O_CREAT|O_EXCL for atomic creation. Retries up to 10 times with
 * 200ms + jitter delay. Cleans stale locks when the holder PID is dead, or when
 * the lock file is older than 10 seconds (existing heuristic).
 *
 * @param statePath - Path to STATE.md
 * @returns Path to the lockfile
 */
export declare function acquireStateLock(statePath: string): Promise<string>;
/**
 * Release a lockfile.
 *
 * @param lockPath - Path to the lockfile to release
 */
export declare function releaseStateLock(lockPath: string): Promise<void>;
/**
 * Full-file read-modify-write for STATE.md — matches CJS `readModifyWriteStateMd` in `state.cjs`
 * (modifier receives entire file content including YAML frontmatter).
 * Used by milestone completion and other flows that replace body fields the same way as the CLI.
 */
export declare function readModifyWriteStateMdFull(projectDir: string, modifier: (content: string) => string | Promise<string>, workstream?: string): Promise<void>;
/**
 * Query handler for state.update command.
 *
 * Replaces a single field in STATE.md.
 *
 * @param args - args[0]: field name, args[1]: new value
 * @param projectDir - Project root directory
 * @returns QueryResult with { updated: true/false, field, value }
 */
export declare const stateUpdate: QueryHandler;
/**
 * Query handler for state.patch command.
 *
 * Replaces multiple fields atomically in one lock cycle.
 *
 * @param args - Either `--field value` pairs (CLI / gsd-tools) or a single JSON object string (SDK).
 * @param projectDir - Project root directory
 * @returns QueryResult with `{ updated, failed }` matching `cmdStatePatch` in `state.cjs`
 */
export declare const statePatch: QueryHandler;
/**
 * Query handler for state.begin-phase command.
 *
 * Sets phase, plan, status, progress, and current focus fields.
 * Rewrites the Current Position section.
 *
 * Accepts gsd-tools-style argv: `--phase N [--name S] [--plans C]` or positional
 * `[phase, name?, planCount?]` (tests and direct handler calls).
 *
 * @param args - Named or positional phase / name / plan count
 * @param projectDir - Project root directory
 * @returns QueryResult with phase metadata and `updated` field names (for raw parity)
 */
export declare const stateBeginPhase: QueryHandler;
/**
 * Query handler for state.advance-plan command.
 *
 * Increments plan counter. Detects phase completion when at last plan.
 *
 * @param args - unused
 * @param projectDir - Project root directory
 * @returns QueryResult with { advanced, current_plan, total_plans }
 */
export declare const stateAdvancePlan: QueryHandler;
/**
 * Query handler for state.record-metric command.
 *
 * Appends a row to the Performance Metrics table.
 *
 * @param args - gsd-tools argv: `--phase`, `--plan`, `--duration`, `--tasks`, `--files`
 * @param projectDir - Project root directory
 * @returns QueryResult with { recorded: true/false }
 */
export declare const stateRecordMetric: QueryHandler;
/**
 * Query handler for state.update-progress command.
 *
 * Scans disk to count completed/total plans and updates progress bar.
 *
 * @param args - unused
 * @param projectDir - Project root directory
 * @returns QueryResult with { updated, percent, completed, total }
 */
export declare const stateUpdateProgress: QueryHandler;
/**
 * Query handler for state.add-decision command.
 *
 * Appends a decision to the Decisions section. Removes placeholder text.
 * argv matches `gsd-tools.cjs`: `--phase`, `--summary`, `--rationale`, etc.
 */
export declare const stateAddDecision: QueryHandler;
/**
 * Query handler for state.add-blocker command.
 * argv: `--text`, `--text-file` (see `gsd-tools.cjs`).
 */
export declare const stateAddBlocker: QueryHandler;
/**
 * Query handler for state.resolve-blocker command.
 * argv: `--text` (see `gsd-tools.cjs`).
 */
export declare const stateResolveBlocker: QueryHandler;
/**
 * Query handler for `state.add-roadmap-evolution`.
 *
 * Appends a single entry to the `### Roadmap Evolution` subsection under
 * `## Accumulated Context` in STATE.md. Creates the subsection if missing.
 * Deduplicates on exact line match against existing entries.
 *
 * Canonical replacement for the raw `edit`/`write` instructions in
 * `insert-phase.md` / `add-phase.md` step "update_project_state" so that
 * projects with a `protect-files.sh` PreToolUse hook blocking direct
 * STATE.md writes still update the Roadmap Evolution log.
 *
 * argv: `--phase`, `--action` (inserted|removed|moved|edited|added),
 *       `--note` (optional), `--after` (optional, for `inserted`),
 *       `--urgent` (boolean flag, appends "(URGENT)" when action=inserted).
 *
 * Returns `{ added: true, entry }` on success, or
 * `{ added: false, reason: 'duplicate', entry }` when an identical line
 * already exists.
 *
 * Throws `GSDError` with `ErrorClassification.Validation` when required
 * inputs are missing or `--action` is not in the allowed set.
 *
 * Atomicity: goes through `readModifyWriteStateMd` which holds a lockfile
 * across read -> transform -> write. Matches sibling mutation handlers.
 */
export declare const stateAddRoadmapEvolution: QueryHandler;
/**
 * Query handler for state.record-session command.
 * argv: `--stopped-at`, `--resume-file` (see `cmdStateRecordSession` in `state.cjs`).
 */
export declare const stateRecordSession: QueryHandler;
/**
 * Query handler for state.planned-phase — port of `cmdStatePlannedPhase` from `state.cjs`.
 */
export declare const statePlannedPhase: QueryHandler;
/**
 * Query handler for `state.milestone-switch` — resets STATE.md for a new
 * milestone cycle (bug #2630 regression guard).
 *
 * The `/gsd-new-milestone` workflow only rewrote STATE.md's body (Current
 * Position section). The YAML frontmatter (`milestone`, `milestone_name`,
 * `status`, `progress.*`) was never touched on a mid-flight switch, so queries
 * that read frontmatter (`state.json`, `getMilestoneInfo`, every handler that
 * calls `buildStateFrontmatter`) kept reporting the old milestone and stale
 * progress counters until the first phase advance forced a resync.
 *
 * This handler performs the reset atomically under the STATE.md lock:
 * - Stomps frontmatter milestone/milestone_name with the caller-supplied
 *   values so `parseMilestoneFromState` reports the new milestone immediately.
 * - Resets `status` to `'planning'` (workflow is at "Defining requirements").
 * - Resets `progress` counters to zero (new milestone, nothing executed yet).
 * - Rewrites the `## Current Position` body to the new-milestone template so
 *   subsequent body-derived field extraction stays consistent with frontmatter.
 * - Preserves Accumulated Context (decisions, todos, blockers) — symmetric
 *   with `milestone.complete` which also keeps history.
 *
 * Args (named, matches gsd-tools style):
 * - `--version <vX.Y>` (required)
 * - `--name <milestone name>` (optional; defaults to 'milestone')
 *
 * Sibling CJS parity: `cmdInitNewMilestone` in `init.cjs` is read-only (like
 * the TS `initNewMilestone`). The workflow-level fix is to call
 * `state.milestone-switch` from `/gsd-new-milestone` Step 5 in place of the
 * manual body rewrite.
 */
export declare const stateMilestoneSwitch: QueryHandler;
/**
 * Port of `cmdSignalWaiting` from state.cjs.
 * Args: `--type`, `--question`, `--options` (pipe-separated), `--phase`.
 *
 * Writes `WAITING.json` under both `.gsd/` and `.planning/` so readers that only
 * watch one location (e.g. init workflows) still observe the signal.
 */
export declare const stateSignalWaiting: QueryHandler;
/**
 * Port of `cmdSignalResume` from state.cjs.
 */
export declare const stateSignalResume: QueryHandler;
/**
 * Port of `cmdStateValidate` from state.cjs.
 */
export declare const stateValidate: QueryHandler;
/**
 * Port of `cmdStateSync` from state.cjs. Supports `--verify` dry-run.
 */
export declare const stateSync: QueryHandler;
/**
 * Port of `cmdStatePrune` from state.cjs.
 * Args: `--keep-recent N` (default 3), `--dry-run`, `--silent` (omit extra logging fields — no-op in SDK JSON).
 */
export declare const statePrune: QueryHandler;
//# sourceMappingURL=state-mutation.d.ts.map