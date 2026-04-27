/**
 * skill manifest — multi-root skill discovery scan.
 *
 * Full port of `buildSkillManifest` / `cmdSkillManifest` from
 * `get-shit-done/bin/lib/init.cjs` (lines 1640–1847).
 * Uses {@link extractFrontmatterLeading} — same as CJS `frontmatter.cjs` `extractFrontmatter`
 * (first `---` block only; skills with later `---` rules must not use TS `extractFrontmatter`'s last-block rule).
 */
import type { QueryHandler } from './utils.js';
export interface SkillManifestSkill {
    name: string;
    description: string;
    triggers: string[];
    path: string;
    file_path: string;
    root: string;
    scope: string;
    installed: boolean;
    deprecated: boolean;
}
export interface SkillManifestRoot {
    root: string;
    path: string;
    scope: string;
    present: boolean;
    deprecated?: boolean;
    skill_count?: number;
    command_count?: number;
}
export interface SkillManifestJson {
    skills: SkillManifestSkill[];
    roots: SkillManifestRoot[];
    installation: {
        gsd_skills_installed: boolean;
        legacy_claude_commands_installed: boolean;
    };
    counts: {
        skills: number;
        roots: number;
    };
}
/**
 * Scan canonical skill roots and build manifest JSON (same shape as gsd-tools.cjs).
 */
export declare function buildSkillManifest(cwd: string, skillsDir?: string | null): SkillManifestJson;
/**
 * `skill-manifest` — same flags as gsd-tools: `--skills-dir`, `--write`.
 */
export declare const skillManifest: QueryHandler;
//# sourceMappingURL=skill-manifest.d.ts.map