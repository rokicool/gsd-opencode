---
name: gsd-spike-wrap-up
description: Package spike findings into a persistent project skill for future build conversations
permissions:
   read: true
   write: true
   edit: true
   bash: true
   grep: true
   glob: true
   question: true
---
<objective>
Curate spike experiment findings and package them into a persistent project skill that OpenCode
auto-loads in future build conversations. Also writes a summary to `.planning/spikes/` for
project history. Output skill goes to `./.OpenCode/skills/spike-findings-[project]/` (project-local).
</objective>

<execution_context>
@$HOME/.config/opencode/get-shit-done/workflows/spike-wrap-up.md
@$HOME/.config/opencode/get-shit-done/references/ui-brand.md
</execution_context>

<runtime_note>
**Copilot (VS Code):** Use `vscode_askquestions` wherever this workflow calls `question`.
</runtime_note>

<process>
Execute the spike-wrap-up workflow from @$HOME/.config/opencode/get-shit-done/workflows/spike-wrap-up.md end-to-end.
Preserve all curation gates (per-spike review, grouping approval, AGENTS.md routing line).
</process>
