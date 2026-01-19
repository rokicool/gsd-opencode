<objective>
Translate all agent files from Claude Code's get-shit-done system to OpenCode format.

**Why this matters:** Agent files define specialized AI agents that perform specific tasks. They must be translated to work with OpenCode's agent system.

**End goal:** All agent files work as OpenCode agents with correct tool sets and specifications.
</objective>

<context>
This is prompt 6 of 6 in the translation sequence. Use the mapping document created in prompt 1 as your reference.

**Source files:** ./original/agents/*.md
**Target directory:** ./gsd-opencode/agents/

**Mapping reference:** @./assets/prompts/TRANSLATION-MAPPING.md

**Agent documentation:** https://opencode.ai/docs/agents/

**Project context:**
- Project name: "gsd-opencode"
- Config folder: ~/.config/opencode OR .opencode/ (not ~/.claude)
- Translate all Claude Code-specific tools, names to OpenCode equivalents

**Translation rules:**
1. Frontmatter: Update agent frontmatter to OpenCode agent specification format
2. Tool names: Translate all tool names in frontmatter and content to OpenCode equivalents
3. File paths: Update all file path references to OpenCode structure
4. XML tags: Convert `<sub>something</sub>` to `*something*`
5. Command references: Update gsd:<name> to gsd-<name>
6. Config paths: Update ~/.claude to ~/.config/opencode or .opencode/
7. Agent capabilities: Update tool lists to OpenCode equivalents
8. Workflow references: Update workflow paths to OpenCode structure
</context>

<requirements>
1. Create target directory: ./gsd-opencode/agents/

2. Translate each .md file from ./original/agents/ to ./gsd-opencode/agents/

3. For each agent file:
   - Update frontmatter to match OpenCode agent specification format per mapping document
   - Translate all tool names in frontmatter to OpenCode equivalents
   - Update agent name if it references Claude Code
   - Translate all tool names in agent content to OpenCode equivalents
   - Update all file path references to OpenCode structure
   - Convert all `<sub>something</sub>` tags to `*something*`
   - Update any command references to use gsd-<name> format
   - Update config directory references
   - Update workflow references to point to OpenCode structure
   - Preserve the agent's role, capabilities, and behavior
   - Maintain the agent's documentation and examples

4. Ensure agents have the correct tool sets for OpenCode

5. Maintain the agent's functionality and purpose

6. Update any examples in agent descriptions to use OpenCode syntax
</requirements>

<implementation>
Follow the mapping document at ./assets/prompts/TRANSLATION-MAPPING.md for specific conversion rules, especially the agent specification section.

For each file:
1. Read the source file
2. Identify all Claude Code-specific elements in frontmatter and content
3. Update frontmatter to OpenCode agent format (may involve restructuring)
4. Apply all translation rules from the mapping document
5. Verify the translated agent makes sense in OpenCode context
6. Ensure the agent has the correct tools for its purpose in OpenCode
7. Write to target location

**Important:**
- Agent frontmatter structure may differ significantly between Claude Code and OpenCode
- Use the mapping document for the correct OpenCode agent specification format
- Preserve the agent's role, philosophy, and behavior descriptions
- Update tool lists to match OpenCode's available tools
- Maintain the agent's specialized capabilities and purpose
- Update examples and patterns in the agent content
- Ensure agent spawning references use OpenCode format
</implementation>

<output>
Create/modify files in:
- `./gsd-opencode/agents/` - All translated agent files

Each agent file should:
- Have OpenCode-compliant frontmatter
- Use OpenCode tool names in frontmatter and content
- Reference files in the correct OpenCode structure
- Use OpenCode-compatible XML tags
- Reference commands with gsd-<name> format
- Preserve original agent role and purpose
- Have correct tool sets for OpenCode
- Maintain agent documentation and examples
</output>

<verification>
After completing translations:

1. Verify all agent files have been translated:
   ```bash
   ls -la ./original/agents/*.md | wc -l
   ls -la ./gsd-opencode/agents/*.md | wc -l
   ```
   The counts should match.

2. Check that frontmatter follows OpenCode agent specification format:
   - Review frontmatter of each agent file
   - Ensure correct fields and structure per mapping document

3. Check that no Claude Code tool names remain:
   ```bash
   grep -r "WebFetch\|AskUserQuestion" ./gsd-opencode/agents/
   ```
   Should return nothing.

4. Verify no `<sub>` tags remain:
   ```bash
   grep -r "<sub>" ./gsd-opencode/agents/
   ```
   Should return nothing.

5. Verify workflow references point to correct locations

6. Spot-check a few agent files to ensure frontmatter is correct
</verification>

<success_criteria>
- [ ] ./gsd-opencode/agents/ directory created
- [ ] All agent files from source translated
- [ ] All agent frontmatter follows OpenCode specification format
- [ ] All tool names in frontmatter translated to OpenCode equivalents
- [ ] All tool names in content translated to OpenCode equivalents
- [ ] All file paths updated to OpenCode structure
- [ ] All `<sub>` tags converted to `*`
- [ ] All command references use gsd-<name> format
- [ ] Agent roles and purposes preserved
- [ ] Tool sets correct for OpenCode
- [ ] File count matches between source and target
</success_criteria>
