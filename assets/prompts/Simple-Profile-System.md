# Phase 12: Simple Profiles System - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

A profile system for OpenCode that lets users configure model assignments based on complexity level (1/2/3 models), replacing the Cloud Code-oriented quality/balanced/budget system. Uses the existing `gsd-oc-select-model` skill for interactive model discovery.

</domain>

<decisions>
## Implementation Decisions

### Profile Types

Three profile types with clear progression:

| Profile | Models | Model Assignment |
|---------|--------|------------------|
| **Simple** | 1 | Same model for all stages |
| **Smart** | 2 | Advanced → Planning + Execution, Less Advanced → Verification |
| **Custom** | 3 | User assigns to Planning / Execution / Verification |

Names: Simple / Smart / Custom (not Simple/Normal/Advanced)

### First-Run Setup

**Wizard triggers:**
- `/gsd-settings` command
- `/gsd-new-project` command
- First `/gsd-set-profile` call (when no config exists)

**Default behavior:**
- If config exists but no profile set → default to Simple profile

### Switching Profiles

**UI approach:** Both
- `/gsd-set-profile <name>` — direct switch (simple/smart/custom)
- `/gsd-set-profile` (no args) — interactive picker

**Model handling on switch:**
- Offer both options:
  1. "Reconfigure from scratch" — full wizard for new profile type
  2. "Keep existing model(s) where possible" — reuse configured models, only prompt for new ones needed

### Migration Path

**Auto-migrate old configs:**
- Detect old format (quality/balanced/budget preset names)
- Convert to Custom profile (already has 3 models configured)
- Map old `active_profile: balanced` → `profile_type: custom`

**No user prompt for migration** — automatic conversion preserves existing model assignments.

### Translation Support

When migrating files from Cloud Code to OpenCode using `translate.js`, include profile system conversion rules:

**Config file** (`profile-migration.json`):
```json
{
  "patterns": ["**/*.md", "**/*.json"],
  "exclude": ["node_modules/**", ".git/**"],
  "rules": [
    {"pattern": "quality", "replacement": "simple", "caseSensitive": false},
    {"pattern": "balanced", "replacement": "smart", "caseSensitive": false},
    {"pattern": "budget", "replacement": "custom", "caseSensitive": false},
    {"pattern": "Quality", "replacement": "Simple", "caseSensitive": true},
    {"pattern": "Balanced", "replacement": "Smart", "caseSensitive": true},
    {"pattern": "Budget", "replacement": "Custom", "caseSensitive": true}
  ]
}
```

**Run translation:**
```bash
# Preview changes
node bin/translate.js profile-migration.json

# Apply changes
node bin/translate.js profile-migration.json --apply
```

**Included in 1-20-5.json:** The conversion rules are already included in `assets/configs/1-20-5.json` for automatic translation when copying from original Cloud Code files.

### The assistant's Discretion

- Exact wizard UI text and flow
- Error messages for invalid model selections
- Confirmation message format after profile switch
- How to display current profile status

</decisions>

<specifics>
## Specific Ideas

- "Smart" profile implies intelligent allocation — smart model for thinking (planning+execution), cheaper model for verification
- Profile names describe user intent, not complexity level
- Stage names remain Planning/Execution/Verification (existing GSD terminology)
- Use existing `gsd-oc-select-model` skill for all model selections

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-simple-profiles-system*
*Context gathered: 2026-02-21*
