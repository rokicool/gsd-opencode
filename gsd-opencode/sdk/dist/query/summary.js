/**
 * Summary query handlers — extract sections and history from SUMMARY.md files.
 *
 * Ported from get-shit-done/bin/lib/commands.cjs (cmdSummaryExtract, cmdHistoryDigest).
 * Uses `extractFrontmatterLeading` for parity with `frontmatter.cjs` (first `---` block only).
 *
 * @example
 * ```typescript
 * import { summaryExtract, historyDigest } from './summary.js';
 *
 * await summaryExtract(['path/to/SUMMARY.md'], '/project');
 * await historyDigest([], '/project');
 * ```
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { extractFrontmatterLeading } from './frontmatter.js';
import { comparePhaseNum, planningPaths, resolvePathUnderProject } from './helpers.js';
// ─── extractOneLinerFromBody ────────────────────────────────────────────────
/**
 * Extract a one-liner from the summary body when it is not in frontmatter.
 * Port of `extractOneLinerFromBody` from `get-shit-done/bin/lib/core.cjs`.
 */
function extractOneLinerFromBody(content) {
    if (!content)
        return null;
    const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n*/, '');
    const match = body.match(/^#[^\n]*\n+\*\*([^*]+)\*\*/m);
    return match ? match[1].trim() : null;
}
/** Normalize frontmatter list fields — scalars become single-element arrays. */
function coerceFmArray(v) {
    if (v === undefined || v === null)
        return [];
    if (Array.isArray(v))
        return v;
    return [v];
}
function parseDecisions(decisionsList) {
    if (!decisionsList || !Array.isArray(decisionsList))
        return [];
    return decisionsList.map((d) => {
        const s = String(d);
        const colonIdx = s.indexOf(':');
        if (colonIdx > 0) {
            return {
                summary: s.substring(0, colonIdx).trim(),
                rationale: s.substring(colonIdx + 1).trim(),
            };
        }
        return { summary: s, rationale: null };
    });
}
function readSubdirectories(dirPath, sort) {
    try {
        const entries = readdirSync(dirPath, { withFileTypes: true });
        const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
        return sort ? dirs.sort((a, b) => comparePhaseNum(a, b)) : dirs;
    }
    catch {
        return [];
    }
}
/** Match `getArchivedPhaseDirs` from core.cjs (newest milestone archive first). */
function getArchivedPhaseDirs(cwd) {
    const milestonesDir = join(cwd, '.planning', 'milestones');
    const results = [];
    if (!existsSync(milestonesDir))
        return results;
    try {
        const milestoneEntries = readdirSync(milestonesDir, { withFileTypes: true });
        const phaseDirs = milestoneEntries
            .filter(e => e.isDirectory() && /^v[\d.]+-phases$/.test(e.name))
            .map(e => e.name)
            .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
        for (const archiveName of phaseDirs) {
            const versionMatch = archiveName.match(/^(v[\d.]+)-phases$/);
            const version = versionMatch ? versionMatch[1] : archiveName;
            const archivePath = join(milestonesDir, archiveName);
            const dirs = readSubdirectories(archivePath, true);
            for (const dir of dirs) {
                results.push({
                    name: dir,
                    milestone: version,
                    fullPath: join(archivePath, dir),
                });
            }
        }
    }
    catch {
        /* intentionally empty */
    }
    return results;
}
export const summaryExtract = async (args, projectDir) => {
    const fieldsIdx = args.indexOf('--fields');
    const pathArgs = fieldsIdx === -1 ? args : args.slice(0, fieldsIdx);
    const summaryPath = pathArgs[0] ?? '';
    if (!summaryPath) {
        return { data: { error: 'summary-path required for summary-extract' } };
    }
    if (summaryPath.includes('\0')) {
        return { data: { error: 'Invalid path', path: summaryPath } };
    }
    const fields = fieldsIdx !== -1 && args[fieldsIdx + 1] ? args[fieldsIdx + 1].split(',').map(f => f.trim()) : null;
    let fullPath;
    try {
        fullPath = await resolvePathUnderProject(projectDir, summaryPath);
    }
    catch {
        return { data: { error: 'File not found', path: summaryPath } };
    }
    if (!existsSync(fullPath)) {
        return { data: { error: 'File not found', path: summaryPath } };
    }
    let content;
    try {
        content = await readFile(fullPath, 'utf-8');
    }
    catch {
        return { data: { error: 'File not found', path: summaryPath } };
    }
    const fm = extractFrontmatterLeading(content);
    const techStackRaw = fm['tech-stack'];
    const techAdded = (techStackRaw && Array.isArray(techStackRaw.added) ? techStackRaw.added : []);
    const fullResult = {
        path: summaryPath,
        one_liner: fm['one-liner'] || extractOneLinerFromBody(content) || null,
        key_files: coerceFmArray(fm['key-files']),
        tech_added: techAdded,
        patterns: coerceFmArray(fm['patterns-established']),
        decisions: parseDecisions(fm['key-decisions']),
        requirements_completed: coerceFmArray(fm['requirements-completed']),
    };
    if (fields && fields.length > 0) {
        const filtered = { path: summaryPath };
        for (const field of fields) {
            if (fullResult[field] !== undefined) {
                filtered[field] = fullResult[field];
            }
        }
        return { data: filtered };
    }
    return { data: fullResult };
};
export const historyDigest = async (_args, projectDir, workstream) => {
    const phasesDir = planningPaths(projectDir, workstream).phases;
    const digest = { phases: {}, decisions: [], tech_stack: new Set() };
    const allPhaseDirs = [];
    const archived = getArchivedPhaseDirs(projectDir);
    for (const a of archived) {
        allPhaseDirs.push({ name: a.name, fullPath: a.fullPath });
    }
    if (existsSync(phasesDir)) {
        try {
            const currentDirs = readdirSync(phasesDir, { withFileTypes: true })
                .filter(e => e.isDirectory())
                .map(e => e.name)
                .sort((a, b) => comparePhaseNum(a, b));
            for (const dir of currentDirs) {
                allPhaseDirs.push({ name: dir, fullPath: join(phasesDir, dir) });
            }
        }
        catch {
            /* intentionally empty */
        }
    }
    if (allPhaseDirs.length === 0) {
        return { data: { phases: {}, decisions: [], tech_stack: [] } };
    }
    try {
        for (const { name: dir, fullPath: dirPath } of allPhaseDirs) {
            const summaries = readdirSync(dirPath)
                .filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md')
                .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
            for (const summary of summaries) {
                try {
                    const content = readFileSync(join(dirPath, summary), 'utf-8');
                    const fm = extractFrontmatterLeading(content);
                    const phaseRaw = fm.phase;
                    const phaseNum = typeof phaseRaw === 'string' || typeof phaseRaw === 'number'
                        ? String(phaseRaw)
                        : dir.split('-')[0];
                    if (!digest.phases[phaseNum]) {
                        digest.phases[phaseNum] = {
                            name: (typeof fm.name === 'string' ? fm.name : null) ||
                                dir.split('-').slice(1).join(' ') ||
                                'Unknown',
                            provides: new Set(),
                            affects: new Set(),
                            patterns: new Set(),
                        };
                    }
                    const depGraph = fm['dependency-graph'];
                    if (depGraph && Array.isArray(depGraph.provides)) {
                        depGraph.provides.forEach(p => digest.phases[phaseNum].provides.add(p));
                    }
                    else if (Array.isArray(fm.provides)) {
                        fm.provides.forEach(p => digest.phases[phaseNum].provides.add(p));
                    }
                    if (depGraph && Array.isArray(depGraph.affects)) {
                        depGraph.affects.forEach(a => digest.phases[phaseNum].affects.add(a));
                    }
                    if (Array.isArray(fm['patterns-established'])) {
                        fm['patterns-established'].forEach(p => digest.phases[phaseNum].patterns.add(p));
                    }
                    if (Array.isArray(fm['key-decisions'])) {
                        fm['key-decisions'].forEach(d => {
                            digest.decisions.push({ phase: phaseNum, decision: d });
                        });
                    }
                    const techStack = fm['tech-stack'];
                    if (techStack && Array.isArray(techStack.added)) {
                        techStack.added.forEach(t => {
                            const s = typeof t === 'string' ? t : t.name;
                            if (s)
                                digest.tech_stack.add(s);
                        });
                    }
                }
                catch {
                    /* Skip malformed summaries */
                }
            }
        }
        const phasesOut = {};
        for (const p of Object.keys(digest.phases)) {
            phasesOut[p] = {
                name: digest.phases[p].name,
                provides: [...digest.phases[p].provides],
                affects: [...digest.phases[p].affects],
                patterns: [...digest.phases[p].patterns],
            };
        }
        return {
            data: {
                phases: phasesOut,
                decisions: digest.decisions,
                tech_stack: [...digest.tech_stack],
            },
        };
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { data: { error: `Failed to generate history digest: ${msg}` } };
    }
};
//# sourceMappingURL=summary.js.map