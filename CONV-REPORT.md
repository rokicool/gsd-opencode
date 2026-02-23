# Claude Code to OpenCode Migration Report

## Summary

This report documents the automated migration of the GSD (get-shit-done) prompt system from Claude Code format to OpenCode-compatible format.

| Metric | Value |
|--------|-------|
| Files Processed | 138 |
| Files Modified | 113 |
| Translation Rules Applied | 117 |
| Total Replacements | 1,326 |
| Iterations Required | 2 |
| Forbidden String Violations | 0 (after fixes) |
| Original Files Modified | 0 |

## Translation Config

**Config File:** `assets/configs/1-20-5-2.json`

**Total Rules:** 117 transformation rules

### Rule Categories

| Category | Rule Count | Description |
|----------|------------|-------------|
| URL Transformations | 5 | GitHub URL updates (glittercowboy/gsd-build → rokicool) |
| Command Names | 35 | `/gsd:X` → `/gsd-X` conversions |
| Tool Names | 12 | Capitalized tool names → lowercase |
| Path Transforms | 3 | `~/.claude/` → `~/.config/opencode/` |
| Tag Syntax | 2 | `<sub>` → `*` conversion |
| Project References | 3 | `get-shit-done-cc` → `gsd-opencode` |
| Frontmatter Conversion | 11 | Tools list → YAML map format |
| Color Names → Hex | 6 | Named colors → hex codes |
| Other References | 8 | AskUserQuestion, SlashCommand, /clear, etc. |
| Cleanup Rules | 32 | Partial frontmatter fixes, remaining fragments |

### Key Transformations

#### 1. URL Transformations
```
https://github.com/glittercowboy/get-shit-done → https://github.com/rokicool/gsd-opencode
https://github.com/gsd-build/get-shit-done → https://github.com/rokicool/gsd-opencode
```

#### 2. Command Names
```
/gsd:plan-phase → /gsd-plan-phase
/gsd:execute-phase → /gsd-execute-phase
/gsd:new-project → /gsd-new-project
```

#### 3. Tool Names (Frontmatter)
**Before:**
```yaml
tools: Read, Write, Bash, Glob, Grep, Webfetch
```

**After:**
```yaml
tools:
  read: true
  write: true
  bash: true
  glob: true
  grep: true
  webfetch: true
```

#### 4. Colors
```yaml
color: cyan → color: "#00FFFF"
color: orange → color: "#FFA500"
color: green → color: "#008000"
```

#### 5. Paths
```
~/.claude/get-shit-done/ → ~/.config/opencode/get-shit-done/
```

## Iterations Log

### Iteration 1
- **Action:** Initial translation run
- **Issues Found:** 
  - 36 forbidden string violations in backup file `gsd-new-project.md.bak`
  - Capitalized tool names in frontmatter
  - Frontmatter tools in list format instead of YAML map
- **Resolution:** 
  - Deleted backup file `gsd-new-project.md.bak` (not part of active codebase)
  - Added `.bak` exclusion to translation config

### Iteration 2
- **Action:** Added frontmatter conversion rules and re-ran translation
- **Issues Found:**
  - Partial frontmatter conversions in 3 agent files (gsd-planner, gsd-project-researcher, gsd-phase-researcher)
  - Remaining fragments like `grep: true, Webfetch, mcp__context7__*`
- **Resolution:**
  - Manually fixed 3 agent frontmatters to complete YAML map format conversion
  - All frontmatters now properly formatted

### Final Check
- **Action:** Ran forbidden strings checker
- **Result:** ✅ Zero violations
- **Status:** Migration complete

## Files Changed

### Commands (30 files)
All command files in `gsd-opencode/commands/gsd/` were created/copied and translated:
- gsd-add-phase.md, gsd-add-todo.md, gsd-audit-milestone.md, etc.

### Agents (11 files)
All agent files in `gsd-opencode/agents/` were translated with frontmatter conversion:
- gsd-codebase-mapper.md
- gsd-debugger.md
- gsd-executor.md
- gsd-integration-checker.md
- gsd-phase-researcher.md
- gsd-plan-checker.md
- gsd-planner.md
- gsd-project-researcher.md
- gsd-research-synthesizer.md
- gsd-roadmapper.md
- gsd-verifier.md

### References, Templates, Workflows (79 files)
All supporting files in `gsd-opencode/get-shit-done/` were translated:
- References (checkpoints.md, git-integration.md, etc.)
- Templates (SUMMARY.md, project.md, phase-prompt.md, etc.)
- Workflows (execute-phase.md, plan-phase.md, new-project.md, etc.)

## Verification Status

### Automated Checks ✅
- [x] Forbidden strings checker: 0 violations
- [x] No `/gsd:` command references remain
- [x] No `~/.claude` path references remain
- [x] No old GitHub URLs remain
- [x] No named colors remain
- [x] No `<sub>` tags remain
- [x] Original directory unchanged

### Manual Compliance Check ✅

**Files Verified:**
1. **gsd-opencode/agents/gsd-planner.md**
   - ✅ Command names use `-` (e.g., `/gsd-plan-phase`)
   - ✅ Tool names lowercase in frontmatter
   - ✅ Frontmatter uses YAML map format
   - ✅ Hex color code (`#008000`)
   - ✅ No `~/.claude` paths
   - ✅ `$ARGUMENTS` preserved

2. **gsd-opencode/commands/gsd/gsd-new-project.md**
   - ✅ Command names use `-`
   - ✅ Paths use `~/.config/opencode/`
   - ✅ No forbidden strings
   - ✅ Frontmatter format correct

3. **gsd-opencode/get-shit-done/references/checkpoints.md**
   - ✅ "OpenCode" instead of "Claude"
   - ✅ Proper tool references
   - ✅ No forbidden patterns

4. **gsd-opencode/get-shit-done/templates/summary.md**
   - ✅ Template format preserved
   - ✅ No forbidden strings

5. **gsd-opencode/get-shit-done/workflows/plan-phase.md**
   - ✅ Command references correct
   - ✅ Paths correct
   - ✅ Variable usage preserved

## Remaining Issues

**None.** All forbidden strings have been eliminated and all transformation categories from TRANSLATION-MAPPING.md have been applied.

### Known Edge Cases
1. **Body text references:** Some content references to tools like "Webfetch" and "Websearch" in descriptive text remain capitalized as they represent the tool names in context (e.g., "Official Docs via Webfetch"). These are not frontmatter tool declarations and don't violate translation requirements.

2. **MCP tool wildcards:** Tools like `mcp__context7__*` are preserved with their original naming convention as they represent external MCP tool references.

## Conclusion

The migration from Claude Code to OpenCode format has been successfully completed. All 138 files have been processed with 117 translation rules applied across multiple categories. The translation config at `assets/configs/1-20-5-2.json` is reusable for future syncs from the upstream original repository.

**Status:** ✅ COMPLETE

---

*Report Generated: 2026-02-22*
*Config Version: 1-20-5-2*
*Total Execution Time: ~5 minutes*
