---
name: gsd-set-profile
description: Switch model profile for GSD agents (simple/smart/custom)
arguments:
  - name: profile
    description: "Profile type: simple, smart, or custom"
    required: false
  - name: options
    description: "--reuse to keep existing models, --wizard for interactive setup"
    required: false
agent: gsd-set-profile
tools:
  - read
  - write
  - bash
  - question
---

<objective>
Switch the project's active model profile (simple/smart/custom).

The new profile system:
- **Simple**: 1 model for all stages (planning + execution + verification)
- **Smart**: 2 models (planning+execution use same model, verification uses different)
- **Custom**: 3 models (each stage can have different model)

Implementation lives in the `gsd-set-profile` agent.
</objective>

<process>

Run the profile switch using the `gsd-set-profile` agent.

</process>

<examples>

**Switch to simple profile (interactive model selection):**

```text
/gsd-set-profile simple

✓ Active profile set to: simple
All stages will use: opencode/glm-4.7-free
```

**Switch to smart profile with model reuse:**

```text
/gsd-set-profile smart --reuse

Current models:
- Planning: opencode/glm-4.7-free
- Execution: opencode/minimax-m2.1-free
- Verification: opencode/glm-4.7-free

Smart profile will:
- Use opencode/glm-4.7-free for Planning+Execution
- Use opencode/glm-4.7-free for Verification

✓ Active profile set to: smart
```

**Run interactive wizard (no args):**

```text
/gsd-set-profile

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PROFILE SETUP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Select profile type:
- Simple: 1 model for all stages
- Smart: 2 models (advanced for planning+execution, cheaper for verification)
- Custom: 3 models (full control per stage)
```

</examples>
