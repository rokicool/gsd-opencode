---
name: gsd-settings
description: Configure GSD model profiles and workflow settings
agent: gsd-settings
tools:
  - read
  - write
  - bash
  - question
---

<objective>
Open an interactive settings menu.

This delegates the implementation to the `gsd-settings` agent, which manages `.planning/config.json` and regenerates `opencode.json` when needed.
</objective>

<process>

Run the interactive settings flow using the `gsd-settings` agent.

After changes are saved:

```
⚠️ OpenCode loads opencode.json at session start and does not hot-reload.
Run `/new` (or fully restart OpenCode) to apply changes.
```

</process>

<success_criteria>

- [ ] `.planning/` is validated as an existing GSD project (or a clear error is shown)
- [ ] Current settings are displayed (active profile, effective models, workflow toggles)
- [ ] User can update profile and workflow toggles via interactive UI
- [ ] Updates are persisted to `.planning/config.json`
- [ ] `opencode.json` is regenerated/updated to reflect effective models
- [ ] A clear confirmation is shown ("GSD ► SETTINGS UPDATED")
- [ ] User is warned that `/new` (or restart) is required to apply changes in the current session

</success_criteria>
