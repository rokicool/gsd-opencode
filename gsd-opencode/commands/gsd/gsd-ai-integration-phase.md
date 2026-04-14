---
name: gsd-ai-integration-phase
description: Generate AI design contract (AI-SPEC.md) for phases that involve building AI systems — framework selection, implementation guidance from official docs, and evaluation strategy
argument-hint: "[phase number]"
permissions:
   read: true
   write: true
   bash: true
   glob: true
   grep: true
   task: true
   webfetch: true
  - websearch
   question: true
   mcp__context7__*: true
---
<objective>
Create an AI design contract (AI-SPEC.md) for a phase involving AI system development.
Orchestrates gsd-framework-selector → gsd-ai-researcher → gsd-domain-researcher → gsd-eval-planner.
Flow: Select Framework → Research Docs → Research Domain → Design Eval Strategy → Done
</objective>

<execution_context>
@$HOME/.config/opencode/get-shit-done/workflows/ai-integration-phase.md
@$HOME/.config/opencode/get-shit-done/references/ai-frameworks.md
@$HOME/.config/opencode/get-shit-done/references/ai-evals.md
</execution_context>

<context>
Phase number: $ARGUMENTS — optional, auto-detects next unplanned phase if omitted.
</context>

<process>
Execute @$HOME/.config/opencode/get-shit-done/workflows/ai-integration-phase.md end-to-end.
Preserve all workflow gates.
</process>
