/**
 * Config mutation handlers — write operations for .planning/config.json.
 *
 * Ported from get-shit-done/bin/lib/config.cjs.
 * Provides config-set (with key validation and value coercion),
 * config-set-model-profile, config-new-project, and config-ensure-section.
 *
 * @example
 * ```typescript
 * import { configSet, configNewProject } from './config-mutation.js';
 *
 * await configSet(['model_profile', 'quality'], '/project');
 * // { data: { updated: true, key: 'model_profile', value: 'quality', previousValue: 'balanced' } }
 *
 * await configNewProject([], '/project');
 * // { data: { created: true, path: '.planning/config.json' } }
 * ```
 */
import type { QueryHandler } from './utils.js';
/**
 * Check whether a config key path is valid.
 *
 * Supports exact matches from VALID_CONFIG_KEYS plus dynamic patterns
 * like `agent_skills.<agent-type>` and `features.<feature_name>`.
 * Uses curated CONFIG_KEY_SUGGESTIONS before LCP fallback for typo correction.
 *
 * @param keyPath - Dot-notation config key path
 * @returns Object with valid flag and optional suggestion for typos
 */
export declare function isValidConfigKey(keyPath: string): {
    valid: boolean;
    suggestion?: string;
};
/**
 * Coerce a CLI string value to its native type.
 *
 * Ported from config.cjs lines 344-351.
 *
 * @param value - String value from CLI
 * @returns Coerced value: boolean, number, parsed JSON, or original string
 */
export declare function parseConfigValue(value: string): unknown;
/**
 * write a validated key-value pair to config.json.
 *
 * Validates key against VALID_CONFIG_KEYS allowlist, coerces value
 * from CLI string to native type, and writes config.json.
 *
 * @param args - args[0]=key, args[1]=value
 * @param projectDir - Project root directory
 * @returns QueryResult matching gsd-tools `config-set` JSON: `{ updated, key, value, previousValue }`
 * @throws GSDError with Validation if key is invalid or args missing
 */
export declare const configSet: QueryHandler;
/**
 * Validate and set the model profile in config.json.
 *
 * @param args - args[0]=profileName
 * @param projectDir - Project root directory
 * @returns QueryResult with { set: true, profile, agents }
 * @throws GSDError with Validation if profile is invalid
 */
export declare const configSetModelProfile: QueryHandler;
/**
 * Create config.json with defaults and optional user choices.
 *
 * Idempotent: if config.json already exists, returns { created: false }.
 * Detects API key availability from environment variables.
 *
 * @param args - args[0]=optional JSON string of user choices
 * @param projectDir - Project root directory
 * @returns QueryResult with { created: true, path } or { created: false, reason }
 */
export declare const configNewProject: QueryHandler;
/**
 * Idempotently ensure a top-level section exists in config.json.
 *
 * If the section key doesn't exist, creates it as an empty object.
 * If it already exists, preserves its contents.
 *
 * @param args - args[0]=sectionName
 * @param projectDir - Project root directory
 * @returns QueryResult with { ensured: true, section }
 */
export declare const configEnsureSection: QueryHandler;
//# sourceMappingURL=config-mutation.d.ts.map