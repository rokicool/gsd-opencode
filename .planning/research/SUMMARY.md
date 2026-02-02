# Project Research Summary

**Project:** gsd-opencode
**Domain:** npm CLI tool with lifecycle management for OpenCode integration
**Researched:** 2026-02-01
**Confidence:** HIGH

## Executive Summary

gsd-opencode is a meta-prompting and spec-driven development system that provides structured workflows for OpenCode (and compatible AI assistants). The project is currently distributed as an npm package but lacks proper npm lifecycle integration. Research reveals that npm CLI tools follow predictable patterns: executable entry points in `bin/`, lifecycle scripts in `package.json`, and careful handling of install contexts (global vs local, CI vs interactive).

The recommended approach is to augment the existing `bin/install.js` with standard npm lifecycle hooks (`prepare`, `postinstall`) while preserving the current interactive installation flow. Critical risks include npm v7+ removing `preuninstall` scripts entirely, `postinstall` running in unintended contexts (CI, development), and cross-platform path resolution differences. Mitigation requires environment detection guards, explicit install mode flags, and thorough testing across npm versions and platforms.

This is a brownfield project with existing working code that needs formal npm packaging improvements rather than architectural redesign.

## Key Findings

### Recommended Stack

The project uses a minimal, intentional stack focused on Node.js CLI tooling without heavy frameworks.

**Core technologies:**
- **Node.js >=16.7.0**: Runtime environment — specified in engines, tested with v18 in CI
- **npm**: Package manager and distribution mechanism — standard JavaScript ecosystem approach
- **@iarna/toml ^2.2.5**: TOML parsing for configuration — used in validation scripts
- **esbuild ^0.24.0**: Build tool for hooks — already in use for bundling
- **JavaScript (CommonJS)**: All CLI tooling — intentional simplicity, no transpilation needed

**Key dependencies rationale:**
- Minimal external dependencies reduce supply chain risk
- Built-in Node.js modules (`fs`, `path`, `os`, `readline`) handle all core operations
- No web framework needed — this is a CLI tool and prompt system

### Expected Features

Based on PROJECT.md requirements and existing codebase analysis:

**Must have (table stakes):**
- npm package with proper lifecycle scripts (`prepare`, `postinstall`)
- Global and local installation modes
- Multi-runtime support (Claude Code, OpenCode, Gemini CLI)
- Slash command structure (`/gsd-*` commands)
- Agent-based workflow orchestration
- File-based state management
- Template-driven document generation

**Should have (competitive):**
- Build/bundle process for hooks
- Test suite for install/uninstall/update
- CI/CD pipeline for publishing
- Version management improvements
- Update checking mechanism

**Defer (v2+):**
- Documentation site
- Plugin system for third-party hooks
- GUI interface (intentionally CLI-only)
- Database persistence (intentionally file-based)

### Architecture Approach

npm CLI tools follow a layered architecture with clear component boundaries:

**Major components:**
1. **bin/install.js** — Main installation script with CLI argument parsing, path replacement, and file copying
2. **command/gsd/** — 29 slash command definitions as Markdown files with frontmatter
3. **agents/** — 16 AI agent definitions spawned by OpenCode
4. **get-shit-done/** — Templates and workflows for planning and execution
5. **hooks/** (optional) — Lifecycle extensions for statusline and update checking

**Key patterns:**
- Executable scripts with shebang (`#!/usr/bin/env node`)
- File-based configuration in `~/.config/opencode/` (global) or `./.opencode/` (local)
- Path replacement for cross-repo compatibility (`@gsd-opencode/` → install path)
- VERSION file creation for update detection

### Critical Pitfalls

Research identified 7 major pitfalls specific to npm CLI lifecycle management:

1. **npm v7+ removed `preuninstall`/`uninstall` scripts** — Never rely on these for cleanup; implement separate CLI command (`gsd-opencode --uninstall`) or manual cleanup documentation

2. **`postinstall` runs in wrong contexts** — Runs during `npm ci`, development installs, and as transitive dependency; add guards checking `npm_package_resolved`, `npm_config_global`, and `INIT_CWD`

3. **`prepare` scripts run in background (npm v7+)** — Output hidden without `--foreground-scripts`; add explicit error handling and logging

4. **bin path resolution differences** — Global install, local install, npx, and Windows all behave differently; use `__dirname` and `npm_package_json` env var, never assume relative paths

5. **Environment variable injection changed in npm v7+** — Most `npm_package_*` env vars removed; only `name`, `version`, `bin_*`, `engines_*`, `config_*` remain; read package.json directly via `require(process.env.npm_package_json)`

6. **Global vs local install detection is unreliable** — `npm_config_global` set inconsistently; accept explicit `--global`/`--local` flags instead of auto-detection

7. **`npm link` breaks lifecycle assumptions** — Symlinks change filesystem layout; `__dirname` resolves to actual location not link location; never traverse outside package root

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Lifecycle Foundation
**Rationale:** Must understand current install flow before adding lifecycle hooks; dependencies: none
**Delivers:** Working npm lifecycle integration with proper guards
**Addresses:** npm package with lifecycle scripts, global/local install modes
**Avoids:** postinstall context confusion, prepare background execution issues, env var changes
**Research flag:** LOW — well-documented npm patterns, standard implementation

### Phase 2: Multi-Runtime & Path Abstraction
**Rationale:** Path resolution and install detection must be robust before adding features; dependencies: Phase 1
**Delivers:** Cross-platform path resolution, explicit install mode flags, Windows support
**Addresses:** Multi-runtime support, version management
**Avoids:** bin path resolution differences, global vs local detection issues
**Research flag:** MEDIUM — Windows testing needed, platform-specific behaviors

### Phase 3: Hook System & Testing
**Rationale:** Hook migration depends on stable install foundation; dependencies: Phase 2
**Delivers:** Migrated hooks (statusline, update-check), test suite for install/uninstall/update
**Addresses:** Build/bundle process for hooks, test suite, update checking
**Avoids:** npm link issues (tested in QA)
**Research flag:** MEDIUM — hook registration API design, testing strategies

### Phase 4: CI/CD & Publishing
**Rationale:** Publishing pipeline should use proven lifecycle integration; dependencies: Phase 1-3
**Delivers:** CI/CD pipeline for publishing, documentation
**Addresses:** CI/CD pipeline, documentation improvements
**Avoids:** All pitfalls through established patterns
**Research flag:** LOW — standard GitHub Actions patterns

### Phase Ordering Rationale

- **Phase 1 first:** Lifecycle integration is foundational; all other phases assume working npm install/uninstall
- **Phase 2 before Phase 3:** Hook system needs stable path resolution and install detection
- **Phase 3 before Phase 4:** Tests validate that publishing works correctly
- **Pitfall avoidance:** Each phase explicitly addresses specific pitfalls identified in research

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** Windows path handling, cross-platform testing strategies
- **Phase 3:** Hook registration API design, integration testing approaches

Phases with standard patterns (skip research-phase):
- **Phase 1:** npm lifecycle scripts are well-documented official behavior
- **Phase 4:** GitHub Actions CI/CD is established pattern

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Direct codebase analysis, minimal dependencies, official Node.js docs |
| Features | HIGH | PROJECT.md requirements validated, existing codebase provides reference |
| Architecture | HIGH | Official npm documentation, direct observation of existing install.js |
| Pitfalls | HIGH | Official npm docs, GitHub issues, npm v7+ release notes |

**Overall confidence:** HIGH

All research based on official npm documentation (docs.npmjs.com), GitHub issues for npm CLI, and direct analysis of the existing gsd-opencode codebase. The domain (npm CLI lifecycle management) is well-documented with established patterns.

### Gaps to Address

- **Windows testing:** No Windows-specific validation in current codebase; Phase 2 must include Windows CI runners
- **npm version matrix:** Current CI only tests Node 18; should test npm v7, v8, v9, v10, v11
- **Hook API design:** Research covers lifecycle integration but specific hook registration API needs design during Phase 3 planning
- **Uninstall strategy:** preuninstall scripts don't work in npm v7+; need to design alternative cleanup mechanism

## Sources

### Primary (HIGH confidence)
- npm CLI Official Documentation: https://docs.npmjs.com/cli/v10/using-npm/scripts — Lifecycle script behavior, execution order
- npm package.json spec: https://docs.npmjs.com/cli/v10/configuring-npm/package-json — Configuration options
- npm developers guide: https://docs.npmjs.com/cli/v10/using-npm/developers — Best practices for CLI tools
- GitHub Issue #3042: npm uninstall -g doesn't run preuninstall script — Confirmed removal in npm v7
- npm v7 release notes: https://github.com/npm/cli/releases/tag/v7.0.0 — Background script execution

### Secondary (MEDIUM confidence)
- gsd-opencode source code: `bin/install.js`, `package.json` — Direct observation of current implementation
- PROJECT.md requirements — Validated requirements from project definition

### Tertiary (LOW confidence)
- None — all sources are official documentation or direct codebase analysis

---
*Research completed: 2026-02-01*
*Ready for roadmap: yes*
