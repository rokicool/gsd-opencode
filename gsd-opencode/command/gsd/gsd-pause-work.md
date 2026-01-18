---
description: Create context handoff when pausing work mid-phase
tools:
  read: true
  write: true
  bash: true
---

<objective>
Create `.continue-here.md` handoff file to preserve complete work state across sessions.

Enables seamless resumption in fresh session with full context restoration.
</objective>

<context>
@.planning/STATE.md
</context>

<process>

<step name="detect">
Find current phase directory from most recently modified files.
</step>

<step name="gather">
**Collect complete state for handoff:**

1. **Current position**: Which phase, which plan, which task
2. **Work completed**: What got done this session
3. **Work remaining**: What's left in current plan/phase
4. **Decisions made**: Key decisions and rationale
5. **Blockers/issues**: Anything stuck
6. **Mental context**: The approach, next steps, "vibe"
7. **Files modified**: What's changed but not committed

Ask user for clarifications if needed.
</step>

<step name="write">
**Write handoff to `.planning/phases/XX-name/.continue-here.md`:**

```markdown
---
phase: XX-name
task: 3
total_tasks: 7
status: in_progress
last_updated: [timestamp]
---

<current_state>
[Where exactly are we? Immediate context]
</current_state>

<completed_work>

- Task 1: [name] - Done
- Task 2: [name] - Done
- Task 3: [name] - In progress, [what's done]
  </completed_work>

<remaining_work>

- Task 3: [what's left]
- Task 4: Not started
- Task 5: Not started
  </remaining_work>

<decisions_made>

- Decided to use [X] because [reason]
- Chose [approach] over [alternative] because [reason]
  </decisions_made>

<blockers>
- [Blocker 1]: [status/workaround]
</blockers>

<context>
[Mental state, what were you thinking, plan]
</context>

<next_action>
Start with: [specific first action when resuming]
</next_action>
```

Be specific enough for a fresh Claude to understand immediately.
</step>

<step name="commit">
```bash
git add .planning/phases/*/.continue-here.md
git commit -m "wip: [phase-name] paused at task [X]/[Y]"
```
</step>

<step name="confirm">
```
✓ Handoff created: .planning/phases/[XX-name]/.continue-here.md

Current state:

- Phase: [XX-name]
- Task: [X] of [Y]
- Status: [in_progress/blocked]
- Committed as WIP

To resume: /gsd-resume-work

```
</step>

</process>

<success_criteria>
- [ ] .continue-here.md created in correct phase directory
- [ ] All sections filled with specific content
- [ ] Committed as WIP
- [ ] User knows location and how to resume
</success_criteria>
```

---

<success_criteria>
- [ ] Phase validated as future/unstarted
- [ ] Phase directory deleted (if existed)
- [ ] All subsequent phase directories renumbered
- [ ] Files inside directories renamed ({old}-01-PLAN.md → {new}-01-PLAN.md)
- [ ] ROADMAP.md updated (section removed, all references renumbered)
- [ ] STATE.md updated (phase count, progress percentage)
- [ ] Dependency references updated in subsequent phases
- [ ] Changes committed with descriptive message
- [ ] No gaps in phase numbering
- [ ] User informed of changes
</success_criteria>

<edge_cases>

**Removing a decimal phase (e.g., 17.1):**
- Only affects other decimals in same series (17.2 → 17.1, 17.3 → 17.2)
- Integer phases unchanged
- Simpler operation

**No subsequent phases to renumber:**
- Removing the last phase (e.g., Phase 20 when that's the end)
- Just delete and update ROADMAP.md, no renumbering needed

**Phase directory doesn't exist:**
- Phase may be in ROADMAP.md but directory not created yet
- Skip directory deletion, proceed with ROADMAP.md updates

**Decimal phases under removed integer:**
- Removing Phase 17 when 17.1, 17.2 exist
- 17.1 → 16.1, 17.2 → 16.2
- They maintain their position in execution order (after current last integer)

</edge_cases>
