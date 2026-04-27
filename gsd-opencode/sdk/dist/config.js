/**
 * Config reader — loads `.planning/config.json` and merges with defaults.
 *
 * Mirrors the default structure from `get-shit-done/bin/lib/config.cjs`
 * `buildNewProjectConfig()`.
 */
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { relPlanningPath } from './workstream-utils.js';
// ─── Defaults ────────────────────────────────────────────────────────────────
export const CONFIG_DEFAULTS = {
    model_profile: 'balanced',
    commit_docs: true,
    parallelization: true,
    search_gitignored: false,
    brave_search: false,
    firecrawl: false,
    exa_search: false,
    git: {
        branching_strategy: 'none',
        phase_branch_template: 'gsd/phase-{phase}-{slug}',
        milestone_branch_template: 'gsd/{milestone}-{slug}',
        quick_branch_template: null,
    },
    workflow: {
        research: true,
        plan_check: true,
        verifier: true,
        nyquist_validation: true,
        tdd_mode: false,
        auto_advance: false,
        node_repair: true,
        node_repair_budget: 2,
        ui_phase: true,
        ui_safety_gate: true,
        text_mode: false,
        research_before_questions: false,
        discuss_mode: 'discuss',
        skip_discuss: false,
        max_discuss_passes: 3,
        subagent_timeout: 300000,
        context_coverage_gate: true,
    },
    hooks: {
        context_warnings: true,
    },
    agent_skills: {},
    project_code: null,
    mode: 'interactive',
    _auto_chain_active: false,
};
// ─── Loader ──────────────────────────────────────────────────────────────────
/**
 * Load project config from `.planning/config.json`, merging with defaults.
 * When project config is missing or empty, layers user defaults
 * (`~/.gsd/defaults.json`) over built-in defaults.
 * Throws on malformed JSON with a helpful error message.
 */
/**
 * Read user-level defaults from `~/.gsd/defaults.json` (or `$GSD_HOME/.gsd/`
 * when set). Returns `{}` when the file is missing, empty, or malformed —
 * matches CJS behavior in `get-shit-done/bin/lib/core.cjs` (#1683, #2652).
 */
async function loadUserDefaults() {
    const home = process.env.GSD_HOME || homedir();
    const defaultsPath = join(home, '.gsd', 'defaults.json');
    let raw;
    try {
        raw = await readFile(defaultsPath, 'utf-8');
    }
    catch {
        return {};
    }
    const trimmed = raw.trim();
    if (trimmed === '')
        return {};
    try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return {};
        }
        return parsed;
    }
    catch {
        return {};
    }
}
export async function loadConfig(projectDir, workstream) {
    const configPath = join(projectDir, relPlanningPath(workstream), 'config.json');
    const rootConfigPath = join(projectDir, '.planning', 'config.json');
    let raw;
    let projectConfigFound = false;
    try {
        raw = await readFile(configPath, 'utf-8');
        projectConfigFound = true;
    }
    catch {
        // If workstream config missing, fall back to root config
        if (workstream) {
            try {
                raw = await readFile(rootConfigPath, 'utf-8');
                projectConfigFound = true;
            }
            catch {
                raw = '';
            }
        }
        else {
            raw = '';
        }
    }
    // Pre-project context: no .planning/config.json exists. Layer user-level
    // defaults from ~/.gsd/defaults.json over built-in defaults. Mirrors the
    // CJS fall-back branch in get-shit-done/bin/lib/core.cjs:421 (#1683) so
    // SDK-dispatched init queries (e.g. resolveModel in Codex installs, #2652)
    // honor user-level knobs like `resolve_model_ids: "omit"`.
    if (!projectConfigFound) {
        const userDefaults = await loadUserDefaults();
        return mergeDefaults(userDefaults);
    }
    const trimmed = raw.trim();
    if (trimmed === '') {
        // Empty project config — treat as no project config (CJS core.cjs
        // catches JSON.parse on empty and falls through to the pre-project path).
        const userDefaults = await loadUserDefaults();
        return mergeDefaults(userDefaults);
    }
    let parsed;
    try {
        parsed = JSON.parse(trimmed);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to parse config at ${configPath}: ${msg}`);
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error(`Config at ${configPath} must be a JSON object`);
    }
    // Project config exists — user-level defaults are ignored (CJS parity).
    // `buildNewProjectConfig` already baked them into config.json at /gsd:new-project.
    return mergeDefaults(parsed);
}
function mergeDefaults(parsed) {
    return {
        ...structuredClone(CONFIG_DEFAULTS),
        ...parsed,
        git: {
            ...CONFIG_DEFAULTS.git,
            ...(parsed.git ?? {}),
        },
        workflow: {
            ...CONFIG_DEFAULTS.workflow,
            ...(parsed.workflow ?? {}),
        },
        hooks: {
            ...CONFIG_DEFAULTS.hooks,
            ...(parsed.hooks ?? {}),
        },
        agent_skills: {
            ...CONFIG_DEFAULTS.agent_skills,
            ...(parsed.agent_skills ?? {}),
        },
    };
}
//# sourceMappingURL=config.js.map