/**
 * Tool scoping — maps phase types to allowed tool sets.
 *
 * Per R015, different phases get different tool access:
 * - Research: read-only + web search (no write/edit on source)
 * - Execute: full read/write
 * - Verify: read-only (no write/edit)
 * - Discuss: read-only
 * - Plan: read/write + web (for creating plan files)
 */

import { PhaseType } from './types.js';
import { parseAgentTools } from './prompt-builder.js';

// ─── Phase default tool sets ─────────────────────────────────────────────────

const PHASE_DEFAULT_TOOLS: Record<PhaseType, string[]> = {
  [PhaseType.Research]: ['read', 'grep', 'glob', 'bash', 'websearch'],
  [PhaseType.Execute]: ['read', 'write', 'edit', 'bash', 'grep', 'glob'],
  [PhaseType.Verify]: ['read', 'bash', 'grep', 'glob'],
  [PhaseType.Discuss]: ['read', 'bash', 'grep', 'glob'],
  [PhaseType.Plan]: ['read', 'write', 'bash', 'glob', 'grep', 'webfetch'],
  [PhaseType.Repair]: ['read', 'write', 'edit', 'bash', 'grep', 'glob'],
};

// ─── Phase → agent definition filename ──────────────────────────────────────

/**
 * Maps each phase type to its corresponding agent definition filename.
 * Discuss has no dedicated agent — it runs in the main conversation.
 */
export const PHASE_AGENT_MAP: Record<PhaseType, string | null> = {
  [PhaseType.Execute]: 'gsd-executor.md',
  [PhaseType.Research]: 'gsd-phase-researcher.md',
  [PhaseType.Plan]: 'gsd-planner.md',
  [PhaseType.Verify]: 'gsd-verifier.md',
  [PhaseType.Discuss]: null,
  [PhaseType.Repair]: null,
};

// ─── Public API ──────────────────────────────────────────────────────────────

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
export function getToolsForPhase(phaseType: PhaseType, agentDef?: string): string[] {
  if (agentDef) {
    return parseAgentTools(agentDef);
  }
  return [...PHASE_DEFAULT_TOOLS[phaseType]];
}

export { PHASE_DEFAULT_TOOLS };
