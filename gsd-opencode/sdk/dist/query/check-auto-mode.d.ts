/**
 * Consolidated auto-advance flags (`check.auto-mode`).
 *
 * Replaces paired `config-get workflow.auto_advance` + `config-get workflow._auto_chain_active`
 * for checkpoint and auto-advance gates. See `.planning/research/decision-routing-audit.md` §3.5.
 *
 * Semantics match `execute-phase.md`: automation applies when **either** the ephemeral chain flag
 * or the persistent user preference is true (`active === true`).
 */
import type { QueryHandler } from './utils.js';
export type AutoModeSource = 'auto_chain' | 'auto_advance' | 'both' | 'none';
export declare const checkAutoMode: QueryHandler;
//# sourceMappingURL=check-auto-mode.d.ts.map