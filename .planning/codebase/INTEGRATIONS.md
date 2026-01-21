# External Integrations

**Analysis Date:** 2026-01-20

## APIs & External Services

**Source Control & Automation:**
- GitHub
  - Repository hosting
  - GitHub Actions CI/CD
  - Workflows: `.github/workflows/{validate,ci,release}.yml`
  - Uses `actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`, `actions/download-artifact@v4`

**Package Registries:**
- npm (npmjs.org)
  - Production releases via OIDC in `.github/workflows/release.yml`
  - Package name: `gsd-opencode`
  - No static token required (uses GitHub OIDC)
  
- GitHub Packages (npm.pkg.github.com)
  - Branch/CI builds via `.github/workflows/ci.yml`
  - Package name: `@rokicool/gsd-opencode`
  - Auth: `GITHUB_TOKEN` / `NODE_AUTH_TOKEN`
  - Config: `gsd-opencode/.npmrc`

**Upstream Content Source:**
- Git submodule: `original/get-shit-done`
  - URL: `https://github.com/glittercowboy/get-shit-done` (declared in `.gitmodules`)
  - Purpose: Source material for translation to OpenCode format
  - Used by: `assets/bin/translate-files.js`

## Data Storage

**Databases:**
- None

**File Storage:**
- Local filesystem only
- Installer copies files to OpenCode config directory (`gsd-opencode/bin/install.js`)
- Target locations:
  - Global: `~/.config/opencode/` (or `$OPENCODE_CONFIG_DIR`)
  - Local: `./.opencode/`

**Caching:**
- None

## Authentication & Identity

**Runtime Auth:**
- Not applicable (installer has no auth requirements)

**CI/Registry Auth:**
- GitHub Packages:
  - `${{ secrets.GITHUB_TOKEN }}` → `NODE_AUTH_TOKEN` in `.github/workflows/ci.yml`
  - Local: `GITHUB_TOKEN` via `gsd-opencode/.npmrc`
  
- npm (production):
  - OIDC provenance (`npm@11.7.0` with `id-token: write` permission)
  - No static token stored

## Monitoring & Observability

**Error Tracking:**
- None

**Logs:**
- Console output only (`console.log` in `gsd-opencode/bin/install.js`)
- GitHub Actions step output for CI (`.github/workflows/*.yml`)

**Metrics:**
- npm download stats (public npm registry)
- GitHub Actions run history

## CI/CD & Deployment

**Hosting:**
- npm registries (npmjs.org and GitHub Packages)
- No server hosting (client-side installer only)

**CI Pipeline (GitHub Actions):**

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `validate.yml` | Called by other workflows | Code quality checks, structure validation, antipattern scanning |
| `ci.yml` | Push to any branch | Validation → Version generation → Build → Publish to GitHub Packages |
| `release.yml` | Push tag `v*.*.*` | Validation → Production tests → Build → GitHub Release → npm publish |

**Deployment Process:**
1. Tag commit with `v*.*.*` (e.g., `v1.6.0`)
2. `release.yml` runs automatically
3. Validates code and GSD compliance
4. Builds npm package with checksums
5. Creates GitHub Release with artifacts
6. Publishes to npm with OIDC provenance

## Environment Configuration

**Required Environment Variables:**
- None strictly required for users

**Optional Environment Variables:**
- `OPENCODE_CONFIG_DIR` - Custom install target directory (read in `gsd-opencode/bin/install.js`)
- `GITHUB_TOKEN` - For installing from GitHub Packages (referenced in `gsd-opencode/.npmrc`)

**CI Environment Variables:**
- `NODE_AUTH_TOKEN` - Derived from `${{ secrets.GITHUB_TOKEN }}` in `.github/workflows/ci.yml`
- `GH_TOKEN` - Set to `${{ github.token }}` for `gh` CLI in `.github/workflows/release.yml`

**Secrets Location:**
- GitHub Actions secrets/context only
- No static secrets in codebase

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Third-Party Dependencies (Transitive)

The production npm package has **zero runtime dependencies**.

Development tooling uses:
- `@iarna/toml` - TOML parser for antipatterns validation

---

*Integration audit: 2026-01-20*
