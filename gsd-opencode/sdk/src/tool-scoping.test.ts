import { describe, it, expect } from 'vitest';
import { getToolsForPhase, PHASE_AGENT_MAP, PHASE_DEFAULT_TOOLS } from './tool-scoping.js';
import { PhaseType } from './types.js';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('getToolsForPhase', () => {
  describe('default tools per phase', () => {
    it('research phase: read-only + web search, no write/edit', () => {
      const tools = getToolsForPhase(PhaseType.Research);
      expect(tools).toContain('read');
      expect(tools).toContain('grep');
      expect(tools).toContain('glob');
      expect(tools).toContain('bash');
      expect(tools).toContain('websearch');
      expect(tools).not.toContain('write');
      expect(tools).not.toContain('edit');
    });

    it('execute phase: full read/write', () => {
      const tools = getToolsForPhase(PhaseType.Execute);
      expect(tools).toContain('read');
      expect(tools).toContain('write');
      expect(tools).toContain('edit');
      expect(tools).toContain('bash');
      expect(tools).toContain('grep');
      expect(tools).toContain('glob');
    });

    it('verify phase: read-only, no write/edit', () => {
      const tools = getToolsForPhase(PhaseType.Verify);
      expect(tools).toContain('read');
      expect(tools).toContain('bash');
      expect(tools).toContain('grep');
      expect(tools).toContain('glob');
      expect(tools).not.toContain('write');
      expect(tools).not.toContain('edit');
    });

    it('discuss phase: read-only, no write/edit', () => {
      const tools = getToolsForPhase(PhaseType.Discuss);
      expect(tools).toContain('read');
      expect(tools).toContain('bash');
      expect(tools).toContain('grep');
      expect(tools).toContain('glob');
      expect(tools).not.toContain('write');
      expect(tools).not.toContain('edit');
    });

    it('plan phase: read/write + web, has write but no edit', () => {
      const tools = getToolsForPhase(PhaseType.Plan);
      expect(tools).toContain('read');
      expect(tools).toContain('write');
      expect(tools).toContain('bash');
      expect(tools).toContain('glob');
      expect(tools).toContain('grep');
      expect(tools).toContain('webfetch');
    });
  });

  describe('returns copies, not references', () => {
    it('mutating returned array does not affect future calls', () => {
      const tools1 = getToolsForPhase(PhaseType.Execute);
      tools1.push('CustomTool');
      const tools2 = getToolsForPhase(PhaseType.Execute);
      expect(tools2).not.toContain('CustomTool');
    });
  });

  describe('agent definition override', () => {
    it('parses tools from agent def frontmatter when provided', () => {
      const agentDef = `---
name: test-agent
tools: bash, grep, CustomTool
---

<role>Test agent</role>`;

      const tools = getToolsForPhase(PhaseType.Execute, agentDef);
      expect(tools).toEqual(['bash', 'grep', 'CustomTool']);
    });

    it('falls back to defaults when agent def has no tools line', () => {
      const agentDef = `---
name: test-agent
---

<role>Test agent</role>`;

      const tools = getToolsForPhase(PhaseType.Execute, agentDef);
      // parseAgentTools returns DEFAULT_ALLOWED_TOOLS when no tools: line found
      expect(tools).toEqual(['read', 'write', 'edit', 'bash', 'grep', 'glob']);
    });

    it('falls back to defaults when agent def has no frontmatter', () => {
      const agentDef = '<role>Test agent with no frontmatter</role>';

      const tools = getToolsForPhase(PhaseType.Research, agentDef);
      // parseAgentTools returns DEFAULT_ALLOWED_TOOLS for no frontmatter
      expect(tools).toEqual(['read', 'write', 'edit', 'bash', 'grep', 'glob']);
    });
  });

  describe('R015 compliance', () => {
    it('research has no write or edit on source', () => {
      const tools = getToolsForPhase(PhaseType.Research);
      expect(tools).not.toContain('write');
      expect(tools).not.toContain('edit');
    });

    it('execute has write and edit for source modification', () => {
      const tools = getToolsForPhase(PhaseType.Execute);
      expect(tools).toContain('write');
      expect(tools).toContain('edit');
    });

    it('verify has no write or edit (read-only verification)', () => {
      const tools = getToolsForPhase(PhaseType.Verify);
      expect(tools).not.toContain('write');
      expect(tools).not.toContain('edit');
    });
  });
});

describe('PHASE_AGENT_MAP', () => {
  it('maps all phase types', () => {
    for (const phase of Object.values(PhaseType)) {
      expect(phase in PHASE_AGENT_MAP).toBe(true);
    }
  });

  it('execute maps to gsd-executor.md', () => {
    expect(PHASE_AGENT_MAP[PhaseType.Execute]).toBe('gsd-executor.md');
  });

  it('research maps to gsd-phase-researcher.md', () => {
    expect(PHASE_AGENT_MAP[PhaseType.Research]).toBe('gsd-phase-researcher.md');
  });

  it('plan maps to gsd-planner.md', () => {
    expect(PHASE_AGENT_MAP[PhaseType.Plan]).toBe('gsd-planner.md');
  });

  it('verify maps to gsd-verifier.md', () => {
    expect(PHASE_AGENT_MAP[PhaseType.Verify]).toBe('gsd-verifier.md');
  });

  it('discuss maps to null (no dedicated agent)', () => {
    expect(PHASE_AGENT_MAP[PhaseType.Discuss]).toBeNull();
  });
});

describe('PHASE_DEFAULT_TOOLS', () => {
  it('covers all phase types', () => {
    for (const phase of Object.values(PhaseType)) {
      expect(PHASE_DEFAULT_TOOLS[phase]).toBeDefined();
      expect(PHASE_DEFAULT_TOOLS[phase].length).toBeGreaterThan(0);
    }
  });
});
