# Phase 6: Settings Command - Context

**Gathered:** 2026-01-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement `/gsd-settings` so users can:
- View the current active profile and the effective model used for each stage (planning/execution/verification)
- Interactively change the active profile
- Interactively configure per-stage model overrides

Out of scope for this phase: new capabilities beyond settings management (e.g., per-agent overrides, editing preset definitions).

</domain>

<decisions>
## Implementation Decisions

### Settings display layout
- Default output is a stage summary (planning/execution/verification), not a full per-agent listing.
- Overrides are indicated inline with a `*` marker next to the effective model, with a small legend explaining `* = overridden`.
- `/gsd-settings` always shows the action menu immediately after printing the current settings.
- Output includes the config file path (`.planning/config.json`) and notes that it is editable.

### Interactive flow + menu shape
- Menu-driven interaction (not a mandatory wizard).
- The command loops until the user chooses Exit, so multiple changes can be made in one run.
- Changing the active profile shows a preview of the resulting stage model assignments and requires confirmation before applying.
- Editing overrides starts by selecting a stage (planning/execution/verification), then picking the model.

### Override configuration UX
- Overrides are per-stage only (planning/execution/verification), not per-agent.
- Override model selection uses a picker from a known model list (source of the list is OpenCode's discretion).
- Users can clear an override for a specific stage (per-stage clear).
- Overrides are scoped per profile:
  - While on `quality`, editing overrides changes the override set for `quality`
  - Switching to `balanced` should not carry over overrides from `quality`

### Confirm + save behavior
- Persist changes to `.planning/config.json` after each confirmed action (no "save on exit" batching).
- When changing an override, show old vs new for that stage and ask for confirmation.
- Cancel/back-out during an edit discards that edit and returns to the menu.
- After a successful change, reprint the settings table and show a short "Saved" confirmation.

### OpenCode's Discretion
- Whether to add a "reset all overrides for this profile" action (user explicitly left this up to OpenCode).
- How to handle any legacy config shape that used a single global override map when moving to per-profile overrides (e.g., migration vs error).
- Exact contents and ordering of the "known model" picker list.

</decisions>

<specifics>
## Specific Ideas

- Override visibility relies on a `*` marker in the settings table rather than a separate "Overrides: none" line.
- Overrides should feel "tied to the profile" (switching profiles should not surprise the user by carrying overrides across).

</specifics>

<deferred>
## Deferred Ideas

- Per-agent overrides (instead of per-stage only) would be a new capability and belongs in a future phase/backlog item.

</deferred>

---

*Phase: 06-settings-command*
*Context gathered: 2026-01-21*
