---
name: gsd-spike
description: Spike an idea through experiential exploration, or propose what to spike next (frontier mode)
argument-hint: "[idea to validate] [--quick] [--text] or [frontier]"
permissions:
   read: true
   write: true
   edit: true
   bash: true
   grep: true
   glob: true
   question: true
   websearch: true
   webfetch: true
   mcp__context7__resolve-library-id: true
   mcp__context7__query-docs: true
---
<objective>
Spike an idea through experiential exploration — build focused experiments to feel the pieces
of a future app, validate feasibility, and produce verified knowledge for the real build.
Spikes live in `.planning/spikes/` and integrate with GSD commit patterns, state tracking,
and handoff workflows.

Two modes:
- **Idea mode** (default) — describe an idea to spike
- **Frontier mode** (no argument or "frontier") — analyzes existing spike landscape and proposes integration and frontier spikes

Does not require `/gsd-new-project` — auto-creates `.planning/spikes/` if needed.
</objective>

<execution_context>
@$HOME/.config/opencode/get-shit-done/workflows/spike.md
@$HOME/.config/opencode/get-shit-done/references/ui-brand.md
</execution_context>

<runtime_note>
**Copilot (VS Code):** Use `vscode_askquestions` wherever this workflow calls `question`.
</runtime_note>

<context>
Idea: $ARGUMENTS

**Available flags:**
- `--quick` — Skip decomposition/alignment, jump straight to building. Use when you already know what to spike.
- `--text` — Use plain-text numbered lists instead of question (for non-OpenCode runtimes).
</context>

<process>
Execute the spike workflow from @$HOME/.config/opencode/get-shit-done/workflows/spike.md end-to-end.
Preserve all workflow gates (prior spike check, decomposition, research, risk ordering, observability assessment, verification, MANIFEST updates, commit patterns).
</process>
