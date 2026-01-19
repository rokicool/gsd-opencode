# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
