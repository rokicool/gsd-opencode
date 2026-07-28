/**
 * Config-get and resolve-model query handlers.
 *
 * Ported from get-shit-done/bin/lib/config.cjs and commands.cjs.
 * Provides raw config.json traversal and model profile resolution.
 *
 * @example
 * ```typescript
 * import { configGet, resolveModel } from './config-query.js';
 *
 * const result = await configGet(['workflow.auto_advance'], '/project');
 * // { data: true }
 *
 * const model = await resolveModel(['gsd-planner'], '/project');
 * // { data: { model: 'opus', profile: 'balanced' } }
 * ```
 */
import type { QueryHandler } from './utils.js';
/**
 * Mapping of GSD agent type to model alias for each profile tier.
 *
 * Ported from get-shit-done/bin/lib/model-profiles.cjs.
 */
export declare const MODEL_PROFILES: Record<string, Record<string, string>>;
/** Valid model profile names. */
export declare const VALID_PROFILES: string[];
/**
 * Flat map of agent name → model alias for one profile tier (matches `model-profiles.cjs`).
 */
export declare function getAgentToModelMapForProfile(normalizedProfile: string): Record<string, string>;
/**
 * Query handler for config-get command.
 *
 * Reads raw .planning/config.json and traverses dot-notation key paths.
 * Does NOT merge with defaults (matches gsd-tools.cjs behavior).
 *
 * @param args - args[0] is the dot-notation key path (e.g., 'workflow.auto_advance')
 * @param projectDir - Project root directory
 * @returns QueryResult with the config value at the given path
 * @throws GSDError with Validation classification if key missing or not found
 */
export declare const configGet: QueryHandler;
/**
 * Query handler for config-path — resolved `.planning/config.json` path (workstream-aware via cwd).
 *
 * Port of `cmdConfigPath` from `config.cjs`. The JSON query API returns `{ path }`; the CJS CLI
 * emits the path as plain text for shell substitution.
 *
 * @param _args - Unused
 * @param projectDir - Project root directory
 * @returns QueryResult with `{ path: string }` absolute or project-relative resolution via planningPaths
 */
export declare const configPath: QueryHandler;
/**
 * Query handler for resolve-model command.
 *
 * Resolves the model alias for a given agent type based on the current profile.
 * Uses loadConfig (with defaults) and MODEL_PROFILES for lookup.
 *
 * @param args - args[0] is the agent type (e.g., 'gsd-planner')
 * @param projectDir - Project root directory
 * @returns QueryResult with { model, profile } or { model, profile, unknown_agent: true }
 * @throws GSDError with Validation classification if agent type not provided
 */
export declare const resolveModel: QueryHandler;
//# sourceMappingURL=config-query.d.ts.map