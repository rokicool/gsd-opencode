# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.38.1] - 2026-04-26

Overview: Rewrote health check integrity verification to use installation manifest with SHA-256 hash comparison instead of sample file checks. Added install.js and gsd-sdk.js scripts for streamlined OpenCode tooling. Fixed false negatives in check command and integrity verification.

### Added

- `install.js` script (7434 lines) providing comprehensive multi-runtime installation and uninstallation support for OpenCode, Codex, Gemini, Copilot, Cursor, Windsurf, Cline, Antigravity, Trae, Qwen, CodeBuddy, Augment, and Kilo in `gsd-opencode/bin/install.js`
- `gsd-sdk.js` script as SDK entry point in `gsd-opencode/bin/gsd-sdk.js`
- `gsd-local-patches/` directory support for preserving user modifications across updates in `gsd-opencode/bin/install.js`
- `gsd-file-manifest.json` generation for tracking installed files with SHA-256 hashes in `gsd-opencode/bin/install.js`
- JSONC config parsing support for OpenCode and Kilo configuration files in `gsd-opencode/bin/install.js`
- Runtime-specific permission configuration for OpenCode and Kilo in `gsd-opencode/bin/install.js`
- User artifact preservation during re-install for `USER-PROFILE.md` and `dev-preferences.md` in `gsd-opencode/bin/install.js`
- Leaked path detection for unreplaced .OpenCode references in non-OpenCode runtimes in `gsd-opencode/bin/install.js`
- Codex config.toml generation with agent roles and hooks configuration in `gsd-opencode/bin/install.js`
- Copilot instructions merging with `copilot-instructions.md` in `gsd-opencode/bin/install.js`
- Hook file installation with version stamping and executable permissions in `gsd-opencode/bin/install.js`
- Context monitor hook auto-migration adding matcher and timeout in `gsd-opencode/bin/install.js`
- Agent frontmatter conversion for all supported runtimes in `gsd-opencode/bin/install.js`
- Command-to-skill conversion functions for Codex, Copilot, Cursor, Windsurf, Trae, Antigravity, Augment, Codebuddy, and Qwen in `gsd-opencode/bin/install.js`

### Changed

- Rewrote `verifyIntegrity()` in `HealthChecker` to load installation manifest and compare SHA-256 hashes for all installed files instead of checking sample files in `gsd-opencode/bin/dm/src/services/health-checker.js`
- Added extra file detection to identify files not tracked in the installation manifest in `gsd-opencode/bin/dm/src/services/health-checker.js`
- Updated integrity check output to show `passedCount/totalChecked files verified` summary instead of listing all files in `gsd-opencode/bin/dm/src/commands/check.js`
- Fixed package root resolution from `../..` to `../../../..` in check command in `gsd-opencode/bin/dm/src/commands/check.js`
- Updated health-checker imports to include `ManifestManager` and `MANIFEST_FILENAME` in `gsd-opencode/bin/dm/src/services/health-checker.js`
- Added `gsd-sdk.js` and `install.js` to package.json bin array in `gsd-opencode/package.json`
- Added whitespace normalization in `discovery-phase.md` in `gsd-opencode/get-shit-done/workflows/discovery-phase.md`

### Fixed

- Fixed integrity check false negative for `help.md` (renamed to `gsd-help.md`) in `gsd-opencode/bin/dm/src/services/health-checker.js`
- Fixed check command false negatives for version and integrity checks by using manifest-based verification in `gsd-opencode/bin/dm/src/commands/check.js`
- Fixed integrity check to only display failed files instead of all files in output in `gsd-opencode/bin/dm/src/commands/check.js`

## [1.38.0] - 2026-04-25

Overview: Major upstream sync from GSD v1.38.5 introducing UI sketching and spiking workflows, Socratic spec refinement phase, plan convergence via external AI reviewers, ultraplan cloud integration, document ingestion pipeline, and enhanced debugging with session management. Added 4 new agents, 18 new commands, 8 new library modules, 19 new reference documents, and comprehensive workflow infrastructure for design exploration and knowledge capture.

### Added

- `gsd-sketch` command and `sketch` workflow for exploring UI/design ideas with throwaway HTML mockups and theme system in `gsd-opencode/commands/gsd/gsd-sketch.md` and `gsd-opencode/get-shit-done/workflows/sketch.md`
- `gsd-sketch-wrap-up` command and `sketch-wrap-up` workflow for finalizing selected sketch variants into production components in `gsd-opencode/commands/gsd/gsd-sketch-wrap-up.md` and `gsd-opencode/get-shit-done/workflows/sketch-wrap-up.md`
- `gsd-spike` command and `spike` workflow for experiential idea validation through targeted experiments in `gsd-opencode/commands/gsd/gsd-spike.md` and `gsd-opencode/get-shit-done/workflows/spike.md`
- `gsd-spike-wrap-up` command and `spike-wrap-up` workflow for consolidating spike findings into documented knowledge in `gsd-opencode/commands/gsd/gsd-spike-wrap-up.md` and `gsd-opencode/get-shit-done/workflows/spike-wrap-up.md`
- `gsd-spec-phase` command and `spec-phase` workflow for Socratic requirement clarification with ambiguity scoring before planning in `gsd-opencode/commands/gsd/gsd-spec-phase.md` and `gsd-opencode/get-shit-done/workflows/spec-phase.md`
- `gsd-ultraplan-phase` command for offloading planning to OpenCode's ultraplan cloud infrastructure with browser review in `gsd-opencode/commands/gsd/gsd-ultraplan-phase.md`
- `gsd-plan-review-convergence` command and workflow for cross-AI plan convergence loop using external AI CLIs (codex, gemini, OpenCode) until no HIGH concerns remain in `gsd-opencode/commands/gsd/gsd-plan-review-convergence.md` and `gsd-opencode/get-shit-done/workflows/plan-review-convergence.md`
- `gsd-ingest-docs` command and `ingest-docs` workflow for classifying, synthesizing, and consolidating existing planning documents with conflict detection in `gsd-opencode/commands/gsd/gsd-ingest-docs.md` and `gsd-opencode/get-shit-done/workflows/ingest-docs.md`
- `gsd-extract_learnings` command and `extract_learnings` workflow for capturing and retrieving project learnings in `gsd-opencode/commands/gsd/gsd-extract_learnings.md` and `gsd-opencode/get-shit-done/workflows/extract_learnings.md`
- `gsd-sync-skills` command and `sync-skills` workflow for synchronizing skill definitions in `gsd-opencode/commands/gsd/gsd-sync-skills.md` and `gsd-opencode/get-shit-done/workflows/sync-skills.md`
- `gsd-graphify` command for visualizing project structure in `gsd-opencode/commands/gsd/gsd-graphify.md`
- `gsd-settings-advanced` and `gsd-settings-integrations` commands for advanced configuration and integration management in `gsd-opencode/commands/gsd/`
- `gsd-oc-set-profile` command for OpenCode profile configuration in `gsd-opencode/commands/gsd/gsd-oc-set-profile.md`
- `gsd-inbox` command for inbox management in `gsd-opencode/commands/gsd/gsd-inbox.md`
- `gsd-debug-session-manager` agent for multi-cycle debug checkpoint and continuation loop in isolated context in `gsd-opencode/agents/gsd-debug-session-manager.md`
- `gsd-doc-classifier` agent for classifying planning documents as ADR, PRD, SPEC, DOC, or UNKNOWN in `gsd-opencode/agents/gsd-doc-classifier.md`
- `gsd-doc-synthesizer` agent for synthesizing classified docs with precedence rules and conflict detection in `gsd-opencode/agents/gsd-doc-synthesizer.md`
- `gsd-pattern-mapper` agent for analyzing codebase patterns and producing PATTERNS.md in `gsd-opencode/agents/gsd-pattern-mapper.md`
- 8 new library modules: `artifacts.cjs`, `audit.cjs`, `config-schema.cjs`, `decisions.cjs`, `drift.cjs`, `gap-checker.cjs`, `graphify.cjs`, `secrets.cjs` in `gsd-opencode/get-shit-done/bin/lib/`
- `spec.md` template for Socratic specification documents in `gsd-opencode/get-shit-done/templates/spec.md`
- `README.md` template for project documentation in `gsd-opencode/get-shit-done/templates/README.md`
- 19 new reference documents: `autonomous-smart-discuss.md`, `debugger-philosophy.md`, `doc-conflict-engine.md`, `executor-examples.md`, `mandatory-initial-read.md`, `planner-antipatterns.md`, `planner-chunked.md`, `planner-source-audit.md`, `project-skills-discovery.md`, `scout-codebase.md`, `sketch-interactivity.md`, `sketch-theme-system.md`, `sketch-tooling.md`, `sketch-variant-patterns.md` in `gsd-opencode/get-shit-done/references/`
- `discuss-phase/` workflow directory with modes (advisor, all, analyze, auto, batch, chain, default, power, text) and templates in `gsd-opencode/get-shit-done/workflows/discuss-phase/`
- `execute-phase/` workflow directory with codebase drift gate in `gsd-opencode/get-shit-done/workflows/execute-phase/`
- `graduation.md` workflow for phase graduation in `gsd-opencode/get-shit-done/workflows/graduation.md`
- Ultraplan phase design specification in `gsd-opencode/docs/superpowers/specs/2026-04-17-ultraplan-phase-design.md`
- BETA documentation in `gsd-opencode/docs/BETA.md`
- INVENTORY documentation and manifest in `gsd-opencode/docs/`
- SDK query migration blurb in `gsd-opencode/docs/`
- Skills documentation directory in `gsd-opencode/docs/skills/`

### Changed

- Synced 348 files from upstream GSD submodule at v1.38.5
- Converted 1 remaining Task() function call to @subagent_type shorthand syntax in `gsd-opencode/commands/gsd/gsd-plan-review-convergence.md`
- Enhanced all 25 existing agent definitions with updated behavior and tool specifications in `gsd-opencode/agents/`
- Enhanced 47 existing command files with improved prompts, permissions, and argument hints in `gsd-opencode/commands/gsd/`
- Enhanced 72 existing workflow files with expanded steps, anti-pattern checks, and integration points in `gsd-opencode/get-shit-done/workflows/`
- Updated 15 CLI library modules with new functionality and improved error handling in `gsd-opencode/get-shit-done/bin/lib/`
- Enhanced `gsd-tools.cjs` with new commands for artifacts, audit, decisions, drift, gap-checking, graphify, and secrets in `gsd-opencode/get-shit-done/bin/gsd-tools.cjs`
- Updated 21 reference documents with improved patterns and expanded guidance in `gsd-opencode/get-shit-done/references/`
- Updated 4 templates with improved structure and additional fields in `gsd-opencode/get-shit-done/templates/`
- Updated documentation across 5 locales (en, ja-JP, ko-KR, pt-BR, zh-CN) reflecting new features in `gsd-opencode/docs/`
- Added 1 translation replacement for whitespace normalization in `gsd-opencode/get-shit-done/workflows/discovery-phase.md`

## [1.35.0] - 2026-04-13

Overview: Major upstream sync from GSD v1.35.0 introducing code review pipeline with auto-fix loop, codebase intelligence system, explore/scan/explore workflows, AI integration phase, import workflow, eval review, undo, and inbox management. Added 8 new agents, 9 new commands, and 14 new reference documents. Converted all Task() calls to @subagent_type shorthand and added mode: subagent to all agent definitions.

### Added

- `gsd-code-reviewer` agent for deep code review with configurable depth and finding categorization in `gsd-opencode/agents/gsd-code-reviewer.md`
- `gsd-code-fixer` agent for automated fix application from review findings with iterative review-fix loop in `gsd-opencode/agents/gsd-code-fixer.md`
- `gsd-ai-researcher` agent for AI-specific research tasks in `gsd-opencode/agents/gsd-ai-researcher.md`
- `gsd-domain-researcher` agent for domain-specific research in `gsd-opencode/agents/gsd-domain-researcher.md`
- `gsd-eval-auditor` agent for evaluation auditing in `gsd-opencode/agents/gsd-eval-auditor.md`
- `gsd-eval-planner` agent for evaluation planning in `gsd-opencode/agents/gsd-eval-planner.md`
- `gsd-framework-selector` agent for framework selection guidance in `gsd-opencode/agents/gsd-framework-selector.md`
- `gsd-intel-updater` agent for codebase intelligence file refresh in `gsd-opencode/agents/gsd-intel-updater.md`
- `/gsd-code-review` command and `code-review` workflow for automated code review at configurable depth in `gsd-opencode/commands/gsd/gsd-code-review.md` and `gsd-opencode/get-shit-done/workflows/code-review.md`
- `/gsd-code-review-fix` command and `code-review-fix` workflow for iterative auto-fix of review findings with convergence detection in `gsd-opencode/commands/gsd/gsd-code-review-fix.md` and `gsd-opencode/get-shit-done/workflows/code-review-fix.md`
- `/gsd-intel` command for querying, inspecting, and refreshing codebase intelligence files in `gsd-opencode/commands/gsd/gsd-intel.md`
- `/gsd-explore` command and `explore` workflow for interactive codebase exploration with optional research agent spawning in `gsd-opencode/commands/gsd/gsd-explore.md` and `gsd-opencode/get-shit-done/workflows/explore.md`
- `/gsd-scan` command and `scan` workflow for focused codebase scanning with parallel mapper agents in `gsd-opencode/commands/gsd/gsd-scan.md` and `gsd-opencode/get-shit-done/workflows/scan.md`
- `/gsd-import` command and `import` workflow for importing existing projects into GSD structure with plan validation in `gsd-opencode/commands/gsd/gsd-import.md` and `gsd-opencode/get-shit-done/workflows/import.md`
- `/gsd-audit-fix` command and `audit-fix` workflow for auto-fixing audit findings with test verification in `gsd-opencode/commands/gsd/gsd-audit-fix.md` and `gsd-opencode/get-shit-done/workflows/audit-fix.md`
- `/gsd-ai-integration-phase` command and `ai-integration-phase` workflow for AI integration phases in `gsd-opencode/commands/gsd/gsd-ai-integration-phase.md` and `gsd-opencode/get-shit-done/workflows/ai-integration-phase.md`
- `/gsd-eval-review` command and `eval-review` workflow for evaluation review in `gsd-opencode/commands/gsd/gsd-eval-review.md` and `gsd-opencode/get-shit-done/workflows/eval-review.md`
- `/gsd-undo` command and `undo` workflow for undoing recent GSD operations with git-based rollback in `gsd-opencode/commands/gsd/gsd-undo.md` and `gsd-opencode/get-shit-done/workflows/undo.md`
- `/gsd-from-gsd2` command for migrating from GSD v2 format in `gsd-opencode/commands/gsd/gsd-from-gsd2.md`
- `inbox` workflow for managing development inbox in `gsd-opencode/get-shit-done/workflows/inbox.md`
- `intel.cjs` library for codebase intelligence management (extract-exports, patch-meta, validate, status) in `gsd-opencode/get-shit-done/bin/lib/intel.cjs`
- `learnings.cjs` library for learning capture and retrieval in `gsd-opencode/get-shit-done/bin/lib/learnings.cjs`
- `gsd2-import.cjs` library for GSD v2 project migration in `gsd-opencode/get-shit-done/bin/lib/gsd2-import.cjs`
- `AI-SPEC.md` template for AI integration specifications in `gsd-opencode/get-shit-done/templates/AI-SPEC.md`
- `gsd-code-review` and `gsd-code-review-fix` skills for OpenCode integration in `gsd-opencode/skills/`
- 14 new reference documents: `ai-evals.md`, `ai-frameworks.md`, `common-bug-patterns.md`, `gates.md`, `ios-scaffold.md`, `thinking-models-debug.md`, `thinking-models-execution.md`, `thinking-models-planning.md`, `thinking-models-research.md`, `thinking-models-verification.md`, `thinking-partner.md`, `verification-overrides.md`, and few-shot examples for `plan-checker.md` and `verifier.md` in `gsd-opencode/get-shit-done/references/`
- Regex-based forbidden string matching to antipatterns checker in `assets/bin/check-forbidden-strings.js`
- `task(\n` regexp pattern to antipatterns list in `assets/antipatterns.toml` for detecting unconverted Task() calls

### Changed

- Synced 289 files from upstream GSD submodule at v1.35.0
- Converted all 66 Task() function calls to @subagent_type shorthand syntax across workflows, commands, templates, and references
- Added `mode: subagent` declaration to all 29 agent definition files in `gsd-opencode/agents/`
- Applied 5,144 Claude Code to OpenCode translations across 287 files (paths, tool names, commands, URLs, HTML tags)
- Enhanced `execute-phase` workflow with expanded executor agent prompts, worktree branch check improvements, and verifier agent integration in `gsd-opencode/get-shit-done/workflows/execute-phase.md`
- Enhanced `plan-phase` workflow with additional planner and plan-checker context in `gsd-opencode/get-shit-done/workflows/plan-phase.md`
- Enhanced `quick` workflow with executor worktree support, code review, and verification integration in `gsd-opencode/get-shit-done/workflows/quick.md`
- Enhanced `manager` workflow with plan-phase and execute-phase background agent delegation in `gsd-opencode/get-shit-done/workflows/manager.md`
- Enhanced `autonomous` workflow with agent tracking and dispatch patterns in `gsd-opencode/get-shit-done/workflows/autonomous.md`
- Updated `gsd-tools.cjs` with new commands and enhanced CLI tooling in `gsd-opencode/get-shit-done/bin/gsd-tools.cjs`
- Refactored `state.cjs` with improved state management in `gsd-opencode/get-shit-done/bin/lib/state.cjs`
- Enhanced `phase.cjs` with expanded phase management capabilities in `gsd-opencode/get-shit-done/bin/lib/phase.cjs`
- Updated `model-profiles.md` and `model-profile-resolution.md` references to use @subagent syntax in `gsd-opencode/get-shit-done/references/`
- Expanded `planning-config.md` reference with detailed configuration documentation in `gsd-opencode/get-shit-done/references/planning-config.md`
- Updated documentation (ARCHITECTURE, COMMANDS, CONFIGURATION, FEATURES, USER-GUIDE) to reflect new commands, agents, and workflows in `gsd-opencode/docs/`

## [1.33.3] - 2026-04-12

Overview: Fixed YAML frontmatter parse errors across 11 command files by quoting unquoted argument-hint values, corrected malformed skill permission in gsd-manager, and updated translation config with new rules for skill permissions and argument-hint quoting.

### Fixed

- Quoted unquoted `argument-hint` YAML values in 11 command files (`gsd-add-backlog`, `gsd-add-phase`, `gsd-add-todo`, `gsd-check-todos`, `gsd-complete-milestone`, `gsd-debug`, `gsd-health`, `gsd-insert-phase`, `gsd-remove-phase`, `gsd-set-profile`, `gsd-thread`) to prevent YAML parse errors with bracketed values like `[--flag]`
- Corrected malformed `  - skill` permission entry to `skill: true` in `gsd-opencode/commands/gsd/gsd-manager.md`

### Changed

- Added `skill` to the YAML list-item permission translation regex in `assets/configs/config.json`
- Added `argument-hint` auto-quoting translation rule in `assets/configs/config.json` to wrap unquoted values in double quotes during sync

## [1.33.1] - 2026-04-07

Overview: Added M-TRANSLATE.md workflow for sync from upstream GSD, updated gsd-set-profile to remove model constraint, converted task() calls to @subagent syntax, and enhanced discovery and discuss-phase workflows.

### Added

- `M-TRANSLATE.md` workflow for copying and translating changes from upstream GSD repository to OpenCode equivalents in `assets/prompts/M-TRANSLATE.md`
- `model: haiku` to forbidden strings list in `assets/antipatterns.toml` to prevent incorrect model assignments

### Changed

- Removed `model: haiku` constraint from `gsd-set-profile.md` command in `gsd-opencode/commands/gsd/gsd-set-profile.md` to allow dynamic model assignment
- Converted `task()` function calls to `@subagent_type` shorthand syntax in `gsd-opencode/get-shit-done/workflows/discuss-phase-assumptions.md` and `gsd-opencode/get-shit-done/workflows/discuss-phase.md`
- Updated agent call syntax from `task()` to `@subagent_type prompt` format in discuss-phase workflow in `gsd-opencode/get-shit-done/workflows/discuss-phase.md`
- Enhanced discovery-phase workflow with improved formatting for library resolution in `gsd-opencode/get-shit-done/workflows/discovery-phase.md`

## [1.33.2] - 2026-04-12

Overview: Added regex translation rule for Agent() background task calls in autonomous workflows, converting OpenCode-incompatible Agent() syntax to @gsd-xxx shorthand with dynamic agent name extraction.

### Added

- Translation rule 21 in `assets/configs/remove-task.json` for converting `Agent(description=..., run_in_background=true, prompt=...)` calls to `@gsd-<agent>` shorthand syntax, extracting agent name from `skill="gsd:<agent>"` patterns

### Changed

- Converted `Agent()` background task dispatch calls to `@gsd-plan-phase` and `@gsd-execute-phase` shorthand in `gsd-opencode/get-shit-done/workflows/autonomous.md` for OpenCode compatibility
- Updated skill invocation syntax from `skill="gsd:plan-phase"` to `skill="gsd-plan-phase"` (colon to dash) in autonomous workflow agent prompts

## [1.33.0] - 2026-04-06

Overview: Major upstream sync from GSD v1.33.0 introducing security auditing pipeline, automated documentation generation with codebase verification, dependency analysis, and discuss-phase power mode. Enhanced planner with scope reduction prohibition and decision coverage matrices. Added response language support, worktree isolation control, Kilo runtime support, and schema drift detection across 150 files.

### Added

- `/gsd-secure-phase` command and `secure-phase` workflow for retroactive threat mitigation verification of completed phases in `gsd-opencode/commands/gsd/gsd-secure-phase.md` and `gsd-opencode/get-shit-done/workflows/secure-phase.md`
- `gsd-security-auditor` agent for verifying PLAN.md threat model mitigations against implemented code and producing SECURITY.md in `gsd-opencode/agents/gsd-security-auditor.md`
- `/gsd-docs-update` command and `docs-update` workflow for generating, updating, and verifying up to 9 documentation types with codebase-verified accuracy in `gsd-opencode/commands/gsd/gsd-docs-update.md` and `gsd-opencode/get-shit-done/workflows/docs-update.md`
- `gsd-doc-writer` agent for writing and updating project documentation with codebase exploration in `gsd-opencode/agents/gsd-doc-writer.md`
- `gsd-doc-verifier` agent for verifying factual claims in generated docs against the live codebase in `gsd-opencode/agents/gsd-doc-verifier.md`
- `/gsd-analyze-dependencies` command and `analyze-dependencies` workflow for phase dependency graph analysis and ROADMAP.md Depends-on suggestions in `gsd-opencode/commands/gsd/gsd-analyze-dependencies.md` and `gsd-opencode/get-shit-done/workflows/analyze-dependencies.md`
- `discuss-phase-power.md` workflow for power user mode generating all questions upfront into JSON state file with HTML companion UI in `gsd-opencode/get-shit-done/workflows/discuss-phase-power.md`
- `docs.cjs` library for docs-update workflow providing project signal detection, doc inventory with GSD marker detection, and doc tooling detection in `gsd-opencode/get-shit-done/bin/lib/docs.cjs`
- `schema-detect.cjs` library for detecting schema-relevant file changes and verifying database push commands were executed during phases in `gsd-opencode/get-shit-done/bin/lib/schema-detect.cjs`
- `SECURITY.md` template for security audit reports in `gsd-opencode/get-shit-done/templates/SECURITY.md`
- 10 new reference documents: `agent-contracts.md`, `artifact-types.md`, `context-budget.md`, `domain-probes.md`, `gate-prompts.md`, `planner-gap-closure.md`, `planner-reviews.md`, `planner-revision.md`, `revision-loop.md`, and `universal-anti-patterns.md` in `gsd-opencode/get-shit-done/references/`
- `remove-task.json` configuration for task removal patterns during installation in `assets/configs/remove-task.json`
- `v1.33.0.json` supplemental configuration for upstream sync in `assets/configs/v1.33.0.json`
- `manual-update.md` documentation for manual update procedures in `gsd-opencode/docs/manual-update.md`
- `.bg-shell/manifest.json` for background shell configuration

### Changed

- Enhanced `gsd-planner` agent with scope reduction prohibition, mandatory decision coverage matrices, threat model generation in PLAN.md, and MCP tool usage guidance in `gsd-opencode/agents/gsd-planner.md`
- Enhanced `gsd-plan-checker` agent with Dimension 7b scope reduction detection, Dimension 11 research resolution check, and improved verification checks in `gsd-opencode/agents/gsd-plan-checker.md`
- Enhanced `gsd-verifier` agent with ROADMAP success criteria merging, improved status determination decision tree, and human_needed status priority in `gsd-opencode/agents/gsd-verifier.md`
- Enhanced `gsd-executor` agent with threat model awareness, threat surface scan in summaries, and MCP tool usage guidance in `gsd-opencode/agents/gsd-executor.md`
- Enhanced `gsd-phase-researcher` agent with claim provenance tagging, assumptions log, and security domain research section in `gsd-opencode/agents/gsd-phase-researcher.md`
- Enhanced `execute-phase` workflow with blocking anti-pattern checks, intra-wave file overlap detection, worktree isolation control, adaptive context window enrichment, and response language propagation in `gsd-opencode/get-shit-done/workflows/execute-phase.md`
- Enhanced `plan-phase` workflow with security threat model gate, auto-chain UI-SPEC generation, response language support, and enriched context for 1M-class models in `gsd-opencode/get-shit-done/workflows/plan-phase.md`
- Enhanced `discuss-phase` workflow with `--power` mode, `--chain` mode, blocking anti-pattern checks, interrupted discussion checkpoint recovery, and response language support in `gsd-opencode/get-shit-done/workflows/discuss-phase.md`
- Enhanced `quick` workflow with `--full` and `--validate` flags replacing `--full` semantics, composable granular flags in `gsd-opencode/get-shit-done/workflows/quick.md`
- Enhanced `autonomous` workflow with `--to N`, `--only N`, and `--interactive` flags for phase range and single-phase execution in `gsd-opencode/get-shit-done/workflows/autonomous.md`
- Enhanced `verify-phase` workflow with test quality audit step covering disabled tests, circular test detection, and expected value provenance in `gsd-opencode/get-shit-done/workflows/verify-phase.md`
- Enhanced `verify-work` workflow with automated UI verification via Playwright-MCP integration in `gsd-opencode/get-shit-done/workflows/verify-work.md`
- Enhanced `reapply-patches` command with three-way comparison, Kilo runtime support, and expanded environment variable detection in `gsd-opencode/commands/gsd/gsd-reapply-patches.md`
- Enhanced `update` workflow with Kilo runtime support, PREFERRED_CONFIG_DIR detection, and expanded runtime candidate list in `gsd-opencode/get-shit-done/workflows/update.md`
- Enhanced `debug` command with `--diagnose` flag for root-cause-only investigation in `gsd-opencode/commands/gsd/gsd-debug.md`
- Enhanced `manager` workflow with configurable per-step passthrough flags from config in `gsd-opencode/get-shit-done/workflows/manager.md`
- Enhanced `review` workflow with CodeRabbit and OpenCode CLI support, environment-based runtime detection, and Antigravity agent compatibility in `gsd-opencode/get-shit-done/workflows/review.md`
- Enhanced `progress` workflow with corrected command ordering (`/new` then command) in `gsd-opencode/get-shit-done/workflows/progress.md`
- Updated `gsd-tools.cjs` with `docs-init`, `check-commit`, `verify schema-drift`, `state planned-phase`, `state validate`, and `state sync` commands in `gsd-opencode/get-shit-done/bin/gsd-tools.cjs`
- Updated `core.cjs` with extracted CONFIG_DEFAULTS constants, workstream session environment keys, planning lock support, and `phaseTokenMatches` helper in `gsd-opencode/get-shit-done/bin/lib/core.cjs`
- Updated `state.cjs` with atomic read-modify-write for concurrent agent safety, progress derivation from disk counts, and diagnostic warnings for field mismatches in `gsd-opencode/get-shit-done/bin/lib/state.cjs`
- Updated `phase.cjs` with project-code-prefixed phase support, custom phase ID handling, and improved phase matching in `gsd-opencode/get-shit-done/bin/lib/phase.cjs`
- Updated `roadmap.cjs` with structured phase search, success criteria extraction, and malformed roadmap detection in `gsd-opencode/get-shit-done/bin/lib/roadmap.cjs`
- Updated `verify.cjs` with STATE.md/ROADMAP.md cross-validation and config field validation checks in `gsd-opencode/get-shit-done/bin/lib/verify.cjs`
- Updated `commands.cjs` with `determinePhaseStatus` introducing "Executed" status, slug length limit, and decimal phase matching in `gsd-opencode/get-shit-done/bin/lib/commands.cjs`
- Updated `frontmatter.cjs` with quote-aware inline array splitting and empty must_haves diagnostic warning in `gsd-opencode/get-shit-done/bin/lib/frontmatter.cjs`
- Updated `config.cjs` with new valid config keys for worktrees, subagent timeout, manager flags, response language, and project code in `gsd-opencode/get-shit-done/bin/lib/config.cjs`
- Updated `profile-output.cjs` with project skills discovery from standard directories and skills section generation for AGENTS.md in `gsd-opencode/get-shit-done/bin/lib/profile-output.cjs`
- Updated `config.json` template with security enforcement, ASVS level, security block-on, and project code fields in `gsd-opencode/get-shit-done/templates/config.json`
- Updated 12 additional workflow files with minor improvements across `gsd-opencode/get-shit-done/workflows/`
- Updated all documentation across 4 locales (en, ja-JP, ko-KR, pt-BR, zh-CN) reflecting new commands and features in `gsd-opencode/docs/`

## [1.22.2] - 2026-03-30

Overview: Major upstream sync from GSD v1.30.0 adding autonomous execution, fast mode, UI design pipeline, multi-project workspaces, user profiling, forensics, and 25 new slash commands. Full documentation now available in four additional locales (ja-JP, ko-KR, pt-BR, zh-CN). Added `mode: subagent` declarations to all agent definition files.

### Added

- `/gsd-autonomous` command and `autonomous` workflow for end-to-end autonomous project execution
- `/gsd-fast` command and `fast` workflow for rapid-fire task execution
- `/gsd-do` command and `do` workflow for direct task execution without full planning
- `/gsd-forensics` command and `forensics` workflow for post-mortem investigation and debugging
- `/gsd-thread` command for threaded conversation management
- `/gsd-workstreams` command and `workstream.cjs` library for multi-stream work management with `--workstream` flag
- `/gsd-profile-user` command, `profile-user` workflow, `gsd-user-profiler` agent, `profile-pipeline.cjs`, and `profile-output.cjs` for building and maintaining user preference profiles
- `/gsd-ui-phase` command, `ui-phase` workflow, `gsd-ui-researcher` agent, `gsd-ui-auditor` agent, `gsd-ui-checker` agent for complete UI design and review pipeline
- `/gsd-ui-review` command and `ui-review` workflow for retroactive UI audits
- `/gsd-ship` command and `ship` workflow for streamlined shipping and release
- `/gsd-pr-branch` command and `pr-branch` workflow for PR branch creation and management
- `/gsd-manager` command and `manager` workflow for manager-level project oversight
- `/gsd-session-report` command and `session-report` workflow for session summary generation
- `/gsd-stats` command and `stats` workflow for project and milestone statistics
- `/gsd-note` command and `note` workflow for quick note-taking during work
- `/gsd-add-backlog` and `/gsd-review-backlog` commands for backlog item management
- `/gsd-milestone-summary` command and `milestone-summary` workflow for milestone overview generation
- `/gsd-new-workspace`, `/gsd-list-workspaces`, and `/gsd-remove-workspace` commands and workflows for multi-project workspace management
- `/gsd-next` command and `next` workflow for determining and starting the next task
- `/gsd-plant-seed` command and `plant-seed` workflow for seeding new project ideas
- `/gsd-audit-uat` command, `audit-uat` workflow, and `uat.cjs` library for user acceptance testing audits
- `/gsd-review` command and `review` workflow for structured code review
- `gsd-advisor-researcher` agent for researching gray area decisions with comparison tables
- `gsd-assumptions-analyzer` agent and `discuss-phase-assumptions` workflow for assumption analysis during discuss phase
- `model-profiles.cjs` library for model profile definitions
- `security.cjs` library for security utility functions
- `node-repair` workflow for automated Node.js dependency repair
- `UI-SPEC.md`, `claude-md.md`, `dev-preferences.md`, `discussion-log.md`, and `user-profile.md` templates
- `user-profiling.md` and `workstream-flag.md` reference documentation
- `superpowers/plans/2026-03-18-materialize-new-project-config.md` and `superpowers/specs/2026-03-20-multi-project-workspaces-design.md` design documents
- Skill definitions (SKILL.md) for gsd-audit-milestone, gsd-cleanup, gsd-complete-milestone, gsd-discuss-phase, gsd-execute-phase, gsd-plan-phase, gsd-ui-phase, gsd-ui-review, and gsd-verify-work
- `mode: subagent` declarations added to all 18 agent definition files in `gsd-opencode/agents/`
- Full Japanese (ja-JP) documentation: AGENTS, ARCHITECTURE, CLI-TOOLS, COMMANDS, CONFIGURATION, FEATURES, README, USER-GUIDE, context-monitor, and workflow-discuss-mode
- Full Korean (ko-KR) documentation: AGENTS, ARCHITECTURE, CLI-TOOLS, COMMANDS, CONFIGURATION, FEATURES, README, USER-GUIDE, context-monitor, and workflow-discuss-mode
- Brazilian Portuguese (pt-BR) documentation: AGENTS, ARCHITECTURE, CLI-TOOLS, COMMANDS, CONFIGURATION, FEATURES, README, USER-GUIDE, context-monitor, and workflow-discuss-mode
- Simplified Chinese (zh-CN) documentation: README, USER-GUIDE, and full references subdirectory (checkpoints, continuation-format, decimal-phase-calculation, git-integration, git-planning-commit, model-profile-resolution, model-profiles, phase-argument-parsing, planning-config, questioning, tdd, ui-brand, verification-patterns)

### Changed

- Updated 12 existing agents (codebase-mapper, debugger, executor, integration-checker, nyquist-auditor, phase-researcher, plan-checker, planner, project-researcher, research-synthesizer, roadmapper, verifier) with improved behavior
- Enhanced 8 existing commands (discuss-phase, execute-phase, plan-phase, research-phase, debug, quick, reapply-patches, set-profile)
- Improved 30 existing workflows including execute-phase, plan-phase, discuss-phase, new-project, new-milestone, health, help, settings, and update
- Updated 12 CLI library modules (commands, config, core, frontmatter, init, milestone, phase, roadmap, state, template, verify, gsd-tools) for v1.30.0 compatibility
- Modified templates: config.json, context.md, phase-prompt.md, project.md, and UAT.md
- Updated 7 reference documents: checkpoints, decimal-phase-calculation, git-integration, model-profile-resolution, model-profiles, phase-argument-parsing, and planning-config

## [1.22.0] - 2026-03-08

Overview: Synchronized with upstream GSD v1.22.4 to fix agent execution syntax and prevent unexpected stops. Simplified model profile system from quality/balanced/budget to simple/smart/genius with updated configuration file structure. Enhanced copy and translate services for upstream synchronization.

### Added

- gsd-join-discord command definition routing to Discord community link in `gsd-opencode/commands/gsd/gsd-join-discord.md`
- M-COPY-AND-TRANSLATE.md workflow prompt for copying and translating changes from upstream GSD repository in `assets/prompts/M-COPY-AND-TRANSLATE.md`
- h-copy-and-translate.md meta prompt for copy and translate operations in `assets/prompts/completed/h-copy-and-translate.md`
- v1.22.4.json supplemental translation config to fix remaining forbidden strings in `assets/configs/v1.22.4.json`
- skills sections with workflow references to all agent files (gsd-codebase-mapper, gsd-debugger, gsd-executor, gsd-integration-checker, gsd-nyquist-auditor, gsd-phase-researcher, gsd-plan-checker, gsd-planner, gsd-project-researcher, gsd-research-synthesizer, gsd-roadmapper, gsd-verifier) in `gsd-opencode/agents/`
- hooks configuration for ESLint integration to all agent files in `gsd-opencode/agents/`
- awaiting_human_verify status to debug workflow state machine in `gsd-opencode/agents/gsd-executor.md`
- Wave execution diagram explaining parallel/sequential plan execution in `README.md`

### Changed

- Renamed model profiles from quality/balanced/budget to simple/smart/genius across all command and workflow files in `gsd-opencode/commands/gsd/` and `gsd-opencode/get-shit-done/workflows/`
- Changed configuration file from `.planning/config.json` to `.planning/oc-config.json` in `README.md`, command files, and workflow files
- Updated README.md with version 1.22.0 section documenting upstream sync and enhanced wave execution documentation in `README.md`
- Updated model profile examples with new model references (bailian-coding-plan/qwen3.5-plus, bailian-coding-plan/kimi-k2.5, bailian-coding-plan/MiniMax-M2.5) in `README.md`
- Renamed assets/bin scripts: COPY.md to GSD-COPY-FROM-ORIGINAL.md, TRANSLATION.md to GSD-TRANSLATE-IN-PLACE.md, translate.js to gsd-translate-in-place.js in `assets/bin/`
- Enhanced translator.js with improved regex backreference substitution for capture groups in `assets/lib/translator.js`
- Updated cli.js progress bar output and increased path truncation from 40 to 80 characters in `assets/lib/cli.js`
- Added docs/ directory to sync mapping in SyncService.js in `assets/copy-services/SyncService.js`
- Updated gsd-debugger.md with human verification checkpoint before resolving issues in `gsd-opencode/agents/gsd-debugger.md`
- Added explicit write tool instruction for file creation to gsd-codebase-mapper.md in `gsd-opencode/agents/gsd-codebase-mapper.md`
- Updated executor agent to check both .OpenCode/skills/ and .agents/skills/ paths in `gsd-opencode/agents/gsd-executor.md`
- Updated command table in README.md: removed /gsd-whats-new, added /gsd-join-discord in `README.md`
- Changed section heading from "Distribution System" to "Distribution Manager (gsd-opencode specific)" in `README.md`
- Updated output file naming convention from {phase}-{N}-SUMMARY.md to {phase_num}-{N}-SUMMARY.md in `README.md`
- Updated gsd-tools.cjs state management and config handling in `gsd-opencode/get-shit-done/bin/gsd-tools.cjs`
- Updated all library files in bin/lib/ for v1.22.4 compatibility in `gsd-opencode/get-shit-done/bin/lib/`
- Updated reference documentation for model profiles, phase calculation, and verification patterns in `gsd-opencode/get-shit-done/references/`

### Deprecated

- Old model profile names quality/balanced/budget in favor of simple/smart/genius in `README.md` and workflow files
- .planning/config.json replaced by .planning/oc-config.json for OpenCode-specific configuration in multiple files

### Removed

- Removed custom_overrides section from model profile documentation in `README.md`
- Removed /gsd-whats-new command from quick reference command table in `README.md`
- Deleted old version-specific translation configs: 1-20-4.json, 1-20-5.json, 1-20-5-2.json in `assets/configs/`
- Deleted AI-generated translation configs: glm47-made-config.json, glm5-made-config.json, grok-made-config.json, kimi25-made-config.json in `assets/configs/`

### Fixed

- Fixed config path resolution from ~/.claude/ to $HOME/.config/opencode/ for more reliable path handling in `assets/configs/config.json`
- Fixed skill attribute patterns from skill="gsd:plan-phase" to skill="gsd-plan-phase" (colon to dash) in `assets/configs/v1.22.4.json`
- Fixed file creation instructions to explicitly use write tool instead of bash heredoc in `gsd-opencode/agents/gsd-codebase-mapper.md` and `gsd-opencode/agents/gsd-debugger.md`
- Fixed debug workflow to require human verification checkpoint before marking issues as resolved in `gsd-opencode/agents/gsd-debugger.md`
- Fixed state load command to handle @file: prefix properly in `gsd-opencode/agents/gsd-debugger.md`
- Added "gsd:" to forbidden strings list in antipatterns.toml to catch remaining colon-format command references in `assets/antipatterns.toml`

### Security

- Hardened config path resolution by changing ~/.claude/ references to $HOME/.config/opencode/ for more reliable path resolution in multiple files
- Added explicit protection rules for oc-* and -oc-* files during sync operations in `assets/prompts/M-COPY-AND-TRANSLATE.md`

## [1.20.4] - 2026-03-05

Overview: Added allow-read-config command to gsd-oc-tools.cjs for managing external_directory permissions. Introduced automated GSD config folder access configuration with comprehensive test coverage and workflow integration.

### Added

- allow-read-config.cjs command for adding external_directory permission to read GSD config folder in `gsd-opencode/get-shit-done/bin/gsd-oc-commands/allow-read-config.cjs`
- Comprehensive test suite for allow-read-config command with 5 tests covering permission creation, idempotency, dry-run mode, backup creation, and verbose output in `gsd-opencode/get-shit-done/bin/test/allow-read-config.test.cjs`
- GSD config read permission step in oc-set-profile.md workflow to ensure access to `~/.config/opencode/get-shit-done/` in `gsd-opencode/get-shit-done/workflows/oc-set-profile.md`

### Changed

- Updated gsd-oc-tools.cjs help text and command routing to include allow-read-config command in `gsd-opencode/get-shit-done/bin/gsd-oc-tools.cjs`
- Updated opencode.json with external_directory permission for `/Users/roki/.config/opencode/get-shit-done/**` in `opencode.json`

## [1.20.3] - 2026-03-03

Overview: Major CLI tools release introducing gsd-oc-tools.cjs with comprehensive profile management, validation commands, and atomic transaction support. Added separate oc_config.json for profile configuration, pre-flight model validation, and vitest testing infrastructure.

### Added

- gsd-oc-tools.cjs CLI utility with six commands: check-opencode-json, check-config-json, update-opencode-json, set-profile, get-profile, and validate-models in `gsd-opencode/get-shit-done/bin/gsd-oc-tools.cjs`
- oc-profile-config.cjs library with validateProfile, applyProfileWithValidation, and atomic transaction with rollback support in `gsd-opencode/get-shit-done/bin/gsd-oc-lib/oc-profile-config.cjs`
- oc-config.cjs library for profile configuration operations with loadProfileConfig and applyProfileToOpencode in `gsd-opencode/get-shit-done/bin/gsd-oc-lib/oc-config.cjs`
- oc-core.cjs shared utilities for output formatting, error handling, and backup creation in `gsd-opencode/get-shit-done/bin/gsd-oc-lib/oc-core.cjs`
- oc-models.cjs for model catalog operations and validation in `gsd-opencode/get-shit-done/bin/gsd-oc-lib/oc-models.cjs`
- gsd-check-profile command definition routing to oc-check-profile workflow in `gsd-opencode/commands/gsd/gsd-check-profile.md`
- Profile validation workflow checking both opencode.json and oc_config.json in `gsd-opencode/get-shit-done/workflows/oc-check-profile.md`
- Vitest testing framework with comprehensive unit tests (45 tests across get-profile, oc-profile-config, and pivot-profile) in `gsd-opencode/get-shit-done/bin/test/`
- Test fixtures for valid and invalid configurations in `gsd-opencode/get-shit-done/bin/test/fixtures/`

### Changed

- Migrated profile configuration from config.json to separate `.planning/oc_config.json` to avoid conflicts
- Renamed config key from current_os_profile to current_oc_profile with auto-migration for backward compatibility
- Restructured profile format from profiles.{type} to profiles.presets.{profile_name} with planning/execution/verification model assignments
- Rewrote set-profile command with three operation modes: validate current, switch profile, and create inline profile
- Added pre-flight model validation ensuring all models validated before any file modifications
- Enhanced update-opencode-json with create-or-update pattern that creates opencode.json when missing
- Updated oc-core.cjs output() function to fix raw output double-stringification bug
- Updated ROADMAP.md and STATE.md with Phase 14, 15, 16 completion status and key decisions

### Fixed

- Fixed oc-core.cjs raw output double-stringification in output() function when raw=true flag used
- Fixed profile structure mismatch to support both profiles.models.{category} and profiles.{type} structures
- Fixed set-profile to create opencode.json when missing instead of requiring it to exist
- Fixed test model IDs to match actual opencode catalog (bailian-coding-plan/qwen3.5-plus)
- Fixed vitest configuration to discover tests in get-shit-done/bin/test/ directory

### Removed

- Removed legacy auto-migration logic (LEGACY_PROFILE_MAP constant) from set-profile.cjs
- Removed .translate-backups/backups.json legacy backup tracking file

## [1.20.2] - 2026-02-27

Overview: Updated subagent type references from "task" to "general" across workflow files for compatibility with the current agent system. Added path replacement rule for future installations.

### Changed

- Updated `subagent_type="task"` to `subagent_type="general"` in `gsd-opencode/commands/gsd/gsd-research-phase.md`, `gsd-opencode/get-shit-done/workflows/diagnose-issues.md`, `gsd-opencode/get-shit-done/workflows/discuss-phase.md`, `gsd-opencode/get-shit-done/workflows/new-project.md`, `gsd-opencode/get-shit-done/workflows/plan-phase.md`, and `gsd-opencode/get-shit-done/workflows/quick.md`
- Added path replacement rule in `assets/configs/config.json` to transform `subagent_type="task"` to `subagent_type="general"` during installation

## [1.20.1] - 2026-02-27

Overview: Renamed project instructions file from OPENCODE.md to AGENTS.md for broader AI agent compatibility. Updated path replacement rules and gitignore patterns.

### Changed

- Renamed project instructions file reference from `OPENCODE.md` to `AGENTS.md` in `gsd-opencode/agents/gsd-executor.md`, `gsd-opencode/agents/gsd-phase-researcher.md`, `gsd-opencode/agents/gsd-plan-checker.md`, and `gsd-opencode/agents/gsd-planner.md`
- Updated project instructions reference from `OPENCODE.md` to `AGENTS.md` in `gsd-opencode/get-shit-done/workflows/execute-phase.md`, `gsd-opencode/get-shit-done/workflows/plan-phase.md`, `gsd-opencode/get-shit-done/workflows/quick.md`, and `gsd-opencode/get-shit-done/workflows/update.md`
- Updated project instructions reference in `gsd-opencode/get-shit-done/templates/codebase/structure.md`
- Modified `assets/configs/config.json` to transform `OPENCODE.md` to `AGENTS.md` during installation path replacements

## [1.20.0] - 2026-02-25

Overview: Major release with complete GSD to OpenCode migration, Simple Profile System for model configuration, and comprehensive CLI tools infrastructure. Introduced copy-from-original synchronization services and translation utilities.

### Added

- Simple Profile System for model configuration in `assets/prompts/Simple-Profile-System.md` and `assets/lib/simple-profile.js`
- gsd-oc-select-model skill with interactive model selection workflow in `gsd-opencode/skills/gsd-oc-select-model/`
- Model configuration files for multiple providers (glm47, glm5, grok, kimi25, opus) in `assets/configs/`
- gsd-tools.cjs CLI utility in `gsd-opencode/get-shit-done/bin/gsd-tools.cjs` with commands for phase, roadmap, state, milestone, and verify operations
- Copy-from-original synchronization system with SubmoduleService, SyncManifest, and SyncService in `assets/copy-services/`
- Translation infrastructure with `assets/bin/translate.js`, `assets/lib/translator.js`, and `assets/lib/validator.js`
- New workflows: plan-phase, quick, remove-phase, research-phase, settings, health, cleanup in `gsd-opencode/get-shit-done/workflows/`
- Summary templates (complex, minimal, standard) in `gsd-opencode/get-shit-done/templates/`
- VALIDATION.md template for verification reports
- gsd-oc-work-hard.md rule file for OpenCode-specific work guidelines
- vitest.config.js for test configuration in `gsd-opencode/`

### Changed

- Migrated distribution manager code from `gsd-opencode/src/`, `gsd-opencode/lib/`, `gsd-opencode/agents/` to `gsd-opencode/bin/dm/` directory structure
- Renamed command files with gsd- prefix (e.g., `debug.md` to `gsd-debug.md`) in `gsd-opencode/commands/gsd/`
- Moved workflows from `commands/gsd/` to `get-shit-done/workflows/` directory
- Updated model profile terminology from quality/balanced/budget to simple/smart/genius across codebase
- Updated agent tool specifications in gsd-executor, gsd-planner, gsd-verifier, gsd-phase-researcher, gsd-plan-checker agents
- Enhanced checkpoints.md, git-integration.md, planning-config.md references
- Updated research.md, phase-prompt.md, summary.md templates

### Fixed

- Corrected tool list specifications for gsd-phase-researcher and other agents
- Added missing objective section and name field to gsd-reapply-patches command
- Fixed source directory path resolution in install operations
- Fixed test paths and package config after directory migration
- Replaced bare `~/.config/opencode/` paths during installation

### Removed

- Legacy files `gsd-opencode/package-old.json` and `gsd-opencode/package-lock-old.json`
- Original install.js script (migrated to bin/dm/)
- Removed set-model.md, set-profile.md, settings.md from agents directory (moved to workflows)

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
