/**
 * Tests for agent skills query handler.
 *
 * Verifies the handler reads `config.agent_skills[agentType]` from
 * `.planning/config.json` and returns the `<agent_skills>` XML block
 * workflows interpolate into task() prompts (regression for #2555).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { agentSkills } from './skills.js';

async function writeSkill(rootDir: string, name: string) {
  const skillDir = join(rootDir, name);
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    join(skillDir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: test skill\n---\n\n# ${name}\n`,
  );
}

async function writeConfig(projectDir: string, config: unknown) {
  await mkdir(join(projectDir, '.planning'), { recursive: true });
  await writeFile(join(projectDir, '.planning', 'config.json'), JSON.stringify(config, null, 2));
}

describe('agentSkills', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'gsd-skills-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('returns empty string when no agent type is provided', async () => {
    const r = await agentSkills([], tmpDir);
    expect(r.data).toBe('');
  });

  it('returns empty string when project has no config', async () => {
    const r = await agentSkills(['gsd-planner'], tmpDir);
    expect(r.data).toBe('');
  });

  it('returns empty string when agent type not in config.agent_skills', async () => {
    await writeConfig(tmpDir, { agent_skills: { 'gsd-executor': ['.OpenCode/skills/foo'] } });
    const r = await agentSkills(['gsd-planner'], tmpDir);
    expect(r.data).toBe('');
  });

  it('returns <agent_skills> block for each configured skill path', async () => {
    await writeSkill(join(tmpDir, '.OpenCode', 'skills'), 'skill-a');
    await writeSkill(join(tmpDir, '.OpenCode', 'skills'), 'skill-b');
    await writeConfig(tmpDir, {
      agent_skills: {
        'gsd-planner': ['.OpenCode/skills/skill-a', '.OpenCode/skills/skill-b'],
      },
    });

    const r = await agentSkills(['gsd-planner'], tmpDir);
    expect(r.data).toBe(
      '<agent_skills>\n' +
        'read these user-configured skills:\n' +
        '- @.OpenCode/skills/skill-a/SKILL.md\n' +
        '- @.OpenCode/skills/skill-b/SKILL.md\n' +
        '</agent_skills>',
    );
  });

  it('accepts a single string skill path (normalizes to array)', async () => {
    await writeSkill(join(tmpDir, '.OpenCode', 'skills'), 'only-one');
    await writeConfig(tmpDir, {
      agent_skills: { 'gsd-planner': '.OpenCode/skills/only-one' },
    });

    const r = await agentSkills(['gsd-planner'], tmpDir);
    expect(r.data).toBe(
      '<agent_skills>\n' +
        'read these user-configured skills:\n' +
        '- @.OpenCode/skills/only-one/SKILL.md\n' +
        '</agent_skills>',
    );
  });

  it('skips skills whose SKILL.md is missing', async () => {
    await writeSkill(join(tmpDir, '.OpenCode', 'skills'), 'exists');
    await mkdir(join(tmpDir, '.OpenCode', 'skills', 'missing-md'), { recursive: true });
    await writeConfig(tmpDir, {
      agent_skills: {
        'gsd-planner': ['.OpenCode/skills/exists', '.OpenCode/skills/missing-md'],
      },
    });

    const r = await agentSkills(['gsd-planner'], tmpDir);
    expect(r.data).toBe(
      '<agent_skills>\n' +
        'read these user-configured skills:\n' +
        '- @.OpenCode/skills/exists/SKILL.md\n' +
        '</agent_skills>',
    );
  });

  it('rejects path traversal escaping the project root', async () => {
    await writeConfig(tmpDir, {
      agent_skills: { 'gsd-planner': ['../evil-skill'] },
    });

    const r = await agentSkills(['gsd-planner'], tmpDir);
    expect(r.data).toBe('');
  });

  it('returns empty string when agent_skills value is an empty array', async () => {
    await writeConfig(tmpDir, { agent_skills: { 'gsd-planner': [] } });
    const r = await agentSkills(['gsd-planner'], tmpDir);
    expect(r.data).toBe('');
  });
});
