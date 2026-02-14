# Technology Stack

**Analysis Date:** 2026-02-09

## Languages

**Primary:**
- JavaScript (ES6+) - Core implementation language for installer, hooks, and scripts

**Secondary:**
- Markdown - All commands, agents, workflows, templates, and references are written as markdown files with YAML frontmatter
- YAML - Frontmatter configuration in markdown files
- JSON - Package manifests and configuration files
- TOML - Antipatterns configuration (checked during validation)

## Runtime

**Environment:**
- Node.js 16.7.0+ (minimum required version per `gsd-opencode/package.json` engines)
- Node.js 18 - CI/CD default version (see `.github/workflows/validate.yml`)
- Node.js 20 - Production release OIDC publishing (see `.github/workflows/release.yml`)

**Package Manager:**
- npm - Primary package manager
- Lockfile: `package-lock.json` present in each package directory

## Frameworks

**Core:**
- None - This is a prompt-engineering/meta-prompting system, not a traditional application framework

**Build/Dev:**
- esbuild ^0.24.0 - Used in original GSD for building hooks (see `original/get-shit-done/package.json`)
- npm pack - Package distribution

## Key Dependencies

**Root (`package.json`):**
- @iarna/toml ^2.2.5 - TOML parsing for antipatterns checking

**Original GSD (`original/get-shit-done/package.json`):**
- esbuild ^0.24.0 - Bundler for hook scripts

**GSD-OpenCode (`gsd-opencode/package.json`):**
- ci-info - CI environment detection (transitive)

## Configuration

**Environment:**
- `OPENCODE_CONFIG_DIR` - Custom OpenCode configuration directory
- `XDG_CONFIG_HOME` - XDG base directory spec support
- `GITHUB_TOKEN` - CI/CD token for package publishing

**Build:**
- `bin/install.js` - Main installer script with CLI options
- No build step required for core package (markdown files are used directly)
- Original GSD has `npm run build:hooks` for hook bundling

## Platform Requirements

**Development:**
- Node.js 16.7.0+
- npm
- Git (with submodule support for original GSD)

**Production:**
- Node.js 16.7.0+
- Works on Mac, Windows, and Linux (cross-platform installer)
- OpenCode CLI (target platform)
- Optionally: Claude Code or Gemini CLI (original GSD multi-runtime support)

## Project Structure

**Three Main Directories:**

| Directory | Purpose |
|-----------|---------|
| `./original/` | Git submodule pointing to upstream TÂCHES GSD repo |
| `./gsd-opencode/` | Adapted version for OpenCode |
| `./local/` | Development work directory |

**Key File Types:**
- `.md` files with YAML frontmatter - Commands, agents, workflows
- `.js` files - Installer and hook scripts
- `.json` files - Package manifests and configuration
- `.yml` files - GitHub Actions workflows

## Distribution

**npm Package:**
- Package name: `gsd-opencode`
- Registry: npmjs.org (public)
- Alternative: GitHub Packages (`@rokicool/gsd-opencode`)
- Install command: `npx gsd-opencode` or `npm install -g gsd-opencode`

**Installation Targets:**
- Global: `~/.config/opencode/` (XDG standard)
- Local: `./.opencode/` (project-specific)
- Custom: Via `--config-dir` flag or `OPENCODE_CONFIG_DIR` env var

---

*Stack analysis: 2026-02-09*
