---
name: gsd-sketch
description: Sketch UI/design ideas with throwaway HTML mockups, or propose what to sketch next (frontier mode)
argument-hint: "[design idea to explore] [--quick] [--text] or [frontier]"
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
Explore design directions through throwaway HTML mockups before committing to implementation.
Each sketch produces 2-3 variants for comparison. Sketches live in `.planning/sketches/` and
integrate with GSD commit patterns, state tracking, and handoff workflows. Loads spike
findings to ground mockups in real data shapes and validated interaction patterns.

Two modes:
- **Idea mode** (default) — describe a design idea to sketch
- **Frontier mode** (no argument or "frontier") — analyzes existing sketch landscape and proposes consistency and frontier sketches

Does not require `/gsd-new-project` — auto-creates `.planning/sketches/` if needed.
</objective>

<execution_context>
@$HOME/.config/opencode/get-shit-done/workflows/sketch.md
@$HOME/.config/opencode/get-shit-done/references/ui-brand.md
@$HOME/.config/opencode/get-shit-done/references/sketch-theme-system.md
@$HOME/.config/opencode/get-shit-done/references/sketch-interactivity.md
@$HOME/.config/opencode/get-shit-done/references/sketch-tooling.md
@$HOME/.config/opencode/get-shit-done/references/sketch-variant-patterns.md
</execution_context>

<runtime_note>
**Copilot (VS Code):** Use `vscode_askquestions` wherever this workflow calls `question`.
</runtime_note>

<context>
Design idea: $ARGUMENTS

**Available flags:**
- `--quick` — Skip mood/direction intake, jump straight to decomposition and building. Use when the design direction is already clear.
</context>

<process>
Execute the sketch workflow from @$HOME/.config/opencode/get-shit-done/workflows/sketch.md end-to-end.
Preserve all workflow gates (intake, decomposition, target stack research, variant evaluation, MANIFEST updates, commit patterns).
</process>
