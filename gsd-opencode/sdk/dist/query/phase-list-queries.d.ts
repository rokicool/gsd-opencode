/**
 * Handlers: phase.list-plans, phase.list-artifacts — deterministic plan/artifact listing
 * for agents (replaces shell `ls` / `find` patterns). SDK-only; no gsd-tools.cjs mirror.
 */
import type { QueryHandler } from './utils.js';
/**
 * phase.list-artifacts — list CONTEXT / SUMMARY / VERIFICATION / RESEARCH files in a phase directory.
 *
 * Args: `<phase>` `--type` `<context|summary|verification|research>`
 */
export declare const phaseListArtifacts: QueryHandler;
/**
 * phase.list-plans — list PLAN files in a phase with optional frontmatter key filter.
 *
 * Args: `<phase>` [`--with-schema` `<yamlKey>`]
 */
export declare const phaseListPlans: QueryHandler;
//# sourceMappingURL=phase-list-queries.d.ts.map