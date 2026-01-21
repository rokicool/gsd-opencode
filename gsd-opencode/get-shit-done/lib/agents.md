# Agent Discovery Library (Phase 04-01)

This file is designed to be **@-referenced** by other GSD commands that need to discover, parse, and validate agent files before frontmatter modification.

**Purpose:** Agent discovery and validation for frontmatter rewriting (Phase 5).

**Related:** @gsd-opencode/get-shit-done/lib/config.md for stage-to-agent mapping via `getAgentsForStage()`.

## Constants

### AGENTS_DIR

Path to the agents directory:

```
gsd-opencode/agents/
```

### ALL_GSD_AGENTS

The complete list of all 11 GSD agents (excludes `gsd-set-profile` which is a command, not a stage agent):

```ts
const ALL_GSD_AGENTS = [
  // planning stage (7 agents)
  "gsd-planner",
  "gsd-plan-checker",
  "gsd-phase-researcher",
  "gsd-roadmapper",
  "gsd-project-researcher",
  "gsd-research-synthesizer",
  "gsd-codebase-mapper",
  
  // execution stage (2 agents)
  "gsd-executor",
  "gsd-debugger",
  
  // verification stage (2 agents)
  "gsd-verifier",
  "gsd-integration-checker",
];
```

This mapping aligns with `getAgentsForStage()` from config.md:
- **planning:** gsd-planner, gsd-plan-checker, gsd-phase-researcher, gsd-roadmapper, gsd-project-researcher, gsd-research-synthesizer, gsd-codebase-mapper
- **execution:** gsd-executor, gsd-debugger
- **verification:** gsd-verifier, gsd-integration-checker

## Procedures

> The procedures below are written as language-agnostic pseudocode so they can be translated into whichever runtime the command is implemented in.

---

### resolveAgentPath(agentName)

**Purpose:** Resolve the full path to an agent's markdown file.

**Behavior:**
- Returns absolute path: `${AGENTS_DIR}/${agentName}.md`
- No validation here (validation is handled by `validateAgentsExist()`)

**Pseudocode:**

```ts
function resolveAgentPath(agentName) {
  const AGENTS_DIR = "gsd-opencode/agents";
  return `${AGENTS_DIR}/${agentName}.md`;
}
```

**Example:**
- `resolveAgentPath("gsd-planner")` → `"gsd-opencode/agents/gsd-planner.md"`

---

### validateAgentsExist()

**Purpose:** Validate that all 11 GSD agent files exist on disk.

**Behavior:**
1. Iterate over `ALL_GSD_AGENTS`
2. Check each file exists via `resolveAgentPath()`
3. Collect all missing files (batch, not fail-fast)
4. Return result with either success or detailed error listing all missing files

**Returns:**
- `{ valid: true }`, or
- `{ valid: false, missing: string[], error: string }`

**Error format:**
```
Missing agent files:
  - gsd-planner.md
  - gsd-verifier.md
Expected at: gsd-opencode/agents/
```

**Pseudocode:**

```ts
function validateAgentsExist() {
  const AGENTS_DIR = "gsd-opencode/agents";
  const missing = [];

  for (const agentName of ALL_GSD_AGENTS) {
    const path = resolveAgentPath(agentName);
    if (!exists(path)) {
      missing.push(`${agentName}.md`);
    }
  }

  if (missing.length === 0) {
    return { valid: true };
  }

  const errorLines = [
    "Missing agent files:",
    ...missing.map((file) => `  - ${file}`),
    `Expected at: ${AGENTS_DIR}/`,
  ];

  return {
    valid: false,
    missing,
    error: errorLines.join("\n"),
  };
}
```

**Example scenarios:**
- **All agents exist:** `{ valid: true }`
- **Two agents missing:** `{ valid: false, missing: ["gsd-planner.md", "gsd-verifier.md"], error: "Missing agent files:\n  - gsd-planner.md\n  - gsd-verifier.md\nExpected at: gsd-opencode/agents/" }`
