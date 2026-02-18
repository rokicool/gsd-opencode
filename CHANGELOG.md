# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.10.2] - 2026-02-17

Overview: Fixed path replacement bug in file operations service for local scope installs. Removed duplicate local directory and obsolete backup files. Added comprehensive test coverage for path replacement functionality.

### Fixed

- Fixed path replacement bug in `gsd-opencode/src/services/file-ops.js` `_copyFile` method that incorrectly handled absolute path references in local installs

### Added

- Added comprehensive test coverage for local scope path replacement in `gsd-opencode/test/unit/file-ops.test.js`
- Added path replacement helper utilities in `gsd-opencode/test/helpers/path-replacement-helpers.js`

### Changed

- Updated `gsd-opencode/agents/gsd-settings.md` with enhanced configuration documentation
- Modified `gsd-opencode/lib/constants.js` with updated constants

### Removed

- Removed duplicate `local/gsd-opencode/` directory containing 162 redundant files
- Removed obsolete `local/gsd-opencode/package.json-old` backup file

## [1.10.1] - 2026-02-13

Overview: Fixed release workflow directory references and updated changelog generation to use manually maintained CHANGELOG.md file instead of generating from git log.

### Fixed

- Updated `.github/workflows/release.yml` to reference `commands/` directory instead of legacy `command/` in build artifacts step
- Added missing directories (`src/`, `lib/`, `agents/`) to production build artifacts

### Changed

- Replaced git log-based changelog generation with reading from repository root `CHANGELOG.md` file
- Updated artifact upload paths to use `CHANGELOG-release.md` instead of generated `CHANGELOG.md`
- Modified release notes generation to check both `dist/CHANGELOG.md` and `CHANGELOG-release.md` locations

## [1.10.0] - 2026-02-13

Introduced complete CLI tool infrastructure for gsd-opencode with comprehensive installation, update, and lifecycle management capabilities. Migrated command documentation from `command/` to `commands/` directory structure.

### Added

- Complete CLI tool implementation in `gsd-opencode/` with Node.js-based architecture
- Entry point scripts: `bin/gsd.js` and `bin/gsd-install.js` for CLI execution
- Command implementations in `src/commands/`: install.js, update.js, check.js, config.js, list.js, repair.js, and uninstall.js
- Service layer in `src/services/`: backup-manager.js, config.js, file-ops.js, health-checker.js, manifest-manager.js, migration-service.js, repair-service.js, scope-manager.js, settings.js, structure-detector.js, and update-service.js
- Utility modules in `src/utils/`: hash.js, interactive.js, logger.js, npm-registry.js, and path-resolver.js
- Constants library in `lib/constants.js` for shared configuration
- Comprehensive test suite in `test/` with unit, integration, and service-level tests
- Test fixtures for manifest management, path replacement, and installation scenarios
- Integration test coverage for install safety, migration paths, and command workflows

### Changed

- Renamed command documentation directory from `command/gsd/` to `commands/gsd/` for consistency
- Updated gsd-debugger.md agent with refined debugging workflow references
- Modified list-phase-assumptions.md and verify-work.md workflows with improved execution context
- Updated multiple command documentations (debug.md, discuss-phase.md, execute-phase.md, map-codebase.md, new-milestone.md, new-project.md, plan-phase.md, research-phase.md, verify-work.md) with enhanced tool specifications and context references

### Removed

- Legacy package.json backup files (package-old.json, package-lock-old.json) from version control

## [1.9.1] - 2026-01-23

Standardized command naming conventions and improved documentation formatting across project files.

### Fixed
- Renamed set-profile command to gsd-set-profile in gsd-opencode/command/gsd/set-profile.md for consistency with gsd-* naming convention
- Updated /gsd:whats-new to /gsd-whats-new in README.md to follow standardized command prefix format
- Added forbidden string check in assets/antipatterns.toml to prevent gsd-set-profile old naming pattern

### Changed
- Enhanced gsd-insert-phase command description in gsd-opencode/command/gsd/insert-phase.md for clarity on usage scenarios
- Improved code block formatting in gsd-opencode/command/gsd/set-profile.md with consistent blank line spacing
- Removed duplicate verification line in README.md for cleaner documentation

## [1.9.0] - 2026-01-21

Major upgrade introducing model profile system with quality/balanced/budget tiers, new quick mode for ad-hoc tasks, and comprehensive workflow agent configuration system.

### Added
- gsd-quick command for executing small, ad-hoc tasks with GSD guarantees but skipping optional agents
- gsd-set-profile command for switching model profiles (quality/balanced/budget)
- gsd-settings command for configuring workflow toggles and model profile interactively
- model-profiles.md reference documentation with profile definitions and resolution logic
- planning-config.md reference documentation for .planning/ directory configuration

### Changed
- Updated all orchestrator commands (plan-phase, new-milestone, execute-phase, new-project, etc.) with model profile resolution
- Updated all agents with new tool specification format (Read, Write, Bash, Glob, Grep, webfetch, mcp__context7__*)
- Updated help.md command with quick mode documentation and enhanced feature descriptions
- Enhanced checkpoints.md reference with golden rules for OpenCode automation and dev server setup guidance
- Updated package.json version from 1.6.0 to 1.9.0

## [1.6.1] - 2026-01-19

Fixed repository URLs to point to gsd-opencode repository.

### Changed
- Updated GitHub repository URLs from rokicool/get-shit-done to rokicool/gsd-opencode in command/gsd/update.md and command/gsd/whats-new.md

## [1.6.0] - 2026-01-19

Catch up with original [Get-Shit-Done v1.6.4](https://github.com/glittercowboy/get-shit-done/blob/main/CHANGELOG.md#164---2026-01-17).
Complete restructuring with agent system, unified workflows, and enhanced project lifecycle management.

### Added
- New agent system with 10 specialized agents for planning, debugging, execution, integration checking, research, and verification
- gsd-update command to update GSD to latest version with changelog display
- gsd-whats-new command to see changes since installed version
- gsd-audit-milestone command for milestone auditing
- gsd-plan-milestone-gaps command for gap closure planning
- verify-phase workflow for phase verification
- diagnose-issues workflow for issue diagnosis
- UAT.md template for user acceptance testing
- user-setup.md template for user setup guidance
- verification-report.md template for structured verification reporting
- debug-subagent-prompt.md template for debugging subagent
- planner-subagent-prompt.md template for planner subagent
- requirements.md template for requirements documentation
- research-project templates (ARCHITECTURE, FEATURES, PITFALLS, STACK, SUMMARY)
- verification-patterns.md reference documentation
- ui-brand.md reference for UI branding guidelines
- VERSION file support for version tracking

### Changed
- new-project command: Complete overhaul with unified flow (questioning → research → requirements → roadmap)
- new-milestone command: Enhanced milestone creation with improved workflow
- execute-phase command: Improved execution workflow with better integration
- discuss-phase command: Enhanced discussion capabilities
- complete-milestone command: Improved milestone completion process
- verify-work command: Enhanced verification process with new reporting
- research-phase command: Improved research workflow
- map-codebase command: Better codebase mapping functionality
- debug command: Improved debugging workflow
- progress command: Enhanced progress tracking
- checkpoints.md: Expanded checkpoint documentation
- questioning.md: Enhanced questioning framework
- context.md template: Improved context template
- phase-prompt.md template: Enhanced phase prompt template
- roadmap.md template: Improved roadmap template
- state.md template: Enhanced state management template
- summary.md template: Improved summary template
- research.md template: Enhanced research template
- discovery.md template: Improved discovery template
- codebase templates: Improved architecture, concerns, conventions, structure, and testing templates
- install.js: Improved installation script
- package.json: Updated version from 1.4.4 to 1.6.0, added agents to files array

### Removed
- GSD-STYLE.md style guide
- .opencode/rules/references.md
- .opencode/rules/style.md
- .opencode/rules/templates.md
- .opencode/rules/workflows.md
- Commands: consider-issues, create-roadmap, discuss-milestone, execute-plan, plan-fix, status
- Reference documentation: debugging folder (debugging-mindset, hypothesis-testing, investigation-techniques, verification-patterns, when-to-research), plan-format, principles, research-pitfalls, scope-estimation
- Templates: agent-history.md, checkpoint-return.md, config.json, continuation-prompt.md, issues.md, milestone-context.md, subagent-task-prompt.md, uat-issues.md
- Workflows: create-milestone.md, create-roadmap.md, debug.md, discuss-milestone.md, plan-phase.md, research-phase.md, _archive/execute-phase.md
- Test output files: animal-facts.md, dad-jokes.md, random-numbers.md

## [1.5.2] - 2026-01-19
