---
name: gsd-scan
description: Rapid codebase assessment — lightweight alternative to /gsd-map-codebase
permissions:
   read: true
   write: true
   bash: true
   grep: true
   glob: true
  - Agent
   question: true
---
<objective>
Run a focused codebase scan for a single area, producing targeted documents in `.planning/codebase/`.
Accepts an optional `--focus` flag: `tech`, `arch`, `quality`, `concerns`, or `tech+arch` (default).

Lightweight alternative to `/gsd-map-codebase` — spawns one mapper agent instead of four parallel ones.
</objective>

<execution_context>
@$HOME/.config/opencode/get-shit-done/workflows/scan.md
</execution_context>

<process>
Execute the scan workflow from @$HOME/.config/opencode/get-shit-done/workflows/scan.md end-to-end.
</process>
