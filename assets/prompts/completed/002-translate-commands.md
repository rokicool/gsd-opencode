<objective>
Translate all command files from Claude Code's get-shit-done system to OpenCode format and put to ./gsd-opencode/command/gsd/ folder for further distribution.

**Why this matters:** Commands are the user-facing interface to the GSD system. They must be translated to work with OpenCode's command system.

**End goal:** All GSD commands work as OpenCode commands with `gsd-<name>` naming convention.
</objective>

<context>
This is prompt 2 of 6 in the translation sequence. Use the mapping document created in prompt 1 as your reference.

**Source files:** ./original/get-shit-done/commands/gsd/*.md
**Target directory:** ./gsd-opencode/command/gsd/ 
**Important** ALL COMMANDS MUST BE CREATED IN `gsd-opencode/command/gsd/` FOLDER

**Mapping reference:** @./assets/prompts/TRANSLATION-MAPPING.md

**Project context:**
- Project name: "gsd-opencode"
- Config folder: ~/.config/opencode OR .opencode/ (not ~/.claude)
- Command naming: gsd-<name> instead of gsd:<name> (not file naming)
- Source directory: ".../commands/gsd" → ".../command/gsd" (singular)

**Translation rules:**
1. Command names in frontmatter: `name: gsd:plan-phase` → `name: gsd-plan-phase`
2. Allowed tools: Translate to OpenCode equivalents per mapping document
3. Agent specifications: Update to OpenCode agent format per mapping document
4. File paths: Update Claude Code paths to OpenCode paths
5. XML tags: Convert `<sub>something</sub>` to `*something*`
6. Arguments: Replace "All arguments" references with `$ARGUMENTS`
7. MCP tools: Convert MCP tool references to OpenCode format
</context>

<requirements>
1. Create target directory: ./gsd-opencode/command/gsd/

2. Translate each .md file from ./original/get-shit-done/commands/gsd/ to ./gsd-opencode/command/gsd/

3. For each command file:
   - Update frontmatter `name` field: `gsd:<name>` → `gsd-<name>`
   - Translate `allowed-tools` to OpenCode equivalents
   - Translate `agent` references to OpenCode format
   - Update file path references from Claude Code to OpenCode structure
   - Convert `<sub>something</sub>` tags to `*something*`
   - Replace "All arguments" with `$ARGUMENTS`
   - Convert MCP tool references per mapping document

4. Preserve all functionality and logic while adapting to OpenCode

5. Maintain the original structure, comments, and documentation where appropriate

6. Update any internal references to other commands to use the new naming convention

7. Update references to config directory from ~/.claude to ~/.config/opencode or .opencode/
</requirements>

<implementation>
Follow the mapping document at ./gsd-opencode/TRANSLATION-MAPPING.md for specific conversion rules.

For each file:
1. Read the source file
2. Apply all translation rules from the mapping document
3. Verify the converted file makes sense in OpenCode context
4. Write to target location

**Important:**
- Do not change the logic or functionality of the commands
- Only adapt the syntax, tools, and references for OpenCode
- Preserve all user-facing text and explanations
- Maintain the same command structure where possible
- Ensure all file references point to correct locations in the OpenCode structure
</implementation>

<output>
Create/modify files in:
- `./gsd-opencode/command/gsd/` - All translated command files

Each command file should:
- Have `gsd-<name>` in the frontmatter name field
- Use OpenCode tool names
- Use OpenCode agent specifications
- Reference files in the correct OpenCode structure
- Use OpenCode-compatible XML tags
- Use `$ARGUMENTS` for argument references
</output>

<verification>
After completing translations:

1. Verify all commands have been translated:
   ```bash
   ls -la ./original/get-shit-done/commands/gsd/*.md | wc -l
   ls -la ./gsd-opencode/command/gsd/*.md | wc -l
   ```
   The counts should match.

2. Check a sample of translated files to ensure:
   - Frontmatter is correct (gsd-<name> naming)
   - Tools are OpenCode equivalents
   - Agent references are OpenCode format
   - File paths are updated
   - No `<sub>` tags remain
   - $ARGUMENTS is used where appropriate

3. Check that no Claude Code tool names remain:
   ```bash
   grep -r "WebFetch\|AskUserQuestion" ./gsd-opencode/command/gsd/*.md
   ```
   Should return nothing.

4. Verify no `<sub>` tags remain:
   ```bash
   grep -r "<sub>" ./gsd-opencode/command/gsd/*.md
   ```
   Should return nothing.

5. Verify no files in the original directory structure were missed

6. Test that the translated commands follow OpenCode command syntax
</verification>

<success_criteria>
- [ ] ./gsd-opencode/command/gsd/ directory created
- [ ] All command files from source translated
- [ ] All commands use `gsd-<name>` naming convention
- [ ] All tools translated to OpenCode equivalents
- [ ] All agent specifications updated to OpenCode format
- [ ] All file paths updated to OpenCode structure
- [ ] All `<sub>` tags converted to `*`
- [ ] All "All arguments" replaced with `$ARGUMENTS`
- [ ] Config directory references updated
- [ ] No Claude Code-specific syntax remains
- [ ] File count matches between source and target
</success_criteria>
