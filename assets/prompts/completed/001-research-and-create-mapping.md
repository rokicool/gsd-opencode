<objective>
Research and create a comprehensive mapping document for translating Claude Code conventions to OpenCode conventions. This document will be used as the reference for all translation prompts that follow.

**Why this matters:** The GSD system uses Claude Code-specific tools, agents, commands, and patterns. To make it work in OpenCode, we need a clear, documented mapping between the two systems.

**End goal:** Create a translation guide that can be referenced when translating commands, references, templates, workflows, and agents.
</objective>

<context>
This is the first prompt in a 6-prompt sequence. All subsequent prompts will depend on this mapping document.

**Sources to examine:**
- OpenCode documentation: https://opencode.ai/docs (fetch and analyze)
- OpenCode agents documentation: https://opencode.ai/docs/agents/ (fetch and analyze)
- Original GSD files for patterns and references
- ./package.json for project context

**Project context:**
- Project name: "gsd-opencode"
- Audience: Application developers
- Original system: Claude Code's get-shit-done by TACHES (https://github.com/glittercowboy/get-shit-done)
- Target system: OpenCode

**Translation requirements:**
- Config folder: `~/.config/opencode` or `.opencode/` (not `~/.claude`)
- Command syntax: `gsd-<name>` instead of `gsd:<name>` (OpenCode doesn't support `:` in command names)
- Folder structure: `command/gsd` instead of `commands/gsd`
- XML tags: Replace `<sub>something</sub>` with `*something*`
- Arguments: "All arguments" should use `$ARGUMENTS` variable
</context>

<research>
Thoroughly explore the OpenCode documentation and identify:

1. **Tool mappings:** For each Claude Code tool used in GSD, find the equivalent OpenCode tool
   - Read → OpenCode equivalent
   - Write → OpenCode equivalent
   - Bash → OpenCode equivalent
   - Glob → OpenCode equivalent
   - Grep → OpenCode equivalent
   - Task → OpenCode equivalent
   - WebFetch → OpenCode equivalent
   - MCP server patterns → OpenCode equivalent

2. **Agent mappings:** For each Claude Code agent type, find the OpenCode equivalent
   - How are agents defined in OpenCode?
   - What are the available agent types/subagent_type values?
   - How do agent specifications differ?

3. **Command structure differences:**
   - Frontmatter structure differences
   - Allowed-tools syntax
   - Agent invocation patterns
   - Command naming conventions

4. **File path conventions:**
   - Config directory locations
   - Relative path references
   - File reference patterns (@filename)

5. **XML tag differences:**
   - What XML tags are supported in OpenCode prompts?
   - Are there differences in tag structure?

6. **Variable replacement patterns:**
   - How does OpenCode handle arguments?
   - What variable syntax is used ($ARGUMENTS, etc.)?

7. **MCP server integration:**
   - How does OpenCode integrate with MCP servers?
   - What is the syntax for MCP tool references?

Use the WebFetch tool to retrieve documentation from:
- https://opencode.ai/docs
- https://opencode.ai/docs/agents/

Examine original GSD files to identify all tools and agents used:
- ./original/get-shit-done/commands/gsd/*.md
- ./original/get-shit-done/get-shit-done/references/*.md
- ./original/get-shit-done/get-shit-done/templates/*.md
- ./original/get-shit-done/get-shit-done/workflows/*.md
- ./original/agents/*.md
</research>

<requirements>
Create a comprehensive mapping document that includes:

1. **Tool mappings table** - Claude Code tool → OpenCode tool (with syntax differences if any)

2. **Agent mappings table** - Claude Code agent types → OpenCode agent types (with specification differences)

3. **Command frontmatter conversion guide** - How to convert Claude Code frontmatter to OpenCode format

4. **Path conversion rules** - Rules for converting file paths and references

5. **XML tag conversion rules** - How to handle XML tag differences

6. **Variable substitution guide** - How to handle $ARGUMENTS and other variables

7. **MCP server integration differences** - How to convert MCP tool references

8. **Common patterns and examples** - Before/after examples for common conversion scenarios

9. **Special cases and gotchas** - Any non-obvious differences that require attention

Each mapping should include:
- Source (Claude Code syntax)
- Target (OpenCode syntax)
- Notes (if any differences in behavior or requirements)
- Example usage if needed
</requirements>

<output>
Save the mapping document to: `./gsd-opencode/TRANSLATION-MAPPING.md`

The document should be well-organized with:
- Table of contents
- Clear sections for each type of mapping
- Tables for tool and agent mappings
- Code examples where helpful
- Clear, actionable conversion rules

Use markdown format with:
- Headers (##, ###) for organization
- Tables for comparisons
- Code blocks for examples
- Bullet lists for rules
</output>

<success_criteria>
- [ ] OpenCode documentation fetched and analyzed
- [ ] All Claude Code tools used in GSD identified
- [ ] All Claude Code agents used in GSD identified
- [ ] Mapping document created at ./gsd-opencode/TRANSLATION-MAPPING.md
- [ ] Document includes all required mapping sections
- [ ] Document includes concrete examples
- [ ] Document is clear and actionable for use in subsequent translation prompts
- [ ] Special cases and gotchas documented
</success_criteria>
