<objective>
Translate all template files from Claude Code's get-shit-done system to OpenCode format.

**Why this matters:** Template files provide structure for prompts and outputs. They must be translated to work with OpenCode's conventions.

**End goal:** All template files work with OpenCode's tools, agents, and structure.
</objective>

<context>
This is prompt 4 of 6 in the translation sequence. Use the mapping document created in prompt 1 as your reference.

**Source files:** ./original/get-shit-done/get-shit-done/templates/*.md and subdirectories
**Target directory:** ./gsd-opencode/get-shit-done/templates/

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
7. Template variables: Update any Claude Code-specific variables
8. Include/exclude patterns: Update to OpenCode conventions
</context>

<requirements>
1. Create target directory: ./gsd-opencode/get-shit-done/templates/

2. Translate all .md files from ./original/get-shit-done/get-shit-done/templates/ (including subdirectories) to ./gsd-opencode/get-shit-done/templates/

3. Maintain the same directory structure within templates/

4. For each template file:
   - Translate all tool names to OpenCode equivalents
   - Translate all agent names to OpenCode equivalents
   - Update all file path references to OpenCode structure
   - Convert all `<sub>something</sub>` tags to `*something*`
   - Update any command references to use gsd-<name> format
   - Update config directory references
   - Update any Claude Code-specific template variables
   - Preserve the template structure and variable placeholders

5. Maintain the original template structure and variable naming where appropriate

6. Ensure all examples in templates use OpenCode syntax

7. Update any inline code or examples to match OpenCode conventions
</requirements>

<implementation>
Follow the mapping document at ./gsd-opencode/TRANSLATION-MAPPING.md for specific conversion rules.

For each file:
1. Read the source file
2. Identify all Claude Code-specific elements (tools, agents, paths, patterns)
3. Apply all translation rules from the mapping document
4. Verify the translated template makes sense in OpenCode context
5. Maintain the template's structure and variable placeholders
6. Write to target location (preserving subdirectory structure)

**Important:**
- Templates often contain variable placeholders like `{variable}` - preserve these
- Maintain the same overall structure and sections
- Update examples and code snippets to use OpenCode syntax
- If a template references specific Claude Code features, adapt to OpenCode equivalents
- Preserve the intended use of each template
</implementation>

<output>
Create/modify files in:
- `./gsd-opencode/get-shit-done/templates/` - All translated template files (maintaining subdirectory structure)

Each template file should:
- Use OpenCode tool names
- Use OpenCode agent names
- Reference files in the correct OpenCode structure
- Use OpenCode-compatible XML tags
- Contain examples using OpenCode syntax
- Reference commands with gsd-<name> format
- Maintain template variable placeholders
- Preserve original template structure
</output>

<verification>
After completing translations:

1. Verify all template files have been translated (including subdirectories):
   ```bash
   find ./original/get-shit-done/get-shit-done/templates/ -name "*.md" | wc -l
   find ./gsd-opencode/get-shit-done/templates/ -name "*.md" | wc -l
   ```
   The counts should match.

2. Verify directory structure is preserved:
   ```bash
   ls -R ./original/get-shit-done/get-shit-done/templates/
   ls -R ./gsd-opencode/get-shit-done/templates/
   ```
   Compare to ensure structure matches.

3. Check that no Claude Code tool names remain:
   ```bash
   grep -r "Read\|Write\|Bash\|Glob\|Grep\|Task\|WebFetch" ./gsd-opencode/get-shit-done/templates/
   ```
   Only OpenCode equivalents should be present.

4. Verify no `<sub>` tags remain:
   ```bash
   grep -r "<sub>" ./gsd-opencode/get-shit-done/templates/
   ```
   Should return nothing.

5. Verify template variable placeholders are preserved

6. Spot-check examples in a few files
</verification>

<success_criteria>
- [ ] ./gsd-opencode/get-shit-done/templates/ directory created
- [ ] All template files from source translated
- [ ] Directory structure preserved
- [ ] All tool names translated to OpenCode equivalents
- [ ] All agent names translated to OpenCode equivalents
- [ ] All file paths updated to OpenCode structure
- [ ] All `<sub>` tags converted to `*`
- [ ] Template variable placeholders preserved
- [ ] All examples use OpenCode syntax
- [ ] File count matches between source and target
</success_criteria>
