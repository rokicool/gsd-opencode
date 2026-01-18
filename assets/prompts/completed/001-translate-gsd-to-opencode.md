<objective>
Translate the Get-Shit-Done (GSD) meta-prompting system from Claude Code to OpenCode, creating a fully functional adaptation that any OpenCode developer can use.

The original GSD system (./original/get-shit-done/) was built for Claude Code with its specific architecture, tools, agents, and command syntax. Your task is to translate all components to work seamlessly with OpenCode's architecture while preserving the functionality and philosophy of the original system.

This is a complex, multi-file translation task requiring careful adaptation of:
- Command files (26 files in ./original/get-shit-done/commands/gsd/)
- Agent definitions (11 files in ./original/get-shit-done/agents/)
- Reference files (7 files in ./original/get-shit-done/get-shit-done/references/)
- Tool references and agent invocations throughout
- Configuration paths and command syntax
- Documentation and style references

The output will be a complete, installable GSD system for OpenCode in ./gsd-opencode/ directory.
</objective>

<context>
**Original System Location:** ./original/get-shit-done/
- Commands: ./original/get-shit-done/commands/gsd/*.md (26 command files)
- Agents: ./original/get-shit-done/agents/*.md (11 agent files)
- Reference Files: ./original/get-shit-done/get-shit-done/references/*.md (7 reference files)
- Templates/Workflows: ./original/get-shit-done/ (shared templates and workflows)

**Target System Location:** ./gsd-opencode/
- Commands: ./gsd-opencode/command/gsd/*.md (singular "command", not plural)
- Agents: ./gsd-opencode/agents/*.md
- Reference Files: ./gsd-opencode/references/*.md
- Templates/Workflows: ./gsd-opencode/workflows/ and ./gsd-opencode/templates/

**Original Author:** TÂCHES (https://github.com/glittercowboy/get-shit-done)
**Project Name:** gsd-opencode

**Key Differences Between Claude Code and OpenCode:**

1. **Config Directory:**
   - Claude Code: ~/.claude/
   - OpenCode: ~/.config/opencode/ or .opencode/

2. **Command Syntax:**
   - Claude Code: Supports /gsd:subcommand (colon syntax)
   - OpenCode: Does NOT support colons in command names
   - Solution: Add frontmatter with `name: gsd-<name>` for each command

3. **Command Directory:**
   - Claude Code: commands/gsd/ (plural)
   - OpenCode: command/gsd/ (singular)

4. **Tools:**
   - Claude Code tools must be mapped to OpenCode equivalents
   - Common tools: Read, Write, Edit, Bash, Glob, Grep, WebFetch
   - MCP tools: Format differs between systems

5. **Agents:**
   - Both systems support primary and subagent modes
   - Agent configuration syntax differs (YAML frontmatter vs JSON)
   - OpenCode agents use markdown files with YAML frontmatter

6. **Variable Expansion:**
   - Claude Code uses various variable formats
   - OpenCode uses specific placeholders like $ARGUMENTS, $1, $2, etc.

**OpenCode Documentation for Reference:**
- Commands: https://opencode.ai/docs/commands
- Agents: https://opencode.ai/docs/agents
- Tools: https://opencode.ai/docs/tools

**Files NOT to Modify:**
- ./README.md
- ./assets/*
- ./gsd-opencode/bin/*
- ./gsd-opencode/package.json
- ./original/* (source files, read-only)
</context>

<requirements>
**Required Translations:**

1. **Command Files (26 files):**
   - Read each file from ./original/get-shit-done/commands/gsd/
   - Create OpenCode-compatible version in ./gsd-opencode/command/gsd/
   - Add YAML frontmatter with `name:` field
   - Translate all Claude Code tool references to OpenCode equivalents
   - Replace Claude Code agent invocations with OpenCode-compatible calls
   - Update any path references (~/.claude → ~/.config/opencode or .opencode)
   - Translate variable syntax where needed
   - Replace <sub>tag</sub> with *tag* (markdown italic)

2. **Agent Files (11 files):**
   - Read each file from ./original/get-shit-done/agents/
   - Create OpenCode-compatible version in ./gsd-opencode/agents/
   - Ensure frontmatter is valid YAML for OpenCode agents
   - Translate tools section to OpenCode format
   - Update agent descriptions for OpenCode context
   - Maintain agent roles and responsibilities
   - Translate any tool invocations within agent instructions

3. **Reference Files (7 files):**
   - Read each file from ./original/get-shit-done/get-shit-done/references/
   - Create OpenCode-compatible version in ./gsd-opencode/references/
   - Translate all Claude Code tool references to OpenCode equivalents
   - Replace Claude Code agent invocations with OpenCode-compatible calls
   - Update any path references (~/.claude → ~/.config/opencode or .opencode)
   - Replace <sub>tag</sub> with *tag* (markdown italic)
   - These files are included by agents/commands via @ references - update those paths

3. **Tool Translation Mapping:**
   - Identify all tool references in original files
   - Map to OpenCode equivalents:
     * File operations: Read, Write, Edit → same in OpenCode
     * Bash: Bash → same in OpenCode
     * Search: Glob, Grep → same in OpenCode
     * Web: WebFetch → same in OpenCode
     * MCP tools: Update naming conventions (mcp__* format may differ)

4. **Command Naming:**
   - Original GSD uses /gsd:subcommand syntax
   - OpenCode version must use /gsd-subcommand syntax
   - Add frontmatter: `name: gsd-<subcommand-name>`
   - Example: /gsd:plan-phase → name: gsd-plan-phase

5. **Path Translations:**
   - ~/.claude → ~/.config/opencode (global config)
   - ~/.claude → .opencode (project config)
   - commands/ → command/
   - Any path references in prompts must be updated

6. **Tag Translations:**
   - Replace <sub>text</sub> with *text* throughout all files
   - This applies to agents, commands, templates, workflows

7. **Agent Invocations:**
   - Update syntax for spawning subagents
   - Ensure OpenCode-compatible agent references
   - Maintain orchestration logic but adapt to OpenCode's agent system

8. **Templates and Workflows:**
   - If templates/workflows exist, translate them similarly
   - Create ./gsd-opencode/workflows/ and ./gsd-opencode/templates/ directories
   - Update all references within these files
</requirements>

<translation_rules>
**Critical Rules for Translation:**

1. **Preserve Functionality:**
   - The translated system must function identically to the original
   - All command workflows must work in OpenCode
   - All agent orchestration must work correctly
   - User experience should be the same

2. **Maintain Structure:**
   - Keep the same command structure (26 commands)
   - Keep the same agent set (11 agents)
   - Maintain file organization logic
   - Preserve the XML prompt formatting and philosophies

3. **Adapt Syntax Only:**
   - Change syntax to match OpenCode requirements
   - Do NOT change functionality or logic
   - Do NOT restructure the system architecture
   - Maintain TÂCHES' design decisions

4. **Tool Equivalence:**
   - Read OpenCode docs for exact tool names
   - Use correct tool syntax for OpenCode
   - MCP server tools: check OpenCode's MCP server syntax

5. **Command Frontmatter:**
   Every OpenCode command file must have:
   ```yaml
   ---
   name: gsd-<command-name>
   description: <original description adapted for OpenCode>
   ---
   ```

6. **Agent Frontmatter:**
   Every OpenCode agent file must have:
   ```yaml
   ---
   name: <agent-name>
   description: <original description adapted>
   mode: subagent  # or primary as appropriate
   tools:
     <tool-name>: true/false
   ---
   ```

7. **Variable Syntax:**
   - If prompt expects "All arguments", replace with $ARGUMENTS
   - Use $1, $2, $3 for positional arguments in OpenCode
   - Update any other variable syntax to OpenCode format

8. **Tag Replacement:**
   - Systematically replace ALL <sub>text</sub> with *text*
   - This includes nested tags and multiple occurrences

9. **Path Consistency:**
   - Always use .opencode/ for project-local config
   - Always use ~/.config/opencode/ for global config
   - Never reference ~/.claude/ in translated files

10. **Verification:**
    - After translation, verify each command file is valid
    - Verify each agent file is valid
    - Check that all file references are correct
    - Ensure no Claude Code remnants remain
</translation_rules>

<execution_steps>
**Step 1: Prepare Directories**
```bash
mkdir -p ./gsd-opencode/command/gsd
mkdir -p ./gsd-opencode/agents
mkdir -p ./gsd-opencode/workflows
mkdir -p ./gsd-opencode/templates
```

**Step 2: List and Catalog Files**
```bash
# List all command files
ls -1 ./original/get-shit-done/commands/gsd/*.md > /tmp/gsd-commands.txt

# List all agent files
ls -1 ./original/get-shit-done/agents/*.md > /tmp/gsd-agents.txt

# List all reference files
ls -1 ./original/get-shit-done/get-shit-done/references/*.md > /tmp/gsd-references.txt

# Count files for tracking
echo "Commands: $(wc -l < /tmp/gsd-commands.txt)"
echo "Agents: $(wc -l < /tmp/gsd-agents.txt)"
echo "References: $(wc -l < /tmp/gsd-references.txt)"
```

**Step 3: Translate Commands (26 files)**
For each command file:
1. Read the original file
2. Extract existing frontmatter (if any)
3. Add OpenCode-compatible frontmatter with `name:` field
4. Translate all tool references to OpenCode equivalents
5. Update agent invocation syntax for OpenCode
6. Replace all <sub>tag</sub> with *tag*
7. Update any ~/.claude/ paths to .opencode/ or ~/.config/opencode/
8. Update variable syntax to OpenCode format ($ARGUMENTS, $1, $2, etc.)
9. Write to ./gsd-opencode/command/gsd/ with same filename

**Step 4: Translate Agents (11 files)**
For each agent file:
1. Read the original agent definition
2. Adapt frontmatter for OpenCode agent syntax
3. Update tools list to OpenCode format
4. Translate any tool invocations within agent's instructions
5. Replace <sub>tag</sub> with *tag*
6. Update path references
7. Write to ./gsd-opencode/agents/ with same filename

**Step 5: Translate Reference Files (7 files)**
For each reference file:
1. Read the original reference file
2. Translate all Claude Code tool references to OpenCode equivalents
3. Replace Claude Code agent invocations with OpenCode-compatible calls
4. Update any path references (~/.claude → ~/.config/opencode or .opencode)
5. Replace <sub>tag</sub> with *tag* (markdown italic)
6. Update any @ references to point to ./gsd-opencode/references/ instead
7. Write to ./gsd-opencode/references/ with same filename

**Step 6: Translate Templates/Workflows**
For any templates or workflows in ./original/get-shit-done/:
1. Read each template/workflow file
2. Translate all tool references and agent invocations
3. Update paths
4. Replace tags
5. Write to appropriate directory in ./gsd-opencode/

**Step 7: Create Index/Documentation**
Create ./gsd-opencode/TRANSLATION.md documenting:
- What was translated
- Key differences between versions
- Command mapping (old: /gsd:name → new: /gsd-name)
- Tool mapping (if any differences)
- Known limitations or notes

**Step 8: Verify Translation**
Run verification checks:
```bash
# Check all command files exist
ls -1 ./gsd-opencode/command/gsd/*.md | wc -l  # Should be 26

# Check all agent files exist
ls -1 ./gsd-opencode/agents/*.md | wc -l  # Should be 11

# Check for remaining Claude Code references
grep -r "Claude Code" ./gsd-opencode/ || echo "No Claude Code references found"

# Check for remaining ~/.claude/ references
grep -r "\.claude" ./gsd-opencode/ || echo "No .claude references found"

# Check for remaining <sub> tags
grep -r "<sub>" ./gsd-opencode/ || echo "No <sub> tags found"
```
</execution_steps>

<output>
Create translated files in this structure:
```
./gsd-opencode/
├── command/
│   └── gsd/
│       ├── add-phase.md           (translated)
│       ├── add-todo.md           (translated)
│       ├── audit-milestone.md     (translated)
│       ├── check-todos.md         (translated)
│       ├── complete-milestone.md  (translated)
│       ├── debug.md              (translated)
│       ├── discuss-phase.md       (translated)
│       ├── execute-phase.md      (translated)
│       ├── help.md              (translated)
│       ├── insert-phase.md       (translated)
│       ├── list-phase-assumptions.md (translated)
│       ├── map-codebase.md      (translated)
│       ├── new-milestone.md     (translated)
│       ├── new-project.md       (translated)
│       ├── pause-work.md        (translated)
│       ├── plan-milestone-gaps.md (translated)
│       ├── plan-phase.md        (translated)
│       ├── progress.md          (translated)
│       ├── remove-phase.md      (translated)
│       ├── research-phase.md    (translated)
│       ├── resume-work.md       (translated)
│       ├── update.md            (translated)
│       ├── verify-work.md       (translated)
│       ├── whats-new.md         (translated)
│       └── [other commands]    (translated)
├── agents/
│   ├── gsd-codebase-mapper.md   (translated)
│   ├── gsd-debugger.md          (translated)
│   ├── gsd-executor.md         (translated)
│   ├── gsd-integration-checker.md (translated)
│   ├── gsd-phase-researcher.md  (translated)
│   ├── gsd-plan-checker.md      (translated)
│   ├── gsd-planner.md          (translated)
│   ├── gsd-project-researcher.md (translated)
│   ├── gsd-research-synthesizer.md (translated)
│   ├── gsd-roadmapper.md        (translated)
│   └── gsd-verifier.md         (translated)
├── references/
│   ├── checkpoints.md           (translated)
│   ├── continuation-format.md   (translated)
│   ├── git-integration.md      (translated)
│   ├── questioning.md          (translated)
│   ├── tdd.md                (translated)
│   ├── ui-brand.md            (translated)
│   └── verification-patterns.md (translated)
├── workflows/                   (if templates/workflows exist)
├── templates/                   (if templates/workflows exist)
└── TRANSLATION.md               (documentation of changes)
```

**Expected File Counts:**
- Commands: 26 files in ./gsd-opencode/command/gsd/
- Agents: 11 files in ./gsd-opencode/agents/
- References: 7 files in ./gsd-opencode/references/
- Templates/Workflows: As needed
- Documentation: ./gsd-opencode/TRANSLATION.md
</output>

<success_criteria>
Translation is complete when:

**File Counts:**
- [ ] Exactly 26 command files in ./gsd-opencode/command/gsd/
- [ ] Exactly 11 agent files in ./gsd-opencode/agents/
- [ ] Exactly 7 reference files in ./gsd-opencode/references/
- [ ] TRANSLATION.md created and complete

**Content Quality:**
- [ ] All command files have valid YAML frontmatter with `name:` field
- [ ] All agent files have valid OpenCode frontmatter
- [ ] No references to "Claude Code" remain in translated files
- [ ] No references to "~/.claude/" remain in translated files
- [ ] No "<sub>" tags remain in any translated files
- [ ] All tool references are OpenCode-compatible
- [ ] All agent invocations are OpenCode-compatible
- [ ] All path references use .opencode/ or ~/.config/opencode/

**Functionality:**
- [ ] Command naming follows gsd-kebab-case format
- [ ] All original command functionality is preserved
- [ ] All original agent functionality is preserved
- [ ] System would be installable and functional in OpenCode

**Documentation:**
- [ ] TRANSLATION.md clearly explains what was changed
- [ ] Command mapping documented (old → new syntax)
- [ ] Any known limitations or differences noted
</success_criteria>

<verification>
After completing the translation, verify:

1. **File Count Verification:**
```bash
# Commands
echo "Original commands: $(ls -1 ./original/get-shit-done/commands/gsd/*.md | wc -l)"
echo "Translated commands: $(ls -1 ./gsd-opencode/command/gsd/*.md | wc -l)"

# Agents
echo "Original agents: $(ls -1 ./original/get-shit-done/agents/*.md | wc -l)"
echo "Translated agents: $(ls -1 ./gsd-opencode/agents/*.md | wc -l)"

# References
echo "Original references: $(ls -1 ./original/get-shit-done/get-shit-done/references/*.md | wc -l)"
echo "Translated references: $(ls -1 ./gsd-opencode/references/*.md | wc -l)"
```

2. **No Claude Code References:**
```bash
grep -r "Claude Code" ./gsd-opencode/ | head -5 || echo "✓ No Claude Code references found"
grep -r "\.claude" ./gsd-opencode/ | head -5 || echo "✓ No .claude paths found"
```

3. **No Old Tags:**
```bash
grep -r "<sub>" ./gsd-opencode/ | head -5 || echo "✓ No <sub> tags found"
grep -r "</sub>" ./gsd-opencode/ | head -5 || echo "✓ No </sub> tags found"
```

4. **Command Frontmatter Check:**
```bash
for f in ./gsd-opencode/command/gsd/*.md; do
  if ! head -10 "$f" | grep -q "^name: gsd-"; then
    echo "✗ Missing 'name: gsd-*' in $f"
  fi
done
echo "✓ All command files have valid name: field" || echo "✗ Some commands missing name field"
```

5. **Directory Structure Check:**
```bash
# Correct directory names
test -d ./gsd-opencode/command && echo "✓ command/ exists" || echo "✗ command/ missing"
test -d ./gsd-opencode/agents && echo "✓ agents/ exists" || echo "✗ agents/ missing"
test -d ./gsd-opencode/references && echo "✓ references/ exists" || echo "✗ references/ missing"

# Correct paths (not commands/, not ~/.claude)
test -d ./gsd-opencode/commands && echo "✗ Incorrect: commands/ should be command/"
test -d ./gsd-opencode/command && echo "✓ Correct: command/ used"
```

6. **Sample Validation:**
Check a few sample files to ensure quality:
- Read ./gsd-opencode/command/gsd/new-project.md (should have `name: gsd-new-project`)
- Read ./gsd-opencode/agents/gsd-planner.md (should have OpenCode frontmatter)
- Read ./gsd-opencode/references/checkpoints.md (should have all references updated)
- Verify no <sub> tags in these files
- Verify paths use .opencode/ or ~/.config/opencode/

7. **Translation Documentation:**
```bash
test -f ./gsd-opencode/TRANSLATION.md && echo "✓ TRANSLATION.md exists" || echo "✗ TRANSLATION.md missing"
head -50 ./gsd-opencode/TRANSLATION.md  # Review contents
```
</verification>

<notes>
**Important Considerations:**

1. **Systematic Approach:**
   - Use a systematic process to avoid missing files
   - Track progress: file X of 26 commands, file Y of 11 agents, file Z of 7 references
   - Verify each file before moving to next

2. **Maintain Philosophy:**
   - The GSD system's philosophy (context engineering, atomic tasks, etc.) must be preserved
   - Don't simplify or "optimize" - just translate
   - The XML formatting and task structure are core to the system

3. **Error Prevention:**
   - After writing each file, verify it's valid
   - Use grep to find any missed Claude Code references
   - Check for typos in command names

4. **Testing Considerations:**
   - While you can't run OpenCode, you can validate syntax
   - Verify YAML frontmatter is valid
   - Check that all references are consistent

5. **Edge Cases:**
   - Some commands may have complex orchestration - ensure agent invocations work
   - Templates/workflows may have many references - translate carefully
   - Any shared code or includes - update references

6. **Documentation Quality:**
   - TRANSLATION.md should help future maintainers understand changes
   - Include examples of before/after for complex changes
   - Note any limitations or differences in behavior

7. **Original Author Credit:**
   - Preserve TÂCHES' authorship in TRANSLATION.md
   - Reference the original repository
   - Acknowledge this is an adaptation, not original work
</notes>

<reference_files>
For reference during translation, examine these files to understand patterns:
- ./original/get-shit-done/GSD-STYLE.md (explains GSD philosophy)
- ./original/get-shit-done/commands/gsd/help.md (shows command structure)
- ./original/get-shit-done/agents/gsd-planner.md (shows agent structure)
- ./original/get-shit-done/agents/gsd-executor.md (shows tool usage)
- ./README.md (shows project context and goals)

Also reference:
- https://opencode.ai/docs/commands (OpenCode command syntax)
- https://opencode.ai/docs/agents (OpenCode agent syntax)
- https://opencode.ai/docs/tools (OpenCode tool names)
</reference_files>
