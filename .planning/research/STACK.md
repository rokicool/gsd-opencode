# Stack Research: Node.js CLI Package Management Tools

**Domain:** CLI tools with install/uninstall/check/repair/update operations  
**Researched:** Feb 09, 2026  
**Confidence:** HIGH

## Executive Summary

For building a CLI package management tool in 2025, the standard stack centers on **oclif** as the CLI framework, **chalk** for terminal styling, and **conf** for configuration management. These libraries represent the mature, actively maintained ecosystem with millions of dependents and strong TypeScript support.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @oclif/core | ^4.8.0 | CLI framework | Officially recommended by clig.dev; powers Heroku CLI, Salesforce CLI; has built-in subcommand support, flag parsing, help generation, and plugin architecture |
| chalk | ^5.6.2 | Terminal styling | Industry standard (115k+ dependents), no dependencies, auto-detects color support, chainable API; Chalk 5 is ESM-only but required for modern tooling |
| conf | ^15.1.0 | Configuration persistence | 154k dependents, atomic writes, JSON schema validation via ajv, handles config directory selection per OS, migration support |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ora | ^9.3.0 | Loading spinners | 8.2m dependents, shows progress during long operations (downloads, file processing), integrates seamlessly with chalk |
| @inquirer/prompts | ^13.2.2 | Interactive prompts | 10m dependents, rewritten from ground up for reduced package size, supports input/select/confirm/password/checkbox prompts |
| execa | ^9.6.1 | Process execution | 26.6m dependents, safer alternative to child_process with proper escaping, cross-platform support, better error handling |
| listr2 | ^8.2.5 | Task lists | Complex workflows with multiple sequential steps, progress tracking, and rollback support |
| semver | ^7.7.3 | Version parsing | Validating and comparing package versions during update operations |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| oclif | CLI generator | Use `npx oclif generate` to scaffold new commands, handles bin scripts and TypeScript setup automatically |
| ts-node | TypeScript execution | Required for oclif dev scripts, enables running TypeScript directly without compilation |
| vitest | Testing | ESM-native, faster than Jest for CLI testing, better async handling |

## Installation

```bash
# Core dependencies
npm install @oclif/core@^4.8.0 chalk@^5.6.2 conf@^15.1.0

# Supporting libraries (install as needed)
npm install ora@^9.3.0
npm install @inquirer/prompts@^13.2.2
npm install execa@^9.6.1
npm install semver@^7.7.3

# Development dependencies
npm install -D oclif@^4.8.0 ts-node@^10.9.2 vitest@^2.1.0
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| oclif | commander.js | commander.js is lighter (27.9k stars) for simple CLIs without subcommands; use oclif for multi-command CLIs with shared state |
| oclif | yargs | yargs (11.4k stars) has automatic help generation and strict parsing; oclif preferred for larger, plugin-based architectures |
| chalk | yoctocolors | yoctocolors is smaller (~100 bytes vs 50KB) for size-critical CLIs; chalk provides better API ergonomics and long-term maintenance guarantee |
| conf | configstore | conf is the successor to configstore by the same author; fixes cross-platform permission issues; configstore deprecated |
| ora | nanospinner | nanospinner is smaller (fewer dependencies); ora is more battle-tested with better Windows support |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| commander.js v11+ | Excellent for simple CLIs but lacks built-in subcommand file organization, shared state management, and plugin architecture needed for complex package managers | oclif |
| minimist | No longer maintained, security vulnerabilities in prototype pollution | oclif's built-in flag parsing or parseArgs (Node.js 18+) |
| meow | Good for simple CLIs, lacks subcommand infrastructure | oclif for multi-command tools |
| node-persist | Synchronous API blocks event loop, no schema validation | conf with JSON schema |
| inquirer v8 and below | Previous versions had large dependency trees, now superseded by @inquirer/prompts modular architecture | @inquirer/prompts v13+ |
| colors (npm package) | Maintainer intentionally introduced an infinite loop in v1.4.44 as protest; security risk | chalk |

## Stack Patterns by Variant

**If supporting CommonJS (legacy Node versions):**
- Use Chalk 4.x instead of Chalk 5
- Chalk 5 is ESM-only; Chalk 4 supports both CommonJS and ESM
- Note: This increases bundle size by ~50KB but maintains compatibility

**If needing ultra-small bundle size:**
- Replace chalk with yoctocolors (~100 bytes vs 50KB)
- Replace ora with nanospinner
- Trade-off: Reduced API ergonomics and feature completeness

**If building TypeScript-first:**
- All recommended libraries have excellent TypeScript support
- Use `oclif generate` with TypeScript template
- Enable strict mode in tsconfig.json

**If supporting Windows extensively:**
- execa provides better Windows support than native child_process
- ora detects Windows Terminal and adjusts spinner accordingly
- conf handles Windows config directory correctly (avoids ~/.config permission issues)

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| @oclif/core@4.8.0 | Node.js 18+ (LTS) | Requires LTS Node versions only; v4.0 was major rewrite with ESM support |
| chalk@5.6.2 | ESM only | Use chalk@4 for CommonJS projects; no breaking API changes between 4 and 5 |
| conf@15.1.0 | Node.js 18+ | Uses AJV for schema validation; v15 is current major |
| ora@9.3.0 | ESM only | Like chalk, ora 9+ is ESM-only; use ora@5 for CommonJS |
| execa@9.6.1 | Node.js 18+ | v9 is current major with template literal support and improved piping |

## Specific Recommendations for This Project

Given the requirements (GSD-OpenCode distribution management with install/uninstall/check/repair/update):

1. **Start with oclif generate** to scaffold the CLI structure:
   ```bash
   npx oclif generate opencode-cli
   ```
   This creates: `bin/dev.js`, `bin/run.js`, `src/commands/` structure

2. **Global vs Local scope detection**:
   - Use `process.cwd()` for local scope detection
   - Use `os.homedir()` + `/.config/opencode` for global scope
   - conf handles directory selection automatically based on `projectName`

3. **Path replacement in .md files**:
   - Use native `fs/promises` with `String.prototype.replace()`
   - execa for any git operations needed during installation

4. **Update mechanism**:
   - Use semver for version comparison
   - Use ora to show progress during downloads
   - Use listr2 if update requires multiple sequential steps

## Sources

- [oclif.io/docs/introduction](https://oclif.io/docs/introduction) — Official documentation, v4.0 released with ESM support (Nov 2025)
- [github.com/oclif/core/releases](https://github.com/oclif/core/releases) — v4.8.0 latest release (Oct 28, 2025)
- [clig.dev](https://clig.dev/) — CLI Guidelines recommending oclif for Node.js
- [github.com/chalk/chalk](https://github.com/chalk/chalk) — v5.6.2 latest (Sep 8, 2025), 115k+ dependents
- [github.com/sindresorhus/conf](https://github.com/sindresorhus/conf) — v15.1.0 latest (Feb 4, 2026), 154k dependents
- [github.com/sindresorhus/ora](https://github.com/sindresorhus/ora) — v9.3.0 latest (Feb 5, 2026), 8.2m dependents
- [github.com/SBoudrias/Inquirer.js](https://github.com/SBoudrias/Inquirer.js) — v13.2.2 latest (Jan 28, 2026), 10m dependents
- [github.com/sindresorhus/execa](https://github.com/sindresorhus/execa) — v9.6.1 latest (Nov 29, 2025), 26.6m dependents

---
*Stack research for: Node.js CLI Package Management Tools*  
*Researched: Feb 09, 2026*
