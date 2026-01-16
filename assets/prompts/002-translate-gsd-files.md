<objective>
Translate all non-command GSD markdown files from Claude Code to OpenCode format.

Copy all markdown files from `./src/get-shit-done/` (excluding the commands/gsd/ directory) to `./gsd-opencode/`, translating all Claude Code-specific elements to OpenCode equivalents.

**Target audience:** Any application developer who wants to use the GSD system with OpenCode instead of Claude Code.
</objective>

<context>
The GSD (Get Shit Done) system has many supporting files (templates, workflows, rules, documentation) that need to be adapted for OpenCode. These files are not commands but are referenced by commands.

**Source:** `./src/get-shit-done/` (all .md files except commands/gsd/)
**Destination:** `./gsd-opencode/get-shit-done/`

**Project name:** gsd-opencode
**Author credit:** TACHES (https://github.com/glittercowboy/get-shit-done)

**Key translations needed:**
1. Tool names: Read→read, Write→write, Edit→edit, Glob→glob, Grep→grep, Bash→bash, Task→task, TodoWrite→todowrite, AskUserQuestion→question
2. Agent names: "general-purpose"→"general"
3. Paths: ~/.claude/→~/.config/opencode/ OR .opencode/
4. Tag format: <sub>text</sub> → *text*
5. Directory name: commands → command (singular)

**Files to NOT modify:**
- ./README.md
- ./assets/*
- ./gsd-opencode/bin/*
- ./gsd-opencode/package.json

**Note:** These files do NOT need "name: gsd:<name>" in their frontmatter because they are not commands. They are supporting files referenced by commands.
</context>

<requirements>
1. Create `./gsd-opencode/` directory structure matching `./src/get-shit-done/`
2. Copy all `.md` files from `./src/get-shit-done/` EXCEPT those in `commands/gsd/`
3. Copy all '.md' files from  `./src/.claude/rules/` to `./gsd-opencode/.opencode/rules/`
4. For each file, perform the following translations:

   **Path translations:**
   - Replace ~/.claude/get-shit-done/ with ~/.config/opencode/gsd-opencode/
   - Replace ~/.claude/ with ~/.config/opencode/
   - Replace @~/.claude/ with @~/.config/opencode/
   - Update any references to command files: commands/gsd/ → command/gsd/

   **Content translations:**
   - Replace all occurrences of "Claude Code" with "OpenCode"
   - Replace agent name "general-purpose" with "general"
   - Replace "Explore agents" with "explore agents" (when referring to the subagent type)
   - Replace `subagent_type="Explore"` with `subagent_type="explore"`
   - Replace tool names (when referenced in documentation):
     - Read → read
     - Write → write
     - Edit → edit
     - Glob → glob
     - Grep → grep
     - Bash → bash
     - Task → task (if OpenCode supports it, otherwise remove)
     - TodoWrite → todowrite
     - AskUserQuestion → question
   - Replace <sub>text</sub> tags with *text*
   - Remove any TaskOutput references or polling code
   - Remove any references to background agents (OpenCode uses parallel task invocation instead)

   **Special attention to these directories:**
   - `.claude/rules/` → translate rules but keep them in `.opencode/gsd-opencode/rules/`
   - `templates/` → translate all template files
   - Any workflow files → translate workflows

4. Ensure proper markdown formatting and indentation
5. Preserve directory structure (except commands → command)
6. Verify all translated files are syntactically correct markdown
</requirements>

<translation_mapping>
Use these mappings consistently:

**Tools:**
- Read → read
- Write → write
- Edit → edit
- Glob → glob
- Grep → grep
- Bash → bash
- Task → task
- TodoWrite → todowrite
- AskUserQuestion → question

**Agents:**
- general-purpose → general
- explore → explore

**Paths:**
- ~/.claude/ → ~/.config/opencode/
- ./src/get-shit-done/ → ./gsd-opencode/
- commands/gsd/ → command/gsd/

**Tags:**
- <sub>text</sub> → *text*
</translation_mapping>

<output>
Create translated files in `./gsd-opencode/`:
- All .md files from ./src/get-shit-done/ (except commands/gsd/) translated to OpenCode format
- Directory structure preserved (with commands → command)
- All Claude Code references replaced with OpenCode equivalents
</output>

<process>
1. List all .md files in ./src/get-shit-done/ and subdirectories
2. Exclude files in ./src/get-shit-done/commands/gsd/ (handled by separate prompt)
3. Create matching directory structure in ./gsd-opencode/
4. For each source file (excluding commands/gsd/):
   a. Read the full content
   b. Apply all translations (tools, agents, paths, tags)
   c. Write translated file to ./gsd-opencode/ maintaining relative path
   d. For .claude/ directory, translate to .opencode/ instead
5. Verify all translations are complete and accurate
6. Confirm all non-command markdown files exist in destination
</process>

<verification>
Before declaring complete, verify:

1. Directory ./gsd-opencode/ exists with expected subdirectories
2. Count .md files in ./gsd-opencode/ matches ./src/get-shit-done/ minus 27 command files
3. No Claude Code references remain in translated files
4. No <sub>...</sub> tags remain (replaced with *...*)
5. All tool name references use OpenCode naming (lowercase)
6. All path references use ~/.config/opencode/ instead of ~/.claude/
7. All agent references use OpenCode agent names
8. Directory names are correct (command, not commands)
9. .claude/ directory translated to .opencode/
10. Templates, workflows, and rules all translated
11. README.md in root remains unchanged
12. assets/* remain unchanged

Use grep to verify:
- `grep -r "Claude Code" ./gsd-opencode/ --exclude-dir=command 2>/dev/null` should return nothing
- `grep -r "<sub>" ./gsd-opencode/ --exclude-dir=command 2>/dev/null` should return nothing
- `grep -r "general-purpose" ./gsd-opencode/ --exclude-dir=command 2>/dev/null` should return nothing
- `grep -r 'subagent_type="explore"'./gsd-opencode/ --exclude-dir=command 2>/dev/null` should return nothing
- `grep -r "~/.claude" ./gsd-opencode/ --exclude-dir=command 2>/dev/null` should return nothing
</verification>

<success_criteria>
- [ ] All non-command markdown files successfully copied and translated
- [ ] All Claude Code tool names replaced with OpenCode equivalents
- [ ] All agent names updated to OpenCode conventions
- [ ] All path references updated to OpenCode config locations
- [ ] All <sub>...</sub> tags replaced with *...*
- [ ] Directory names corrected (command not commands)
- [ ] .claude/ directory properly translated to .opencode/
- [ ] Templates, workflows, rules all translated
- [ ] No Claude Code references remain in non-command files
- [ ] README.md, assets/* remain unchanged
</success_criteria>
