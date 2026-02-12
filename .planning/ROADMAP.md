# Project Roadmap: GSD-OpenCode Package Manager

**Project:** GSD-OpenCode Package Manager  
**Core Value:** Users can reliably install, verify, and maintain their GSD-OpenCode installation through a simple, consistent CLI interface  
**Depth:** Standard  
**Phases:** 8  
**Coverage:** 52/52 v1 requirements ✓

---

## Overview

This roadmap delivers a comprehensive CLI package manager for GSD-OpenCode artifacts. The eight phases progress from foundational installation capabilities through verification, repair, and lifecycle management, ending with integration polish, enhanced safety features, and support for alternative directory structures. Each phase delivers a coherent, verifiable capability that builds upon previous phases.

**Phase ordering rationale:**
- Install must come first (foundation for everything)
- Uninstall pairs with install as basic lifecycle operations
- Check must precede Repair (repair uses check results)
- Update comes last (requires all other commands for safe upgrades)
- Polish phase ensures path replacement and final integration

---

## Phase 1: Core CLI & Installation

**Goal:** Users can install GSD-OpenCode and view installation status

**Dependencies:** None (foundation phase)

**Requirements:**
| ID | Requirement |
|----|-------------|
| CLI-01 | User can run `gsd-opencode install` to install the system |
| CLI-06 | User can run `gsd-opencode list` to show installed version and location |
| INST-01 | Install supports `--global` flag for global installation to `~/.config/opencode/` |
| INST-02 | Install supports `--local` flag for local installation to `./.opencode/` |
| INST-03 | Install prompts interactively for location if neither flag is provided |
| INST-04 | Install performs path replacement in .md files (rewrite `@gsd-opencode/` references) |
| INST-05 | Install supports `--config-dir` to specify custom OpenCode configuration directory |
| INST-06 | Install shows clear progress indicators during file operations |
| INST-07 | Install creates VERSION file to track installed version |
| INST-08 | Install validates target paths to prevent path traversal attacks |
| INST-09 | Install uses atomic operations (temp-then-move) to prevent partial installations |
| INST-10 | Install handles permission errors gracefully with helpful error messages |
| LIST-01 | List shows currently installed version |
| LIST-02 | List shows installation location (global or local path) |
| LIST-03 | List shows installation scope (global vs local) |
| LIST-04 | List handles case when not installed with appropriate message |
| ERROR-01 | All commands handle permission errors (EACCES) with helpful messages |
| ERROR-02 | All commands handle signal interrupts (SIGINT/SIGTERM) gracefully with cleanup |
| ERROR-03 | All commands support `--verbose` flag for detailed debugging output |
| ERROR-04 | All commands validate paths to prevent directory traversal attacks |
| ERROR-05 | All commands provide clear, actionable error messages |
| ERROR-06 | CLI shows consistent branding and formatted output using colors |
| ERROR-07 | CLI provides helpful suggestions when commands fail |

**Success Criteria:**
1. User can run `gsd-opencode install --global` and successfully install to `~/.config/opencode/`
2. User can run `gsd-opencode install --local` and successfully install to `./.opencode/`
3. User sees interactive prompt when running `gsd-opencode install` without flags
4. Installation shows progress indicators during file copy operations
5. User can run `gsd-opencode list` and see installed version, location, and scope
6. Running `gsd-opencode list` when not installed shows "Not installed" message
7. All commands handle Ctrl+C (SIGINT) gracefully without leaving partial files
8. All commands show consistent branding with colors and formatted output
9. Permission errors show helpful messages with suggestions (e.g., "Try with sudo" or "Use --local")
10. Path traversal attempts (e.g., `../../../etc/passwd`) are blocked with clear error

**Plans:** 6 plans in 4 waves

| Wave | Plans | Description |
|------|-------|-------------|
| 1 | 01-01, 01-02 | Utils layer (logger, path-resolver, interactive) |
| 2 | 01-03, 01-04 | Services layer (scope-manager, config, file-ops) |
| 3 | 01-05 | Commands layer (install) |
| 4 | 01-06 | CLI entry points (list command, bin/gsd.js, legacy shim) |

Plans:
- [x] 01-01-PLAN.md — Create utility modules (logger, path-resolver, constants)
- [x] 01-02-PLAN.md — Create interactive prompt utility with @inquirer/prompts
- [x] 01-03-PLAN.md — Create ScopeManager and ConfigManager services
- [x] 01-04-PLAN.md — Create FileOperations service with atomic install
- [x] 01-05-PLAN.md — Create install command with flags and error handling
- [x] 01-06-PLAN.md — Create list command and CLI entry points

---

## Phase 2: Uninstall & Configuration

**Goal:** Users can remove GSD-OpenCode and manage configuration settings

**Dependencies:** Phase 1 (requires installation infrastructure)

**Requirements:**
| ID | Requirement |
|----|-------------|
| CLI-02 | User can run `gsd-opencode uninstall` to remove the system |
| CLI-07 | User can run `gsd-opencode config` to manage configuration settings |
| UNIN-01 | Uninstall removes all installed files (agents/, command/, get-shit-done/ directories) |
| UNIN-02 | Uninstall removes VERSION file |
| UNIN-03 | Uninstall shows interactive confirmation before deleting |
| UNIN-04 | Uninstall supports `--force` flag to skip confirmation |
| UNIN-05 | Uninstall shows summary of what will be removed before confirmation |
| CONFIG-01 | Config can display current configuration settings |
| CONFIG-02 | Config can set configuration values |
| CONFIG-03 | Config can reset configuration to defaults |
| CONFIG-04 | Config persists settings across command invocations |

**Success Criteria:**
1. User can run `gsd-opencode uninstall` and see summary of files to be removed
2. Uninstall shows interactive confirmation prompt before deleting files
3. User can run `gsd-opencode uninstall --force` to skip confirmation
4. After uninstall, running `gsd-opencode list` shows "Not installed"
5. User can run `gsd-opencode config` to view current settings
6. User can run `gsd-opencode config set <key> <value>` to update settings
7. User can run `gsd-opencode config reset` to restore defaults
8. Configuration persists between command invocations
9. Uninstall removes all artifacts: agents/, command/, get-shit-done/, and VERSION file
10. Configuration file is not removed during uninstall (user preference preserved)

**Plans:** 3 plans in 2 waves

| Wave | Plans | Description |
|------|-------|-------------|
| 1 | 02-01, 02-02 | Settings service and Uninstall command (parallel - no deps) |
| 2 | 02-03 | Config command and CLI registration (depends on 02-01) |

Plans:
- [x] 02-01-PLAN.md — Create SettingsManager service with XDG storage and atomic writes
- [x] 02-02-PLAN.md — Create uninstall command with confirmation and --force flag
- [x] 02-03-PLAN.md — Create config command with get/set/reset/list subcommands

---

## Phase 3: Health Verification

**Goal:** Users can verify installation integrity and detect issues

**Dependencies:** Phase 1 (requires installation to verify)

**Requirements:**
| ID | Requirement |
|----|-------------|
| CLI-03 | User can run `gsd-opencode check` to verify installation health |
| CHECK-01 | Check verifies all required files exist |
| CHECK-02 | Check verifies installed version matches expected version |
| CHECK-03 | Check detects corrupted or modified files |
| CHECK-04 | Check provides clear pass/fail output for each verification |
| CHECK-05 | Check returns appropriate exit codes (0 for healthy, non-zero for issues) |

**Success Criteria:**
1. User can run `gsd-opencode check` on a healthy installation and see all checks pass
2. Check command verifies all required files exist (agents/, command/, get-shit-done/)
3. Check command compares installed version against VERSION file
4. Check command detects missing files and reports them specifically
5. Check command returns exit code 0 when installation is healthy
6. Check command returns non-zero exit code when issues are detected
7. Output clearly shows ✓ for passing checks and ✗ for failing checks
8. Each check shows what was verified (e.g., "File: agents/ro-commit/SKILL.md - OK")

**Plans:** 2 plans in 2 waves

| Wave | Plans | Description |
|------|-------|-------------|
| 1 | 03-01 | HealthChecker service with file, version, and integrity verification |
| 2 | 03-02 | Check command and CLI registration (depends on 03-01) |

Plans:
- [x] 03-01-PLAN.md — Create HealthChecker service and hash utility
- [x] 03-02-PLAN.md — Create check command and register in CLI

---

## Phase 4: Self-Healing

**Goal:** Users can automatically repair broken installations

**Dependencies:** Phase 1 (installation infrastructure), Phase 3 (check command for detection)

**Requirements:**
| ID | Requirement |
|----|-------------|
| CLI-04 | User can run `gsd-opencode repair` to fix broken installations |
| REPAIR-01 | Repair detects and reinstalls missing files |
| REPAIR-02 | Repair detects and replaces corrupted files |
| REPAIR-03 | Repair fixes broken path references in .md files |
| REPAIR-04 | Repair shows summary of issues found before fixing |
| REPAIR-05 | Repair requires interactive confirmation before making changes |

**Success Criteria:**
1. User can run `gsd-opencode repair` and see a summary of detected issues
2. Repair shows interactive confirmation before making any changes
3. Repair detects missing files (from check results) and reinstalls them
4. Repair detects corrupted files and replaces them with fresh copies
5. Repair performs path replacement on reinstalled .md files
6. After repair, running `gsd-opencode check` shows all checks pass
7. Repair uses atomic operations (temp-then-move) for safety
8. Repair handles permission errors gracefully with helpful suggestions

**Plans:** 3 plans in 3 waves

| Wave | Plans | Description |
|------|-------|-------------|
| 1 | 04-01 | BackupManager service for backup creation and retention |
| 2 | 04-02 | RepairService for issue detection and orchestration (depends on 04-01) |
| 3 | 04-03 | Repair command and CLI registration (depends on 04-02) |

Plans:
- [x] 04-01-PLAN.md — Create BackupManager service with date-stamped backups and retention
- [x] 04-02-PLAN.md — Create RepairService for issue detection and repair orchestration
- [x] 04-03-PLAN.md — Create repair command with confirmation and progress reporting

---

## Phase 5: Lifecycle Management

**Goal:** Users can update GSD-OpenCode to latest versions

**Dependencies:** Phase 1 (installation infrastructure), Phase 3 (health verification before update)

**Requirements:**
| ID | Requirement |
|----|-------------|
| CLI-05 | User can run `gsd-opencode update` to update to latest version |
| UPDATE-01 | Update checks npm registry for latest version |
| UPDATE-02 | Update supports `--beta` flag to install from private registry `@rokicool/gsd-opencode` |
| UPDATE-03 | Update supports specifying exact version to install |
| UPDATE-04 | Update shows current and target versions before proceeding |
| UPDATE-05 | Update preserves existing installation scope (global vs local) |
| UPDATE-06 | Update performs full install procedure including path replacement |

**Success Criteria:**
1. User can run `gsd-opencode update` and see current vs latest version comparison
2. Update checks npm registry for latest version of gsd-opencode
3. Update shows confirmation prompt with version details before proceeding
4. Update preserves installation scope (global stays global, local stays local)
5. Update performs complete installation including path replacement
6. User can run `gsd-opencode update --beta` to install from @rokicool/gsd-opencode
7. User can specify exact version: `gsd-opencode update 2.0.0`
8. After update, `gsd-opencode list` shows new version
9. Update handles "already up to date" gracefully with informative message

**Plans:** 3 plans in 3 waves

| Wave | Plans | Description |
|------|-------|-------------|
| 1 | 05-01 | NpmRegistry utility for npm registry version queries |
| 2 | 05-02 | UpdateService for update orchestration (depends on 05-01) |
| 3 | 05-03 | Update command and CLI registration (depends on 05-02) |

Plans:
- [x] 05-01-PLAN.md — Create NpmRegistry utility for npm registry version queries
- [x] 05-02-PLAN.md — Create UpdateService for update orchestration workflow
- [x] 05-03-PLAN.md — Create update command handler and register in CLI

---

## Phase 6: Integration & Polish

**Goal:** All CLI features work together seamlessly with complete path replacement

**Dependencies:** All previous phases (integration phase)

**Requirements:**
| ID | Requirement |
|----|-------------|
| INST-04 | Install performs path replacement in .md files (rewrite `@gsd-opencode/` references) |

**Note:** This phase focuses on ensuring INST-04 works correctly across all scenarios and that all commands integrate properly. The actual requirement is covered in Phase 1, but this phase ensures comprehensive path replacement testing and edge cases.

**Success Criteria:**
1. Path replacement correctly transforms `@gsd-opencode/` to actual installation paths
2. Global installs rewrite `@gsd-opencode/` to `~/.config/opencode/`
3. Local installs rewrite `@gsd-opencode/` to `./.opencode/`
4. Path replacement handles nested directories correctly
5. Path replacement preserves file formatting and structure
6. All commands work correctly with path-replaced files
7. Repair command correctly re-applies path replacement
8. Update command preserves path replacements after upgrade

**Plans:** 2 plans in 2 waves

| Wave | Plans | Description |
|------|-------|-------------|
| 1 | 06-01 | Unit tests for FileOperations path replacement |
| 2 | 06-02 | Integration tests for all commands with path replacement |

Plans:
- [x] 06-01-PLAN.md — Create comprehensive unit test suite for path replacement functionality
- [x] 06-02-PLAN.md — Create integration tests verifying all commands work with path-replaced files

---

## Phase 7: Make Uninstall Safe and User-Friendly

**Goal:** Make uninstall safe and more user-friendly

**Dependencies:** Phase 2 (requires uninstall infrastructure)

**Requirements:**
| ID | Requirement |
|----|-------------|
| UNIN-06 | Uninstall creates backup before deletion for potential recovery |
| UNIN-07 | Uninstall supports --dry-run flag to preview what will be removed |
| UNIN-08 | Uninstall requires typed confirmation (type 'uninstall') for extra safety |
| UNIN-09 | Uninstall shows enhanced warnings with file counts, sizes, and path |
| UNIN-10 | Uninstall provides recovery instructions after completion |

**Success Criteria:**
1. User can run `gsd-opencode uninstall --dry-run` to preview removal without executing
2. Backup is created in .uninstall-backups directory before deletion
3. User must type 'uninstall' to confirm (unless --force flag used)
4. Warning shows file count, total size, and full installation path
5. Success message includes backup location and recovery instructions
6. All unit tests pass (promptTypedConfirmation, enhanced uninstall)
7. All integration tests pass (dry-run accuracy, backup integrity, recovery workflow)
8. --no-backup flag allows skipping backup creation
9. Existing functionality (scope detection, permission handling) preserved

**Plans:** 3 plans in 3 waves

| Wave | Plans | Description |
|------|-------|-------------|
| 1 | 07-01 | Enhanced uninstall command with backup, dry-run, and typed confirmation |
| 2 | 07-02 | Unit tests for promptTypedConfirmation and enhanced uninstall |
| 3 | 07-03 | Integration tests for safety features and recovery workflow |

Plans:
- [x] 07-01-PLAN.md — Enhanced uninstall command with backup, dry-run, typed confirmation
- [x] 07-02-PLAN.md — Unit tests for enhanced uninstall
- [x] 07-03-PLAN.md — Integration tests for safety features

---

## Phase 8: Support for opencode/commands/ Directory Structure

**Goal:** [To be planned]

**Depends on:** Phase 7

**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 8 to break down)

**Details:**
[To be added during planning]

---

## Progress

| Phase | Goal | Requirements | Status | Started | Completed |
|-------|------|--------------|--------|---------|-----------|
| 1 | Core CLI & Installation | 22 | 🟢 Completed | 2026-02-09 | 2026-02-09 |
| 2 | Uninstall & Configuration | 10 | 🟢 Completed | 2026-02-10 | 2026-02-10 |
| 3 | Health Verification | 6 | 🟢 Completed | 2026-02-10 | 2026-02-10 |
| 4 | Self-Healing | 6 | 🟢 Completed | 2026-02-10 | 2026-02-10 |
| 5 | Lifecycle Management | 6 | 🟢 Completed | 2026-02-10 | 2026-02-10 |
| 6 | Integration & Polish | 2 | 🟢 Completed | 2026-02-10 | 2026-02-11 |
| 7 | Make Uninstall Safe and User-Friendly | 5 | 🟢 Completed | 2026-02-11 | 2026-02-11 |
| 8 | Support for opencode/commands/ Directory Structure | TBD | 🔵 Planned | — | — |

**Legend:** 🔵 Planned | 🟡 In Progress | 🟢 Completed | ⭕ Blocked

---

## Coverage

**v1 Requirements:** 52 total
**Mapped to Phases:** 52
**Unmapped:** 0 ✓

### By Phase

| Phase | Requirements | Count |
|-------|--------------|-------|
| Phase 1 | CLI-01, CLI-06, INST-01-10, LIST-01-04, ERROR-01-07 | 22 |
| Phase 2 | CLI-02, CLI-07, UNIN-01-05, CONFIG-01-04 | 10 |
| Phase 3 | CLI-03, CHECK-01-05 | 6 |
| Phase 4 | CLI-04, REPAIR-01-05 | 6 |
| Phase 5 | CLI-05, UPDATE-01-06 | 6 |
| Phase 6 | INST-04 (comprehensive testing) | 2 |
| Phase 7 | UNIN-06 to UNIN-10 (safety enhancements) | 5 |
| Phase 8 | TBD (support opencode/commands/ directory) | TBD |

---

*Roadmap created: 2026-02-09*  
*Last updated: 2026-02-11 (Phase 8 added — support for opencode/commands/ directory)*
