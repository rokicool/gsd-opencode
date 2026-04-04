---
name: gsd-discuss-phase
description: Gather phase context through adaptive questioning before planning. Use --auto to skip interactive questions (OpenCode picks recommended defaults). Use --chain for interactive discuss followed by automatic plan+execute. Use --power for bulk question generation into a file-based UI (answer at your own pace).
argument-hint: "<phase> [--auto] [--chain] [--batch] [--analyze] [--text] [--power]"
permissions:
   read: true
   write: true
   bash: true
   glob: true
   grep: true
   question: true
   task: true
   mcp__context7__resolve-library-id: true
   mcp__context7__query-docs: true
---

<objective>
Extract implementation decisions that downstream agents need — researcher and planner will use CONTEXT.md to know what to investigate and what choices are locked.

**How it works:**
1. Load prior context (PROJECT.md, REQUIREMENTS.md, STATE.md, prior CONTEXT.md files)
2. Scout codebase for reusable assets and patterns
3. Analyze phase — skip gray areas already decided in prior phases
4. Present remaining gray areas — user selects which to discuss
5. Deep-dive each selected area until satisfied
6. Create CONTEXT.md with decisions that guide research and planning

**Output:** `{phase_num}-CONTEXT.md` — decisions clear enough that downstream agents can act without asking the user again
</objective>

<execution_context>
@$HOME/.config/opencode/get-shit-done/workflows/discuss-phase.md
@$HOME/.config/opencode/get-shit-done/workflows/discuss-phase-assumptions.md
@$HOME/.config/opencode/get-shit-done/workflows/discuss-phase-power.md
@$HOME/.config/opencode/get-shit-done/templates/context.md
</execution_context>

<runtime_note>
**Copilot (VS Code):** Use `vscode_askquestions` wherever this workflow calls `question`. They are equivalent — `vscode_askquestions` is the VS Code Copilot implementation of the same interactive question API.
</runtime_note>

<context>
Phase number: $ARGUMENTS (required)

Context files are resolved in-workflow using `init phase-op` and roadmap/state tool calls.
</context>

<process>
**Mode routing:**
```bash
DISCUSS_MODE=$(node "$HOME/.config/opencode/get-shit-done/bin/gsd-tools.cjs" config-get workflow.discuss_mode 2>/dev/null || echo "discuss")
```

If `DISCUSS_MODE` is `"assumptions"`: read and execute @$HOME/.config/opencode/get-shit-done/workflows/discuss-phase-assumptions.md end-to-end.

If `DISCUSS_MODE` is `"discuss"` (or unset, or any other value): read and execute @$HOME/.config/opencode/get-shit-done/workflows/discuss-phase.md end-to-end.

**MANDATORY:** The execution_context files listed above ARE the instructions. read the workflow file BEFORE taking any action. The objective and success_criteria sections in this command file are summaries — the workflow file contains the complete step-by-step process with all required behaviors, config checks, and interaction patterns. Do not improvise from the summary.
</process>

<success_criteria>
- Prior context loaded and applied (no re-asking decided questions)
- Gray areas identified through intelligent analysis
- User chose which areas to discuss
- Each selected area explored until satisfied
- Scope creep redirected to deferred ideas
- CONTEXT.md captures decisions, not vague vision
- User knows next steps
</success_criteria>
