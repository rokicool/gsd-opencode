# External Integrations

**Analysis Date:** 2026-02-09

## APIs & External Services

**npm Registry:**
- npmjs.org - Primary package distribution
- GitHub Packages - Alternative registry for CI builds
- Auth: OIDC token (npm 11.7.0+ required for tokenless publishing)
- Files: `.github/workflows/release.yml`

**GitHub API:**
- Used for releases via `gh` CLI
- Actions: Create releases, upload assets, manage tags
- Auth: `GITHUB_TOKEN` (automatic in Actions)

## Data Storage

**Databases:**
- None - This system is stateless; project state stored in `.planning/` directory as markdown files

**File Storage:**
- Local filesystem only
- Install locations:
  - `~/.config/opencode/` - Global OpenCode config (XDG standard)
  - `./.opencode/` - Local project install
  - `~/.claude/` - Claude Code config (original GSD)
  - `~/.gemini/` - Gemini CLI config (original GSD)

**Caching:**
- `~/.claude/cache/gsd-update-check.json` - Update check cache (original GSD)
- `~/.claude/todos/` - Todo list storage for statusline

## Authentication & Identity

**Auth Provider:**
- npm OIDC - Tokenless publishing via GitHub Actions OIDC
- No user authentication required (CLI tool)

## Monitoring & Observability

**Error Tracking:**
- None - Silent failures in hooks to avoid disrupting user workflow

**Logs:**
- Console output during installation
- GitHub Actions logs for CI/CD
- Statusline hooks read from stdin and write to stdout

## CI/CD & Deployment

**Hosting:**
- npm registry (package distribution)
- GitHub (source code, releases)

**CI Pipeline:**
- GitHub Actions (3 workflow files):
  - `.github/workflows/validate.yml` - Reusable validation
  - `.github/workflows/ci.yml` - CI pipeline (all branches)
  - `.github/workflows/release.yml` - Production release (tag-triggered)

**Release Process:**
1. Push tag `v*.*.*` (e.g., `v1.9.0`)
2. Validation runs (syntax, structure, antipatterns)
3. Version extracted from tag, package.json updated
4. Production tests and security audit
5. Build artifacts and checksums
6. GitHub release created with assets
7. Package published to npm via OIDC
8. `latest` tag updated

## Environment Configuration

**Required env vars (CI):**
- `GITHUB_TOKEN` - Automatic in Actions
- `NODE_AUTH_TOKEN` - GitHub Packages auth

**Optional env vars (User):**
- `OPENCODE_CONFIG_DIR` - Custom OpenCode config location
- `OPENCODE_CONFIG` - Alternative config file path
- `XDG_CONFIG_HOME` - XDG base directory
- `CLAUDE_CONFIG_DIR` - Claude Code config (original GSD)
- `GEMINI_CONFIG_DIR` - Gemini CLI config (original GSD)

**Secrets location:**
- GitHub repository secrets (for CI/CD)
- No secrets in codebase

## Webhooks & Callbacks

**Incoming:**
- None - CLI tool, no server component

**Outgoing:**
- None - No external API calls from installed system

## Runtime Integrations

**Target Platforms:**
| Platform | Config Directory | Notes |
|----------|------------------|-------|
| OpenCode | `~/.config/opencode/` | Primary target for this fork |
| Claude Code | `~/.claude/` | Original GSD target |
| Gemini CLI | `~/.gemini/` | Original GSD target (experimental) |

**Integration Points:**
- Slash commands - Installed to `{config}/command/gsd/*.md`
- Agents - Installed to `{config}/agents/gsd-*.md`
- Workflows/templates - Installed to `{config}/get-shit-done/`
- Hooks - Installed to `{config}/hooks/` (Claude Code/Gemini only)
- Settings - Modified in `{config}/settings.json`

## Hook System (Original GSD)

**SessionStart Hooks:**
- `gsd-check-update.js` - Checks for GSD updates on session start
- Configured in `settings.json` under `hooks.SessionStart`

**Statusline:**
- `gsd-statusline.js` - Shows model, task, context usage in terminal
- Reads JSON from stdin, outputs formatted status
- Configured in `settings.json` under `statusLine`

**Note:** OpenCode uses themes instead of statusline hooks, so these are skipped for OpenCode installs.

---

*Integration audit: 2026-02-09*
