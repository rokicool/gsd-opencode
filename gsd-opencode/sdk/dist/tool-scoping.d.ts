/**
 * Tool scoping — maps phase types to allowed tool sets.
 *
 * Per R015, different phases get different tool access:
 * - Research: read-only + web search (no Write/Edit on source)
 * - Execute: full read/write
 * - Verify: read-only (no Write/Edit)
 * - Discuss: read-only
 * - Plan: read/write + web (for creating plan files)
 */
import { PhaseType } from './types.js';
declare const PHASE_DEFAULT_TOOLS: Record<PhaseType, string[]>;
/**
 * Maps each phase type to its corresponding agent definition filename.
 * Discuss has no dedicated agent — it runs in the main conversation.
 */
export declare const PHASE_AGENT_MAP: Record<PhaseType, string | null>;
/**
 * Get the allowed tools for a phase type.
 *
 * If an agent definition string is provided, tools are parsed from its
 * frontmatter (reusing parseAgentTools from prompt-builder). Otherwise,
 * returns the hardcoded phase defaults per R015.
 *
 * @param phaseType - The phase being executed
 * @param agentDef - Optional raw agent .md file content to parse tools from
 * @returns Array of allowed tool names
 */
export declare function getToolsForPhase(phaseType: PhaseType, agentDef?: string): string[];
export { PHASE_DEFAULT_TOOLS };
//# sourceMappingURL=tool-scoping.d.ts.map