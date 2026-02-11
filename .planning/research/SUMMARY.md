# Project Research Summary

**Project:** GSD-OpenCode CLI Package Manager
**Domain:** Node.js CLI Tools with Subcommand Architecture
**Researched:** 2026-02-09
**Confidence:** HIGH

## Executive Summary

This research analyzes the domain of CLI package management tools, specifically for distributing GSD-OpenCode artifacts (agent definitions, command definitions, workflows). The standard approach for building production-grade Node.js CLI tools in 2025 centers on **oclif** as the framework, with **chalk** for terminal styling and **conf** for configuration persistence. These libraries represent a mature, actively maintained ecosystem with millions of dependents and strong TypeScript support.

The key architectural shift recommended is moving from the current monolithic `bin/install.js` structure to a multi-command CLI with clear separation of concerns: entry points in `bin/`, command implementations in `src/commands/`, shared services in `src/services/`, and utilities in `src/utils/`. This follows established patterns from npm CLI, GitHub CLI, and other industry-standard tools.

Seven critical pitfalls have been identified that must be addressed: path traversal attacks, partial installation cleanup failures, cross-platform path inconsistencies, permission errors, version conflicts, poor signal handling, and inadequate error messages. Most critical are path validation and atomic installation, which must be implemented in Phase 1 to prevent security vulnerabilities and corrupted state.

## Key Findings

### Recommended Stack

The research confirms a well-established, high-confidence stack for Node.js CLI tools:

**Core technologies:**
- **@oclif/core (^4.8.0)**: CLI framework with built-in subcommand support, flag parsing, help generation, and plugin architecture. Powers Heroku CLI and Salesforce CLI. Requires Node.js 18+ (LTS).
- **chalk (^5.6.2)**: Terminal styling — industry standard with 115k+ dependents, no dependencies, auto-detects color support. Chalk 5 is ESM-only.
- **conf (^15.1.0)**: Configuration persistence — 154k dependents, atomic writes, JSON schema validation via ajv, handles config directory selection per OS.

**Supporting libraries:**
- **ora (^9.3.0)**: Loading spinners for long operations (8.2m dependents)
- **@inquirer/prompts (^13.2.2)**: Interactive prompts rewritten for reduced package size (10m dependents)
- **execa (^9.6.1)**: Safer process execution alternative to child_process (26.6m dependents)
- **semver (^7.7.3)**: Version parsing and comparison

**Development tools:**
- **oclif**: CLI generator via `npx oclif generate`
- **vitest**: ESM-native testing (faster than Jest for CLI testing)

### Expected Features

**Must have (table stakes):**
- **install** — Core purpose, must support local (project) and global (system) installation with path replacement
- **uninstall** — Clean removal without leaving orphans
- **check** — Verify installation health, file integrity, configuration
- **list** — Basic inventory of installed packages
- **update/upgrade** — Keep packages current
- **dry-run mode** — Preview changes before applying (critical for safety and CI)
- **config command** — View/manage settings
- **version flag** — Check CLI version
- **help system** — Comprehensive help per subcommand
- **force/overwrite** — Override existing installations

**Should have (competitive):**
- **repair command** — Fix broken installations automatically (HIGH complexity, GSD-OpenCode requirement)
- **doctor command** — Comprehensive health check (npm doctor, brew doctor pattern)
- **path replacement** — Dynamic configuration during install (HIGH complexity, replaces placeholders like `{{OPENCODE_CONFIG_DIR}}`)
- **JSON output** — Machine-readable for scripting (`--json` flag)
- **quiet/verbose modes** — Minimal output for scripts, detailed debugging
- **progress indicators** — Show activity during long operations
- **shell completion** — Tab completion support

**Defer (v2+):**
- Version switching (multiple versions side-by-side) — Very high complexity
- Plugin system — Overkill for MVP
- Dependency resolution — GSD-OpenCode artifacts are standalone
- Web UI — Scope creep, separate product
- Package signing beyond HTTPS — Premature complexity

### Architecture Approach

The current monolithic `bin/install.js` (324 lines) has problems: all logic in one file, no separation of concerns, hard to add new commands, no shared utilities.

**Recommended structure:**
```
gsd-opencode/
├── bin/
│   ├── gsd.js                    # New main entry (replaces install.js)
│   └── gsd-install.js            # Legacy compatibility alias
├── src/
│   ├── commands/
│   │   ├── install.js            # Install command implementation
│   │   ├── uninstall.js          # Uninstall command
│   │   ├── check.js              # Check installation integrity
│   │   ├── repair.js             # Repair broken installation
│   │   └── update.js             # Update to latest version
│   ├── services/
│   │   ├── scope-manager.js      # Global/local scope resolution
│   │   ├── file-ops.js           # File operations with path replacement
│   │   └── config.js             # Configuration management
│   └── utils/
│       ├── path-resolver.js      # Path expansion/normalization
│       ├── logger.js             # Terminal output utilities
│       └── interactive.js        # User prompts
└── lib/
    └── constants.js              # Shared constants
```

**Major components:**
1. **CLI Entry (bin/gsd.js)** — Parse args, route to commands, global flags using oclif
2. **Commands (src/commands/)** — Self-contained command implementations
3. **Scope Manager** — Resolve global vs local paths, environment detection
4. **File Operations** — Copy with path replacement, verification, atomic operations
5. **Config Manager** — Read/write configuration, version tracking

**Key patterns:**
- Command pattern with oclif for subcommands
- Dependency injection (pass context object to commands)
- Service layer for shared operations
- Backward compatibility shim for legacy CLI interface

### Critical Pitfalls

1. **Path Traversal in File Installation** — Malicious packages could escape installation directory (`../../sensitive/file`). Always validate target paths using `path.resolve()` and verify they remain within intended directory. Test with `../../../etc/passwd` paths.

2. **Corrupted or Partial Installation Cleanup** — Failed installations leave partial files. Implement atomic installation: write to temp directory first, then move to final location only after all operations succeed. Handle SIGINT/SIGTERM for cleanup.

3. **Cross-Platform Path Separator Inconsistencies** — Hardcoding `/` fails on Windows. Always use `path.join()`, `path.resolve()`, `path.normalize()`. Test on all target platforms (Ubuntu, macOS, Windows CI runners).

4. **Permission Errors with System Directories** — Installing to `/usr/local` or `C:\Program Files` fails without elevation. Check permissions before writing with `fs.access()`, request elevation only when needed, support user-local installation (`~/.local`).

5. **Silent Version Conflicts** — May silently overwrite newer versions with older ones. Implement version checking with semver, respect semver ranges, warn about conflicts, track installed versions in lockfile.

6. **Poor Signal Handling** — Ctrl+C leaves partial files. Install signal handlers for SIGINT/SIGTERM/SIGHUP, use atomic operations, implement cleanup registry.

7. **Inadequate Error Messages** — Unhelpful errors like `ENOENT` without context. Wrap errors with file paths, operation names, and suggestions. Categorize errors (user/system/network). Provide `--verbose` flag.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Core Installation Foundation
**Rationale:** Foundation must be solid before building on it. Path validation and atomic installation are security-critical and cannot be retrofitted.
**Delivers:** Working install, uninstall, check, list commands with proper path validation and atomic operations
**Addresses:** Table stakes features (install, uninstall, check, list)
**Avoids:** Path traversal attacks, partial installation corruption, cross-platform path bugs
**Research Flag:** Standard patterns — well-documented oclif usage, no additional research needed

### Phase 2: Maintenance & Error Handling
**Rationale:** Depends on Phase 1 services. Repair reuses check + install patterns. Error handling and signal safety should be layered on after core logic works.
**Delivers:** Update, repair commands, comprehensive error handling, signal safety, atomic operations
**Uses:** File operations service, scope manager from Phase 1
**Implements:** Pitfall prevention (cleanup, permissions, error messages)
**Research Flag:** Standard patterns — established error handling patterns, no additional research needed

### Phase 3: Developer Experience & Polish
**Rationale:** UX improvements that depend on stable core. JSON output, shell completion, and config command are additive.
**Delivers:** Dry-run mode, JSON output, quiet/verbose modes, shell completion, config command
**Addresses:** Differentiator features (progress indicators, JSON output, shell completion)
**Research Flag:** Standard patterns — oclif has built-in completion support, no additional research needed

### Phase 4: CI/CD & Distribution
**Rationale:** Final phase for automation and delivery. GitHub Actions integration, cross-platform testing, release automation.
**Delivers:** GitHub Actions workflow, automated releases, cross-platform CI testing, artifact verification
**Avoids:** Security leaks in logs, Windows failures, hardcoded credentials
**Research Flag:** **NEEDS RESEARCH** — GitHub Actions integration specifics for this project, artifact distribution strategy

### Phase Ordering Rationale

- **Phase 1 first:** Core installation logic has zero dependencies and is on the critical path for all other phases. Must implement path validation and atomic operations from the start (can't retrofit security).
- **Phase 2 second:** Repair and update commands depend on file operations and scope manager from Phase 1. Error handling patterns should be established after core logic is working.
- **Phase 3 third:** UX features are additive and depend on stable commands. JSON output requires stable command results.
- **Phase 4 last:** CI/CD pipeline tests the deliverables from previous phases. Needs working CLI to test.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (CI/CD Pipeline):** GitHub Actions workflow specifics, artifact distribution strategy, secret management patterns for this organization

Phases with standard patterns (skip research-phase):
- **Phase 1 (Core Installation):** Well-documented oclif patterns, standard file operations
- **Phase 2 (Maintenance):** Established error handling and signal handling patterns
- **Phase 3 (DX):** oclif has built-in support for completion and help generation

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official oclif documentation, clig.dev recommendations, millions of dependents, actively maintained |
| Features | HIGH | Derived from npm, pip, Homebrew, Cargo patterns — well-established feature sets |
| Architecture | HIGH | Based on Commander.js docs, npm CLI patterns, industry-standard separation of concerns |
| Pitfalls | HIGH | Snyk security best practices, npm documentation, established CLI patterns |

**Overall confidence:** HIGH

All research areas have high confidence based on official documentation, security best practices from Snyk, and established patterns from major CLI tools (npm, GitHub CLI, Homebrew). The domain is mature with well-understood patterns.

### Gaps to Address

- **GitHub Actions integration specifics:** While general patterns are known, the exact workflow for this organization's GitHub setup needs validation during Phase 4 planning
- **Artifact distribution strategy:** Primary source will be GitHub releases, but exact asset structure and download verification needs definition
- **Template variable specification:** Path replacement variables (`{{OPENCODE_CONFIG_DIR}}`, etc.) need to be finalized during requirements phase

## Sources

### Primary (HIGH confidence)
- oclif.io/docs/introduction — Official documentation, v4.0 with ESM support
- github.com/oclif/core/releases — v4.8.0 latest release
- clig.dev — CLI Guidelines recommending oclif for Node.js
- github.com/chalk/chalk — v5.6.2, 115k+ dependents
- github.com/sindresorhus/conf — v15.1.0, 154k dependents
- npm CLI documentation (docs.npmjs.com/cli/v10/commands) — Feature patterns
- Snyk: 10 npm Security Best Practices — Security pitfalls

### Secondary (MEDIUM confidence)
- Homebrew documentation (docs.brew.sh/Manpage) — Doctor/repair patterns
- Cargo documentation — Install/update patterns
- pip documentation — Dry-run and config patterns
- GitHub CLI (cli.github.com) — Command structure patterns

### Tertiary (LOW confidence)
- Deno CLI patterns — Alternative approach validation

---

*Research completed: 2026-02-09*
*Ready for roadmap: yes*
