<objective>
Adopt the entire get-shit-done metaprompt system from Claude Code to OpenCode. This is a systematic translation task where all Claude Code-specific tools, agents, paths, and naming conventions must be converted to their OpenCode equivalents while preserving the original system's functionality and logic.

The end goal is a fully functional gsd-opencode system that application developers can use with the same command structure (/gsd:subcommand) but adapted for OpenCode.
</objective>

<context>
Source system: ./src/get-shit-done - A comprehensive metaprompt system for Claude Code by TACHES (https://github.com/glittercowboy/get-shit-done)
Destination: ./gsd-opencode - OpenCode adaptation with same structure and functionality
Target audience: Application developers using OpenCode

Key files to examine:
- @./gsd-opencode/MAPPING.md - Complete tool, agent, and path mappings
- @./src/get-shit-done - Source directory structure (109 markdown files)
- @https://opencode.ai/docs - OpenCode documentation for tool reference

Destination structure:
- Commands: ./gsd-opencode/command/*.md (singular "command", not "commands")
- All other files: ./gsd-opencode/get-shit-done/ (preserve source structure)

Original author attribution: TACHES (https://github.com/glittercowboy/get-shit-done)
Project name: gsd-opencode

DO NOT MODIFY:
- ./README.md
- ./assets/*
- ./gsd-opencode/bin/*
- ./gsd-opencode/package.json
</context>

<requirements>
Thoroughly analyze all transformations needed and apply them systematically across all 109 markdown files.

**Core transformations:**

1. **Command file headers:** Add "name: gsd:command-name" to every command's frontmatter (based on Claude Code's /gsd:subcommand syntax)

2. **Tool name translation:** Replace all Claude Code tool names with OpenCode equivalents per MAPPING.md:
   - AskUserQuestion → question
   - SlashCommand → Remove (OpenCode uses direct /command syntax)
   - Task → Remove or adapt to OpenCode agent invocation
   - Other tools: Direct 1:1 mappings (Bash → bash, Edit → edit, etc.)

3. **Agent name translation:**
   - general-purpose → general
   - Explore → Explore (keep as-is)

4. **Path translation:**
   - ~/.claude/ → ~/.config/opencode/
   - ./.claude/ → .opencode/
   - commands/ → command/

5. **XML tag formatting:** Replace Claude Code <sub> tags with single-star Markdown:
   - <sub>something</sub> → *something*

6. **Variable syntax:** Replace "All arguments become X" with "($ARGUMENTS) becomes X"

7. **File structure:**
   - ./src/get-shit-done/commands/gsd/*.md → ./gsd-opencode/command/*.md
   - ./src/get-shit-done/get-shit-done/** → ./gsd-opencode/get-shit-done/**
   - Preserve all subdirectories: templates/, workflows/, references/, debugging/, etc.

8. **MCP tools:** Preserve unchanged (format: mcp__{server_name}__{tool_name})

9. **Allowed-tools lists:** Update to use OpenCode tool names in command frontmatter

10. **File references:** Update @ syntax to use translated paths

**Command invocation:** Replace any subagent spawning or command invocation with appropriate OpenCode syntax
</requirements>

<implementation>
Proceed methodically through these steps:

**Step 1: Inventory and categorization**
- List all files in ./src/get-shit-done (should be 109 markdown files)
- Categorize by type: commands, workflows, templates, references, rules
- Create a transformation checklist for each category

**Step 2: Create destination structure**
- Create ./gsd-opencode/command/ directory if it doesn't exist
- Ensure ./gsd-opencode/get-shit-done/ exists with proper subdirectories

**Step 3: Process command files**
- Read each ./src/get-shit-done/commands/gsd/*.md file
- Transform frontmatter: add "name: gsd:[filename-without-md]" header
- Translate all tool names in allowed-tools lists
- Replace all path references (Claude Code → OpenCode)
- Replace <sub> tags with * formatting
- Update any "All arguments" references to ($ARGUMENTS)
- Remove SlashCommand tool references, adapt Task tool usage
- Save to ./gsd-opencode/command/[filename].md

**Step 4: Process get-shit-done structure**
- Recursively copy structure from ./src/get-shit-done/get-shit-done/ to ./gsd-opencode/get-shit-done/
- Transform all file contents:
  - Tool name translations (MAPPING.md reference)
  - Agent name translations
  - Path translations (~/.claude/ → ~/.config/opencode/)
  - <sub> tag conversions
  - Command invocation syntax updates
  - MCP tools preservation
- Maintain original file structure and filenames

**Step 5: Process .claude/rules**
- Copy and translate ./src/get-shit-done/.claude/rules/* to ./gsd-opencode/get-shit-done/.claude/rules/*
- Apply all transformations consistently

**Step 6: Verification**
- Check that every source file has a corresponding destination file
- Verify no Claude Code tool names remain (except MCP tools)
- Verify no Claude Code paths remain
- Verify command headers are correct
- Spot-check several files for accuracy

**What to avoid and WHY:**
- Do NOT modify ./README.md, ./assets/*, ./gsd-opencode/bin/*, ./gsd-opencode/package.json - These are project infrastructure that should remain unchanged
- Do NOT preserve SlashCommand tool references - OpenCode uses direct /command syntax
- Do NOT preserve ~/.claude/ paths - OpenCode uses different config locations
- Do NOT use Claude Code agent names - Use OpenCode equivalents (general-purpose → general)

**Critical considerations:**
- This is a systematic transformation - apply rules consistently across all files
- Preserve the original system's logic and functionality - only translate syntax/names
- Maintain proper attribution to original author TACHES
- Ensure commands use "name: gsd:command-name" format (matches Claude Code's /gsd:subcommand)
- MCP tools should remain exactly as-is (they're a different ecosystem)
</implementation>

<output>
Create/modify files with relative paths:

Destination structure:
- ./gsd-opencode/command/*.md - Translated command files (from ./src/get-shit-done/commands/gsd/*.md)
- ./gsd-opencode/get-shit-done/templates/* - Translated templates
- ./gsd-opencode/get-shit-done/workflows/* - Translated workflows
- ./gsd-opencode/get-shit-done/references/* - Translated references
- ./gsd-opencode/get-shit-done/.claude/rules/* - Translated rules
- [Preserve all subdirectory structure from source]

Each file should contain:
- Original content with all transformations applied
- Proper tool/agent/path names for OpenCode
- Command files with "name: gsd:command-name" header
- No Claude Code-specific references remaining (except MCP tools)
</output>

<verification>
Before declaring complete, systematically verify your work:

**File count verification:**
```bash
# Count source files
find ./src/get-shit-done -name "*.md" | wc -l
# Should match destination (excluding protected files)
find ./gsd-opencode -name "*.md" -not -path "./gsd-opencode/command/*" | wc -l
```

**Tool name verification:**
```bash
# Search for remaining Claude Code tool names (should be 0 results)
grep -r "AskUserQuestion" ./gsd-opencode/command/
grep -r "SlashCommand" ./gsd-opencode/
grep -r "~/.claude/" ./gsd-opencode/
```

**Command header verification:**
```bash
# Verify all commands have proper name header
grep -L "name: gsd:" ./gsd-opencode/command/*.md
```

**Agent name verification:**
```bash
# Check for general-purpose (should be 0)
grep -r "general-purpose" ./gsd-opencode/
```

**Manual spot checks:**
- Read 3 random command files to verify transformations
- Read 1 workflow file to verify path translations
- Read 1 template file to verify <sub> tag conversion
- Verify DEBUG.md or similar complex file has correct formatting

**Functionality check:**
- Command files should have valid OpenCode frontmatter
- All @file references should point to valid paths
- No broken internal references
</verification>

<success_criteria>
The transformation is successful when:

- [ ] All 109 source markdown files have corresponding destination files
- [ ] No Claude Code tool names remain (AskUserQuestion, SlashCommand, Task etc.)
- [ ] All command files have "name: gsd:command-name" header
- [ ] All ~/.claude/ paths replaced with ~/.config/opencode/
- [ ] All ./.claude/ paths replaced with .opencode/
- [ ] No <sub> tags remain (converted to * formatting*)
- [ ] "All arguments" references use ($ARGUMENTS) syntax
- [ ] Agent names translated (general-purpose → general)
- [ ] MCP tools preserved unchanged
- [ ] Protected files unchanged (README.md, assets/*, bin/*, package.json)
- [ ] Command folder uses singular "command" not "commands"
- [ ] Original author attribution preserved (TACHES)
- [ ] Spot-check files show correct transformations
</success_criteria>
