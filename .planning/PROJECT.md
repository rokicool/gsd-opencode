# gsd-opencode

## What This Is

A meta-prompting, context engineering and spec-driven development system for OpenCode. GSD provides structured workflows for project initialization, planning, and execution through declarative prompt-based orchestration. It transforms vague ideas into executable plans with AI-powered agents.

## Core Value

Enable developers to go from idea to shipped code through structured, repeatable workflows that maintain context and ensure nothing falls through the cracks.

## Requirements

### Validated

- ✓ Install script with global/local support — existing
- ✓ Multi-runtime support (Claude Code, OpenCode, Gemini) — existing
- ✓ Command structure with slash commands — existing
- ✓ Agent-based workflow orchestration — existing
- ✓ File-based state management — existing
- ✓ Template-driven document generation — existing
- ✓ Update checking mechanism — existing
- ✓ Statusline integration — existing
- ✓ Path replacement during install — existing
- ✓ Uninstall capability — existing

### Active

- [ ] npm package with proper lifecycle scripts
- [ ] Build/bundle process for hooks
- [ ] Test suite for install/uninstall/update
- [ ] CI/CD pipeline for publishing
- [ ] Documentation site
- [ ] Version management improvements

### Out of Scope

- GUI interface — CLI-only by design
- Database persistence — file-based state is intentional
- Real-time collaboration — single-user workflow
- Cloud hosting — local-first architecture

## Context

This is a brownfield project with existing code in `gsd-opencode/` directory. The codebase has been mapped and contains:
- Installation system supporting multiple AI runtimes
- Command definitions in `command/gsd/`
- Agent definitions in `agents/`
- Workflow templates in `get-shit-done/`
- Hooks for statusline and update checking

The project needs formal npm packaging with proper lifecycle management (install, uninstall, update, check).

## Constraints

- **Tech stack**: Node.js >=16.7.0, CommonJS modules
- **Compatibility**: Must support Claude Code, OpenCode, and Gemini CLI
- **Distribution**: npm registry
- **Installation**: Global and local install modes
- **State**: File-based only, no external dependencies

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Multi-runtime support | Users work across different AI assistants | ✓ Good — increases adoption |
| File-based state | Simplicity, version control friendly | ✓ Good — no database needed |
| Declarative prompts | AI-native, self-documenting | ✓ Good — easy to extend |
| npm distribution | Standard JavaScript ecosystem | — Pending |

---
*Last updated: 2025-02-01 after initialization*
