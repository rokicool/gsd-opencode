# Technology Stack

**Analysis Date:** 2026-01-20

## Languages

**Primary:**
- JavaScript (Node.js, CommonJS) - CLI/installer and CI utilities in `gsd-opencode/bin/install.js` and `assets/bin/*.js`

**Secondary:**
- Markdown - Prompt/command content and templates in `gsd-opencode/command/gsd/*.md`, `gsd-opencode/agents/*.md`, `gsd-opencode/get-shit-done/{workflows,templates,references}/*.md`
- TOML - Forbidden-strings configuration in `assets/antipatterns.toml`
- YAML - GitHub Actions workflows in `.github/workflows/*.yml`
- JSON - Package manifests in `package.json` and `gsd-opencode/package.json`

## Runtime

**Environment:**
- Node.js (minimum): `>=16.7.0` (declared in `gsd-opencode/package.json`)
- CI uses Node.js 18 for validation/build (`.github/workflows/validate.yml`, `.github/workflows/ci.yml`) and Node.js 20 for npm publish with OIDC (`.github/workflows/release.yml`)

**Package Manager:**
- npm (implicit via `npm install`, `npm pack`, `npm publish` in `.github/workflows/*.yml`)
- Lockfile: missing (no `package-lock.json` / `pnpm-lock.yaml` / `yarn.lock` detected; `package-lock.json` is in `.gitignore`)

## Frameworks

**Core:**
- Not applicable (this is a content/automation package + Node.js installer script, not an application)

**Testing:**
- Not implemented (no Jest/Vitest config; `gsd-opencode/package.json` has `"test": "echo \"Error: no test specified\" && exit 1"`)

**Build/Dev:**
- GitHub Actions for validation/build/release automation (`.github/workflows/{validate,ci,release}.yml`)
- No build step for JavaScript (runs directly)

## Key Dependencies

**Production (gsd-opencode package):**
- None declared (no `dependencies` in `gsd-opencode/package.json`)
- Installer uses only Node.js built-ins: `fs`, `path`, `os`, `readline`

**Development (root package.json):**
- `@iarna/toml` ^2.2.5 - parses `assets/antipatterns.toml` in `assets/bin/check-forbidden-strings.js`

## Configuration

**Environment Variables:**
- `OPENCODE_CONFIG_DIR` - Custom OpenCode config directory (optional, read in `gsd-opencode/bin/install.js`)
- `GITHUB_TOKEN` - GitHub Packages auth (referenced in `gsd-opencode/.npmrc`)

**CLI Arguments (installer):**
- `--global` / `-g` - Install to `~/.config/opencode/` (or `$OPENCODE_CONFIG_DIR`)
- `--local` / `-l` - Install to `./.opencode/`
- `--config-dir <path>` / `-c <path>` - Specify custom config directory
- `--help` / `-h` - Show help

**Build/CI Configuration:**
- `.github/workflows/validate.yml` - Node syntax checks, command/workflow structure checks, antipattern scanner
- `.github/workflows/ci.yml` - validation + build/package publish to GitHub Packages (scoped `@rokicool/gsd-opencode`)
- `.github/workflows/release.yml` - tagged releases, artifacts + publish to npm using OIDC

## Platform Requirements

**Development:**
- Node.js >= 16.7.0
- npm
- Git with submodule support (`git submodule update --init --recursive` for `original/get-shit-done`)
- Works on macOS, Windows, Linux

**Production:**
- Distributed as npm package with `npx gsd-opencode` entrypoint
- Published to npmjs.org (production releases) and GitHub Packages (branch builds)

## Project Structure Overview

This is a **meta-prompting system for OpenCode**, not a traditional application:

| Directory | Purpose |
|-----------|---------|
| `gsd-opencode/bin/` | CLI installer (`install.js`) |
| `gsd-opencode/command/gsd/` | Slash commands (24 .md files) |
| `gsd-opencode/agents/` | Specialized agent prompts (11 .md files) |
| `gsd-opencode/get-shit-done/templates/` | Document templates (20 .md files) |
| `gsd-opencode/get-shit-done/workflows/` | Process definitions (12 .md files) |
| `gsd-opencode/get-shit-done/references/` | Style guides (7 .md files) |
| `original/get-shit-done/` | Git submodule - upstream source from TÂCHES |
| `assets/bin/` | Translation and validation utilities |

**Translation System:**
- Source: `original/get-shit-done/` (git submodule from `glittercowboy/get-shit-done`)
- Target: `gsd-opencode/`
- Translator: `assets/bin/translate-files.js` - converts Claude Code references to OpenCode
- Validator: `assets/bin/check-forbidden-strings.js` - ensures no Claude-specific terms remain

---

*Stack analysis: 2026-01-20*
