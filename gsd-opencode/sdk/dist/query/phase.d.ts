/**
 * Phase finding and plan index query handlers.
 *
 * Ported from get-shit-done/bin/lib/phase.cjs and core.cjs.
 * Provides find-phase (directory lookup with archived fallback)
 * and phase-plan-index (plan metadata with wave grouping).
 *
 * @example
 * ```typescript
 * import { findPhase, phasePlanIndex } from './phase.js';
 *
 * const found = await findPhase(['9'], '/project');
 * // { data: { found: true, directory: '.planning/phases/09-foundation', ... } }
 *
 * const index = await phasePlanIndex(['9'], '/project');
 * // { data: { phase: '09', plans: [...], waves: { '1': [...] }, ... } }
 * ```
 */
import type { QueryHandler } from './utils.js';
/**
 * Query handler for find-phase.
 *
 * Locates a phase directory by number/identifier, searching current phases
 * first, then archived milestone phases.
 *
 * Port of cmdFindPhase from phase.cjs lines 152-196, combined with
 * findPhaseInternal from core.cjs lines 1002-1038.
 *
 * @param args - args[0] is the phase identifier (required)
 * @param projectDir - Project root directory
 * @returns QueryResult with PhaseInfo
 * @throws GSDError with Validation classification if phase identifier missing
 */
export declare const findPhase: QueryHandler;
/**
 * Query handler for phase-plan-index.
 *
 * Returns plan metadata with wave grouping for a specific phase.
 *
 * Port of cmdPhasePlanIndex from phase.cjs lines 203-310.
 *
 * @param args - args[0] is the phase identifier (required)
 * @param projectDir - Project root directory
 * @returns QueryResult with { phase, plans[], waves{}, incomplete[], has_checkpoints }
 * @throws GSDError with Validation classification if phase identifier missing
 */
export declare const phasePlanIndex: QueryHandler;
//# sourceMappingURL=phase.d.ts.map