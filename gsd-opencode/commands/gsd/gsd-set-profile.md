---
name: gsd-set-profile
description: Switch model profile for GSD agents (simple/smart/custom)
argument-hint: <profile>
allowed-tools:
  - read
  - write
  - bash
---

<objective>
Switch the model profile used by GSD agents. Controls which OpenCode model each agent uses, balancing quality vs token spend.

Routes to the set-profile workflow which handles:
- Argument validation (simple/smart/custom)
- Config file creation if missing
- Profile update in config.json
- Confirmation with model table display
</objective>

<execution_context>
@~/.config/opencode/get-shit-done/workflows/oc-set-profile.md
</execution_context>

<process>
**Follow the set-profile workflow** from `@~/.config/opencode/get-shit-done/workflows/oc-set-profile.md`.

The workflow handles all logic including:
1. Profile argument validation
2. Config file ensuring
3. Config reading and updating
4. Model table generation from MODEL_PROFILES
5. Confirmation display
</process>
