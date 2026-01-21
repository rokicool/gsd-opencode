# Stack Research: Model Profile Management

**Project:** gsd-opencode model profiles
**Researched:** 2026-01-20
**Scope:** YAML frontmatter parsing, OpenCode command patterns, JSON config management

## Executive Summary

This is a **brownfield** addition to an existing OpenCode command system. The key constraint: **no runtime dependencies** — gsd-opencode is purely prompt-driven orchestration using OpenCode's built-in tools (bash, read, write, edit, glob, grep).

The stack is already defined by the environment. This research focuses on **approaches** for the three core operations.

---

## YAML Frontmatter Parsing

### The Problem

Agent files have YAML frontmatter like:

```markdown
---
name: gsd-planner
description: Creates executable phase plans...
tools:
  read: true
  write: true
  bash: true
model: opencode/glm-4.7-free
color: "#008000"
---

<role>
You are a GSD planner...
```

Need to:
1. Read current `model:` value (if present)
2. Update/add `model:` key without corrupting other frontmatter
3. Preserve markdown body completely

### Approach 1: sed-based Extraction + Edit Tool (RECOMMENDED)

**Confidence: HIGH** — Verified from real-world GitHub examples.

**For reading frontmatter:**
```bash
# Extract frontmatter block
sed -n '/^---$/,/^---$/p' file.md

# Extract specific key
sed -n '/^---$/,/^---$/p' file.md | grep "^model:" | sed 's/model:[[:space:]]*//'
```

**For modifying frontmatter:** Use OpenCode's `edit` tool with exact string replacement.

**Why this works:**
- `sed -n '/^---$/,/^---$/p'` is a proven pattern (found in pchalasani/claude-code-tools, qdhenry/Claude-Command-Suite, multiple other repos)
- The `edit` tool handles the actual file modification safely
- No YAML parser needed — treat as text with known structure

**Implementation pattern:**

```bash
# Step 1: Read the file to get exact current content
cat gsd-opencode/agents/gsd-planner.md

# Step 2: Identify the model line (or where to insert)
sed -n '1,/^---$/{ /^---$/!p }' gsd-opencode/agents/gsd-planner.md | grep -n "model:"
```

Then use `edit` tool:
```json
{
  "filePath": "gsd-opencode/agents/gsd-planner.md",
  "oldString": "model: opencode/glm-4.7-free",
  "newString": "model: opencode/minimax-m2.1-free"
}
```

**Edge case — model key doesn't exist:** Insert before closing `---`:
```json
{
  "filePath": "gsd-opencode/agents/gsd-planner.md",
  "oldString": "color: \"#008000\"\n---",
  "newString": "color: \"#008000\"\nmodel: opencode/glm-4.7-free\n---"
}
```

### Approach 2: Full File Rewrite (FALLBACK)

**Confidence: HIGH** — Simple but more invasive.

1. Read entire file
2. Parse frontmatter boundary (find first `---`, find second `---`)
3. Modify model line or insert it
4. Write entire file back

**When to use:** Only if edit tool fails due to duplicate string matches or complex frontmatter.

### Approach 3: awk-based Parsing (ALTERNATIVE)

**Confidence: MEDIUM** — More complex, less readable.

```bash
awk '/^---$/{p=!p; print; next} p{gsub(/^model:.*/, "model: new-value")} 1' file.md
```

**Why not recommended:** Harder to debug, less transparent, and the edit tool approach is more aligned with OpenCode patterns.

### Recommendation

**Use Approach 1: sed for reading + edit tool for modifying.**

Rationale:
- Matches existing gsd-opencode patterns (commands use bash + edit)
- Proven in production (multiple GitHub repos use this exact sed pattern)
- Transparent and debuggable
- Handles the 80% case cleanly; full rewrite as fallback

---

## Markdown Preservation

### The Problem

When modifying `model:` key, must NOT:
- Corrupt other YAML keys (name, description, tools, color)
- Alter the markdown body below the frontmatter
- Break YAML syntax (indentation, quoting)

### Strategy: Surgical Edit

**Confidence: HIGH**

1. **Read file first** — Always use `read` tool before `edit`
2. **Match exact strings** — Include surrounding context for uniqueness
3. **Preserve whitespace** — Match exact indentation and newlines
4. **Validate after** — Re-read and verify frontmatter parses

**Safety patterns:**

```python
# Pseudocode for the command's mental model

# 1. Read current state
current = read(agent_file)

# 2. Find model line with context
# Look for: "model: {current_value}\n" 
# If not found, look for position to insert (before closing ---)

# 3. Use edit with exact match
edit(
    oldString="model: old-value\n",
    newString="model: new-value\n"
)

# 4. Verify (in command logic)
new_content = read(agent_file)
assert "model: new-value" in frontmatter(new_content)
```

### Edge Cases

| Scenario | Handling |
|----------|----------|
| `model:` doesn't exist | Insert before closing `---` |
| `model:` has trailing spaces | Match exact whitespace |
| Multiple `model:` occurrences | Error — malformed file |
| Model value contains colons | Quote the value: `model: "foo:bar"` |
| Body contains "model:" | Not a problem — edit targets frontmatter section |

### Recommendation

**The edit tool with explicit oldString/newString is sufficient.** No special markdown-aware library needed.

---

## Command Patterns

### Existing gsd-opencode Command Structure

From analyzing existing commands (gsd-new-project, gsd-help, gsd-update):

```yaml
---
name: gsd-command-name
description: One-line description
argument-hint: "<required>" or "[optional]"
---

<objective>
What/why/when
</objective>

<execution_context>
@workflow/reference files
</execution_context>

<context>
$ARGUMENTS
@dynamic project files
</context>

<process>
<step name="step_name">
...bash commands...
...question calls...
...file operations...
</step>
</process>

<success_criteria>
- [ ] Measurable outcome
</success_criteria>
```

### Interactive Prompts Pattern

**From gsd-new-project (lines 239-271):**

```markdown
Use question:
- header: "Mode"
- question: "How do you want to work?"
- multiSelect: false
- options:
  - { label: "YOLO", description: "Auto-approve" }
  - { label: "Interactive", description: "Confirm at each step" }
```

**This is the pattern for `/gsd-settings`:**

```markdown
Use question:
- header: "Model Profile"
- question: "Which model profile to use?"
- options:
  - "quality" — Best quality, uses glm-4.7-free for all stages
  - "balanced" — Mix of quality and speed
  - "budget" — Fastest, lowest cost
  - "custom" — Define your own model assignments
```

### Command Delegation Pattern

Commands are thin wrappers. Heavy logic lives in:
- `workflows/` — Reusable process definitions
- `templates/` — Output format specifications
- `agents/` — Subagent definitions

For this feature:
- `/gsd-settings` — Interactive command (thin wrapper)
- `/gsd-set-profile` — Quick switch command (thin wrapper)
- Logic: Inline in commands (simple enough, no workflow needed)

---

## Config Management

### Existing Pattern: .planning/config.json

Current structure:
```json
{
  "mode": "yolo",
  "depth": "comprehensive",
  "parallelization": true
}
```

### Proposed Extension

```json
{
  "mode": "yolo",
  "depth": "comprehensive",
  "parallelization": true,
  "model_profile": "balanced",
  "model_profiles": {
    "quality": {
      "planning": "opencode/glm-4.7-free",
      "execution": "opencode/glm-4.7-free",
      "verification": "opencode/glm-4.7-free"
    },
    "balanced": {
      "planning": "opencode/glm-4.7-free",
      "execution": "opencode/minimax-m2.1-free",
      "verification": "opencode/glm-4.7-free"
    },
    "budget": {
      "planning": "opencode/minimax-m2.1-free",
      "execution": "opencode/grok-code",
      "verification": "opencode/minimax-m2.1-free"
    }
  },
  "model_overrides": {}
}
```

### JSON Read/Update/Write Pattern

**Confidence: HIGH** — Standard bash + OpenCode tool pattern.

**Reading:**
```bash
cat .planning/config.json
```

Then parse in command logic (OpenCode understands JSON natively).

**Merge-update pattern:**

1. Read current config
2. Parse as JSON (OpenCode does this mentally)
3. Merge new keys (preserving existing)
4. Write complete new file

**Using write tool (full replacement):**
```json
{
  "filePath": ".planning/config.json",
  "content": "{\n  \"mode\": \"yolo\",\n  \"depth\": \"comprehensive\",\n  \"parallelization\": true,\n  \"model_profile\": \"balanced\"\n}\n"
}
```

**Using edit tool (surgical update):**
```json
{
  "filePath": ".planning/config.json",
  "oldString": "\"parallelization\": true\n}",
  "newString": "\"parallelization\": true,\n  \"model_profile\": \"balanced\"\n}"
}
```

### Recommendation

**Use `read` to get current state, mentally merge, use `write` to replace entire file.**

Rationale:
- JSON is small (< 50 lines)
- Full replacement is safer than surgical JSON edits
- Avoids edge cases with edit tool and JSON syntax
- Matches existing patterns (config.json is written wholesale in gsd-new-project)

---

## Recommendations Summary

### YAML Frontmatter

| Operation | Approach | Confidence |
|-----------|----------|------------|
| Read frontmatter | `sed -n '/^---$/,/^---$/p'` | HIGH |
| Extract model value | `grep "^model:" \| sed 's/model:[[:space:]]*//'` | HIGH |
| Update model value | `edit` tool with exact string match | HIGH |
| Insert model key | `edit` tool, insert before closing `---` | HIGH |

### Markdown Preservation

| Approach | Confidence |
|----------|------------|
| Surgical `edit` with frontmatter-scoped changes | HIGH |
| Always `read` before `edit` | MANDATORY |

### Command Structure

| Command | Pattern |
|---------|---------|
| `/gsd-settings` | Interactive flow with `question`, multi-step |
| `/gsd-set-profile` | Quick, takes profile name as argument |

### Config Management

| Operation | Approach | Confidence |
|-----------|----------|------------|
| Read config | `cat .planning/config.json` | HIGH |
| Merge update | Read → mental parse → merge → `write` full file | HIGH |
| Don't use | `jq` (not installed by default), surgical JSON edit | N/A |

---

## Implementation Notes

### Agent File Locations

```
gsd-opencode/agents/gsd-*.md  (11 files)
```

Stage-to-agent mapping (from PROJECT.md):

| Stage | Agents |
|-------|--------|
| Planning | gsd-planner, gsd-plan-checker, gsd-phase-researcher, gsd-roadmapper, gsd-project-researcher, gsd-research-synthesizer, gsd-codebase-mapper |
| Execution | gsd-executor, gsd-debugger |
| Verification | gsd-verifier, gsd-integration-checker |

### Idempotency

Profile application must be idempotent:
1. Read current model value
2. If already matches target, skip
3. If different, update
4. Log what changed

### Error Handling

- **Missing agent file:** Fail loudly with clear message
- **Malformed frontmatter:** Fail loudly, suggest manual inspection
- **No model key exists:** Insert (don't fail)
- **Config.json missing:** Create with defaults

---

## Sources

| Finding | Source | Confidence |
|---------|--------|------------|
| sed frontmatter pattern | GitHub: pchalasani/claude-code-tools, qdhenry/Claude-Command-Suite | HIGH |
| OpenCode edit tool behavior | Existing gsd-opencode commands, system prompt | HIGH |
| OpenCode question pattern | gsd-new-project.md lines 239-271 | HIGH |
| Config.json merge pattern | gsd-new-project.md | HIGH |
| Agent file structure | Local inspection of gsd-opencode/agents/*.md | HIGH |
