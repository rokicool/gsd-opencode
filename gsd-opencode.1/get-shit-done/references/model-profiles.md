# Model Profiles

Model profiles control which OpenCode model each GSD agent uses. This allows balancing quality vs token spend.

## Stage-to-Agent Mapping

Agents are grouped by stage. Each profile assigns a model to each stage:

| Stage | Agents |
|-------|--------|
| Planning | gsd-planner, gsd-plan-checker, gsd-phase-researcher, gsd-roadmapper, gsd-project-researcher, gsd-research-synthesizer, gsd-codebase-mapper |
| Execution | gsd-executor, gsd-debugger |
| Verification | gsd-verifier, gsd-integration-checker, gsd-set-profile, gsd-settings |

## Profile Configuration

Models are **user-configured**, not hardcoded. OpenCode supports multiple providers (Anthropic, OpenAI, local models, etc.), so available models vary per installation.

On first run, `/gsd-settings` runs the **Preset Setup Wizard**:

1. Queries `opencode models` to discover available models
2. Prompts user to select models for each profile/stage combination
3. Saves to `.planning/config.json`

Configuration structure:

```json
{
  "profiles": {
    "active_profile": "balanced",
    "presets": {
      "quality": { "planning": "...", "execution": "...", "verification": "..." },
      "balanced": { "planning": "...", "execution": "...", "verification": "..." },
      "budget": { "planning": "...", "execution": "...", "verification": "..." }
    }
  }
}
```

## Profile Philosophy

When configuring presets, consider these guidelines:

**quality** - Maximum reasoning power

- Use your most capable model for all stages
- Use when: quota available, critical architecture work

**balanced** (default) - Smart allocation

- Strong model for planning (where architecture decisions happen)
- Mid-tier model for execution (follows explicit instructions)
- Mid-tier model for verification (needs reasoning, not just pattern matching)
- Use when: normal development, good balance of quality and cost

**budget** - Minimal token spend

- Mid-tier model for anything that writes code
- Lightweight model for research and verification
- Use when: conserving quota, high-volume work, less critical phases

## Resolution Logic

Orchestrators resolve model before spawning:

```text
1. Read .planning/config.json
2. Get active_profile (default: "balanced")
3. Look up preset[profile][stage] for the agent's stage
4. Apply any custom_overrides[profile][stage] if set
5. Pass model parameter to Task call
```

Agent-to-model mappings are written to `opencode.json` by `/gsd-set-profile` and `/gsd-settings`.

## Switching Profiles

Runtime: `/gsd-set-profile <profile>`

Interactive settings: `/gsd-settings`

Per-project default stored in `.planning/config.json`:

```json
{
  "profiles": {
    "active_profile": "balanced"
  }
}
```

## Design Rationale

**Why use your strongest model for planning?**
Planning involves architecture decisions, goal decomposition, and task design. This is where model quality has the highest impact.

**Why mid-tier for execution?**
Executors follow explicit PLAN.md instructions. The plan already contains the reasoning; execution is implementation.

**Why mid-tier (not lightweight) for verification?**
Verification requires goal-backward reasoning - checking if code *delivers* what the phase promised, not just pattern matching. Mid-tier models handle this well; lightweight models may miss subtle gaps.

**Why lightweight for codebase mapping?**
Read-only exploration and pattern extraction. No complex reasoning required, just structured output from file contents.
