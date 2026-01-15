<objective>
Translate all GSD command files from Claude Code to OpenCode format.

Copy all command files from `./src/get-shit-done/commands/gsd/` to `./gsd-opencode/command/gsd/`, translating all Claude Code-specific elements to OpenCode equivalents.

**Target audience:** Any application developer who wants to use the GSD system with OpenCode instead of Claude Code.
</objective>

<context>
The GSD (Get Shit Done) system was originally created for Claude Code. We need to adapt it for OpenCode, which has different tool names, agent names, configuration paths, and command syntax.

**Source:** `./src/get-shit-done/commands/gsd/` (27 command files)
**Destination:** `./gsd-opencode/command/gsd/`

**Project name:** gsd-opencode
**Author credit:** TACHES (https://github.com/glittercowboy/get-shit-done)

**Key translations needed:**
1. Tool names: Read→read, Write→write, Edit→edit, Glob→glob, Grep→grep, Bash→bash, Task→task, TodoWrite→todowrite, AskUserQuestion→question
2. Agent names: "general-purpose"→"general"
3. Paths: ~/.claude/→~/.config/opencode/ OR .opencode/
4. Command syntax: Add "name: gsd:<name>" to YAML frontmatter
5. Tag format: <sub>text</sub> → *text*
6. Variables: "All arguments" → ($ARGUMENTS)
7. Directory name: commands → command (singular)

**Files to NOT modify:**
- ./README.md
- ./assets/*
- ./gsd-opencode/bin/*
- ./gsd-opencode/package.json
</context>

<requirements>
1. Create `./gsd-opencode/command/gsd/` directory if it doesn't exist
2. Copy all `.md` files from `./src/get-shit-done/commands/gsd/` to `./gsd-opencode/command/gsd/`
3. For each file, perform the following translations:

   **YAML Frontmatter updates:**
   - Add or update `name: gsd:<filename-without-extension>` (e.g., name: gsd:help)
   - Keep existing `description` and `argument-hint` if present
   - Update `allowed-tools` section:
     - Read → read
     - Write → write
     - Edit → edit
     - Glob → glob
     - Grep → grep
     - Bash → bash
     - Task → task (if OpenCode supports it, otherwise remove)
     - TodoWrite → todowrite
     - AskUserQuestion → question
     - TaskOutput → remove (OpenCode doesn't have this)

   **Content translations:**
   - Replace all occurrences of "Claude Code" with "OpenCode"
   - Replace agent name "general-purpose" with "general"
   - Replace agent name "explore" with "explore" (if it appears)
   - Replace path references:
     - ~/.claude/get-shit-done/ → ~/.config/opencode/gsd-opencode/
     - @~/.claude/ → @~/.config/opencode/
   - Replace <sub>text</sub> tags with *text*
   - Replace "All arguments" with ($ARGUMENTS)
   - Remove any TaskOutput references or polling code
   - Remove any references to background agents (OpenCode uses parallel task invocation instead)

   **Special cases:**
   - In execute-phase.md: Remove TaskOutput loops and background agent tracking
   - In help.md: Replace all Claude Code references with OpenCode
   - In status.md: Remove or simplify (OpenCode doesn't support background agent polling)

4. Ensure proper markdown formatting and indentation
5. Verify all translated files are syntactically correct markdown with valid YAML frontmatter
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
- ./src/get-shit-done/commands/ → ./gsd-opencode/command/
- ./src/get-shit-done/ → ./gsd-opencode/

**Tags:**
- <sub>text</sub> → *text*

**Variables:**
- All arguments → ($ARGUMENTS)
</translation_mapping>

<output>
Create translated command files in `./gsd-opencode/command/gsd/`:
- All 27 command files from ./src/get-shit-done/commands/gsd/ translated to OpenCode format
- Each file should have proper YAML frontmatter with name: gsd:<name>
- All Claude Code references replaced with OpenCode equivalents
</output>

<process>
1. Read all command files from ./src/get-shit-done/commands/gsd/
2. Create ./gsd-opencode/command/gsd/ directory
3. For each source file:
   a. Read the full content
   b. Apply all translations (tools, agents, paths, tags, variables)
   c. Add/update name field in YAML frontmatter: name: gsd:<basename>
   d. Write translated file to ./gsd-opencode/command/gsd/
4. Verify all translations are complete and accurate
5. Confirm 27 translated files exist in destination
</process>

<verification>
Before declaring complete, verify:

1. Directory ./gsd-opencode/command/gsd/ exists
2. Count: 27 .md files in ./gsd-opencode/command/gsd/ (matching source)
3. Each file has name: gsd:<name> in YAML frontmatter
4. No Claude Code references remain in translated files
5. No <sub>...</sub> tags remain (replaced with *...*)
6. All tool names use OpenCode naming (lowercase)
7. All path references use ~/.config/opencode/ instead of ~/.claude/
8. All agent references use OpenCode agent names
9. YAML frontmatter is valid and properly formatted
10. help.md specifically mentions OpenCode instead of Claude Code

Use grep to verify:
- `grep -r "Claude Code" ./gsd-opencode/command/gsd/` should return nothing
- `grep -r "<sub>" ./gsd-opencode/command/gsd/` should return nothing
- `grep -r "general-purpose" ./gsd-opencode/command/gsd/` should return nothing
- `grep -c "name: gsd:" ./gsd-opencode/command/gsd/*.md` should show 27 matches
</verification>

<success_criteria>
- [ ] 27 command files successfully copied and translated
- [ ] All Claude Code tool names replaced with OpenCode equivalents
- [ ] All agent names updated to OpenCode conventions
- [ ] All path references updated to OpenCode config locations
- [ ] All <sub>...</sub> tags replaced with *...*
- [ ] All "All arguments" replaced with ($ARGUMENTS)
- [ ] Each file has proper name: gsd:<name> frontmatter
- [ ] YAML frontmatter is valid for all files
- [ ] No Claude Code references remain
- [ ] README.md, assets/*, gsd-opencode/bin/*, gsd-opencode/package.json remain unchanged
</success_criteria>
