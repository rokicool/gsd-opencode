# Codebase Concerns

**Analysis Date:** 2026-01-20

## Tech Debt

**Repository packaging split (root vs `gsd-opencode/`):**
- Issue: The repo is effectively a small monorepo: root contains utility scripts + CI config, while the publishable npm package lives in `gsd-opencode/`.
- Files: `package.json`, `gsd-opencode/package.json`, `gsd-opencode/bin/install.js`, `assets/bin/translate-files.js`, `assets/bin/check-forbidden-strings.js`
- Impact: Easy to run commands in the wrong directory; dependency management is split; CI has to `npm install` in two places (`.github/workflows/validate.yml`).
- Fix approach: Pick one of:
  - Make root the package (move `gsd-opencode/*` up), or
  - Formalize as a workspace (npm workspaces/pnpm) with explicit boundaries, lockfiles, and scripts per package.

**No lockfiles detected for either npm context:**
- Issue: `package-lock.json`/`pnpm-lock.yaml`/`yarn.lock` are not present.
- Files: `package.json`, `gsd-opencode/package.json`
- Impact: Non-reproducible installs and CI drift; harder to audit supply chain.
- Fix approach: Commit a lockfile for each install context (or unify into a single workspace lockfile).

**Test script placeholder / no automated tests:**
- Issue: `npm test` is explicitly a stub.
- Files: `gsd-opencode/package.json` (`scripts.test`)
- Impact: Regressions in installer behavior, translation, or validation logic are likely to ship unnoticed.
- Fix approach: Add a minimal test harness around key scripts:
  - Unit tests for translation rules in `assets/bin/translate-files.js`
  - Snapshot/fixture tests for install path replacement in `gsd-opencode/bin/install.js`
  - Fixture tests for forbidden string scanning in `assets/bin/check-forbidden-strings.js`

**Console-heavy “production” installer code is treated as acceptable:**
- Issue: The installer is intentionally chatty and CI only warns on `console.log`.
- Files: `gsd-opencode/bin/install.js`, `.github/workflows/validate.yml`
- Impact: Hard to distinguish informational output vs error output; future maintainers may add logging without structure.
- Fix approach: Keep `console` (it’s a CLI), but standardize:
  - Use `console.error` for fatal failures only
  - Consider a small logger helper to route levels consistently

## Known Bugs

**Validation workflow: naming-violation counter never increments (subshell bug):**
- Symptoms: The `naming_violations` variable is mutated inside a `find ... | while read` pipeline, which runs in a subshell; the final `if [ $naming_violations -eq 0 ]` check reports 0 even when violations exist.
- Files: `.github/workflows/validate.yml` (step: “Validate file naming conventions”, lines ~141-159)
- Trigger: Any non-kebab-case markdown filename under `${{ inputs.working_directory }}`.
- Workaround: None reliable; must fix the shell logic.

**Changelog generation writes duplicate content:**
- Symptoms: When a previous tag exists, it writes `git log ... > CHANGELOG.md` and then immediately appends another header + the same range again.
- Files: `.github/workflows/release.yml` (step: “Generate changelog”, lines ~228-253)
- Trigger: Tag-based production release with an existing previous tag.
- Workaround: Manually edit the changelog output in artifacts.

**Typos/incorrect product naming in installer banner likely bypasses forbidden-string checks:**
- Symptoms: The banner says “development system for Cloude Code…”, and includes other “translated-from” strings.
- Files: `gsd-opencode/bin/install.js` (banner lines ~33-37)
- Trigger: Running `npx gsd-opencode`.
- Workaround: None; needs a text fix.

## Security Considerations

**Bundled `.npmrc` references `${GITHUB_TOKEN}`:**
- Risk: Accidental publication or reuse of `.npmrc` in unexpected contexts can create confusing auth behavior; it also encourages token usage patterns.
- Files: `gsd-opencode/.npmrc`, `.github/workflows/ci.yml` (step: “Configure .npmrc for GitHub registry”)
- Current mitigation: `gsd-opencode/package.json` `files` list excludes `.npmrc`, reducing risk of publishing it to npm.
- Recommendations: Keep `.npmrc` out of published artifacts (current state does) and add a CI check to ensure it stays excluded.

**Release workflow mutates tags and pushes to origin:**
- Risk: The release pipeline deletes and recreates the `latest` tag, and pushes tag deletions (`git push origin :latest`). If credentials or branch protections are misconfigured, this is effectively destructive.
- Files: `.github/workflows/release.yml` (step: “Update latest tag”, lines ~461-472)
- Current mitigation: Runs only on tag push (`on: push: tags: v*.*.*`).
- Recommendations: Guard with explicit repository checks / environment protection, or avoid tag deletion entirely (use moving tags cautiously).

**Path-copy installer writes into user config directories recursively:**
- Risk: `gsd-opencode/bin/install.js` writes/copies into `~/.config/opencode` or a caller-supplied `--config-dir` / `OPENCODE_CONFIG_DIR`. A mistaken path can overwrite unexpected locations.
- Files: `gsd-opencode/bin/install.js` (`install()`, `copyWithPathReplacement()`)
- Current mitigation: Limited to copying from known internal directories (`command/gsd`, `agents`, `get-shit-done`).
- Recommendations: Add a safety check:
  - Refuse to install if destination is `/` or home root
  - Confirm before overwriting existing directories (for interactive mode)

## Performance Bottlenecks

**Forbidden-string checker is O(files × forbiddenStrings × lines) and fully synchronous:**
- Problem: `assets/bin/check-forbidden-strings.js` scans every line of every matching file for every forbidden string using nested loops and sync IO.
- Files: `assets/bin/check-forbidden-strings.js`
- Cause: Triple nested iteration and `fs.readFileSync` for all files; no short-circuiting per file/string.
- Improvement path:
  - Precompile a single combined search strategy (e.g., regex alternation, or Aho–Corasick style via a library)
  - Short-circuit once a file has violations if detailed counts aren’t needed
  - Add exclude dirs and default excludes (e.g., `node_modules`, `.git`), even if currently unused

## Fragile Areas

**Translation rules are broad and can change unintended content:**
- Files: `assets/bin/translate-files.js` (e.g., `terminology`, `tools`, `commands` rules)
- Why fragile: Regex replacements like `\bClaude\b` → `OpenCode` and generic string replacements can modify text inside code blocks, URLs, or proper nouns unintentionally.
- Safe modification: Add fixtures (source markdown) and assert exact translated output before changing rules.
- Test coverage: Not detected.

**Installer path replacement only applies to `.md` files:**
- Files: `gsd-opencode/bin/install.js` (`copyWithPathReplacement()`)
- Why fragile: If non-markdown assets ever contain hardcoded paths (e.g., `.json`, `.txt`), they won’t be rewritten, leading to broken references.
- Safe modification: Keep “rewrite” logic centralized and add tests around which file types are rewritten.
- Test coverage: Not detected.

**OS path assumptions vs “works on Windows” claim:**
- Files: `README.md` (claims cross-platform), `gsd-opencode/bin/install.js` (default uses `~/.config/opencode`)
- Why fragile: Default install path is Unix-style; Windows users may require `OPENCODE_CONFIG_DIR` for a correct location.
- Safe modification: Treat `OPENCODE_CONFIG_DIR` as required on Windows, or detect platform and set a Windows-appropriate default.
- Test coverage: Not detected.

## Scaling Limits

**Doc/code size growth makes CI checks slower and noisier:**
- Current capacity: The largest files are markdown agents/workflows (e.g., `gsd-opencode/get-shit-done/workflows/execute-plan.md` ~1831 lines).
- Limit: Forbidden-string and grep-based validations will become slow and hard to interpret as the number of templates/workflows grows.
- Scaling path:
  - Split giant markdown into smaller referenced modules (while keeping semantic containers)
  - Add targeted checks per directory (commands vs workflows vs templates)

## Dependencies at Risk

**Node version mismatch across environments:**
- Risk: `gsd-opencode/package.json` allows `node >=16.7.0`, but CI uses Node 18/20 (`.github/workflows/validate.yml`, `.github/workflows/release.yml`).
- Impact: A script might accidentally start relying on Node 18+ behavior and still declare Node 16 support.
- Files: `gsd-opencode/package.json`, `.github/workflows/validate.yml`, `.github/workflows/release.yml`
- Migration plan: Either update engines to match CI minimum (18+), or add a CI job that runs the installer under Node 16.

## Missing Critical Features

**Repeatable “local install” verification:**
- Problem: There is no automated check that a freshly installed `.opencode/` or `~/.config/opencode/` tree is complete and internally consistent.
- Blocks: Confidence that published package installs correctly across platforms.
- Files: `gsd-opencode/bin/install.js`, `.github/workflows/validate.yml`

## Test Coverage Gaps

**Script behavior not covered by tests (highest risk surface):**
- What's not tested: installer output, directory copy behavior, path rewriting, and translation rules.
- Files: `gsd-opencode/bin/install.js`, `assets/bin/translate-files.js`, `assets/bin/check-forbidden-strings.js`
- Risk: Release regressions that break installation or produce invalid command/workflow markdown.
- Priority: High

---

*Concerns audit: 2026-01-20*
