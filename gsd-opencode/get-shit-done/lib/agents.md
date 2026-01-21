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

---

### parseFrontmatter(agentPath)

**Purpose:** Extract and parse YAML frontmatter from an agent file.

**Behavior:**
1. Read file content
2. Extract YAML between first `---` markers
3. Parse YAML to object
4. Return frontmatter data and the line number where the body starts

**Returns:**
- `{ ok: true, frontmatter: object, bodyStart: number }`, or
- `{ ok: false, error: string }`

**Error cases:**
- File not found: `"Agent file not found: {path}"`
- No frontmatter: `"No frontmatter found in: {path}"`
- Invalid YAML: `"Invalid YAML in frontmatter: {path} - {yamlError}"`

**Pseudocode:**

```ts
function parseFrontmatter(agentPath) {
  // Check file exists
  if (!exists(agentPath)) {
    return { ok: false, error: `Agent file not found: ${agentPath}` };
  }

  const content = readFile(agentPath);
  const lines = content.split("\n");

  // Find frontmatter delimiters (first two lines starting with ---)
  let frontmatterStart = -1;
  let frontmatterEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      if (frontmatterStart === -1) {
        frontmatterStart = i;
      } else {
        frontmatterEnd = i;
        break;
      }
    }
  }

  // Validate frontmatter exists
  if (frontmatterStart === -1 || frontmatterEnd === -1) {
    return { ok: false, error: `No frontmatter found in: ${agentPath}` };
  }

  // Extract YAML content between delimiters
  const yamlLines = lines.slice(frontmatterStart + 1, frontmatterEnd);
  const yamlContent = yamlLines.join("\n");

  // Parse YAML
  let frontmatter;
  try {
    frontmatter = parseYAML(yamlContent);
  } catch (err) {
    return {
      ok: false,
      error: `Invalid YAML in frontmatter: ${agentPath} - ${err.message}`,
    };
  }

  return {
    ok: true,
    frontmatter,
    bodyStart: frontmatterEnd + 1, // Line number where body content begins
  };
}
```

**Example scenarios:**
- **Valid file:** `{ ok: true, frontmatter: { name: "gsd-planner", ... }, bodyStart: 15 }`
- **File not found:** `{ ok: false, error: "Agent file not found: gsd-opencode/agents/gsd-foo.md" }`
- **No frontmatter:** `{ ok: false, error: "No frontmatter found in: gsd-opencode/agents/gsd-planner.md" }`

---

### validateFrontmatter(frontmatter, agentPath)

**Purpose:** Validate the structure of parsed frontmatter.

**Behavior:**
1. Check required keys exist: `name` (string), `description` (string), `tools` (object)
2. If `model` key exists:
   - Must be a non-empty string (not null, not empty string, correct type)
   - Invalid type or empty value produces an error
3. Collect all validation errors (batch, not fail-fast)

**Note:** Model key is optional — agents without a `model:` key are valid. They inherit OpenCode's current model selection. The model key exists to override the default behavior.

**Returns:**
- `{ valid: true }`, or
- `{ valid: false, errors: string[] }`

**Pseudocode:**

```ts
function validateFrontmatter(frontmatter, agentPath) {
  const errors = [];

  // Check required keys
  if (typeof frontmatter.name !== "string" || frontmatter.name.trim() === "") {
    errors.push(`Missing or invalid 'name' key in: ${agentPath}`);
  }

  if (typeof frontmatter.description !== "string" || frontmatter.description.trim() === "") {
    errors.push(`Missing or invalid 'description' key in: ${agentPath}`);
  }

  if (typeof frontmatter.tools !== "object" || frontmatter.tools === null) {
    errors.push(`Missing or invalid 'tools' key in: ${agentPath}`);
  }

  // Optional model key validation (only if present)
  if ("model" in frontmatter) {
    if (typeof frontmatter.model !== "string") {
      errors.push(`Invalid 'model' type in: ${agentPath} - expected string, got ${typeof frontmatter.model}`);
    } else if (frontmatter.model.trim() === "") {
      errors.push(`Empty 'model' value in: ${agentPath} - remove key or provide valid model`);
    }
  }

  if (errors.length === 0) {
    return { valid: true };
  }

  return { valid: false, errors };
}
```

**Example scenarios:**
- **Valid frontmatter (with model):** `{ valid: true }`
- **Valid frontmatter (no model key):** `{ valid: true }` — model is optional
- **Missing name:** `{ valid: false, errors: ["Missing or invalid 'name' key in: ..."] }`
- **Empty model value:** `{ valid: false, errors: ["Empty 'model' value in: ... - remove key or provide valid model"] }`

---

### getValidModels()

**Purpose:** Get the list of valid model identifiers from OpenCode.

**Behavior:**
1. Run `opencode models` command
2. Parse output to extract model identifiers (provider/model format)
3. Handle command failure gracefully

**Returns:**
- `{ ok: true, models: string[] }`, or
- `{ ok: false, error: string }`

**Pseudocode:**

```ts
function getValidModels() {
  let output;
  try {
    output = exec("opencode models");
  } catch (err) {
    return {
      ok: false,
      error: `Failed to run 'opencode models': ${err.message}`,
    };
  }

  // Parse output to extract model identifiers
  // Expected format: lines containing provider/model (e.g., "opencode/claude-sonnet-4")
  const lines = output.split("\n");
  const models = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Match provider/model pattern (e.g., "opencode/glm-4.7-free", "github-copilot/gpt-5")
    if (trimmed.match(/^[\w-]+\/[\w.-]+$/)) {
      models.push(trimmed);
    }
  }

  if (models.length === 0) {
    return {
      ok: false,
      error: "No valid models found in 'opencode models' output",
    };
  }

  return { ok: true, models };
}
```

**Example scenarios:**
- **Success:** `{ ok: true, models: ["opencode/claude-sonnet-4", "opencode/glm-4.7-free", ...] }`
- **Command failed:** `{ ok: false, error: "Failed to run 'opencode models': command not found" }`
- **No models parsed:** `{ ok: false, error: "No valid models found in 'opencode models' output" }`

---

### validateModelKey(modelValue, validModels)

**Purpose:** Validate a model value against the list of valid models.

**Behavior:**
1. Check if `modelValue` exists in `validModels` array
2. Return success or specific error with guidance

**Returns:**
- `{ valid: true }`, or
- `{ valid: false, error: string }`

**Pseudocode:**

```ts
function validateModelKey(modelValue, validModels) {
  if (validModels.includes(modelValue)) {
    return { valid: true };
  }

  return {
    valid: false,
    error: `Invalid model '${modelValue}'. Run 'opencode models' to see valid options.`,
  };
}
```

**Example scenarios:**
- **Valid model:** `validateModelKey("opencode/glm-4.7-free", [...])` → `{ valid: true }`
- **Invalid model:** `validateModelKey("invalid/model", [...])` → `{ valid: false, error: "Invalid model 'invalid/model'. Run 'opencode models' to see valid options." }`

---

### validateAllAgents()

**Purpose:** Batch validate all 11 GSD agents before any modification.

**Guarantee:** All agents are validated before any are modified. Phase 5 calls this once to get either a complete set of pre-validated agent info or a comprehensive list of all errors.

**Behavior:**
1. Call `validateAgentsExist()` — fail early if any agent files are missing
2. Get valid models via `getValidModels()`
3. For each agent in `ALL_GSD_AGENTS`:
   - `parseFrontmatter(resolveAgentPath(agent))`
   - `validateFrontmatter(frontmatter, path)`
   - If model key exists, `validateModelKey(model, validModels)`
   - Collect all errors (batch, not fail-fast)
4. Return aggregate result

**Returns:**
- `{ valid: true, agents: AgentInfo[] }` — all agents validated successfully
- `{ valid: false, errors: ValidationError[] }` — one or more validation errors

**Type definitions:**

```ts
type AgentInfo = {
  name: string;           // Agent name (e.g., "gsd-planner")
  path: string;           // Full path to agent file
  frontmatter: object;    // Parsed frontmatter object
  bodyStart: number;      // Line number where body content begins
};

type ValidationError = {
  agent: string;          // Agent name
  path: string;           // Full path to agent file
  errors: string[];       // List of error messages for this agent
};
```

**Pseudocode:**

```ts
function validateAllAgents() {
  // Step 1: Validate all agent files exist
  const existsResult = validateAgentsExist();
  if (!existsResult.valid) {
    return {
      valid: false,
      errors: [{
        agent: "(file existence)",
        path: "gsd-opencode/agents/",
        errors: [existsResult.error],
      }],
    };
  }

  // Step 2: Get valid models
  const modelsResult = getValidModels();
  const validModels = modelsResult.ok ? modelsResult.models : [];
  
  // Note: If models command fails, we can still validate structure
  // We just skip model value validation
  const modelsFailed = !modelsResult.ok;

  // Step 3: Validate each agent
  const agents = [];
  const errors = [];

  for (const agentName of ALL_GSD_AGENTS) {
    const path = resolveAgentPath(agentName);
    const agentErrors = [];

    // Parse frontmatter
    const parseResult = parseFrontmatter(path);
    if (!parseResult.ok) {
      agentErrors.push(parseResult.error);
    } else {
      // Validate frontmatter structure
      const structureResult = validateFrontmatter(parseResult.frontmatter, path);
      if (!structureResult.valid) {
        agentErrors.push(...structureResult.errors);
      }

      // Validate model key (if present and models available)
      if (
        parseResult.frontmatter.model &&
        !modelsFailed
      ) {
        const modelResult = validateModelKey(
          parseResult.frontmatter.model,
          validModels
        );
        if (!modelResult.valid) {
          agentErrors.push(`${path}: ${modelResult.error}`);
        }
      }

      // If no errors, add to successful agents list
      if (agentErrors.length === 0) {
        agents.push({
          name: agentName,
          path,
          frontmatter: parseResult.frontmatter,
          bodyStart: parseResult.bodyStart,
        });
      }
    }

    // Collect errors for this agent
    if (agentErrors.length > 0) {
      errors.push({
        agent: agentName,
        path,
        errors: agentErrors,
      });
    }
  }

  // Step 4: Return aggregate result
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, agents };
}
```

**Example scenarios:**

- **All valid:**
  ```ts
  {
    valid: true,
    agents: [
      { name: "gsd-planner", path: "gsd-opencode/agents/gsd-planner.md", frontmatter: {...}, bodyStart: 15 },
      { name: "gsd-plan-checker", path: "gsd-opencode/agents/gsd-plan-checker.md", frontmatter: {...}, bodyStart: 12 },
      // ... all 11 agents
    ]
  }
  ```

- **Multiple errors:**
  ```ts
  {
    valid: false,
    errors: [
      { agent: "gsd-planner", path: "gsd-opencode/agents/gsd-planner.md", errors: ["Invalid YAML in frontmatter: ..."] },
      { agent: "gsd-verifier", path: "gsd-opencode/agents/gsd-verifier.md", errors: ["Invalid model 'bad/model'. Run 'opencode models' to see valid options."] },
    ]
  }
  ```

---

## Usage

### Phase 5 Consumption Pattern

Phase 5 (Frontmatter Rewriting) calls `validateAllAgents()` once before any modification:

```ts
const result = validateAllAgents();

if (!result.valid) {
  // Display all errors, abort before any modification
  console.error("Agent validation failed:");
  for (const err of result.errors) {
    console.error(`\n${err.agent}:`);
    for (const msg of err.errors) {
      console.error(`  - ${msg}`);
    }
  }
  return; // Do NOT proceed with frontmatter rewriting
}

// Safe to proceed with frontmatter rewriting
// All agents have been validated
for (const agent of result.agents) {
  // agent.name       - Agent name
  // agent.path       - Full path to file
  // agent.frontmatter - Parsed frontmatter object
  // agent.bodyStart  - Line number where body begins
  
  // Modify frontmatter as needed, then rewrite file
}
```

### Batch Validation Guarantee

**All agents are validated before any are modified.**

This ensures:
1. No partial modifications if some agents have errors
2. User sees complete error list (not just first error)
3. Atomic operation: all succeed or none are modified

### Reference from Other Commands

Include this library via @-reference:

```markdown
@gsd-opencode/get-shit-done/lib/agents.md
```

### Exports

This library provides:

| Procedure | Purpose |
|-----------|---------|
| `resolveAgentPath(agentName)` | Get full path to agent file |
| `validateAgentsExist()` | Check all 11 agent files exist |
| `parseFrontmatter(agentPath)` | Extract and parse YAML frontmatter |
| `validateFrontmatter(frontmatter, agentPath)` | Validate frontmatter structure |
| `getValidModels()` | Get valid model list from opencode |
| `validateModelKey(modelValue, validModels)` | Check model against valid list |
| `validateAllAgents()` | Main orchestration — batch validate all agents |
