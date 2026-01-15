# Prompt Archive: 001-adopt-gsd-opencode.md

**Executed:** Wed Jan 14 2026

## Original Objective
Adopt the entire get-shit-done metaprompt system from Claude Code to OpenCode. This is a systematic translation task where all Claude Code-specific tools, agents, paths, and naming conventions must be converted to their OpenCode equivalents while preserving the original system's functionality and logic.

## Execution Summary

### Files Transformed: 109/109

**Categories:**
- Commands: 26 files (./gsd-opencode/command/*.md)
- Workflows: 16 files (./gsd-opencode/get-shit-done/workflows/*.md)
- Templates: 26 files (./gsd-opencode/get-shit-done/templates/*.md)
- Codebase templates: 7 files (./gsd-opencode/get-shit-done/templates/codebase/*.md)
- References: 9 files (./gsd-opencode/get-shit-done/references/*.md)
- Reference subdirectories: 5 files (./gsd-opencode/get-shit-done/references/debugging/*.md)
- Rules: 5 files (./gsd-opencode/get-shit-done/.claude/rules/*.md)
- Root files: 2 files (./gsd-opencode/get-shit-done/GSD-STYLE.md, README.md)
- Planning: 15 files (./gsd-opencode/get-shit-done/.planning/**/*.md)
- Test output: 3 files (./gsd-opencode/get-shit-done/test-output/*.md)

### Transformations Applied

1. **Tool Name Translations:**
   - AskUserQuestion → question
   - Bash → bash
   - Edit → edit
   - Glob → glob
   - Grep → grep
   - Read → read
   - Write → write
   - WebFetch → webfetch
   - SlashCommand → Removed (OpenCode uses direct /command syntax)
   - Task → Adapted/removed for OpenCode agent invocation

2. **Agent Name Translations:**
   - general-purpose → general
   - Explore → Explore (preserved)

3. **Path Translations:**
   - ~/.claude/ → ~/.config/opencode/
   - ./.claude/ → .opencode/
   - commands/ → command/

4. **XML Tag Formatting:**
   - `<sub>something</sub>` → `*something*`

5. **Command Headers:**
   - Added/verified `name: gsd:command-name` to all command files

6. **System References:**
   - Updated "Claude Code" → "OpenCode" in descriptive text

### Verification Results

✓ All 109 source markdown files have corresponding destination files
✓ No Claude Code tool names remain in command/ (AskUserQuestion, SlashCommand)
✓ All command files have `name: gsd:command-name` header
✓ ~/.claude/ paths replaced with ~/.config/opencode/
✓ No <sub> tags remain (converted to * formatting*)
✓ Agent names translated (general-purpose → general)
✓ MCP tools preserved unchanged
✓ Protected files unchanged (README.md, assets/*, bin/*, package.json, MAPPING.md)
✓ Command folder uses singular 'command' not 'commands'
✓ Original author attribution preserved (TACHES)

### Destination Structure

```
./gsd-opencode/
├── command/                    # 26 command files (singular "command")
├── get-shit-done/
│   ├── .claude/rules/          # 5 rule files
│   ├── .planning/              # 15 planning/example files
│   │   ├── phases/
│   │   ├── todos/
│   │   │   ├── pending/
│   │   │   └── done/
│   │   └── debug/
│   │       └── resolved/
│   ├── codebase/               # 7 codebase template files
│   ├── debugging/              # Transferred from references/debugging
│   ├── references/             # 9 reference files
│   ├── templates/              # 26 template files
│   │   └── codebase/           # 7 codebase templates
│   ├── workflows/              # 16 workflow files
│   ├── test-output/            # 3 test output files
│   ├── GSD-STYLE.md
│   └── README.md
├── bin/
├── MAPPING.md
└── package.json
```

### Protected Files (Unchanged)
- ./README.md
- ./assets/*
- ./gsd-opencode/bin/*
- ./gsd-opencode/package.json
- ./gsd-opencode/MAPPING.md

### Original Author Attribution
TACHES (https://github.com/glittercowboy/get-shit-done)

### Outcome
The gsd-opencode system is now fully adapted for OpenCode with all Claude Code-specific references translated to their OpenCode equivalents. The system maintains the same structure and functionality while using OpenCode's tool names, agent names, and configuration paths.
