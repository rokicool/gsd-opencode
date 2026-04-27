/**
 * roadmap.update-plan-progress — sync ROADMAP.md progress table + plan checkboxes
 * from on-disk PLAN/SUMMARY counts for a phase.
 *
 * Port of `cmdRoadmapUpdatePlanProgress` from get-shit-done/bin/lib/roadmap.cjs
 * (lines 257–354). Uses `findPhase` for disk stats and `readModifyWriteRoadmapMd`
 * for atomic writes (same pattern as `phase.complete`).
 */
import type { QueryHandler } from './utils.js';
export declare const roadmapUpdatePlanProgress: QueryHandler;
//# sourceMappingURL=roadmap-update-plan-progress.d.ts.map