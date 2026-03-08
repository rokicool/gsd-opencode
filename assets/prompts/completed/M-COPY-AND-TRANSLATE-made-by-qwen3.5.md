# M-COPY-AND-TRANSLATE: Get-Shit-Done System Migration

## Overview

This prompt migrates the Get-Shit-Done system from the original TACHES repository (`original/get-shit-done`) to the OpenCode adaptation (`gsd-opencode/`).

**Three-phase workflow:**
1. **Copy** - Sync files from original repository
2. **Translate** - Convert Claude Code artifacts to OpenCode
3. **Validate** - Check for forbidden strings/antipatterns

---

## Prerequisites

Before executing, ensure:

```bash
# 1. Initialize git submodule
git submodule update --init --recursive

# 2. Install dependencies
cd assets && npm install && cd ..
```

---

## Phase 1: Copy Files from Original

### Goal
Copy all Get-Shit-Done system files from `original/get-shit-done` to `gsd-opencode/`.

### Command

```bash
# Preview first (shows what will be copied)
node assets/bin/gsd-copy-from-original.js

# Apply changes (actually copy files)
node assets/bin/gsd-copy-from-original.js --apply
```

### Protection Rules
Files with `oc-` or `-oc-` in the name are **automatically preserved** by the copy service. Do not manually override.

### Success Criteria
- ✅ Submodule initialized at correct commit
- ✅ All files in mapping copied (agents/, commands/gsd/, get-shit-done/{references,templates,workflows}/)
- ✅ No binary files copied (automatically skipped)
- ✅ Backup created in `.planning/backups/`

### Expected Output
```
🔄 Copy from Original

✓ Submodule initialized
✓ Submodule at 131f24b (v1.20.5)
✓ Found 108 files with differences
✓ Copied 108 files:
  - agents/gsd-codebase-mapper.md
  - agents/gsd-debugger.md
  - commands/gsd/execute-phase.md
  ... and 105 more

✓ Sync complete
```

### Evidence to Collect
1. Submodule commit hash and version
2. Number of files copied
3. List of orphaned files (OpenCode-specific additions preserved)
4. Backup location

---

## Phase 2: Translate Claude Code → OpenCode

### Goal
Replace all Claude Code-specific references with OpenCode equivalents in `gsd-opencode/`.

### Configuration

**Primary config:** `assets/configs/config.json`

**Additional configs:** Created dynamically if Phase 3 detects forbidden strings (e.g., `assets/configs/v1.20.5.json`)

### Commands

```bash
# Step 1: Preview changes (DRY RUN)
node assets/bin/gsd-translate-in-place.js assets/configs/config.json --show-diff

# Step 2: Apply changes
node assets/bin/gsd-translate-in-place.js assets/configs/config.json --apply

# Step 3: If Phase 3 finds violations, use additional config
node assets/bin/gsd-translate-in-place.js assets/configs/config.json assets/configs/<version>.json --apply
```

### Protection Rules
The config explicitly excludes:
- `**/oc-*` and `**/*-oc-*` files
- `assets/**` directory
- `node_modules/**`, `.git/**`, `.translate-backups/**`

### Success Criteria
- ✅ All translation rules applied
- ✅ No forbidden strings remain (verified by Phase 3)
- ✅ Backups created in `.translate-backups/`
- ✅ Git warning acknowledged (if uncommitted changes exist)

### Expected Output
```
Found 45 file(s) to process

╔══════════════════════════════════════════════════════════════════════╗
║  Translation Summary                                                 ║
╠══════════════════════════════════════════════════════════════════════╣
║  File                                    Changes  Status             ║
╠══════════════════════════════════════════════════════════════════════╣
║  gsd-opencode/README.md                    12  ✓ Modified            ║
║  gsd-opencode/package.json                  3  ✓ Modified            ║
║  gsd-opencode/agents/gsd-planner.md         8  ✓ Modified            ║
╚══════════════════════════════════════════════════════════════════════╝

  Total: 43 changes in 5 files

⚠ This was a dry-run. Use --apply to make changes.
```

---

## Phase 3: Validate for Antipatterns

### Goal
Scan for forbidden strings defined in `assets/antipatterns.toml`.

### Command

```bash
node assets/bin/check-forbidden-strings.js
```

### Forbidden Strings (from antipatterns.toml)
```
Claude, Claude Code, <sub>, general-purpose, subagent_type="Explore",
~/.claude, /gsd:, get-shit-done-cc, glittercowboy, AskUserQuestion,
All arguments become, /clear, SlashCommand, TodoWrite, WebSearch,
WebFetch, BashOutput, rokicool/get-shit-done, color: cyan/orange/yellow/blue/green/purple,
name: set-profile, websearch, webfetch, mcp__context7__*,
workflows/set-profile.md, quality/balanced/budget, gsd:
```

### Decision Tree

```
┌─────────────────────────────────────┐
│  Run check-forbidden-strings.js     │
└──────────────┬──────────────────────┘
               │
    ┌──────────▼──────────┐
    │  Forbidden strings  │
    │  found?             │
    └──────┬───────┬──────┘
           │       │
          YES      NO
           │       │
           │       └──────────────────┐
           │                          │
           ▼                          ▼
    ┌──────────────┐          ┌──────────────┐
    │ Create       │          │ Generate     │
    │ versioned    │          │ FINAL REPORT │
    │ config file  │          │ (Success)    │
    └──────┬───────┘          └──────────────┘
           │
           ▼
    ┌──────────────┐
    │ Return to    │
    │ Phase 2 with │
    │ new config   │
    └──────────────┘
```

### If Forbidden Strings Found

1. **Create versioned config** in `assets/configs/`:
   ```json
   {
     "_description": "Hotfix config for version v1.20.5 - addresses remaining forbidden strings",
     "include": ["gsd-opencode/**"],
     "exclude": [
       "node_modules/**", ".git/**", ".translate-backups/**",
       "assets/**", "**/oc-*", "**/*-oc-*"
     ],
     "rules": [
       {
         "pattern": "<remaining_forbidden_string>",
         "replacement": "<openCode_equivalent>",
         "description": "Fix remaining <string> references"
       }
     ]
   }
   ```

2. **Name the file:** `assets/configs/v<VERSION>.json` (e.g., `v1.20.5.json`)

3. **Execute Phase 2 again** with the new config:
   ```bash
   node assets/bin/gsd-translate-in-place.js assets/configs/config.json assets/configs/v1.20.5.json --apply
   ```

4. **Re-run Phase 3** to verify

### Success Criteria
- ✅ Exit code 0
- ✅ Output: "✅ No forbidden strings found"
- ✅ All files pass validation

### Expected Output (Success)
```
🔍 Checking forbidden strings from antipatterns.toml...
📁 Scanning folder: ./gsd-opencode/
📄 File pattern: *.md
🚫 Exclude dirs: none
⚠️  Forbidden strings: 10 strings to check

📋 Found 25 files to check

✅ No forbidden strings found
🎉 All files passed the check!
```

---

## Final Report Template

```markdown
# Migration Report

## Summary
- **Source:** original/get-shit-done @ <commit_hash> (v<version>)
- **Target:** gsd-opencode/
- **Date:** <ISO_8601_timestamp>

## Phase 1: Copy
- Files copied: <count>
- Files skipped (binary): <count>
- Orphaned files preserved: <count>
- Backup location: `.planning/backups/<timestamp>/`

## Phase 2: Translate
- Files processed: <count>
- Total replacements: <count>
- Config files used:
  - assets/configs/config.json
  - assets/configs/<version>.json (if applicable)
- Backup location: `.translate-backups/`

## Phase 3: Validate
- Forbidden strings checked: <count>
- Violations found: 0
- Validation iterations: <count> (1 if clean first try, 2+ if hotfix needed)

## Statistics
| Category | Count |
|----------|-------|
| Total files migrated | |
| Total replacements | |
| Config rules applied | |
| Validation passes | |

## Evidence
- Submodule: `git ls-tree HEAD original/get-shit-done`
- Sync manifest: `.planning/sync-manifest.json`
- Translation backups: `.translate-backups/`
- Copy backups: `.planning/backups/<timestamp>/`

## Notes
<Any relevant observations, issues encountered, or manual interventions>
```

---

## Troubleshooting

### "Submodule not initialized"
```bash
git submodule update --init --recursive
```

### "Diverged files" warning in Phase 1
Review local changes:
```bash
git diff gsd-opencode/<file>
```
Force overwrite if safe:
```bash
node assets/bin/gsd-copy-from-original.js --apply --force
```

### Translation validation fails repeatedly
1. Check which forbidden strings remain
2. Verify config `rules` cover all patterns
3. Consider case-sensitivity (`caseSensitive: true`)
4. Check for regex patterns needing `isRegex: true`

### Restore from backup
```bash
# Copy backups
cp .planning/backups/<timestamp>/<file> gsd-opencode/<file>

# Translate backups
cp .translate-backups/<file>.<timestamp>.bak gsd-opencode/<file>
```

---

## Quick Reference

```bash
# Full migration (interactive)
node assets/bin/gsd-copy-from-original.js --apply
node assets/bin/gsd-translate-in-place.js assets/configs/config.json --apply
node assets/bin/check-forbidden-strings.js

# If validation fails, create hotfix config and re-run translate:
node assets/bin/gsd-translate-in-place.js assets/configs/config.json assets/configs/v1.20.5.json --apply
node assets/bin/check-forbidden-strings.js
```

---

## Related Documentation
- Copy Service: `assets/bin/GSD-COPY-FROM-ORIGINAL.md`
- Translate Service: `assets/bin/GSD-TRANSLATE-IN-PLACE.md`
- Forbidden Strings: `assets/bin/CHECK-FORBIDDEN-STRINGS.md`
- Antipatterns Config: `assets/antipatterns.toml`
- Translation Rules: `assets/configs/config.json`
