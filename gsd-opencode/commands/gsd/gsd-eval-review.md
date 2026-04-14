---
name: gsd-eval-review
description: Retroactively audit an executed AI phase's evaluation coverage — scores each eval dimension as COVERED/PARTIAL/MISSING and produces an actionable EVAL-REVIEW.md with remediation plan
argument-hint: "[phase number]"
permissions:
   read: true
   write: true
   bash: true
   glob: true
   grep: true
   task: true
   question: true
---
<objective>
Conduct a retroactive evaluation coverage audit of a completed AI phase.
Checks whether the evaluation strategy from AI-SPEC.md was implemented.
Produces EVAL-REVIEW.md with score, verdict, gaps, and remediation plan.
</objective>

<execution_context>
@$HOME/.config/opencode/get-shit-done/workflows/eval-review.md
@$HOME/.config/opencode/get-shit-done/references/ai-evals.md
</execution_context>

<context>
Phase: $ARGUMENTS — optional, defaults to last completed phase.
</context>

<process>
Execute @$HOME/.config/opencode/get-shit-done/workflows/eval-review.md end-to-end.
Preserve all workflow gates.
</process>
