# Pitfalls Research: npm CLI Tool Lifecycle Management

**Domain:** npm CLI tools with lifecycle hooks (postinstall, preuninstall, etc.)
**Researched:** 2026-02-01
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: npm v7+ Removed Uninstall Scripts

**What goes wrong:**
The `preuninstall` and `uninstall` lifecycle scripts were **completely removed** in npm v7 (released October 2020). Any package relying on these scripts for cleanup will silently fail to run cleanup code. This is a breaking change that affects all npm users on modern versions.

**Why it happens:**
npm removed these scripts because "removal of a package can happen for a wide variety of reasons, and there's no clear way to currently give the script enough context to be useful." The scripts existed in npm v6 but were removed without deprecation warnings in v7.

**How to avoid:**
- **Never rely on `preuninstall`/`uninstall` scripts** for critical cleanup
- Implement cleanup as a separate CLI command (e.g., `gsd-opencode --uninstall` or `npx gsd-opencode cleanup`)
- Document manual cleanup steps for users
- Consider using a "marker file" approach: create a `.gsd-installed` file during install, check for it on subsequent runs, offer cleanup if orphaned

**Warning signs:**
- Package has `preuninstall` in scripts but files remain after `npm uninstall -g`
- Users report "leftover files" or "ghost installations"
- Tests pass on npm v6 but cleanup fails on npm v7+

**Phase to address:**
Phase 1 (Lifecycle Migration) — Must redesign cleanup strategy before implementing any uninstall logic.

---

### Pitfall 2: postinstall Scripts Run on Every npm install

**What goes wrong:**
`postinstall` scripts run not just when users install your package, but also when:
- Developers run `npm install` in your package directory (development)
- Your package is installed as a dependency of another package
- `npm ci` runs in CI/CD pipelines

This can cause unwanted side effects like modifying user configs during development or CI builds.

**Why it happens:**
npm lifecycle scripts don't distinguish between "user installing this package to use it" vs "developer working on this package" vs "this package being installed as a transitive dependency."

**How to avoid:**
- Check `npm_package_resolved` environment variable to detect if installing from registry vs local
- Use `process.env.npm_config_global` to detect global vs local install
- Skip postinstall if `process.env.INIT_CWD` matches your development directory
- Add a `--skip-postinstall` flag for CI environments
- Consider using `prepare` instead of `postinstall` for build steps (runs at publish time, not install time)

**Warning signs:**
- Postinstall runs during `npm ci` in your own repo
- Tests fail because postinstall modified test environment
- Users report unexpected config changes when installing unrelated packages that depend on yours

**Phase to address:**
Phase 1 (Lifecycle Migration) — Must add guards to prevent unwanted execution contexts.

---

### Pitfall 3: prepare Script Runs in Background (npm v7+)

**What goes wrong:**
As of npm v7, `prepare` scripts run in the background. Output is hidden unless you use `--foreground-scripts`. This makes debugging prepare script failures extremely difficult.

**Why it happens:**
npm v7 introduced parallel script execution for workspaces. `prepare` runs concurrently, and output is buffered/suppressed to avoid interleaving.

**How to avoid:**
- Always test prepare scripts with `--foreground-scripts` flag during development
- Add explicit error handling with descriptive messages
- Write to a log file if prepare fails: `script || { echo "Error: see prepare.log"; exit 1; }`
- Document the `--foreground-scripts` requirement for users reporting install issues
- Consider using `prepublishOnly` for critical pre-publish checks instead of `prepare`

**Warning signs:**
- Install seems to hang with no output
- Package appears installed but files are missing/incomplete
- Users report "it worked when I ran it manually but not via npm install"

**Phase to address:**
Phase 1 (Lifecycle Migration) — Add debugging/logging infrastructure to prepare scripts.

---

### Pitfall 4: bin Path Resolution Differences

**What goes wrong:**
The `bin` field in package.json behaves differently across:
- Global install (`npm install -g`): links to `{prefix}/bin`
- Local install: links to `node_modules/.bin/`
- npx execution: temporary install + run + cleanup
- Windows vs Unix: `.cmd` wrappers on Windows

Scripts that assume a specific installation structure will break in some contexts.

**Why it happens:**
npm abstracts binary installation, but the abstraction leaks when scripts need to know their own location or access package files relative to the binary.

**How to avoid:**
- Use `__dirname` in Node.js scripts to find package root, never assume relative paths
- For global installs, check `process.env.npm_config_prefix`
- Use `process.env.npm_package_json` to locate package.json reliably
- Test on both Windows and Unix-like systems
- Avoid hardcoded paths like `/usr/local/bin` or `~/.config`

**Warning signs:**
- "Cannot find module" errors when running via npx but not when installed globally
- Different behavior between `npm install -g` and `npx`
- Windows users report "command not found" errors

**Phase to address:**
Phase 2 (Multi-Runtime Support) — Must abstract path resolution for cross-platform compatibility.

---

### Pitfall 5: Environment Variable Injection Changes

**What goes wrong:**
npm injects environment variables like `npm_package_name`, `npm_package_version`, `npm_config_*`, but these changed significantly in npm v7:
- Most package.json fields are NO LONGER provided as env vars in npm v7+
- Only specific whitelist of fields: `name`, `version`, `bin_*`, `engines_*`, `config_*`
- Scripts must now read package.json directly for other fields

**Why it happens:**
npm v7 reduced environment pollution for performance and security reasons. The `npm_package_json` env var was added as the recommended way to access package.json.

**How to avoid:**
- Never assume `npm_package_*` env vars exist beyond name/version
- Always use `require(process.env.npm_package_json)` to access full package.json
- Provide fallback for older npm versions: `process.env.npm_package_json || path.join(__dirname, '../package.json')`
- Cache package.json contents at startup, don't read repeatedly

**Warning signs:**
- `process.env.npm_package_description` is undefined
- Scripts work on npm v6 but fail on v7+
- "Cannot read property of undefined" errors when accessing env vars

**Phase to address:**
Phase 1 (Lifecycle Migration) — Update all scripts to use modern env var access patterns.

---

### Pitfall 6: Global vs Local Install Detection

**What goes wrong:**
Packages often need different behavior when installed globally vs locally, but detecting this reliably is tricky. `process.env.npm_config_global` is set inconsistently, and `npm root -g` comparison fails in edge cases.

**Why it happens:**
npm doesn't provide a reliable "am I global?" API. The global flag is a configuration option, not a runtime property of the installation.

**How to avoid:**
- Check if install path contains `node_modules`: if yes, likely local; if no, likely global
- Compare `__dirname` against `npm root -g` output (spawn npm to check)
- Accept explicit flags (`--global`, `--local`) instead of trying to auto-detect
- Design package to work the same way regardless of install type
- Use different entry points: `bin/` for global CLI, `lib/` for local require

**Warning signs:**
- Package installs to wrong location (tries to write to global when local, or vice versa)
- Permission errors during install
- Confusion about which config file to modify

**Phase to address:**
Phase 2 (Multi-Runtime Support) — Explicit install mode flags are more reliable than detection.

---

### Pitfall 7: npm link Breaks Lifecycle Assumptions

**What goes wrong:**
`npm link` creates symlinks for development, but lifecycle scripts behave differently:
- `prepare` runs on linked packages differently than installed packages
- Relative path resolution breaks when package is symlinked
- `npm install` in a linked package doesn't trigger expected hooks

**Why it happens:**
Symlinks change the filesystem layout. `__dirname` resolves to the actual location, not the link location, breaking relative path assumptions.

**How to avoid:**
- Never use relative paths that traverse outside package root (`../../something`)
- Use `fs.realpath()` carefully — sometimes you want the symlink path, sometimes the real path
- Test both `npm install` and `npm link` workflows
- Document that `npm link` is for development only, not production

**Warning signs:**
- "File not found" errors when using linked package
- Different behavior between linked and installed versions
- Path resolution errors on Windows (symlink support varies)

**Phase to address:**
Phase 3 (Clean Uninstall) — Testing phase must include linked package scenarios.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Use `postinstall` for user setup | Automatic configuration | Runs in wrong contexts (CI, dev, deps) | Never for user-facing setup; OK for pure build steps |
| Rely on `preuninstall` for cleanup | Simple cleanup logic | Completely broken in npm v7+ | Never — feature was removed |
| Hardcode paths like `~/.config` | Simple path logic | Fails on Windows, custom prefixes, XDG variations | Never — use proper path resolution |
| Skip npm v7+ testing | Faster CI | Silent failures for majority of users | Never — npm v7+ is the standard |
| Use `install` script for setup | Familiar pattern | Conflicts with node-gyp, runs at wrong times | Only for native compilation (binding.gyp) |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| npx | Assuming npx install is permanent | npx is ephemeral — don't rely on state persistence |
| npm link | Treating linked package like installed | Document link as dev-only; test both paths |
| Global install | Writing to arbitrary directories | Respect `npm_config_prefix`; check permissions |
| Local install | Modifying files outside node_modules | Scope all changes to package directory or explicit user config |
| yarn/pnpm | Assuming npm-specific behavior | Test on multiple package managers if supporting them |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Heavy postinstall | Slow installs, CI timeouts | Move heavy work to runtime or lazy initialization | Any CI pipeline, impatient users |
| Synchronous file operations | Install appears to hang | Use async I/O, show progress indicators | Large file copies, network mounts |
| No prepare script caching | Rebuilds on every install | Use prepare for build, cache artifacts | Frequent reinstalls, CI without cache |
| Excessive env var reading | Slow script startup | Cache env vars at module load | Any script execution |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Executing user input in scripts | Command injection | Validate all inputs, use execFile not exec |
| Writing to arbitrary paths | Path traversal attacks | Resolve all paths, validate against allowed directories |
| Trusting npm_package_* env vars | Spoofing | Read package.json directly, verify signatures if critical |
| Running postinstall with elevated permissions | System compromise | Warn users, require explicit opt-in for privileged ops |
| Downloading resources in postinstall | Supply chain attacks | Pin versions, verify checksums, use npm dependencies instead |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Silent failures in lifecycle scripts | Users don't know setup failed | Always provide clear error messages and exit codes |
| Modifying configs without asking | Users surprised by changes | Explicit opt-in: `--setup` flag or interactive prompt |
| No uninstall/cleanup path | Orphaned files accumulate | Document manual cleanup; provide cleanup command |
| Assuming specific shell | Windows users can't install | Use Node.js APIs, not shell commands |
| No version checking | Users run outdated versions | Include update check in CLI; document upgrade path |

## "Looks Done But Isn't" Checklist

- [ ] **postinstall script:** Often missing guards for CI/dev contexts — verify it doesn't run during `npm ci` in your own repo
- [ ] **Global install support:** Often missing prefix detection — verify it respects `npm_config_prefix`
- [ ] **Windows support:** Often missing path separators and shell assumptions — test on Windows
- [ ] **Uninstall cleanup:** Often missing entirely — verify manual cleanup documentation exists
- [ ] **npm v7+ compatibility:** Often only tested on v6 — verify on npm v7, v8, v9, v10, v11
- [ ] **Error handling:** Often silent failures — verify all scripts exit with proper codes and messages
- [ ] **Idempotency:** Often fails on reinstall — verify running install twice doesn't break

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| preuninstall reliance | HIGH | Must release new version with alternative cleanup; document manual cleanup for existing installs |
| postinstall context confusion | MEDIUM | Add guards, release patch, users get fix on next update |
| Path resolution bugs | LOW | Fix in code, release patch, reinstall fixes it |
| npm v7 background script issues | LOW | Document `--foreground-scripts` for debugging |
| Broken global install | LOW | `npm uninstall -g` + `npm install -g` (if no preuninstall reliance) |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| npm v7+ uninstall scripts removed | Phase 1: Lifecycle Migration | Verify no preuninstall/uninstall in package.json scripts |
| postinstall context confusion | Phase 1: Lifecycle Migration | Test `npm install` in dev repo, verify no side effects |
| prepare background execution | Phase 1: Lifecycle Migration | Test with `--foreground-scripts`, add logging |
| bin path resolution | Phase 2: Multi-Runtime Support | Test global install, local install, npx on all platforms |
| Environment variable changes | Phase 1: Lifecycle Migration | Audit all env var usage, update to npm v7+ patterns |
| Global vs local detection | Phase 2: Multi-Runtime Support | Add explicit flags, test both modes |
| npm link issues | Phase 3: Clean Uninstall | Test `npm link` workflow during QA |

## Sources

- npm CLI Official Documentation: https://docs.npmjs.com/cli/v11/using-npm/scripts
- npm uninstall command docs: https://docs.npmjs.com/cli/v11/commands/npm-uninstall
- npm developers guide: https://docs.npmjs.com/cli/v11/using-npm/developers
- GitHub Issue #3042: npm uninstall -g doesn't run preuninstall script (npm v7 bug): https://github.com/npm/cli/issues/3042
- npm v7 release notes (background scripts): https://github.com/npm/cli/releases/tag/v7.0.0
- Current codebase analysis: `/gsd-opencode/gsd-opencode/bin/install.js` — ad-hoc install system

---
*Pitfalls research for: npm CLI tool lifecycle management*
*Researched: 2026-02-01*
