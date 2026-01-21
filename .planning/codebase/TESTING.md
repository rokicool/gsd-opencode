# Testing Patterns

**Analysis Date:** 2026-01-20

## Test Framework

**Runner:**
- Not detected (no Jest/Vitest/Mocha configuration files or `*.test.*`/`*.spec.*` source tests found in this repository).
- Package script is a placeholder and fails intentionally: `gsd-opencode/package.json` → `scripts.test`.

**Assertion Library:**
- Not applicable (no automated unit/integration test runner configured).

**Run Commands:**

```bash
# Note: `npm test` is not implemented in `gsd-opencode/package.json`.

# CI-equivalent validations (run from repo root)
npm install                                    # Required for TOML parser used by checker
node -c gsd-opencode/bin/install.js            # JS syntax validation (CI: .github/workflows/validate.yml)
node -e "JSON.parse(require('fs').readFileSync('gsd-opencode/package.json','utf8')); console.log('ok')"  # package.json is valid JSON
node assets/bin/check-forbidden-strings.js     # Forbidden strings audit driven by assets/antipatterns.toml

# Manual acceptance testing workflow (OpenCode command)
# /gsd-verify-work <phase-number>              # UAT session workflow (see gsd-opencode/command/gsd/verify-work.md)
```

## Test File Organization

**Location:**
- Not applicable (no automated test suite).
- Validation logic is implemented as scripts and GitHub Actions steps:
  - `assets/bin/check-forbidden-strings.js`
  - `.github/workflows/validate.yml`

**Naming:**
- No `*.test.*` / `*.spec.*` patterns detected.

**Structure:**

```
assets/
  antipatterns.toml                 # Forbidden string list (validation inputs)
  bin/
    check-forbidden-strings.js      # Standalone validator used in CI

.github/workflows/
  validate.yml                      # Reusable validation workflow
  ci.yml                            # Calls validate.yml + build/publish pipeline
  release.yml                        # Tag-based release workflow; runs validate.yml + audits

gsd-opencode/
  command/gsd/*.md                  # OpenCode command specs (validated for required structure)
  get-shit-done/workflows/*.md      # Workflow specs (validated for semantic tags and patterns)
```

## Test Structure

**Suite Organization:**

```typescript
// Not applicable: no JS/TS test runner configured.
```

**Patterns:**
- Treat **GitHub Actions validation** as the enforced “test suite” for this repo.
- Treat **/gsd-verify-work** as the manual acceptance test harness for projects using GSD.

## Mocking

**Framework:**
- Not applicable (no automated test runner).

**Patterns:**

```typescript
// Not applicable: no code-level mocking patterns exist in this repository.
```

**What to Mock:**
- Not applicable.

**What NOT to Mock:**
- Not applicable.

## Fixtures and Factories

**Test Data:**

```typescript
// Not applicable: no automated tests.
```

**Location:**
- Not applicable.

## Coverage

**Requirements:**
- Code coverage is not measured/enforced (no coverage tooling like `c8`/`nyc` configured).
- “Coverage” is tracked at the spec/process level instead of line coverage:
  - **Requirements coverage** is validated by agents and verification templates (used by downstream projects), not by this repo’s own unit tests.
    - `gsd-opencode/get-shit-done/templates/verification-report.md`
    - `gsd-opencode/get-shit-done/workflows/verify-phase.md`
    - `gsd-opencode/agents/gsd-plan-checker.md` (requirement coverage checks for plans)

**Configuration:**
- Not applicable.

**View Coverage:**

```bash
# Not applicable for code coverage.
# Spec/process “coverage” is reported via generated planning artifacts in downstream projects:
# .planning/REQUIREMENTS.md and .planning/phases/*/*-VERIFICATION.md
```

## Test Types

**Unit Tests:**
- Not used in this repository.

**Integration Tests:**
- Not used in this repository.

**E2E Tests:**
- Not used in this repository.

## Common Patterns

**Async Testing:**

```typescript
// Not applicable: no test runner.
```

**Error Testing:**

```typescript
// Not applicable: no test runner.
```

---

## CI Validation

CI treats validation steps as the quality gate.

**Primary workflow:** `./.github/workflows/validate.yml`
- Installs dependencies (`npm install`) in the package workspace.
- Validates JavaScript syntax:
  - `node -c bin/install.js` (run in `gsd-opencode/`)
- Validates `package.json` parseability (JSON correctness):
  - `node -e "... JSON.parse(...)"` (run in `gsd-opencode/`)
- Checks for common issues:
  - `grep -r "console\.log" bin/` (warn-only)
  - Ensures `gsd-opencode/bin/install.js` is executable

**GSD compliance validation:** (same workflow)
- Command structure validation for `gsd-opencode/command/gsd/*.md`:
  - Requires `name:` and `description:` frontmatter
  - Requires an `<objective>` section
- Workflow structure validation for `gsd-opencode/get-shit-done/workflows/*.md`:
  - Rejects generic XML tags like `<section>` and `<item>`
  - Encourages semantic tags (`<purpose>`, `<process>`, `<step>`, etc.)
- File naming convention validation (kebab-case for `*.md`) via `find`.
- Anti-pattern scanning (non-failing warnings in some checks), plus an enforced “forbidden strings” scan:
  - Driven by `assets/antipatterns.toml`
  - Executed by `node assets/bin/check-forbidden-strings.js`

**Pipelines invoking validation:**
- `./.github/workflows/ci.yml` runs `validate.yml` before build/publish.
- `./.github/workflows/release.yml` runs `validate.yml` before production readiness checks.

## Manual Validation Harness (Downstream)

Although this repository has no unit tests, it provides a manual UAT workflow for projects using GSD:

- Command entrypoint: `gsd-opencode/command/gsd/verify-work.md`
- Workflow logic: `gsd-opencode/get-shit-done/workflows/verify-work.md`
  - Creates/updates `.planning/phases/{phase}/{phase}-UAT.md`
  - Records passes/issues/skips and infers severity
  - When issues exist, triggers diagnosis and gap-closure planning via other workflows/agents

---

*Testing analysis: 2026-01-20*
