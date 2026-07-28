/**
 * Batch workflow config for orchestration decisions (`check.config-gates`).
 *
 * Replaces many repeated `config-get workflow.*` calls with one JSON object.
 * See `.planning/research/decision-routing-audit.md` §3.3.
 */
import type { QueryHandler } from './utils.js';
/**
 * Merge workflow defaults with project config, then expose stable keys for workflows.
 */
export declare const checkConfigGates: QueryHandler;
//# sourceMappingURL=config-gates.d.ts.map