/**
 * Phase or milestone completion rollup (`check.completion`).
 *
 * Replaces repeated PLAN/SUMMARY counting and verification checks in
 * `transition.md`, `complete-milestone.md`, `execute-phase.md`.
 * See `.planning/research/decision-routing-audit.md` §3.7.
 */
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { GSDError, ErrorClassification } from '../errors.js';
import { normalizePhaseName } from './helpers.js';
import { findPhase } from './phase.js';
import { roadmapAnalyze } from './roadmap.js';
const VALID_SCOPES = new Set(['phase', 'milestone']);
// ─── Helpers ───────────────────────────────────────────────────────────────
function countFailLines(content) {
    return (content.match(/\|\s*FAIL\s*\|/gi) || []).length;
}
async function readFileSafe(filePath) {
    try {
        return await readFile(filePath, 'utf-8');
    }
    catch {
        return null;
    }
}
function deriveVerificationStatus(content) {
    if (!content)
        return null;
    const failCount = countFailLines(content);
    if (failCount > 0)
        return 'fail';
    const passMatch = content.match(/\|\s*PASS\s*\|/gi);
    if (passMatch && passMatch.length > 0)
        return 'pass';
    // Frontmatter status field fallback
    const statusMatch = content.match(/^status:\s*(\S+)/im);
    if (statusMatch)
        return statusMatch[1].toLowerCase();
    return 'missing';
}
function deriveUatStatus(content) {
    if (!content)
        return null;
    const failCount = (content.match(/\|\s*FAIL\s*\|/gi) || []).length;
    if (failCount > 0)
        return 'fail';
    return 'pass';
}
// ─── Phase scope ───────────────────────────────────────────────────────────
async function checkPhaseCompletion(phaseArg, projectDir) {
    const phaseRes = await findPhase([phaseArg], projectDir);
    const pdata = phaseRes.data;
    const found = Boolean(pdata.found);
    const plans = pdata.plans ?? [];
    const summaries = pdata.summaries ?? [];
    const plans_total = plans.length;
    // Derive which plans are missing a summary
    const summaryIds = new Set(summaries
        .map(s => s.replace('-SUMMARY.md', '').replace('SUMMARY.md', ''))
        .filter(Boolean));
    const plans_with_summaries = plans.filter(p => {
        const planId = p.replace('-PLAN.md', '').replace('PLAN.md', '');
        return summaryIds.has(planId);
    }).length;
    const missing_summaries = plans
        .filter(p => {
        const planId = p.replace('-PLAN.md', '').replace('PLAN.md', '');
        return !summaryIds.has(planId);
    });
    // Read VERIFICATION.md and UAT.md if phase was found
    let verificationContent = null;
    let uatContent = null;
    if (found && pdata.directory) {
        const phaseDirFull = join(projectDir, pdata.directory);
        if (existsSync(phaseDirFull)) {
            try {
                const files = (await readdir(phaseDirFull)).sort((a, b) => a.localeCompare(b));
                const verFile = files.includes('VERIFICATION.md')
                    ? 'VERIFICATION.md'
                    : files.find(f => f.endsWith('-VERIFICATION.md'));
                const uatFile = files.includes('UAT.md') ? 'UAT.md' : files.find(f => f.endsWith('-UAT.md'));
                if (verFile)
                    verificationContent = await readFileSafe(join(phaseDirFull, verFile));
                if (uatFile)
                    uatContent = await readFileSafe(join(phaseDirFull, uatFile));
            }
            catch {
                // Phase dir unreadable — treat as no files
            }
        }
    }
    const verification_status = deriveVerificationStatus(verificationContent);
    const uat_status = deriveUatStatus(uatContent);
    const uat_gaps = uatContent ? countFailLines(uatContent) : 0;
    const verification_failures = verificationContent ? countFailLines(verificationContent) : 0;
    const complete = plans_total > 0 &&
        missing_summaries.length === 0 &&
        verification_status !== 'fail';
    return {
        complete,
        plans_total,
        plans_with_summaries,
        missing_summaries,
        verification_status,
        uat_status,
        debt: {
            uat_gaps,
            verification_failures,
            human_needed: false,
        },
    };
}
// ─── Milestone scope ───────────────────────────────────────────────────────
async function checkMilestoneCompletion(projectDir) {
    const analysis = await roadmapAnalyze([], projectDir);
    const adata = analysis.data;
    const phases = adata.phases ?? [];
    const phase_count = phases.length;
    const completePhases = phases.filter(p => p.roadmap_complete === true || p.disk_status === 'complete');
    const phases_complete = completePhases.length;
    const phases_incomplete = phases
        .filter(p => p.roadmap_complete !== true && p.disk_status !== 'complete')
        .map(p => String(normalizePhaseName(String(p.number))));
    const blockers = [];
    const complete = phase_count > 0 && phases_complete === phase_count;
    return {
        complete,
        phase_count,
        phases_complete,
        phases_incomplete,
        blockers,
    };
}
// ─── Handler ───────────────────────────────────────────────────────────────
export const checkCompletion = async (args, projectDir) => {
    const scope = args[0];
    if (!scope) {
        throw new GSDError('scope required for check completion (phase|milestone)', ErrorClassification.Validation);
    }
    if (!VALID_SCOPES.has(scope)) {
        throw new GSDError(`invalid scope "${scope}" — must be "phase" or "milestone"`, ErrorClassification.Validation);
    }
    if (scope === 'phase') {
        const phaseNum = args[1];
        if (!phaseNum) {
            throw new GSDError('phase number required for check completion phase', ErrorClassification.Validation);
        }
        const result = await checkPhaseCompletion(phaseNum, projectDir);
        return { data: result };
    }
    // milestone scope
    const result = await checkMilestoneCompletion(projectDir);
    return { data: result };
};
//# sourceMappingURL=check-completion.js.map