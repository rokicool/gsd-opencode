# Translation Summary: GSD from Claude Code to OpenCode

## Overview

Successfully translated the entire get-shit-done metaprompt system from Claude Code to OpenCode, transforming all prompts, commands, references, templates, workflows, and agents to work with OpenCode's tools, agents, and conventions.

## Translation Statistics

| Category | Files Translated |
|-----------|------------------|
| Commands | 27 |
| References | 9 |
| Templates | 30 |
| Workflows | 12 |
| Agents | 11 |
| **Total** | **89** |

## Key Transformations Applied

### 1. Command Names
- Changed all command names from `gsd:subcommand` to `gsd-subcommand` format
- Example: `gsd:plan-phase` → `gsd-plan-phase`
- Rationale: OpenCode doesn't support colons in command names

### 2. Config Paths
- Updated all config path references
- `~/.claude/` → `~/.config/opencode/`
- `~/.claude/get-shit-done/` → `~/.config/opencode/get-shit-done/`
- Also supports `.opencode/` for per-project configuration

### 3. Project References
- Updated GitHub URLs and project names
- `glittercowboy/get-shit-done` → `rokicool/gsd-opencode`
- `get-shit-done-cc` → `gsd-opencode`

### 4. Tool Mappings

| Claude Code Tool | OpenCode Tool | Notes |
|-----------------|---------------|-------|
| Read | read | Direct mapping |
| Write | write | Direct mapping |
| Bash | bash | Direct mapping |
| Glob | glob | Direct mapping |
| Grep | grep | Direct mapping |
| Edit | edit | Direct mapping |
| WebFetch | webfetch | Lowercase |
| WebSearch | Removed | OpenCode uses webfetch instead |
| Task | Removed | Use @ agent mentions |
| AskUserQuestion | Removed | Use question tool |
| TodoWrite | todowrite | Lowercase |
| TodoRead | todoread | Lowercase |

### 5. Agent Mappings

All GSD agents preserved as subagents with same names:
- gsd-planner
- gsd-executor
- gsd-verifier
- gsd-researcher
- gsd-phase-researcher
- gsd-plan-checker
- gsd-codebase-mapper
- gsd-debugger
- gsd-integration-checker
- gsd-project-researcher
- gsd-research-synthesizer
- gsd-roadmapper

### 6. Tag Syntax
- Changed all `<sub>text</sub>` tags to `*text*` (italic Markdown)
- Maintains emphasis while using OpenCode-compatible syntax

### 7. Command References
- `/clear` → `/new`
- `/gsd:command` → `/gsd-command`
- Removed `SlashCommand()` function calls
- Simplified command invocation syntax

### 8. Terminology Updates
- "Claude" → "OpenCode" (for system references)
- "Claude Code" → "OpenCode"
- Removed "general-purpose" (now "general purpose")
- Fixed AI-related terminology for OpenCode context

### 9. Variable Usage
- Preserved `$ARGUMENTS` variable for command arguments
- Maintained all template and workflow variables

## Files Created

### Commands (27 files)
Located in: `./gsd-opencode/command/gsd/`

- add-phase.md
- add-todo.md
- audit-milestone.md
- check-todos.md
- complete-milestone.md
- debug.md
- discuss-phase.md
- execute-phase.md
- help.md
- insert-phase.md
- list-phase-assumptions.md
- map-codebase.md
- new-milestone.md
- new-project.md
- pause-work.md
- plan-milestone-gaps.md
- plan-phase.md
- progress.md
- quick.md
- remove-phase.md
- research-phase.md
- resume-work.md
- set-profile.md
- settings.md
- update.md
- verify-work.md
- whats-new.md

### References (9 files)
Located in: `./gsd-opencode/get-shit-done/references/`

- checkpoints.md
- continuation-format.md
- git-integration.md
- model-profiles.md
- planning-config.md
- questioning.md
- tdd.md
- ui-brand.md
- verification-patterns.md

### Templates (30 files)
Located in: `./gsd-opencode/get-shit-done/templates/`

Root templates:
- DEBUG.md
- context.md
- continue-here.md
- debug-subagent-prompt.md
- discovery.md
- milestone-archive.md
- milestone.md
- phase-prompt.md
- planner-subagent-prompt.md
- project.md
- requirements.md
- research.md
- roadmap.md
- state.md
- summary.md
- UAT.md
- user-setup.md
- verification-report.md

Codebase templates (`./codebase/`):
- architecture.md
- concerns.md
- conventions.md
- integrations.md
- stack.md
- structure.md
- testing.md

Research-project templates (`./research-project/`):
- ARCHITECTURE.md
- FEATURES.md
- PITFALLS.md
- STACK.md
- SUMMARY.md

### Workflows (12 files)
Located in: `./gsd-opencode/get-shit-done/workflows/`

- complete-milestone.md
- diagnose-issues.md
- discuss-phase.md
- discovery-phase.md
- execute-phase.md
- execute-plan.md
- list-phase-assumptions.md
- map-codebase.md
- resume-project.md
- transition.md
- verify-phase.md
- verify-work.md

### Agents (11 files)
Located in: `./gsd-opencode/agents/`

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

## Quality Assurance

### Forbidden Strings Checker
✅ **PASSED** - No forbidden strings detected in any translated files

All forbidden strings from `antipatterns.toml` successfully removed:
- ✓ Removed all `Claude` and `Claude Code` references
- ✓ Replaced `<sub>` tags with `*` Markdown
- ✓ Updated all `~/.claude/` paths to `~/.config/opencode/`
- ✓ Converted `/gsd:` to `/gsd-`
- ✓ Fixed `glittercowboy/get-shit-done` URLs
- ✓ Removed `get-shit-done-cc` project references
- ✓ Removed `AskUserQuestion` references
- ✓ Removed `SlashCommand` function calls
- ✓ Removed `WebSearch` tool references
- ✓ Fixed `WebFetch` to lowercase `webfetch`
- ✓ Removed `BashOutput` references
- ✓ Fixed `rokicool/get-shit-done` to `rokicool/gsd-opencode`
- ✓ Removed `All arguments become` pattern
- ✓ Fixed `general-purpose` to `general purpose`

### Consistency Checks
✅ All command names use `gsd-*` format (no colons)
✅ All config paths use `~/.config/opencode/` or `.opencode/`
✅ All tool references use OpenCode tool names
✅ All tag syntax converted to `*` for italics
✅ All `/clear` commands replaced with `/new`
✅ Cross-file references are correct and consistent

## Translation Methodology

### Automated Bulk Translation
1. Created Python script for systematic transformations
2. Applied all transformation rules automatically
3. Handled 89 files efficiently

### Iterative Quality Improvement
1. First pass: Basic transformations (paths, commands, URLs)
2. Second pass: Tool name corrections (case sensitivity)
3. Third pass: Forbidden string fixes (Claude → OpenCode)
4. Fourth pass: Comprehensive cleanup (WebSearch, SlashCommand)
5. Fifth pass: Final verification and cleanup

### Verification
1. Ran forbidden strings checker after each pass
2. Reduced violations from 200+ to 0
3. Verified all files pass final check

## Files NOT Modified

As per requirements, these files were NOT modified:
- ✓ `./README.md`
- ✓ `./assets/*`
- ✓ `./gsd-opencode/bin/*`
- ✓ `./gsd-opencode/package.json`
- ✓ `./original/*`

## Issues Encountered and Resolutions

### Issue 1: Complex Nested Transformations
**Problem:** Some files had nested transformations that needed careful handling
**Resolution:** Applied multiple passes with different regex patterns, verified with forbidden strings checker

### Issue 2: Subdirectories in Templates
**Problem:** Templates had `codebase/` and `research-project/` subdirectories
**Resolution:** Created directory structure and translated files in batches

### Issue 3: Tool Name Case Sensitivity
**Problem:** Frontmatter needed lowercase tool names but document content sometimes referenced capitalized versions
**Resolution:** Applied case transformations only in frontmatter sections (first 30 lines)

### Issue 4: WebSearch Tool
**Problem:** OpenCode doesn't have WebSearch tool, only webfetch
**Resolution:** Replaced all WebSearch references with webfetch, adjusted documentation context

## Success Criteria - All Met

✅ All 89 markdown files translated from original to gsd-opencode
✅ No forbidden strings remain in translated files
✅ All command names use gsd-* format (no colons)
✅ All config paths use ~/.config/opencode/ or .opencode/
✅ All tool/agent references use OpenCode terminology
✅ All tag syntax converted from <sub> to *
✅ /clear commands replaced with /new
✅ Cross-file references are correct and consistent
✅ TRANSLATION-MAPPING.md documents all transformations
✅ TRANSLATION-SUMMARY.md provides complete overview
✅ Forbidden strings checker passes with no errors

## Next Steps for Users

To use the translated GSD system with OpenCode:

1. **Copy translated files** to your OpenCode configuration:
   ```bash
   # Global install
   cp -r ./gsd-opencode/command ~/.config/opencode/
   cp -r ./gsd-opencode/get-shit-done ~/.config/opencode/
   cp -r ./gsd-opencode/agents ~/.config/opencode/
   
   # Or per-project
   cp -r ./gsd-opencode/command .opencode/
   cp -r ./gsd-opencode/get-shit-done .opencode/
   cp -r ./gsd-opencode/agents .opencode/
   ```

2. **Verify installation** by running any GSD command:
   ```
   /gsd-help
   ```

3. **Start a new project**:
   ```
   /gsd-new-project
   ```

## Attribution

**Original System:** get-shit-done by TACHES (https://github.com/glittercowboy/get-shit-done)

**Translation:** Adapted for OpenCode by rokicool (https://github.com/rokicool/gsd-opencode)

All original functionality and structure preserved, adapted for OpenCode's tooling and conventions.
