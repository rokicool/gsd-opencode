<objective>
Translate all reference files from Claude Code's get-shit-done system to OpenCode format.

**Why this matters:** Reference files contain patterns, conventions, and guidelines that commands and agents use. They must be translated to reference OpenCode instead of Claude Code.

**End goal:** All reference files work with OpenCode's tools, agents, and patterns.
</objective>

<context>
This is prompt 3 of 6 in the translation sequence. Use the mapping document created in prompt 1 as your reference.

**Source files:** ./original/get-shit-done/get-shit-done/references/*.md
**Target directory:** ./gsd-opencode/get-shit-done/references/

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
7. Patterns: Update any Claude Code-specific patterns to OpenCode equivalents
</context>

<requirements>
1. Create target directory: ./gsd-opencode/get-shit-done/references/

2. Translate each .md file from ./original/get-shit-done/get-shit-done/references/ to ./gsd-opencode/get-shit-done/references/

3. For each reference file:
   - Translate all tool names to OpenCode equivalents
   - Translate all agent names to OpenCode equivalents
   - Update all file path references to OpenCode structure
   - Convert all `<sub>something</sub>` tags to `*something*`
   - Update any command references to use gsd-<name> format
   - Update config directory references
   - Update any Claude Code-specific patterns or conventions to OpenCode equivalents
   - Preserve the original intent, structure, and documentation

4. Maintain the educational and explanatory nature of the reference files

5. Ensure all examples use OpenCode syntax

6. Update any workflows or procedures to match OpenCode's capabilities
</requirements>

<implementation>
Follow the mapping document at ./gsd-opencode/TRANSLATION-MAPPING.md for specific conversion rules.

For each file:
1. Read the source file
2. Identify all Claude Code-specific elements (tools, agents, paths, patterns)
3. Apply all translation rules from the mapping document
4. Verify the translated content makes sense in OpenCode context
5. Write to target location

**Important:**
- Reference files often contain examples and explanations - update all examples to use OpenCode syntax
- Preserve the educational value and clarity of the original files
- If a pattern doesn't have an OpenCode equivalent, document this clearly
- Maintain the same file structure and organization
- Ensure all cross-references between files use correct paths
</implementation>

<output>
Create/modify files in:
- `./gsd-opencode/get-shit-done/references/` - All translated reference files

Each reference file should:
- Use OpenCode tool names throughout
- Use OpenCode agent names throughout
- Reference files in the correct OpenCode structure
- Use OpenCode-compatible XML tags
- Contain examples using OpenCode syntax
- Reference commands with gsd-<name> format
</output>

<verification>
After completing translations:

1. Verify all reference files have been translated:
   ```bash
   ls -la ./original/get-shit-done/get-shit-done/references/*.md | wc -l
   ls -la ./gsd-opencode/get-shit-done/references/*.md | wc -l
   ```
   The counts should match.

2. Check that no Claude Code tool names remain in translated files:
   ```bash
   grep -r "Read\|Write\|Bash\|Glob\|Grep\|Task\|WebFetch" ./gsd-opencode/get-shit-done/references/
   ```
   Only OpenCode equivalents should be present.

3. Verify no `<sub>` tags remain:
   ```bash
   grep -r "<sub>" ./gsd-opencode/get-shit-done/references/
   ```
   Should return nothing.

4. Verify all file paths point to OpenCode structure

5. Spot-check examples in a few files to ensure they use OpenCode syntax
</verification>

<success_criteria>
- [ ] ./gsd-opencode/get-shit-done/references/ directory created
- [ ] All reference files from source translated
- [ ] All tool names translated to OpenCode equivalents
- [ ] All agent names translated to OpenCode equivalents
- [ ] All file paths updated to OpenCode structure
- [ ] All `<sub>` tags converted to `*`
- [ ] All command references use gsd-<name> format
- [ ] All examples use OpenCode syntax
- [ ] Educational value preserved
- [ ] File count matches between source and target
</success_criteria>
