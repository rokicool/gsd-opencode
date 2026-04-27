/**
 * Context engine — resolves which .planning/ state files exist per phase type.
 *
 * Different phases need different subsets of context files. The execute phase
 * only needs STATE.md + config.json (minimal). Research needs STATE.md +
 * ROADMAP.md + CONTEXT.md. Plan needs all files. Verify needs STATE.md +
 * ROADMAP.md + REQUIREMENTS.md + PLAN/SUMMARY files.
 *
 * Context reduction (issue #1614):
 * - Large files are truncated to keep prompts cache-friendly
 * - ROADMAP.md is narrowed to the current milestone when possible
 * - Truncation preserves headings + first paragraph per section
 */
import type { ContextFiles } from './types.js';
import { PhaseType } from './types.js';
import type { GSDLogger } from './logger.js';
import { type TruncationOptions } from './context-truncation.js';
interface FileSpec {
    key: keyof ContextFiles;
    filename: string;
    required: boolean;
}
/**
 * Define which files each phase needs. Required files emit warnings when missing;
 * optional files silently return undefined.
 */
declare const PHASE_FILE_MANIFEST: Record<PhaseType, FileSpec[]>;
export declare class ContextEngine {
    private readonly planningDir;
    private readonly logger?;
    private readonly truncation;
    constructor(projectDir: string, logger?: GSDLogger, truncation?: Partial<TruncationOptions>, workstream?: string);
    /**
     * Resolve context files appropriate for the given phase type.
     * Reads each file defined in the phase manifest, returning undefined
     * for missing optional files and warning for missing required files.
     *
     * Files exceeding the truncation threshold are reduced to headings +
     * first paragraphs. ROADMAP.md is narrowed to the current milestone.
     */
    resolveContextFiles(phaseType: PhaseType): Promise<ContextFiles>;
    /**
     * Check if a file exists and read it. Returns undefined if not found.
     */
    private readFileIfExists;
}
export { PHASE_FILE_MANIFEST };
export type { FileSpec };
//# sourceMappingURL=context-engine.d.ts.map