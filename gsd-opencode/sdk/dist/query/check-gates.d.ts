/**
 * Safety gate consolidation (`check.gates`).
 *
 * Checks blocking conditions before proceeding with a workflow — replaces
 * per-workflow gate logic in `next.md`, `execute-phase.md`, `discuss-phase.md`.
 * See `.planning/research/decision-routing-audit.md` §3.2.
 */
import type { QueryHandler } from './utils.js';
export declare const checkGates: QueryHandler;
//# sourceMappingURL=check-gates.d.ts.map