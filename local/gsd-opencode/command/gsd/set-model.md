---
name: gsd-set-model
description: Configure models for a specific profile's stages (planning/execution/verification)
arguments:
  - name: profile
    description: "Profile name: quality, balanced, or budget (optional - will prompt if not provided)"
    required: false
agent: gsd-set-model
tools:
  - read
  - write
  - bash
  - question
---

<objective>
Configure the models assigned to each stage (planning, execution, verification) for a specific profile.

Unlike `/gsd-set-profile` which switches between profiles, this command lets you define *what models* a profile uses. Implementation lives in the `gsd-set-model` agent.
</objective>

<process>

Run the model configuration flow using the `gsd-set-model` agent.

</process>

<examples>

**Configure the balanced profile:**

```text
/gsd-set-model balanced

Configuring models for: balanced

Select model for Planning stage:
> anthropic/claude-sonnet-4-20250514

Select model for Execution stage:
> anthropic/claude-sonnet-4-20250514

Select model for Verification stage:
> openai/gpt-4o-mini

✓ Updated balanced profile:
| Stage | Model |
|-------|-------|
| planning | anthropic/claude-sonnet-4-20250514 |
| execution | anthropic/claude-sonnet-4-20250514 |
| verification | openai/gpt-4o-mini |
```

**Interactive mode (no argument):**

```text
/gsd-set-model

Which profile do you want to configure?
> Balanced

Configuring models for: balanced
...
```

</examples>

<success_criteria>

- [ ] `.planning/config.json` exists (or clear error shown)
- [ ] User selects a profile (or provides via argument)
- [ ] User selects models for all three stages from available models
- [ ] Profile preset is updated in `.planning/config.json`
- [ ] `opencode.json` is regenerated if the modified profile is active
- [ ] Clear confirmation shown with updated model assignments

</success_criteria>
