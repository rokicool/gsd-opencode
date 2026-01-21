# Architecture Research: Model Profile Management

**Domain:** Model profile management for gsd-opencode
**Researched:** 2026-01-20
**Confidence:** HIGH (based on direct codebase analysis)

## Executive Summary

Model profile management for gsd-opencode requires coordinating three distinct concerns: (1) storing profile configurations, (2) presenting user interfaces for profile selection, and (3) rewriting agent frontmatter to reflect chosen models. The key constraint is that OpenCode commands are markdown files containing LLM instructions, not executable code. All logic must be expressed as structured prompts.

The architecture follows gsd-opencode's existing patterns: commands orchestrate workflows, agents perform work, templates provide structure, and references provide guidance. Config extends `.planning/config.json` which already stores workflow preferences.

## Components

### 1. Configuration Store: `.planning/config.json`

**Responsibility:** Persist model profile settings alongside existing workflow configuration.

**Current structure (from codebase analysis):**
```json
{
  "mode": "interactive|yolo",
  "depth": "quick|standard|comprehensive",
  "parallelization": "parallel|sequential"
}
```

**Extended structure for profiles:**
```json
{
  "mode": "interactive",
  "depth": "standard",
  "parallelization": "parallel",
  "profiles": {
    "active": "balanced",
    "definitions": {
      "balanced": {
        "orchestrator": { "provider": "anthropic", "model": "claude-sonnet-4-20250514" },
        "worker": { "provider": "anthropic", "model": "claude-sonnet-4-20250514" },
        "researcher": { "provider": "anthropic", "model": "claude-sonnet-4-20250514" }
      },
      "economical": {
        "orchestrator": { "provider": "anthropic", "model": "claude-sonnet-4-20250514" },
        "worker": { "provider": "anthropic", "model": "claude-haiku-3-20240307" },
        "researcher": { "provider": "anthropic", "model": "claude-haiku-3-20240307" }
      },
      "premium": {
        "orchestrator": { "provider": "anthropic", "model": "claude-sonnet-4-20250514" },
        "worker": { "provider": "anthropic", "model": "claude-sonnet-4-20250514" },
        "researcher": { "provider": "anthropic", "model": "claude-sonnet-4-20250514" }
      }
    }
  }
}
```

**Design rationale:**
- Extends existing config.json rather than creating new file
- Maintains backward compatibility (profiles field optional)
- Profile definitions are inline (no external schema dependency)
- Role-based model assignment (orchestrator, worker, researcher) maps to agent types

### 2. Command: `/gsd-settings`

**Responsibility:** View and modify all GSD configuration including model profiles.

**Location:** `gsd-opencode/command/gsd/settings.md`

**Behavior:**
1. Display current settings (mode, depth, parallelization, active profile)
2. Present modification options via `question` tool
3. Update config.json when settings change
4. Commit changes with descriptive message

**Integration points:**
- Reads/writes `.planning/config.json`
- Uses `question` tool for structured selection
- Follows existing command patterns (frontmatter + objective + process)

### 3. Command: `/gsd-set-profile <profile-name>`

**Responsibility:** Quick profile switching without full settings menu.

**Location:** `gsd-opencode/command/gsd/set-profile.md`

**Behavior:**
1. Validate profile name exists in definitions
2. Update `profiles.active` in config.json
3. Trigger agent frontmatter rewrite (see Component 5)
4. Report success with profile details

**Why separate from `/gsd-settings`:**
- Common operation deserves quick path
- Profile switching during work should be frictionless
- Mirrors `/gsd-progress` vs `/gsd-resume-work` pattern (quick vs comprehensive)

### 4. Profile Schema Definition

**Responsibility:** Define valid profile structure with role-to-model mappings.

**Location:** Embedded in config.json documentation and command validation logic.

**Key decisions:**
- **Three role types:** orchestrator, worker, researcher
  - `orchestrator`: Commands that coordinate (new-project, execute-phase)
  - `worker`: Agents that do focused work (executor, planner, debugger)
  - `researcher`: Agents that gather information (project-researcher, phase-researcher)
- **Provider/model pairs:** Allow different providers per role
- **Preset profiles:** Ship with balanced, economical, premium defaults
- **Custom profiles:** Users can add their own definitions

**Role-to-agent mapping:**
| Role | Agents |
|------|--------|
| orchestrator | Commands that spawn subagents |
| worker | gsd-executor, gsd-planner, gsd-debugger, gsd-verifier, gsd-plan-checker, gsd-integration-checker, gsd-roadmapper |
| researcher | gsd-project-researcher, gsd-phase-researcher, gsd-research-synthesizer, gsd-codebase-mapper |

### 5. Agent Frontmatter Rewriter

**Responsibility:** Update agent .md files with model/provider from active profile.

**Location:** Logic embedded in `/gsd-set-profile` command (markdown instructions).

**Current agent frontmatter structure:**
```yaml
---
name: gsd-executor
description: Executes GSD plans...
tools:
  read: true
  write: true
  ...
color: "#FFFF00"
---
```

**Extended frontmatter with model:**
```yaml
---
name: gsd-executor
description: Executes GSD plans...
tools:
  read: true
  write: true
  ...
color: "#FFFF00"
model:
  provider: anthropic
  model: claude-sonnet-4-20250514
---
```

**Rewrite process:**
1. Read active profile from config.json
2. Determine role for each agent (worker, researcher, orchestrator)
3. For each agent file in `gsd-opencode/agents/`:
   - Parse frontmatter
   - Update/add `model` field with profile's settings for that role
   - Write back with preserved content
4. Commit all changes atomically

**Key constraint:** This is expressed as LLM instructions, not executable code. The command tells the LLM what to do, and the LLM uses `read`, `edit`, `write` tools.

### 6. Reference: Model Profiles

**Responsibility:** Document profile system for other agents/commands that need context.

**Location:** `gsd-opencode/get-shit-done/references/model-profiles.md`

**Contents:**
- What profiles are and why they exist
- How to read active profile from config.json
- Role definitions and which agents map to which role
- Default profiles and their intended use cases

## Data Flow

```
User → /gsd-settings → config.json → [active profile selected]
                           ↓
User → /gsd-set-profile → config.json → Agent files (frontmatter rewritten)
                                              ↓
Commands → spawn agents → OpenCode reads agent frontmatter → Uses specified model
```

### Flow 1: Initial Setup (via /gsd-new-project)

```
1. /gsd-new-project runs
2. Phase 5 asks workflow mode, depth, parallelization
3. NEW: Also asks profile preference (balanced/economical/premium/custom)
4. Creates config.json with all settings including profiles
5. Rewrites agent frontmatter if profile != defaults
```

### Flow 2: Profile Switch (via /gsd-set-profile)

```
1. User runs: /gsd-set-profile economical
2. Command validates profile exists in config.json definitions
3. Updates profiles.active to "economical"
4. Iterates over agents/ directory
5. For each agent:
   - Determines role (worker, researcher)
   - Gets model from profile for that role
   - Updates frontmatter model field
6. Commits all changes
7. Reports: "Switched to 'economical' profile"
```

### Flow 3: Settings Review (via /gsd-settings)

```
1. User runs: /gsd-settings
2. Command reads config.json
3. Displays current settings:
   - Mode: interactive
   - Depth: standard
   - Parallelization: parallel
   - Active Profile: balanced
4. Offers modification options via question tool
5. On selection, updates config.json
6. If profile changed, triggers agent rewrite
```

## Integration Points

### With Existing Commands

| Command | Integration |
|---------|-------------|
| `/gsd-new-project` | Add profile selection in Phase 5 (config step) |
| `/gsd-new-milestone` | Inherits config from existing project |
| `/gsd-help` | Document new commands in reference |
| All spawning commands | No change - agents already have frontmatter |

### With Existing Agents

All 11 agents in `gsd-opencode/agents/` get frontmatter extension:
- gsd-codebase-mapper (researcher)
- gsd-debugger (worker)
- gsd-executor (worker)
- gsd-integration-checker (worker)
- gsd-phase-researcher (researcher)
- gsd-plan-checker (worker)
- gsd-planner (worker)
- gsd-project-researcher (researcher)
- gsd-research-synthesizer (researcher)
- gsd-roadmapper (worker)
- gsd-verifier (worker)

### With Existing Config

`.planning/config.json` already exists and is read by:
- execute-phase workflow (mode check)
- transition workflow (mode check)
- complete-milestone workflow (mode check)
- new-milestone command (inherits config)

**Backward compatibility:** Existing projects without `profiles` field use defaults. Commands check for presence and fall back gracefully.

## Build Order

Recommended implementation sequence based on dependencies:

### Phase 1: Schema & Storage (Foundation)

**Components:** Profile schema in config.json

**Tasks:**
1. Define profile schema structure
2. Define role-to-agent mapping
3. Create default profile definitions (balanced, economical, premium)
4. Document in references/model-profiles.md

**Dependencies:** None
**Enables:** All subsequent phases

### Phase 2: Settings Command

**Components:** `/gsd-settings` command

**Tasks:**
1. Create command markdown file with frontmatter
2. Implement read config.json and display logic
3. Implement modification flow via question tool
4. Implement config.json write
5. Add to help command reference

**Dependencies:** Phase 1 (needs schema)
**Enables:** User can view/modify settings

### Phase 3: Agent Rewriter Logic

**Components:** Frontmatter rewriting instructions

**Tasks:**
1. Define agent role classification
2. Write rewrite instructions for LLM
3. Test with single agent file
4. Generalize to all agents

**Dependencies:** Phase 1 (needs profile definitions)
**Enables:** Profiles affect actual model usage

### Phase 4: Set-Profile Command

**Components:** `/gsd-set-profile` command

**Tasks:**
1. Create command markdown file
2. Implement profile validation
3. Integrate agent rewriter from Phase 3
4. Implement commit logic
5. Add to help command reference

**Dependencies:** Phase 3 (needs rewriter)
**Enables:** Quick profile switching

### Phase 5: New-Project Integration

**Components:** Profile selection in `/gsd-new-project`

**Tasks:**
1. Add profile question in Phase 5
2. Create config.json with profile settings
3. Trigger initial agent rewrite if non-default profile
4. Update completion summary

**Dependencies:** Phase 4 (needs set-profile for initial write)
**Enables:** New projects start with chosen profile

### Dependency Graph

```
Phase 1 (Schema)
    ↓
    ├── Phase 2 (Settings Command)
    │
    └── Phase 3 (Agent Rewriter)
            ↓
        Phase 4 (Set-Profile Command)
            ↓
        Phase 5 (New-Project Integration)
```

**Wave Structure:**
- Wave 1: Phase 1 (foundation)
- Wave 2: Phase 2, Phase 3 (parallel - no dependency between them)
- Wave 3: Phase 4 (depends on Phase 3)
- Wave 4: Phase 5 (depends on Phase 4)

## Architectural Patterns

### Pattern 1: Config Extension

**What:** Add new fields to existing config.json rather than new files.
**When:** New feature is project-scoped configuration.
**Why:** Single source of truth, existing read/write patterns work.

```json
// Existing
{ "mode": "...", "depth": "..." }

// Extended
{ "mode": "...", "depth": "...", "profiles": { ... } }
```

### Pattern 2: Command-as-Orchestrator

**What:** Commands coordinate work by spawning agents or issuing instructions.
**When:** Multi-step operations with user interaction.
**Why:** Matches existing GSD architecture, keeps agents focused.

```markdown
<!-- Command pattern -->
---
name: gsd-settings
---

<process>
1. Read config
2. Display to user
3. Get selection via question tool
4. Update config
5. If profile changed, rewrite agents
</process>
```

### Pattern 3: Frontmatter-as-Configuration

**What:** Agent behavior controlled by YAML frontmatter at file top.
**When:** Per-agent settings that vary between agents.
**Why:** Self-contained, readable, follows OpenCode conventions.

```yaml
---
name: gsd-executor
model:
  provider: anthropic
  model: claude-sonnet-4-20250514
---
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: External Schema Files

**What:** Creating separate JSON schema files that commands reference.
**Why bad:** Adds indirection, version sync issues, not needed for this scope.
**Instead:** Inline schema in config.json, document in reference file.

### Anti-Pattern 2: Runtime Profile Resolution

**What:** Resolving profile → model mapping at agent spawn time.
**Why bad:** Would require modifying all spawn points, complex.
**Instead:** Rewrite agent files when profile changes. Agents are self-contained.

### Anti-Pattern 3: Per-Agent Profile Configuration

**What:** Letting users set model per individual agent (11 settings).
**Why bad:** Too granular, cognitive overload, most users want role-based.
**Instead:** Role-based assignment (3 roles), with escape hatch to custom profiles.

### Anti-Pattern 4: Mutable Shared State

**What:** Storing active profile in memory or session state.
**Why bad:** Context resets lose state, doesn't survive `/new`.
**Instead:** All state in config.json, read on each command invocation.

## Scalability Considerations

| Concern | Current Design | Future Scaling |
|---------|----------------|----------------|
| Number of agents | 11 agents, rewrite all on profile change | Batch in single commit, fast |
| Number of profiles | 3 presets + custom | Unlimited custom definitions |
| Provider diversity | anthropic hardcoded in examples | Schema supports any provider |
| Model versioning | Explicit model IDs | Users update config.json |

## Edge Cases

### No config.json Exists

**Scenario:** User runs `/gsd-set-profile` before `/gsd-new-project`.
**Handling:** Command creates config.json with defaults + requested profile.

### Profile Referenced Doesn't Exist

**Scenario:** User types `/gsd-set-profile premium-turbo` (typo).
**Handling:** Command validates against definitions, shows available profiles.

### Agent File Missing Model Field

**Scenario:** New agent added without model frontmatter.
**Handling:** Rewriter adds field if missing, updates if present.

### Backward Compatibility

**Scenario:** Existing project has config.json without profiles section.
**Handling:** Commands check for presence, use hardcoded defaults if missing.

## Sources

- Direct codebase analysis of gsd-opencode structure
- Existing command patterns: `/gsd-new-project`, `/gsd-help`
- Existing agent patterns: all 11 agents in `gsd-opencode/agents/`
- Existing config patterns: `.planning/config.json` usage
- OpenCode agent frontmatter conventions
