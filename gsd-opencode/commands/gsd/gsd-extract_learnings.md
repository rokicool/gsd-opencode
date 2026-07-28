---
name: gsd-extract-learnings
description: Extract decisions, lessons, patterns, and surprises from completed phase artifacts
argument-hint: "<phase-number>"
permissions:
   read: true
   write: true
   bash: true
   grep: true
   glob: true
type: prompt
---
<objective>
Extract structured learnings from completed phase artifacts (PLAN.md, SUMMARY.md, VERIFICATION.md, UAT.md, STATE.md) into a LEARNINGS.md file that captures decisions, lessons learned, patterns discovered, and surprises encountered.
</objective>

<execution_context>
@$HOME/.config/opencode/get-shit-done/workflows/extract_learnings.md
</execution_context>

Execute the extract-learnings workflow from @$HOME/.config/opencode/get-shit-done/workflows/extract_learnings.md end-to-end.
