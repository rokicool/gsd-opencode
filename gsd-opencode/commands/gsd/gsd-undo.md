---
name: gsd-undo
description: "Safe git revert. Roll back phase or plan commits using the phase manifest with dependency checks."
argument-hint: "--last N | --phase NN | --plan NN-MM"
permissions:
   read: true
   bash: true
   glob: true
   grep: true
   question: true
---

<objective>
Safe git revert — roll back GSD phase or plan commits using the phase manifest, with dependency checks and a confirmation gate before execution.

Three modes:
- **--last N**: Show recent GSD commits for interactive selection
- **--phase NN**: Revert all commits for a phase (manifest + git log fallback)
- **--plan NN-MM**: Revert all commits for a specific plan
</objective>

<execution_context>
@$HOME/.config/opencode/get-shit-done/workflows/undo.md
@$HOME/.config/opencode/get-shit-done/references/ui-brand.md
@$HOME/.config/opencode/get-shit-done/references/gate-prompts.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
Execute the undo workflow from @$HOME/.config/opencode/get-shit-done/workflows/undo.md end-to-end.
</process>
