# Requirements: GSD-OpenCode Package Manager

**Defined:** 2026-02-09
**Core Value:** Users can reliably install, verify, and maintain their GSD-OpenCode installation through a simple, consistent CLI interface

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### CLI Commands

- [x] **CLI-01**: User can run `gsd-opencode install` to install the system
- [x] **CLI-02**: User can run `gsd-opencode uninstall` to remove the system
- [x] **CLI-03**: User can run `gsd-opencode check` to verify installation health
- [x] **CLI-04**: User can run `gsd-opencode repair` to fix broken installations
- [x] **CLI-05**: User can run `gsd-opencode update` to update to latest version
- [x] **CLI-06**: User can run `gsd-opencode list` to show installed version and location
- [x] **CLI-07**: User can run `gsd-opencode config` to manage configuration settings

### Install Command

- [x] **INST-01**: Install supports `--global` flag for global installation to `~/.config/opencode/`
- [x] **INST-02**: Install supports `--local` flag for local installation to `./.opencode/`
- [x] **INST-03**: Install prompts interactively for location if neither flag is provided
- [x] **INST-04**: Install performs path replacement in .md files (rewrite `@gsd-opencode/` references)
- [x] **INST-05**: Install supports `--config-dir` to specify custom OpenCode configuration directory
- [x] **INST-06**: Install shows clear progress indicators during file operations
- [x] **INST-07**: Install creates VERSION file to track installed version
- [x] **INST-08**: Install validates target paths to prevent path traversal attacks
- [x] **INST-09**: Install uses atomic operations (temp-then-move) to prevent partial installations
- [x] **INST-10**: Install handles permission errors gracefully with helpful error messages

### Uninstall Command

- [x] **UNIN-01**: Uninstall removes all installed files (agents/, command/, get-shit-done/ directories)
- [x] **UNIN-02**: Uninstall removes VERSION file
- [x] **UNIN-03**: Uninstall shows interactive confirmation before deleting
- [x] **UNIN-04**: Uninstall supports `--force` flag to skip confirmation
- [x] **UNIN-05**: Uninstall shows summary of what will be removed before confirmation

### Check Command

- [x] **CHECK-01**: Check verifies all required files exist
- [x] **CHECK-02**: Check verifies installed version matches expected version
- [x] **CHECK-03**: Check detects corrupted or modified files
- [x] **CHECK-04**: Check provides clear pass/fail output for each verification
- [x] **CHECK-05**: Check returns appropriate exit codes (0 for healthy, non-zero for issues)

### Repair Command

- [x] **REPAIR-01**: Repair detects and reinstalls missing files
- [x] **REPAIR-02**: Repair detects and replaces corrupted files
- [x] **REPAIR-03**: Repair fixes broken path references in .md files
- [x] **REPAIR-04**: Repair shows summary of issues found before fixing
- [x] **REPAIR-05**: Repair requires interactive confirmation before making changes

### Update Command

- [x] **UPDATE-01**: Update checks npm registry for latest version
- [x] **UPDATE-02**: Update supports `--beta` flag to install from private registry `@rokicool/gsd-opencode`
- [x] **UPDATE-03**: Update supports specifying exact version to install
- [x] **UPDATE-04**: Update shows current and target versions before proceeding
- [x] **UPDATE-05**: Update preserves existing installation scope (global vs local)
- [x] **UPDATE-06**: Update performs full install procedure including path replacement

### List Command

- [x] **LIST-01**: List shows currently installed version
- [x] **LIST-02**: List shows installation location (global or local path)
- [x] **LIST-03**: List shows installation scope (global vs local)
- [x] **LIST-04**: List handles case when not installed with appropriate message

### Config Command

- [x] **CONFIG-01**: Config can display current configuration settings
- [x] **CONFIG-02**: Config can set configuration values
- [x] **CONFIG-03**: Config can reset configuration to defaults
- [x] **CONFIG-04**: Config persists settings across command invocations

### Error Handling & UX

- [x] **ERROR-01**: All commands handle permission errors (EACCES) with helpful messages
- [x] **ERROR-02**: All commands handle signal interrupts (SIGINT/SIGTERM) gracefully with cleanup
- [x] **ERROR-03**: All commands support `--verbose` flag for detailed debugging output
- [x] **ERROR-04**: All commands validate paths to prevent directory traversal attacks
- [x] **ERROR-05**: All commands provide clear, actionable error messages
- [x] **ERROR-06**: CLI shows consistent branding and formatted output using colors
- [x] **ERROR-07**: CLI provides helpful suggestions when commands fail

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Install Features

- **INST-V2-01**: Dry-run mode (`--dry-run`) to preview changes without executing
- **INST-V2-02**: Selective install (install only agents, only commands, etc.)
- **INST-V2-03**: Backup existing installation before overwrite

### Enhanced Update

- **UPDATE-V2-01**: Automatic update checking (notify when update available)
- **UPDATE-V2-02**: Rollback to previous version
- **UPDATE-V2-03**: Show changelog for available updates

### Additional Commands

- **DOCTOR-V2-01**: Comprehensive system health check (like `npm doctor`)
- **CLEAN-V2-01**: Clean command to remove temporary files and caches

### Developer Experience

- **DX-V2-01**: Shell completion (bash, zsh, fish)
- **DX-V2-02**: JSON output mode (`--json`) for programmatic use
- **DX-V2-03**: Man pages for all commands

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| GUI or interactive wizard | Keep CLI simple and scriptable; current interactive prompts are sufficient |
| Multiple version management (nvm-style) | Single active installation per scope is simpler and sufficient |
| Automatic background updates | Explicit user action required; avoid surprise updates |
| Dependency resolution | GSD artifacts are standalone files, no dependencies |
| Windows-specific installers (.msi) | npm global install covers Windows via Node.js |
| Remote code execution | Security risk; all code comes from npm package only |
| Plugin/extension system | Would significantly complicate architecture; defer until needed |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLI-01 | Phase 1 | Complete |
| CLI-02 | Phase 2 | Complete |
| CLI-03 | Phase 3 | Complete |
| CLI-04 | Phase 4 | Complete |
| CLI-05 | Phase 5 | Complete |
| CLI-06 | Phase 1 | Complete |
| CLI-07 | Phase 2 | Complete |
| INST-01 | Phase 1 | Complete |
| INST-02 | Phase 1 | Complete |
| INST-03 | Phase 1 | Complete |
| INST-04 | Phase 1 | Complete |
| INST-05 | Phase 1 | Complete |
| INST-06 | Phase 1 | Complete |
| INST-07 | Phase 1 | Complete |
| INST-08 | Phase 1 | Complete |
| INST-09 | Phase 1 | Complete |
| INST-10 | Phase 1 | Complete |
| UNIN-01 | Phase 2 | Complete |
| UNIN-02 | Phase 2 | Complete |
| UNIN-03 | Phase 2 | Complete |
| UNIN-04 | Phase 2 | Complete |
| UNIN-05 | Phase 2 | Complete |
| CHECK-01 | Phase 3 | Complete |
| CHECK-02 | Phase 3 | Complete |
| CHECK-03 | Phase 3 | Complete |
| CHECK-04 | Phase 3 | Complete |
| CHECK-05 | Phase 3 | Complete |
| REPAIR-01 | Phase 4 | Complete |
| REPAIR-02 | Phase 4 | Complete |
| REPAIR-03 | Phase 4 | Complete |
| REPAIR-04 | Phase 4 | Complete |
| REPAIR-05 | Phase 4 | Complete |
| UPDATE-01 | Phase 5 | Complete |
| UPDATE-02 | Phase 5 | Complete |
| UPDATE-03 | Phase 5 | Complete |
| UPDATE-04 | Phase 5 | Complete |
| UPDATE-05 | Phase 5 | Complete |
| UPDATE-06 | Phase 5 | Complete |
| LIST-01 | Phase 1 | Complete |
| LIST-02 | Phase 1 | Complete |
| LIST-03 | Phase 1 | Complete |
| LIST-04 | Phase 1 | Complete |
| CONFIG-01 | Phase 2 | Complete |
| CONFIG-02 | Phase 2 | Complete |
| CONFIG-03 | Phase 2 | Complete |
| CONFIG-04 | Phase 2 | Complete |
| ERROR-01 | Phase 1 | Complete |
| ERROR-02 | Phase 1 | Complete |
| ERROR-03 | Phase 1 | Complete |
| ERROR-04 | Phase 1 | Complete |
| ERROR-05 | Phase 1 | Complete |
| ERROR-06 | Phase 1 | Complete |
| ERROR-07 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 52 total
- Mapped to phases: 52
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-09*
*Last updated: 2026-02-11 (All v1 requirements complete)*
