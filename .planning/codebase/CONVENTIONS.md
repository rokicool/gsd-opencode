# Coding Conventions

**Analysis Date:** 2026-01-20

## Naming Patterns

**Files:**
- Markdown command files use `kebab-case.md` under `gsd-opencode/command/gsd/` (e.g., `gsd-opencode/command/gsd/plan-phase.md`, `gsd-opencode/command/gsd/execute-phase.md`).
- Markdown workflow/reference/template files use `kebab-case.md` under `gsd-opencode/get-shit-done/` (e.g., `gsd-opencode/get-shit-done/workflows/execute-phase.md`, `gsd-opencode/get-shit-done/references/tdd.md`).
- Node scripts use `.js` and live primarily in `gsd-opencode/bin/` and `assets/bin/` (e.g., `gsd-opencode/bin/install.js`, `assets/bin/translate-files.js`).

**Functions:**
- JavaScript functions use `camelCase` names.
  - Examples: `parseConfigDirArg()`, `expandTilde()`, `copyWithPathReplacement()` in `gsd-opencode/bin/install.js`.
  - Examples: `translateContent()`, `translateCategory()` in `assets/bin/translate-files.js`.
- Command “identifiers” in YAML frontmatter use `kebab-case` with `gsd-` prefix.
  - Examples: `name: gsd-plan-phase` in `gsd-opencode/command/gsd/plan-phase.md`, `name: gsd-help` in `gsd-opencode/command/gsd/help.md`.

**Variables:**
- Prefer `const` for bindings; use `camelCase`.
  - Examples: `const args = process.argv.slice(2);` in `gsd-opencode/bin/install.js`.
  - Examples: `const translationRules = { ... }` in `assets/bin/translate-files.js`.
- “Constants” are commonly `camelCase`, not `UPPER_SNAKE_CASE`.
  - Example ANSI color constants: `const cyan = "\x1b[36m";` in `gsd-opencode/bin/install.js`.

**Types:**
- Not applicable (no TypeScript types/interfaces detected in this repository).

## Code Style

**Formatting:**
- No formatter config detected (no `.prettierrc`, `prettier.config.*`, or `biome.json` found in repo root or `gsd-opencode/`).
- Follow existing “local consistency” per directory:
  - `gsd-opencode/bin/install.js` uses **double quotes** and semicolons.
  - `assets/bin/check-forbidden-strings.js` and `assets/bin/translate-files.js` use **single quotes** and semicolons.
- Indentation is consistently **2 spaces** in `gsd-opencode/bin/install.js` and `assets/bin/*.js`.

**Linting:**
- No linter config detected (no ESLint config files found in repo root or `gsd-opencode/`).
- CI performs lightweight validation (syntax + structure checks) via `.github/workflows/validate.yml`.

## Import Organization

**Order:**
1. Node built-ins via CommonJS `require()`
2. Third-party packages
3. Local project imports

Examples:
- Built-ins first in `gsd-opencode/bin/install.js`: `fs`, `path`, `os`, `readline`.
- Third-party next in `assets/bin/check-forbidden-strings.js`: `@iarna/toml`.
- Local import for package metadata in `gsd-opencode/bin/install.js`: `const pkg = require("../package.json");`.

**Path Aliases:**
- Not applicable (no TS/JS path alias config detected).

## Error Handling

**Patterns:**
- Guard clauses + explicit termination for CLI error cases:
  - Argument validation emits `console.error(...)` and exits with non-zero code (e.g., `process.exit(1);` in `gsd-opencode/bin/install.js`).
- “Main” routines wrap I/O-heavy work in `try/catch`:
  - `function main() { try { ... } catch (error) { ... process.exit(1); } }` in `assets/bin/check-forbidden-strings.js`.
- Prefer explicit error messaging before exiting:
  - Example: `console.error('❌ antipatterns.toml not found in assets directory');` in `assets/bin/check-forbidden-strings.js`.

## Logging

**Framework:**
- `console.log` / `console.error` (no structured logging library detected).

**Patterns:**
- CLI-style progress output and banners (often with ANSI colors):
  - `console.log(banner);` and status lines like `Installed command/gsd` in `gsd-opencode/bin/install.js`.
- Errors always go to stderr:
  - `console.error(...)` used for invalid flags in `gsd-opencode/bin/install.js`.

## Comments

**When to Comment:**
- Use comments to explain *why* a transformation/behavior exists, especially around path translation and installation behavior.
  - Examples: `// Replace ~/.claude/ and ./.claude/ with OpenCode paths` in `gsd-opencode/bin/install.js`.
  - Examples: `// Translation rules from Claude Code to OpenCode` in `assets/bin/translate-files.js`.

**JSDoc/TSDoc:**
- JSDoc-style block comments are used for key helpers in scripts.
  - Examples: `/** Expand ~ to home directory ... */` and `/** Recursively copy directory ... */` in `gsd-opencode/bin/install.js`.

## Function Design

**Size:**
- Prefer small, single-purpose helpers and keep orchestration in a `main()` (or equivalent) function.
  - Helpers: `expandTilde()`, `copyWithPathReplacement()` in `gsd-opencode/bin/install.js`.
  - Orchestrator: `main()` in `assets/bin/check-forbidden-strings.js` and `assets/bin/translate-files.js`.

**Parameters:**
- Use positional parameters for CLI helpers; prefer passing explicit values rather than relying on global state.
  - Example: `copyWithPathReplacement(srcDir, destDir, pathPrefix)` in `gsd-opencode/bin/install.js`.

**Return Values:**
- Return values are used for pure helpers; side-effect heavy routines return void and exit on error.
  - Example: `translateCategory(...)` returns `{ translated, failed, total }` in `assets/bin/translate-files.js`.

## Module Design

**Exports:**
- Executable scripts use a shebang and run as CLI tools:
  - `#!/usr/bin/env node` in `gsd-opencode/bin/install.js` and `assets/bin/*.js`.
- Export only when the script is also used as a library:
  - `module.exports = { translateContent, translateFile, translateCategory };` in `assets/bin/translate-files.js`.

**Barrel Files:**
- Not applicable.

---

*Convention analysis: 2026-01-20*
