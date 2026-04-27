/**
 * skill manifest — multi-root skill discovery scan.
 *
 * Full port of `buildSkillManifest` / `cmdSkillManifest` from
 * `get-shit-done/bin/lib/init.cjs` (lines 1640–1847).
 * Uses {@link extractFrontmatterLeading} — same as CJS `frontmatter.cjs` `extractFrontmatter`
 * (first `---` block only; skills with later `---` rules must not use TS `extractFrontmatter`'s last-block rule).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { extractFrontmatterLeading } from './frontmatter.js';
/**
 * Scan canonical skill roots and build manifest JSON (same shape as gsd-tools.cjs).
 */
export function buildSkillManifest(cwd, skillsDir = null) {
    const canonicalRoots = skillsDir
        ? [{
                root: resolve(skillsDir),
                path: resolve(skillsDir),
                scope: 'custom',
                present: existsSync(skillsDir),
                kind: 'skills',
            }]
        : [
            { root: '.OpenCode/skills', path: join(cwd, '.OpenCode', 'skills'), scope: 'project', kind: 'skills' },
            { root: '.agents/skills', path: join(cwd, '.agents', 'skills'), scope: 'project', kind: 'skills' },
            { root: '.cursor/skills', path: join(cwd, '.cursor', 'skills'), scope: 'project', kind: 'skills' },
            { root: '.github/skills', path: join(cwd, '.github', 'skills'), scope: 'project', kind: 'skills' },
            { root: '.codex/skills', path: join(cwd, '.codex', 'skills'), scope: 'project', kind: 'skills' },
            { root: '$HOME/.config/opencode/skills', path: join(homedir(), '.OpenCode', 'skills'), scope: 'global', kind: 'skills' },
            { root: '~/.codex/skills', path: join(homedir(), '.codex', 'skills'), scope: 'global', kind: 'skills' },
            {
                root: '.OpenCode/get-shit-done/skills',
                path: join(homedir(), '.OpenCode', 'get-shit-done', 'skills'),
                scope: 'import-only',
                kind: 'skills',
                deprecated: true,
            },
            {
                root: '.OpenCode/commands/gsd',
                path: join(homedir(), '.OpenCode', 'commands', 'gsd'),
                scope: 'legacy-commands',
                kind: 'commands',
                deprecated: true,
            },
        ];
    const skills = [];
    const roots = [];
    let legacyClaudeCommandsInstalled = false;
    for (const rootInfo of canonicalRoots) {
        const rootPath = rootInfo.path;
        const rootSummary = {
            root: rootInfo.root,
            path: rootPath,
            scope: rootInfo.scope,
            present: existsSync(rootPath),
            deprecated: 'deprecated' in rootInfo ? !!rootInfo.deprecated : false,
        };
        if (!rootSummary.present) {
            roots.push(rootSummary);
            continue;
        }
        if (rootInfo.kind === 'commands') {
            let entries;
            try {
                entries = readdirSync(rootPath, { withFileTypes: true });
            }
            catch {
                roots.push(rootSummary);
                continue;
            }
            const commandFiles = entries.filter(e => e.isFile() && e.name.endsWith('.md'));
            rootSummary.command_count = commandFiles.length;
            if (rootSummary.command_count > 0)
                legacyClaudeCommandsInstalled = true;
            roots.push(rootSummary);
            continue;
        }
        let entries;
        try {
            entries = readdirSync(rootPath, { withFileTypes: true });
        }
        catch {
            roots.push(rootSummary);
            continue;
        }
        let skillCount = 0;
        for (const entry of entries) {
            if (!entry.isDirectory())
                continue;
            const entryName = entry.name.toString();
            const skillMdPath = join(rootPath, entryName, 'SKILL.md');
            if (!existsSync(skillMdPath))
                continue;
            let content;
            try {
                content = readFileSync(skillMdPath, 'utf-8');
            }
            catch {
                continue;
            }
            const frontmatter = extractFrontmatterLeading(content);
            const name = frontmatter.name || entryName;
            const description = frontmatter.description || '';
            const triggers = [];
            const bodyMatch = content.match(/^---[\s\S]*?---\s*\n([\s\S]*)$/);
            if (bodyMatch) {
                const body = bodyMatch[1];
                const triggerLines = body.match(/^TRIGGER\s+when:\s*(.+)$/gim);
                if (triggerLines) {
                    for (const line of triggerLines) {
                        const m = line.match(/^TRIGGER\s+when:\s*(.+)$/i);
                        if (m)
                            triggers.push(m[1].trim());
                    }
                }
            }
            skills.push({
                name,
                description,
                triggers,
                path: entryName,
                file_path: `${entryName}/SKILL.md`,
                root: rootInfo.root,
                scope: rootInfo.scope,
                installed: rootInfo.scope !== 'import-only',
                deprecated: !!('deprecated' in rootInfo && rootInfo.deprecated),
            });
            skillCount++;
        }
        rootSummary.skill_count = skillCount;
        roots.push(rootSummary);
    }
    skills.sort((a, b) => {
        const rootCmp = a.root.localeCompare(b.root);
        return rootCmp !== 0 ? rootCmp : a.name.localeCompare(b.name);
    });
    const gsdSkillsInstalled = skills.some(skill => skill.name.startsWith('gsd-'));
    return {
        skills,
        roots,
        installation: {
            gsd_skills_installed: gsdSkillsInstalled,
            legacy_claude_commands_installed: legacyClaudeCommandsInstalled,
        },
        counts: {
            skills: skills.length,
            roots: roots.length,
        },
    };
}
/**
 * `skill-manifest` — same flags as gsd-tools: `--skills-dir`, `--write`.
 */
export const skillManifest = async (args, projectDir) => {
    const skillsDirIdx = args.indexOf('--skills-dir');
    const skillsDir = skillsDirIdx >= 0 && args[skillsDirIdx + 1] ? args[skillsDirIdx + 1] : null;
    const manifest = buildSkillManifest(projectDir, skillsDir);
    if (args.includes('--write')) {
        const planningDir = join(projectDir, '.planning');
        if (existsSync(planningDir)) {
            const manifestPath = join(planningDir, 'skill-manifest.json');
            writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
        }
    }
    return { data: manifest };
};
//# sourceMappingURL=skill-manifest.js.map