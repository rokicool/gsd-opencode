/**
 * Phase-aware prompt factory — assembles complete prompts for each phase type.
 *
 * Reads workflow .md + agent .md files from disk (D006), extracts structured
 * blocks (<role>, <purpose>, <process>), and composes system prompts with
 * injected context files per phase type.
 */
import type { ContextFiles, ParsedPlan } from './types.js';
import { PhaseType } from './types.js';
/**
 * Maps phase types to their workflow file names.
 */
declare const PHASE_WORKFLOW_MAP: Record<PhaseType, string>;
/**
 * Extract content from an XML-style block (e.g., <purpose>...</purpose>).
 * Returns the trimmed inner content, or empty string if not found.
 */
export declare function extractBlock(content: string, tagName: string): string;
/**
 * Extract all <step> blocks from a workflow's <process> section.
 * Returns an array of step contents with their name attributes.
 */
export declare function extractSteps(processContent: string): Array<{
    name: string;
    content: string;
}>;
/**
 * Strip YAML frontmatter (---...---) from an agent definition file,
 * returning only the markdown/XML content body.
 */
export declare function stripYamlFrontmatter(content: string): string;
export declare class PromptFactory {
    private readonly workflowsDir;
    private readonly agentsDir;
    private readonly projectAgentsDir?;
    private readonly sdkPromptsDir;
    private readonly projectDir?;
    constructor(options?: {
        gsdInstallDir?: string;
        agentsDir?: string;
        projectAgentsDir?: string;
        sdkPromptsDir?: string;
        projectDir?: string;
    });
    /**
     * Build a complete prompt for the given phase type.
     *
     * For execute phase with a plan, delegates to buildExecutorPrompt().
     * For other phases, assembles: role + purpose + process steps + context.
     */
    buildPrompt(phaseType: PhaseType, plan: ParsedPlan | null, contextFiles: ContextFiles, phaseDir?: string): Promise<string>;
    /**
     * Load the workflow file for a phase type.
     * Tries installed GSD workflows first (the complete, up-to-date versions),
     * then falls back to SDK bundled copies only if installed not found.
     * Returns the raw content, or undefined if not found.
     */
    loadWorkflowFile(phaseType: PhaseType): Promise<string | undefined>;
    /**
     * Load the agent definition for a phase type.
     * Tries installed agents first (the complete, up-to-date versions),
     * then SDK bundled copies as last resort.
     * Returns undefined if no agent is mapped or file not found.
     */
    loadAgentDef(phaseType: PhaseType): Promise<string | undefined>;
    /**
     * Format context files into a prompt section.
     */
    private formatContextFiles;
}
export { PHASE_WORKFLOW_MAP };
//# sourceMappingURL=phase-prompt.d.ts.map