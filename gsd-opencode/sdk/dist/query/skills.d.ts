/**
 * Agent skills query handler — read configured skills from `.planning/config.json`
 * and emit the `<agent_skills>` XML block workflows interpolate into task() prompts.
 *
 * Ports `buildAgentSkillsBlock` semantics from
 * `get-shit-done/bin/lib/init.cjs` so the SDK path honors
 * `config.agent_skills[agentType]` the same way the legacy
 * `gsd-tools.cjs agent-skills <type>` path does. Fixes #2555.
 *
 * @example
 * ```typescript
 * import { agentSkills } from './skills.js';
 *
 * // With config.agent_skills = { "gsd-planner": [".claude/skills/demo-skill"] }
 * await agentSkills(['gsd-planner'], '/project');
 * // { data: '<agent_skills>\nRead these user-configured skills:\n- @.claude/skills/demo-skill/SKILL.md\n</agent_skills>' }
 *
 * // No agent type → empty string (matches gsd-tools cmdAgentSkills).
 * await agentSkills([], '/project');
 * // { data: '' }
 * ```
 */
import type { QueryHandler } from './utils.js';
export declare const agentSkills: QueryHandler;
//# sourceMappingURL=skills.d.ts.map