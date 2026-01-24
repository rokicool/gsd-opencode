---
name: gsd-set-profile
description: Switch model profile for GSD agents (quality/balanced/budget)
arguments:
  - name: profile
    description: "Profile name: quality, balanced, or budget"
    required: true
agent: gsd-set-profile
tools:
  - read
  - write
  - bash
  - question
---

<objective>
Switch the project’s active model profile (quality/balanced/budget).

Implementation lives in the `gsd-set-profile` agent so we don’t duplicate the full switching/migration logic in multiple places.
</objective>

<process>

Run the profile switch using the `gsd-set-profile` agent.

After the agent reports success:

```
⚠️ OpenCode loads opencode.json at session start and does not hot-reload.
Run `/new` (or fully restart OpenCode) to apply this profile change.
```

</process>

<examples>

**Switch to budget profile:**

```text
/gsd-set-profile budget

✓ Active profile set to: budget

⚠️ OpenCode loads opencode.json at session start and does not hot-reload.
Run `/new` (or fully restart OpenCode) to apply this profile change.
```

**Switch to quality profile:**

```text
/gsd-set-profile quality

✓ Active profile set to: quality

⚠️ OpenCode loads opencode.json at session start and does not hot-reload.
Run `/new` (or fully restart OpenCode) to apply this profile change.
```

</examples>
