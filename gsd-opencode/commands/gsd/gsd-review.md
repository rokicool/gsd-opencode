---
name: gsd-review
description: Request cross-AI peer review of phase plans from external AI CLIs
argument-hint: "--phase N [--gemini] [--OpenCode] [--codex] [--all]"
permissions:
   read: true
   write: true
   bash: true
   glob: true
   grep: true
---

<objective>
Invoke external AI CLIs (Gemini, OpenCode, Codex) to independently review phase plans.
Produces a structured REVIEWS.md with per-reviewer feedback that can be fed back into
planning via /gsd-plan-phase --reviews.

**Flow:** Detect CLIs → Build review prompt → Invoke each CLI → Collect responses → write REVIEWS.md
</objective>

<execution_context>
@$HOME/.config/opencode/get-shit-done/workflows/review.md
</execution_context>

<context>
Phase number: extracted from $ARGUMENTS (required)

**Flags:**
- `--gemini` — Include Gemini CLI review
- `--OpenCode` — Include OpenCode CLI review (uses separate session)
- `--codex` — Include Codex CLI review
- `--all` — Include all available CLIs
</context>

<process>
Execute the review workflow from @$HOME/.config/opencode/get-shit-done/workflows/review.md end-to-end.
</process>
