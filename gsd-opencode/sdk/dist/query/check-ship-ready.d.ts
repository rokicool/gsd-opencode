/**
 * Ship preflight checks (`check.ship-ready`).
 *
 * Consolidates git/gh checks from `ship.md` into a single structured query.
 * All subprocess calls are wrapped in try/catch — never throws on git/gh failures.
 * See `.planning/research/decision-routing-audit.md` §3.9.
 */
import type { QueryHandler } from './utils.js';
export declare const checkShipReady: QueryHandler;
//# sourceMappingURL=check-ship-ready.d.ts.map