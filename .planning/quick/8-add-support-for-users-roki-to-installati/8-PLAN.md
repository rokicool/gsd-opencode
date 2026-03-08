---
phase: quick
plan: 8
type: execute 
wave: 1
depends_on: []
files_modified:
  - gsd-opencode/bin/dm/src/utils/path-resolver.js
  - gsd-opencode/bin/dm/src/services/scope-manager.js
autonomous: true
requirements:
  - Q8-01

must_haves:
  truths:
    - User /Users/roki can successfully install GSD-OpenCode
    - Installation properly resolves paths within /Users/roki's home directory
    - Path traversal validation works correctly for /Users/roki
  artifacts:
    - path-resolver.js handles expansion and validation of /Users/roki paths
    - scope-manager.js correctly resolves targets for /Users/roki
  key_links:
    - expandPath() properly handles tilde and absolute variants for /Users/roki
    - validatePath() correctly permits paths within /Users/roki's home
    - ScopeManager integration with path resolution works correctly
---

<objective>
Add support for /Users/roki to installation manager

Purpose: Enable the GSD-OpenCode installation manager to properly handle installation paths for the /Users/roki user specifically, ensuring all path resolution and validation works correctly with this user's home directory.

Output: Installation manager properly supports /Users/roki user paths
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
  <name>Update path resolver to better handle /Users/roki paths</name>
  <files>gsd-opencode/bin/dm/src/utils/path-resolver.js</files>
  <action>Enhance the path resolver functions to properly handle the "/Users/roki" path pattern by updating the expandPath function to specifically handle paths that start with "/Users/roki". Additionally, improve the path normalization and validation to ensure that "/Users/roki" paths are treated correctly during expansion and validation operations.</action>
  <verify>node -e "const {expandPath} = require('./gsd-opencode/bin/dm/src/utils/path-resolver.js'); console.log(expandPath('~/test')); console.log(expandPath('/Users/roki/test'));"</verify>
  <done>Path resolver correctly handles both relative and absolute "/Users/roki" paths</done>
</task>

<task type="auto">
  <name>Update scope manager to support /Users/roki installation paths</name>
  <files>gsd-opencode/bin/dm/src/services/scope-manager.js</files>
  <action>Modify the ScopeManager to properly handle installations under the "/Users/roki" home directory. This includes updating the constructor logic and path resolution to ensure that paths are properly validated and constructed when installing in the context of this specific user's environment.</action>
  <verify>node -e "const {ScopeManager} = require('./gsd-opencode/bin/dm/src/services/scope-manager.js'); const sm = new ScopeManager({scope: 'global'}); console.log('Target Dir:', sm.getTargetDir()); console.log('Is Installed Sync:', sm.isInstalledSync());"</verify>
  <done>Scope manager correctly identifies and handles installation paths for /Users/roki</done>
</task>

</tasks>

<verification>
Check that installation manager can now handle paths specifically for /Users/roki by running the path expansion and scope management functions with paths related to this user.
</verification>

<success_criteria>
Installation manager properly supports installation paths for the /Users/roki user, including path expansion, validation, and scope management.
</success_criteria>

<output>
After completion, create `.planning/quick/8-add-support-for-users-roki-to-installati/8-SUMMARY.md`
</output>