---
name: gsd-audit-uat
description: Cross-phase audit of all outstanding UAT and verification items
permissions:
   read: true
   glob: true
   grep: true
   bash: true
---
<objective>
Scan all phases for pending, skipped, blocked, and human_needed UAT items. Cross-reference against codebase to detect stale documentation. Produce prioritized human test plan.
</objective>

<execution_context>
@$HOME/.config/opencode/get-shit-done/workflows/audit-uat.md
</execution_context>

<context>
Core planning files are loaded in-workflow via CLI.

**Scope:**
glob: .planning/phases/*/*-UAT.md
glob: .planning/phases/*/*-VERIFICATION.md
</context>
