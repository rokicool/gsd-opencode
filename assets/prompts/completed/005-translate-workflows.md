<objective>
Translate all workflow files from Claude Code's get-shit-done system to OpenCode format.

**Why this matters:** Workflow files define processes and procedures used by commands. They must be translated to work with OpenCode's tools and agents.

**End goal:** All workflow files work with OpenCode's conventions and capabilities.
</objective>

<context>
This is prompt 5 of 6 in the translation sequence. Use the mapping document created in prompt 1 as your reference.

**Source files:** ./original/get-shit-done/get-shit-done/workflows/*.md
**Target directory:** ./gsd-opencode/get-shit-done/workflows/

**Mapping reference:** @./gsd-opencode/TRANSLATION-MAPPING.md

**Project context:**
- Project name: "gsd-opencode"
- Config folder: ~/.config/opencode OR .opencode/ (not ~/.claude)
- Translate all Claude Code-specific names, tools, agents to OpenCode equivalents

**Translation rules:**
1. Tool names: Translate all tool references to OpenCode equivalents
2. Agent names: Translate all agent references to OpenCode equivalents
3. File paths: Update all file paths to OpenCode structure
4. XML tags: Convert `<sub>something</sub>` to `*something*`
5. Command references: Update gsd:<name> to gsd-<name>
6. Config paths: Update ~/.claude to ~/.config/opencode or .opencode/
7. Workflow steps: Update any tool invocations to use OpenCode syntax
8. Agent spawning: Update agent invocation patterns to OpenCode format
</context>

<requirements>
1. Create target directory: ./gsd-opencode/get-shit-done/workflows/

2. Translate each .md file from ./original/get-shit-done/get-shit-done/workflows/ to ./gsd-opencode/get-shit-done/workflows/

3. For each workflow file:
   - Translate all tool names to OpenCode equivalents
   - Translate all agent names to OpenCode equivalents
   - Update all file path references to OpenCode structure
   - Convert all `<sub>something</sub>` tags to `*something*`
   - Update any command references to use gsd-<name> format
   - Update config directory references
   - Update workflow steps and procedures to use OpenCode tool syntax
   - Update agent spawning patterns to use OpenCode agent format
   - Preserve the workflow structure and step-by-step procedures
   - Update any bash commands or CLI invocations to match OpenCode

4. Maintain the original workflow logic and procedures

5. Ensure all tool invocations in workflows use OpenCode syntax

6. Update agent spawning to use OpenCode's agent invocation patterns
</requirements>

<implementation>
Follow the mapping document at ./gsd-opencode/TRANSLATION-MAPPING.md for specific conversion rules.

For each file:
1. Read the source file
2. Identify all Claude Code-specific elements (tools, agents, paths, patterns)
3. Apply all translation rules from the mapping document
4. Pay special attention to workflow steps that invoke tools or spawn agents
5. Verify the translated workflow makes sense in OpenCode context
6. Write to target location

**Important:**
- Workflows contain procedural steps - ensure tool invocations are correct for OpenCode
- Agent spawning patterns may differ significantly - use the mapping document
- Bash commands within workflows may need updates if they reference Claude Code paths
- Preserve the overall workflow structure and step numbering
- Maintain the logic and intent of each workflow
- Update any examples or inline code to use OpenCode syntax
</implementation>

<output>
Create/modify files in:
- `./gsd-opencode/get-shit-done/workflows/` - All translated workflow files

Each workflow file should:
- Use OpenCode tool names in all tool invocations
- Use OpenCode agent names in all agent references
- Use OpenCode agent spawning patterns
- Reference files in the correct OpenCode structure
- Use OpenCode-compatible XML tags
- Reference commands with gsd-<name> format
- Maintain workflow structure and step-by-step procedures
- Preserve original workflow logic
</output>

<verification>
After completing translations:

1. Verify all workflow files have been translated:
   ```bash
   ls -la ./original/get-shit-done/get-shit-done/workflows/*.md | wc -l
   ls -la ./gsd-opencode/get-shit-done/workflows/*.md | wc -l
   ```
   The counts should match.

2. Check that no Claude Code tool names remain in workflow steps:
   ```bash
   grep -r "Read\|Write\|Bash\|Glob\|Grep\|Task\|WebFetch" ./gsd-opencode/get-shit-done/workflows/
   ```
   Only OpenCode equivalents should be present.

3. Verify no `<sub>` tags remain:
   ```bash
   grep -r "<sub>" ./gsd-opencode/get-shit-done/workflows/
   ```
   Should return nothing.

4. Verify agent spawning patterns use OpenCode format

5. Spot-check a few workflow files to ensure steps are correctly translated
</verification>

<success_criteria>
- [ ] ./gsd-opencode/get-shit-done/workflows/ directory created
- [ ] All workflow files from source translated
- [ ] All tool names in workflow steps translated to OpenCode equivalents
- [ ] All agent names translated to OpenCode equivalents
- [ ] All agent spawning patterns use OpenCode format
- [ ] All file paths updated to OpenCode structure
- [ ] All `<sub>` tags converted to `*`
- [ ] Workflow structure and logic preserved
- [ ] All bash commands updated if needed
- [ ] File count matches between source and target
</success_criteria>
