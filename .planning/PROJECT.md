# GSD-OpenCode Package Manager

## What This Is

A comprehensive CLI tool for managing the GSD-OpenCode distribution. While the core GSD system (agents, commands, workflows) already exists in `./gsd-opencode/`, this project provides the missing package management layer that allows users to install, verify, maintain, and update their installation through a unified command-line interface.

The package is distributed via npm (public registry as `gsd-opencode` and GitHub Packages as `@rokicool/gsd-opencode`) with an automated GitHub Actions pipeline handling builds, tests, and releases.

## Core Value

Users can reliably install, verify, and maintain their GSD-OpenCode installation through a simple, consistent CLI interface that handles all edge cases (path replacements, version conflicts, broken installs) without manual intervention.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] **CLI-01**: User can install GSD-OpenCode globally to `~/.config/opencode/`
- [ ] **CLI-02**: User can install GSD-OpenCode locally to `./.opencode/` in current project
- [ ] **CLI-03**: User can uninstall GSD-OpenCode completely (remove all files)
- [ ] **CLI-04**: User can check installation health (verify files exist, versions match, no corruption)
- [ ] **CLI-05**: User can repair broken installations (reinstall missing/corrupted files)
- [ ] **CLI-06**: User can update to latest version (check, download, migrate)
- [ ] **CLI-07**: Installation performs path replacement (`@gsd-opencode/` → actual paths)
- [ ] **CLI-08**: CLI shows clear progress and success/failure messages
- [ ] **CLI-09**: CLI handles errors gracefully with helpful recovery suggestions
- [ ] **CLI-10**: All operations support `--dry-run` flag for previewing changes

### Out of Scope

- **GUI/Interactive wizard beyond basic prompts** — Keep CLI simple and scriptable
- **Multiple version management (nvm-style)** — Single active installation per scope
- **Rollback to previous versions** — Users can reinstall specific version via npm
- **Automatic updates/background checks** — Explicit user action required for updates
- **Windows-specific installers (.msi, .exe)** — npm global install covers Windows via Node.js

## Context

**Current State:**
- Working GSD system exists in `./gsd-opencode/` with complete agent/command/workflow structure
- GitHub Actions pipeline already handles validation, building, and publishing to npm/GitHub Packages
- Current `install.js` only supports install operation with interactive prompts
- Package version managed independently (currently 1.9.0)

**Distribution Strategy:**
- Public npm: `gsd-opencode` (primary distribution channel)
- GitHub Packages: `@rokicool/gsd-opencode` (private/backup)
- Installation via `npx gsd-opencode` or `npm install -g gsd-opencode`

**Technical Environment:**
- Node.js >= 16.7.0 required
- Supports macOS, Linux, Windows (via Node.js)
- Global install path: `~/.config/opencode/` (or custom via `--config-dir`)
- Local install path: `./.opencode/` in current working directory

**Path Replacement System:**
- `@gsd-opencode/` references must be rewritten to actual install paths
- `@~/.config/opencode/` for global installs
- `@./.opencode/` for local installs
- Critical for commands to work correctly after installation

## Constraints

- **Must integrate with existing GitHub Actions pipeline** — No changes to release workflow structure
- **Must maintain backward compatibility** — Existing install behavior preserved
- **Must support both global and local scopes** — As currently implemented
- **Must handle path replacement correctly** — All @-references transformed
- **Must work offline after initial npm install** — No runtime network dependencies
- **Single Node.js file preferred** — Keep `bin/install.js` as main entry point
- **Minimal external dependencies** — Use Node.js built-ins where possible

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Subcommand-based CLI (`gsd-opencode install`, `gsd-opencode check`, etc.) | Cleaner interface than flags, easier to extend | — Pending |
| Single entry point file (`bin/install.js`) | Simpler distribution, no build step needed | — Pending |
| Preserve existing install behavior as default | Don't break existing users | — Pending |
| Version check against npm registry | Most reliable way to detect updates | — Pending |
| Dry-run support for all mutating operations | Users want to see what will happen before committing | — Pending |

---
*Last updated: 2026-02-09 after initialization*
