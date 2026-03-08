---
phase: 9-replace-users-roki-with-home-literally-s
plan: 9
type: execute
wave: 1
depends_on: []
files_modified: 
  - gsd-opencode/bin/dm/src/utils/path-resolver.js
  - gsd-opencode/bin/dm/src/services/scope-manager.js
  - CHANGELOG.md
autonomous: true
requirements: []
---

<objective>
Replace /Users/roki with $HOME (literally $ sign and HOME) in installation manager to make it environment-agnostic while preserving functionality for the specific user setup.

Purpose: Transition hardcoded user paths to a dynamic, configurable environment that works across different systems
Output: Files using $HOME environment variable instead of hardcoded /Users/roki paths
</objective>

<execution_context>
@~/.config/opencode/get-shit-done/workflows/execute-plan.md
@~/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace /Users/roki with $HOME in path-resolver.js</name>
  <files>gsd-opencode/bin/dm/src/utils/path-resolver.js</files>
  <action>
  Replace all hardcoded "/Users/roki" path references with the literal string "$HOME" (dollar sign + HOME) in path-resolver.js:
  
  1. Line 49: Replace `if (expanded.startsWith('/Users/roki'))` with `if (expanded.startsWith('$HOME'))`
  2. Line 58: Replace `if (expanded.startsWith('/Users/roki'))` with `if (expanded.startsWith('$HOME'))`
  3. Line 123: Replace comment text "/Users/roki" with "$HOME" in javadoc
  4. Line 126: Replace comment text "/Users/roki" with "$HOME" in javadoc
  5. Line 130: Replace `return homeDir.startsWith('/Users/roki');` with `return homeDir === '$HOME' || homeDir.startsWith('$HOME/');`
  6. Line 159: Replace `const isRokiPath = targetPath.startsWith('/Users/roki') || isRokiUser();` with `const isRokiPath = targetPath.startsWith('$HOME') || isRokiUser();`
  7. Add appropriate comment explaining that $HOME represents the environment variable placeholder
  </action>
  <verify>node -e "import fs from 'fs'; console.log(fs.readFileSync('gsd-opencode/bin/dm/src/utils/path-resolver.js', 'utf8').includes('$HOME'))"</verify>
  <done>All hardcoded "/Users/roki" references in path-resolver.js replaced with "$HOME" literal</done>
</task>

<task type="auto">
  <name>Task 2: Replace /Users/roki with $HOME in scope-manager.js</name>
  <files>gsd-opencode/bin/dm/src/services/scope-manager.js</files>
  <action>
  Replace all hardcoded "/Users/roki" path references with the literal string "$HOME" (dollar sign + HOME) in scope-manager.js:
  
  1. Line 84: Replace comment text "/Users/roki" with "$HOME" 
  2. Line 87: Replace comment text "/Users/roki" with "$HOME"
  3. Line 309: Replace comment text "/Users/roki" with "$HOME"
  4. Line 311: Replace comment text "/Users/roki" with "$HOME"
  5. Line 315: Replace comment text "/Users/roki" with "$HOME"
  6. Line 320: Replace comment text "/Users/roki" with "$HOME"
  7. Line 322: Replace comment text "/Users/roki" with "$HOME"
  8. Line 324: Replace comment text "/Users/roki" with "$HOME"
  9. Line 326: Replace `const rokiHomeRegex = /^\/Users\/roki/;` with `const homeRegex = /^\$HOME/;`
  10. Line 326: Replace `if (rokiHomeRegex.test(targetDir) && !targetDir.startsWith('/Users/roki'))` with `if (homeRegex.test(targetDir) && !targetDir.startsWith('$HOME'))`
  11. Line 327: Replace comment text "/Users/roki" with "$HOME"
  12. Line 336: Replace comment text "/Users/roki" with "$HOME"
  13. Line 341: Replace comment text "/Users/roki" with "$HOME"
  </action>
  <verify>node -e "import fs from 'fs'; console.log(fs.readFileSync('gsd-opencode/bin/dm/src/services/scope-manager.js', 'utf8').includes('$HOME'))"</verify>
  <done>All hardcoded "/Users/roki" references in scope-manager.js replaced with "$HOME" literal</done>
</task>

<task type="auto">
  <name>Task 3: Update CHANGELOG.md reference</name>
  <files>CHANGELOG.md</files>
  <action>
  Replace the hardcoded "/Users/roki" path reference in CHANGELOG.md with the literal "$HOME" string:
  
  1. In line 21, change "/Users/roki/.config/opencode/get-shit-done/**" to "$HOME/.config/opencode/get-shit-done/**"
  2. Preserve all surrounding context around this change
  </action>
  <verify>grep -q '\$HOME/.config/opencode/get-shit-done' CHANGELOG.md && echo "Change confirmed"</verify>
  <done>CHANGELOG.md updated with $HOME placeholder instead of hardcoded /Users/roki</done>
</task>

</tasks>

<verification>
Check that all three files have been updated successfully:
1. path-resolver.js has $HOME instances
2. scope-manager.js has $HOME instances  
3. CHANGELOG.md has $HOME instance
4. All functionality remains intact (references to isRokiUser() function preserved)
</verification>

<success_criteria>
Successfully replaced all hardcoded '/Users/roki' paths with the literal string '$HOME' across installation manager files while maintaining the special handling logic for when $HOME represents that specific user environment. All three files have been updated: path-resolver.js, scope-manager.js, and CHANGELOG.md.
</success_criteria>

<output>
After completion, create `.planning/quick/9-replace-users-roki-with-home-literally-s/9-SUMMARY.md`
</output>