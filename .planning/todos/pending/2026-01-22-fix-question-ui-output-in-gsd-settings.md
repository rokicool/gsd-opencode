---
created: 2026-01-22T02:16
title: Fix Question UI output in gsd-settings
area: tooling
files:
  - gsd-opencode/command/gsd/settings.md
  - gsd-opencode/agents/gsd-settings.md
  - gsd-opencode/command/gsd/set-profile.md
  - gsd-opencode/agents/gsd-set-profile.md
---

## Problem

The interactive Question-tool UX for `/gsd-settings` (and related profile flows) sometimes renders as plain text transcripts (e.g. `# Questions`) and/or prints tool output that looks like it was meant to be UI (e.g. "Next: choose an action...").

In addition, the model selection UX for stage overrides must not be limited to a hardcoded list of OpenCode free models; users may have other providers enabled (e.g. GitHub Copilot) and need to enter arbitrary model IDs.

## Solution

TBD.

Investigate the most reliable Question-tool prompting pattern to:
- always render menus as selector UI (not plain text)
- avoid stray "next" prompts that look like UI
- support custom/freeform model ID entry for overrides
