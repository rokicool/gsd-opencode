# Feature Landscape: CLI Package Management Tools

**Domain:** CLI Package Management for GSD-OpenCode Distribution
**Researched:** 2026-02-09
**Confidence:** HIGH

## Table Stakes

Features users expect from any CLI package manager. Missing = product feels broken or incomplete.

### Core Lifecycle

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Install** | Core purpose of package manager | Medium | Must support local (project) and global (system) installation. Must handle path replacement during installation. |
| **Uninstall** | Counterpart to install | Low | Should remove cleanly without leaving orphans. `--force` for stubborn cases. |
| **Update/Upgrade** | Keep packages current | Medium | Must handle version resolution. Different from "self-update" of CLI tool. |
| **List** | See what's installed | Low | Basic inventory of installed packages. |
| **Check** | Verify installation health | Medium | Validate integrity, dependencies, configuration. Essential for GSD-OpenCode's "repair" workflow. |

### Installation Scope

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Global installation** | Install CLI tools system-wide | Medium | Write to system directories (e.g., `~/.local/bin`, `/usr/local/bin`). Handle PATH warnings. |
| **Local installation** | Per-project dependencies | Medium | Install to project directory (e.g., `./node_modules`, `./.venv`). Critical for GSD-OpenCode's agent definitions. |
| **Path discovery** | Find where things are installed | Low | `npm prefix`, `pip show`, `brew --prefix`. |

### Dry-Run & Simulation

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Dry-run mode** | Preview changes before applying | Medium | `--dry-run` flag (pip, Homebrew, Cargo). Critical for safety and CI integration. |
| **Force/overwrite** | Override existing installations | Low | `-f` / `--force` flag. Essential for automation and repair workflows. |

### Configuration & Discovery

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Config command** | View/manage settings | Low | `npm config`, `pip config`, `gh config`. Standard for CLI tools. |
| **Version flag** | Check CLI version | Low | `-v` / `--version`. Universal expectation. |
| **Help system** | Learn usage | Low | `-h` / `--help`. Comprehensive help per subcommand. |
| **Shell completion** | Tab completion | Medium | `npm completion`, `deno completions`. Modern expectation. |

## Differentiators

Features that set apart excellent CLI package managers from mediocre ones.

### Health & Maintenance

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Repair command** | Fix broken installations automatically | HIGH | GSD-OpenCode requirement. Beyond `check` - actually repairs. npm has `rebuild`, Homebrew has `doctor`. |
| **Doctor command** | Comprehensive health check | Medium | `npm doctor`, `brew doctor`. Multi-point diagnostic. Exit non-zero on issues. |
| **Verify/Checksum** | Validate package integrity | Medium | Checksum validation, corrupt package detection. npm validates cached tarballs. |

### Developer Experience

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **JSON output** | Machine-readable for scripting | Low | `--json` flag. Critical for automation and integration. |
| **Quiet mode** | Minimal output for scripts | Low | `-q` / `--quiet`. Suppress progress bars, confirmations. |
| **Verbose mode** | Detailed debugging | Low | `-v` / `--verbose`. Multi-level verbosity (`-vv`). |
| **Progress indicators** | Show activity during long operations | Medium | Progress bars, spinners. Disable in non-TTY. |

### Template & Path Handling (GSD-OpenCode Specific)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Path replacement** | Dynamic configuration during install | HIGH | Core GSD-OpenCode requirement. Replace placeholders with actual paths in installed files. |
| **Multi-artifact types** | Handle agents, commands, workflows | Medium | GSD-OpenCode needs to install different artifact types to different locations. |
| **Config directory management** | Know where OpenCode configs live | Medium | Discover and write to `~/.config/opencode/` paths. |

### Version Management

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Version pinning** | Lock to specific versions | Medium | `brew pin`, `npm shrinkwrap`. Prevent accidental upgrades. |
| **Version switching** | Multiple versions side-by-side | HIGH | `pyenv`, `nvm`. Not table stakes but powerful differentiator. |
| **Semantic versioning** | Understand semver ranges | Medium | Parse `^1.2.0`, `~1.2.0`, `>=1.0.0 <2.0.0`. |

### Safety & Validation

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Pre-install validation** | Check prerequisites | Medium | Verify directories writable, disk space, compatible versions. |
| **Rollback capability** | Undo failed installs | HIGH | Restore previous state on failure. Complex but valuable. |
| **Dependency checking** | Verify requirements satisfied | Medium | `pip check`, `npm audit`. For GSD-OpenCode: check OpenCode version compatibility. |

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Automatic updates** | Breaks reproducibility, surprises users | Make updates explicit. Provide `--upgrade` flag. |
| **Registry authentication** | Adds complexity, not needed for GSD | Keep distribution simple (GitHub releases or static files). |
| **Package publishing** | Out of scope for client tool | Focus on install/uninstall/update. |
| **Dependency resolution** | Complex, error-prone | GSD-OpenCode artifacts are standalone. Avoid dependency hell. |
| **Build from source** | Slow, requires toolchain | Distribute pre-built artifacts. |
| **Plugin system** | Overkill for MVP | Core commands only. Add if needed later. |
| **Web UI** | Scope creep | Stay CLI-focused. Web interface is separate product. |
| **Package signing verification** | Premature complexity | HTTPS + checksums sufficient for initial release. |
| **Remote execution** | Security nightmare | Never execute remote code. Download and validate first. |
| **Magic auto-fix** | Dangerous, unpredictable | Explicit repair command with clear actions and confirmations. |

## Feature Dependencies

```
Core Layer (Foundation):
├── install
│   ├── path replacement (modifies installed files)
│   ├── global/local scope selection
│   └── force/overwrite handling
├── uninstall
│   ├── clean removal
│   └── orphan detection (future)
├── list
│   └── installed package inventory
└── check
    ├── file integrity validation
    ├── configuration validation
    └── OpenCode compatibility check

Maintenance Layer:
├── update
│   ├── version resolution
│   └── atomic swap (download new, remove old)
└── repair
    ├── check (depends on check functionality)
    ├── reinstall broken packages
    └── fix path replacements

UX Layer:
├── dry-run (works with install, uninstall, update, repair)
├── json output (works with list, check)
├── quiet mode (global flag)
└── verbose mode (global flag)

Configuration Layer:
├── config command
│   ├── get/set values
│   └── list current config
└── shell completion
    └── static completion scripts
```

## GSD-OpenCode Specific Requirements

Based on project context (installing agent definitions, command definitions, workflow templates):

### Artifact Types to Support

| Type | Destination | Path Replacement Needed |
|------|-------------|------------------------|
| Agent definitions | `~/.config/opencode/agents/` | Yes (template variables) |
| Command definitions | `~/.config/opencode/commands/` | Yes (template variables) |
| Workflow templates | `~/.config/opencode/workflows/` | Yes (template variables) |
| Skills | `~/.config/opencode/skills/` | Yes (template variables) |

### Installation Sources

| Source | Priority | Notes |
|--------|----------|-------|
| GitHub releases | High | Primary distribution method |
| Local filesystem | Medium | Development and testing |
| Remote URL | Low | Direct URL installation |

### Template Variables (Path Replacement)

| Variable | Replacement | Example |
|----------|-------------|---------|
| `{{OPENCODE_CONFIG_DIR}}` | `~/.config/opencode` | `/Users/name/.config/opencode` |
| `{{HOME}}` | User home directory | `/Users/name` |
| `{{INSTALL_DATE}}` | Installation timestamp | `2026-02-09T10:30:00Z` |
| `{{PACKAGE_VERSION}}` | Installed version | `1.2.3` |

## MVP Recommendation

For initial release, prioritize these features:

### Phase 1 (Core): Must Have
1. **install** (global/local, with path replacement)
2. **uninstall** (clean removal)
3. **list** (basic inventory)
4. **check** (health verification)

### Phase 2 (Maintenance): Important
5. **update** (version management)
6. **repair** (fix broken installs)
7. **dry-run** (preview mode)

### Phase 3 (Polish): Nice to Have
8. JSON output
9. Shell completion
10. Config command

### Explicitly Deferred
- Version switching (multiple versions)
- Dependency resolution (not needed for standalone artifacts)
- Plugin system
- Web UI
- Package signing beyond HTTPS

## Complexity Summary

| Complexity | Features |
|------------|----------|
| **Low** | list, uninstall, version flag, help, quiet mode, JSON output |
| **Medium** | install, check, update, dry-run, shell completion, config command |
| **High** | repair, path replacement, progress indicators, rollback |
| **Very High** | version switching, plugin system, dependency resolution |

## Sources

- npm CLI documentation: https://docs.npmjs.com/cli/v10/commands
- Cargo documentation: https://doc.rust-lang.org/cargo/commands/cargo-install.html
- Homebrew documentation: https://docs.brew.sh/Manpage
- pip documentation: https://pip.pypa.io/en/stable/cli/
- Deno CLI: https://docs.deno.com/runtime/reference/cli/install/
- CLI Guidelines: https://clig.dev/
- GitHub CLI: https://cli.github.com/
