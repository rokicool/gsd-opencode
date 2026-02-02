# Stack Research: npm Package Lifecycle Management

**Project:** gsd-opencode  
**Domain:** npm CLI tool lifecycle management  
**Date:** 2025-02-01  
**Confidence:** HIGH

## Executive Summary

The project uses a minimal, intentional stack focused on Node.js CLI tooling without heavy frameworks. This is appropriate for a CLI tool that needs to be lightweight and have minimal dependencies.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **Node.js** | >=16.7.0 | Runtime environment | HIGH |
| **npm** | v7+ | Package manager and distribution | HIGH |
| **@iarna/toml** | ^2.2.5 | TOML parsing for config | HIGH |
| **esbuild** | ^0.24.0 | Build tool for hooks | HIGH |
| **JavaScript (CommonJS)** | ES2020 | All CLI tooling | HIGH |

### Rationale

**Node.js >=16.7.0**
- Specified in engines field
- Tested with v18 in CI
- Provides modern JavaScript features without transpilation
- LTS support through 2025

**npm v7+**
- Standard JavaScript ecosystem package manager
- Provides lifecycle scripts (prepare, postinstall, etc.)
- Handles global vs local installation
- Note: npm v7+ removed preuninstall/uninstall scripts (critical pitfall)

**@iarna/toml ^2.2.5**
- Already in use for configuration parsing
- Lightweight, battle-tested TOML parser
- Used in validation scripts

**esbuild ^0.24.0**
- Already in use for bundling hooks
- Fast bundling for distribution
- Supports CommonJS output

**JavaScript (CommonJS)**
- Intentional simplicity — no transpilation needed
- All CLI tooling uses built-in Node.js modules
- No build step required for main code

## Dependencies Philosophy

### Keep It Minimal

- **Built-in modules preferred**: `fs`, `path`, `os`, `readline` handle all core operations
- **No web frameworks**: This is a CLI tool, not a web application
- **Supply chain risk**: Minimal external dependencies reduce security exposure

### Current Dependencies

```json
{
  "dependencies": {
    "@iarna/toml": "^2.2.5"
  }
}
```

### Dev Dependencies (Recommended)

```json
{
  "devDependencies": {
    "esbuild": "^0.24.0"
  }
}
```

## What NOT to Use

### ❌ TypeScript
**Why:** Adds build complexity for a simple CLI tool. CommonJS JavaScript is sufficient and eliminates transpilation step.

### ❌ Heavy CLI Frameworks (Commander, Yargs)
**Why:** Built-in `process.argv` parsing is sufficient. The current implementation handles flags manually with clear, readable code.

### ❌ External Config Libraries
**Why:** File-based configuration in `~/.config/opencode/` is sufficient. No need for complex config management.

### ❌ Database Libraries
**Why:** Intentionally file-based state management. No database needed.

### ❌ Testing Frameworks (initially)
**Why:** Can use Node.js built-in `assert` module for basic testing. Add Jest/Vitest only when test complexity warrants it.

## npm Lifecycle Scripts

### Essential Scripts

```json
{
  "scripts": {
    "prepare": "node scripts/validate.js",
    "postinstall": "node scripts/postinstall.js",
    "build": "node scripts/build-hooks.js",
    "test": "node --test test/*.test.js"
  }
}
```

### Script Purposes

- **prepare**: Runs before package is published and on local `npm install`. Use for validation.
- **postinstall**: Runs after package is installed. Use for setup with guards (see pitfalls).
- **build**: Bundles hooks for distribution.
- **test**: Runs test suite using Node.js built-in test runner (v18+).

## Version Compatibility

### Node.js Versions

| Version | Support | Notes |
|---------|---------|-------|
| v16.7.0+ | Minimum | Specified in engines |
| v18.x | Recommended | LTS, built-in test runner |
| v20.x | Supported | Current LTS |

### npm Versions

| Version | Support | Notes |
|---------|---------|-------|
| v6.x | Legacy | Preuninstall scripts work |
| v7.x+ | Primary | Removed preuninstall, background scripts |
| v10.x | Recommended | Current stable |

## Cross-Platform Considerations

### Path Handling

```javascript
// ✅ Good: Use path module
const path = require('path');
const configDir = path.join(os.homedir(), '.config', 'opencode');

// ❌ Bad: Hardcoded paths
const configDir = '~/.config/opencode';  // Won't work on Windows
```

### Shebang

```javascript
#!/usr/bin/env node
// Required for executable scripts on Unix
// Windows ignores this, npm handles it via bin entries
```

### Environment Variables

```javascript
// ✅ Good: Check multiple sources
const isGlobal = process.env.npm_config_global === 'true' || 
                 args.includes('--global');

// ❌ Bad: Rely only on npm env vars (changed in v7+)
const isGlobal = process.env.npm_config_global;  // Unreliable
```

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Runtime | HIGH | Official Node.js documentation, direct codebase analysis |
| Package Manager | HIGH | Official npm documentation, well-established patterns |
| Dependencies | HIGH | Minimal set, all widely used |
| Build Tools | HIGH | esbuild already in use, proven approach |
| Cross-Platform | MEDIUM | Needs Windows testing (identified gap) |

## Migration Path

### From Current State

1. **Add lifecycle scripts** to package.json (prepare, postinstall with guards)
2. **Move esbuild to devDependencies** (currently implied)
3. **Add Node.js built-in test runner** scripts (for v18+)
4. **Update engines field** to specify npm version requirements

### No Breaking Changes

- Current `bin/install.js` remains primary entry point
- Existing interactive flow preserved
- Multi-runtime support unchanged

---
*Stack research completed: 2025-02-01*
