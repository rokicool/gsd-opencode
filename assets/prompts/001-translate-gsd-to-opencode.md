<objective>
Translate the entire get-shit-done metaprompt system from Claude Code to OpenCode. This involves transforming all prompts, commands, references, templates, workflows, and agents to work with OpenCode's tools, agents, and conventions while preserving the original system's functionality and structure.

**Why this matters**: The get-shit-done system (created by TACHES - https://github.com/glittercowboy/get-shit-done) is a powerful development methodology that needs to be adapted for OpenCode users (https://opencode.ai) who want the same productivity benefits but with OpenCode's tooling and agent ecosystem.

**End goal**: A fully functional gsd-opencode system where all commands, workflows, and agents work seamlessly with OpenCode's tools, agents, and configuration structure.
</objective>

<context>
**Source system**: Claude Code's get-shit-done (./original/get-shit-done)
**Target system**: OpenCode adaptation (./gsd-opencode)

**Target audience**: Application developers using OpenCode

**Key differences to address**:
- Claude Code config: ~/.claude → OpenCode config: ~/.config/opencode or .opencode/
- Command syntax: /gsd:subcommand → /gsd-subcommand (colon not supported)
- Folder structure: commands/ → command/
- Agent names and tool references need OpenCode equivalents
- Tag syntax: <sub>text</sub> → *text*
- Commands: /clear → /new

**Documentation to consult**:
- OpenCode docs: https://opencode.ai/docs
- OpenCode agents: https://opencode.ai/docs/agents/

**Files to translate**:
1. Commands: ./original/get-shit-done/commands/gsd/*.md → ./gsd-opencode/command/gsd/*.md
2. References: ./original/get-shit-done/get-shit-done/references/*.md → ./gsd-opencode/get-shit-done/references/*.md
3. Templates: ./original/get-shit-done/get-shit-done/templates/*.md → ./gsd-opencode/get-shit-done/templates/*.md
4. Workflows: ./original/get-shit-done/get-shit-done/workflows/*.md → ./gsd-opencode/get-shit-done/workflows/*.md
5. Agents: ./original/agents/*.md → ./gsd-opencode/agents/*.md

**Author attribution**: Original system by TACHES (https://github.com/glittercowboy/get-shit-done)
</context>

<transformation_rules>
1. **Command frontmatter**: Add `name: gsd-<command-name>` to header (replace colon with dash)
   - Example: `name: gsd:plan-phase` → `name: gsd-plan-phase`

2. **Config paths**:
   - `~/.claude/` → `~/.config/opencode/` or `.opencode/`
   - `~/.claude/get-shit-done/` → `~/.config/opencode/get-shit-done/` or `.opencode/get-shit-done/`

3. **Project references**:
   - `get-shit-done-cc` → `gsd-opencode`
   - `https://raw.githubusercontent.com/glittercowboy/get-shit-done` → `https://raw.githubusercontent.com/rokicool/gsd-opencode`

4. **Tool and agent mapping**:
   - Thoroughly analyze each tool and agent reference
   - Map Claude Code tools to equivalent OpenCode tools
   - Map Claude Code agents to equivalent OpenCode agents
   - Consult https://opencode.ai/docs/ for official tool/agent names

5. **Tag syntax**:
   - `<sub>text</sub>` → `*text*` (single star)

6. **Commands**:
   - `/clear` → `/new`

7. **Variables**:
   - When metaprompt expects "All arguments", update to use `$ARGUMENTS` variable

8. **Folder paths**:
   - ./original/get-shit-done/commands/gsd/ → ./gsd-opencode/command/gsd/
   - ./original/get-shit-done/get-shit-done/references/ → ./gsd-opencode/get-shit-done/references/
   - ./original/get-shit-done/get-shit-done/templates/ → ./gsd-opencode/get-shit-done/templates/
   - ./original/get-shit-done/get-shit-done/workflows/ → ./gsd-opencode/get-shit-done/workflows/
   - ./original/agents/ → ./gsd-opencode/agents/

9. **Forbidden strings**: Ensure none of these appear in translated files:
   - Claude Code specific paths (~/.claude)
   - Original GitHub URLs (glittercowboy)
   - Original project name (get-shit-done-cc)
   - Unsupported syntax (colon in command names)

10. **DO NOT modify**:
    - ./README.md
    - ./assets/*
    - ./gsd-opencode/bin/*
    - ./gsd-opencode/package.json
    - ./original/*
</transformation_rules>

<process>
For maximum efficiency, follow this sequential approach:

## Step 1: Create or update Translation Mapping Document

Create or update `./assets/prompts/TRANSLATION-MAPPING.md` to document all transformations for consistency:

```markdown
# Translation Mapping: Claude Code → OpenCode

## Command Names
| Claude Code | OpenCode |
|-------------|----------|
| gsd:plan-phase | gsd-plan-phase |
| gsd:execute-phase | gsd-execute-phase |
| ... | ... |

## Tool Mapping
| Claude Code Tool | OpenCode Tool |
|------------------|---------------|
| Read | Read |
| Write | Write |
| ... | ... |

## Agent Mapping
| Claude Code Agent | OpenCode Agent |
|-------------------|----------------|
| gsd-planner | [OpenCode equivalent] |
| gsd-researcher | [OpenCode equivalent] |
| ... | ... |

## Path Transformations
| Claude Code | OpenCode |
|-------------|----------|
| ~/.claude/ | ~/.config/opencode/ |
| ~/.claude/get-shit-done/ | ~/.config/opencode/get-shit-done/ |
| ... | ... |

## Command Replacements
| Claude Code | OpenCode |
|-------------|----------|
| /clear | /new |
| ... | ... |
```

## Step 2: Analyze OpenCode Documentation

Use WebFetch to gather OpenCode tool and agent information:

```bash
# Fetch OpenCode documentation for tools and agents
```

## Step 3: Translate Files by Category

Translate each category systematically, applying all transformation rules:

**A. Commands** (./original/get-shit-done/commands/gsd/*.md):
- Update frontmatter (name field)
- Replace config paths
- Map tools and agents
- Update command references

**B. References** (./original/get-shit-done/get-shit-done/references/*.md):
- Replace Claude Code terminology with OpenCode equivalents
- Update config paths
- Ensure all tool/agent references are OpenCode-compatible

**C. Templates** (./original/get-shit-done/get-shit-done/templates/*.md):
- Apply all transformation rules
- Update all path references
- Convert tag syntax

**D. Workflows** (./original/get-shit-done/get-shit-done/workflows/*.md):
- Translate workflow-specific terminology
- Update tool/agent references
- Ensure compatibility with OpenCode commands

**E. Agents** (./original/agents/*.md):
- Thoroughly analyze each agent's purpose
- Map to equivalent OpenCode agent functionality
- Update all tool references to OpenCode tools

## Step 3a: Modify use OR just use assets/bin/translate-files.js

- Check the consistancy of assets/bin/translate-files.js file according to assets/prompts/TRANSLATION-MAPPING.md
- Use assets/bin/translate-files.js it suits the task

## Step 4: Verify Translations

Run the forbidden strings checker:

```bash
node ./assets/bin/check-forbidden-strings.js
```

Review any issues and fix them.

## Step 5: Create Translation Summary

Create `./assets/prompts/TRANSLATION-SUMMARY.md` documenting:
- Total files translated
- Key transformations made
- Any issues encountered and resolutions
- Verification results
</process>

<implementation>
**Approach**: Thoroughly analyze each file's content and purpose, then apply transformation rules systematically. Consider multiple approaches for ambiguous mappings and choose the most appropriate OpenCode equivalent.

**Quality considerations**:
- Preserve the original system's functionality and intent
- Ensure all cross-references between files work correctly
- Maintain consistent terminology throughout
- Verify that all commands, workflows, and agents work together

**What to avoid**:
- Literal string replacement without understanding context
- Breaking cross-file references
- Losing functionality during translation
- Leaving Claude Code-specific terminology

**Why constraints matter**:
- Colon in command names breaks OpenCode syntax
- Wrong config paths prevent files from loading
- Incorrect tool/agent references cause runtime errors
- Original attribution must be preserved for licensing/attribution
</implementation>

<output>
**Create/modify these files**:
- `./assets/prompts/TRANSLATION-MAPPING.md` - Document all transformations
- `./assets/prompts/TRANSLATION-SUMMARY.md` - Summary of translation work
- `./gsd-opencode/command/gsd/*.md` - Translated commands
- `./gsd-opencode/get-shit-done/references/*.md` - Translated references
- `./gsd-opencode/get-shit-done/templates/*.md` - Translated templates
- `./gsd-opencode/get-shit-done/workflows/*.md` - Translated workflows
- `./gsd-opencode/agents/*.md` - Translated agents
- './translated-README.md' - translated original/get-shit-done/README.md
</output>

<verification>
Before declaring complete, verify:

1. **All files translated**:
   ```bash
   # Count source and target files to ensure completeness
   find ./original/get-shit-done/commands/gsd -name "*.md" | wc -l
   find ./gsd-opencode/command/gsd -name "*.md" | wc -l
   ```

2. **No forbidden strings**:
   ```bash
   node ./assets/bin/check-forbidden-strings.js
   ```

3. **Consistent terminology**:
   - No remaining references to Claude Code-specific paths
   - All tool/agent references use OpenCode terminology
   - Project references use gsd-opencode

4. **Valid frontmatter**:
   - All commands have `name: gsd-*` format
   - No colons in command names

5. **Cross-file references work**:
   - Commands reference correct workflow paths
   - Templates reference correct config paths
   - Workflows reference correct tools/agents

6. **Documentation review**:
   - TRANSLATION-MAPPING.md is complete
   - TRANSLATION-SUMMARY.md documents all changes
</verification>

<success_criteria>
- ✓ All 87+ markdown files translated from original to gsd-opencode
- ✓ No forbidden strings remain in translated files
- ✓ All command names use gsd-* format (no colons)
- ✓ All config paths use ~/.config/opencode/ or .opencode/
- ✓ All tool/agent references use OpenCode terminology
- ✓ All tag syntax converted from <sub> to *
- ✓ /clear commands replaced with /new
- ✓ Cross-file references are correct and consistent
- ✓ TRANSLATION-MAPPING.md documents all transformations
- ✓ TRANSLATION-SUMMARY.md provides complete overview
- ✓ Forbidden strings checker passes with no errors
</success_criteria>
