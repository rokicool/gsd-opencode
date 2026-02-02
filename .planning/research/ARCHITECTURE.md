# Architecture Research: npm CLI Tool Integration

**Domain:** npm CLI tools with lifecycle management
**Researched:** 2026-02-01
**Confidence:** HIGH

## Executive Summary

npm CLI tools follow a predictable architectural pattern: a `bin/` directory with executable scripts, a `package.json` defining lifecycle scripts and bin entries, and optional hooks for extending behavior. For gsd-opencode, integrating npm lifecycle management requires understanding how the existing install script (`bin/install.js`) can be augmented with standard npm lifecycle hooks (`prepare`, `postinstall`) without breaking the current OpenCode configuration installation flow.

## Standard npm CLI Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     npm CLI Entry Point                      │
│                    (npx gsd-opencode)                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   preinstall │  │   install   │  │    postinstall      │  │
│  │   (optional) │  │  (optional) │  │    (optional)       │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                    │              │
│         └────────────────┴────────────────────┘              │
│                          │                                   │
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Main Install Script (bin/install.js)        ││
│  │  - Parse CLI arguments (--global, --local, --config-dir) ││
│  │  - Determine install location (~/.config/opencode)       ││
│  │  - Copy files with path replacement                      ││
│  │  - Create VERSION file                                   ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                     Package Structure                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
│  │   bin/   │  │ command/ │  │  agents/ │  │get-shit-done/│ │
│  │(executables)│ (slash cmds)│(AI agents)│ │ (templates)  │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `bin/` | Executable entry points | Node.js scripts with shebang (`#!/usr/bin/env node`) |
| `package.json` | Package metadata, scripts, bin mapping | JSON with `bin`, `scripts`, `files` fields |
| `command/` | OpenCode slash command definitions | Markdown files with frontmatter |
| `agents/` | AI agent configurations | Markdown files defining agent roles |
| `get-shit-done/` | Templates and workflows | Markdown templates, reference docs |
| `hooks/` (optional) | Lifecycle extensions | Scripts for statusline, update checks |

## Current gsd-opencode Architecture

### Existing Structure

```
gsd-opencode/
├── bin/
│   └── install.js          # Main install script (324 lines)
├── command/
│   └── gsd/                # 29 slash commands (.md files)
│       ├── help.md
│       ├── new-project.md
│       ├── plan-phase.md
│       └── ...
├── agents/
│   └── gsd-*.md            # 16 AI agent definitions
├── get-shit-done/
│   ├── templates/          # Planning templates
│   ├── workflows/          # Execution workflows
│   └── references/         # Reference documentation
└── package.json            # Package manifest
```

### Current Data Flow

```
User runs: npx gsd-opencode [--global|--local] [--config-dir <path>]
    ↓
bin/install.js parses arguments
    ↓
Determines install location:
    - Global: ~/.config/opencode (or $OPENCODE_CONFIG_DIR)
    - Local: ./.opencode
    - Custom: --config-dir value
    ↓
Copies files with path replacement:
    - command/gsd/ → <config>/command/gsd/
    - agents/ → <config>/agents/
    - get-shit-done/ → <config>/get-shit-done/
    ↓
Creates VERSION file
    ↓
User can now use: /gsd-help, /gsd-new-project, etc.
```

## Integration Points for Lifecycle Management

### npm Lifecycle Scripts

Per official npm docs (HIGH confidence), these lifecycle scripts are available:

| Script | When It Runs | Use Case for gsd-opencode |
|--------|--------------|---------------------------|
| `prepare` | Before pack/publish AND on local `npm install` | Build steps, validation |
| `preinstall` | Before package installation | System checks, warnings |
| `postinstall` | After package installation | Setup, notifications |
| `prepublishOnly` | Before `npm publish` only | Final tests, checks |
| `prepack` | Before `npm pack` | Clean build artifacts |
| `postpack` | After `npm pack` | Verify tarball contents |

### Recommended Integration Strategy

```
┌─────────────────────────────────────────────────────────────┐
│              npm Lifecycle Integration Points                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  npm install gsd-opencode                                    │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────┐    ┌─────────┐    ┌─────────────────────────┐  │
│  │prepare  │───▶│install  │───▶│postinstall (optional)   │  │
│  │(build)  │    │(default)│    │└─▶ bin/install.js       │  │
│  └─────────┘    └─────────┘    │    (if --global flag)    │  │
│                                └─────────────────────────┘  │
│                                                              │
│  npx gsd-opencode                                            │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ bin/install.js (direct execution)                        ││
│  │ - Interactive prompt for global/local                    ││
│  │ - Copy files to ~/.config/opencode or ./.opencode        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Component Boundaries

### Boundary 1: npm CLI ↔ Install Script

**Interface:** `package.json` `bin` field maps command name to script path

```json
{
  "bin": {
    "gsd-opencode": "bin/install.js"
  }
}
```

**Communication:** Direct execution via `npx` or global install

**Considerations:**
- Script must be executable (`chmod +x`)
- Must include shebang (`#!/usr/bin/env node`)
- Exit codes matter (non-zero = failure)

### Boundary 2: Install Script ↔ OpenCode Config

**Interface:** File system operations to `~/.config/opencode/` or `./.opencode/`

**Communication:** File copy with path replacement

**Considerations:**
- Must handle both global and local installs
- Path replacement for repo-local references (`@gsd-opencode/` → install path)
- Must create VERSION file for update checking

### Boundary 3: Commands ↔ Agents

**Interface:** OpenCode's slash command system reads from `command/` directory

**Communication:** Markdown frontmatter defines command metadata

**Considerations:**
- Commands reference agents by name in frontmatter
- Agents are spawned by OpenCode, not directly by npm

## Data Flow for Lifecycle Integration

### Scenario 1: Direct Execution (Current)

```
User: npx gsd-opencode --global
    ↓
npm downloads package to npm cache
    ↓
Executes: node bin/install.js --global
    ↓
Install script:
    1. Parse --global flag
    2. Determine target: ~/.config/opencode
    3. Copy command/, agents/, get-shit-done/
    4. Replace @gsd-opencode/ paths
    5. Create VERSION file
    ↓
Output: "Done! Run /gsd-help to get started"
```

### Scenario 2: With Lifecycle Hooks (Proposed)

```
User: npm install -g gsd-opencode
    ↓
npm runs lifecycle scripts in order:
    1. preinstall (if defined)
    2. install (if defined, else node-gyp rebuild if binding.gyp)
    3. postinstall (if defined)
    4. prepublish (deprecated, runs on install)
    5. preprepare
    6. prepare
    7. postprepare
    ↓
If postinstall triggers bin/install.js:
    - Same flow as Scenario 1
    - But runs automatically after npm install
    ↓
User can immediately use /gsd-* commands
```

## Build Order Implications

### Phase 1: Foundation (No dependencies)

1. **Understand current install flow**
   - Read `bin/install.js` thoroughly
   - Document path replacement logic
   - Identify all copied directories

2. **Add basic lifecycle scripts**
   - Add `prepare` script for validation
   - Add `postinstall` script (optional, see trade-offs)
   - Test with `npm pack` and `npm install`

### Phase 2: Hook Integration (Depends on Phase 1)

1. **Create hook system**
   - Design hook registration API
   - Implement pre-install hooks
   - Implement post-install hooks

2. **Migrate existing hooks**
   - Move `hooks/gsd-statusline.js` to new system
   - Move `hooks/gsd-check-update.js` to new system

### Phase 3: Advanced Lifecycle (Depends on Phase 2)

1. **Add custom lifecycle events**
   - `pre-gsd-install`
   - `post-gsd-install`
   - `gsd-update`

2. **Plugin system**
   - Allow third-party hooks
   - Configuration in `package.json` or `.gsdrc`

## Anti-Patterns to Avoid

### Anti-Pattern 1: Breaking Non-Interactive Install

**What people do:** Add interactive prompts to `postinstall`

**Why it's wrong:** CI/CD, Docker builds, and automated installs will hang

**Do this instead:** 
- Keep `postinstall` non-interactive
- Use `prepare` for validation only
- Save interactive setup for explicit `npx gsd-opencode` call

### Anti-Pattern 2: Assuming Global Install

**What people do:** Hardcode paths like `/usr/local/lib/node_modules`

**Why it's wrong:** npm prefix varies by system and install method

**Do this instead:**
- Use `process.env.npm_config_prefix` if available
- Support both global (`-g`) and local installs
- Respect user's `--config-dir` override

### Anti-Pattern 3: Modifying Package Files in Install Script

**What people do:** Try to write to `node_modules/gsd-opencode/` during install

**Why it's wrong:** npm may prune or overwrite these changes

**Do this instead:**
- Write to target config directory only (`~/.config/opencode/`)
- Keep package directory read-only after install

### Anti-Pattern 4: Long-Running Install Scripts

**What people do:** Network calls, compilation, or heavy processing in `postinstall`

**Why it's wrong:** Slows down every `npm install`, frustrates users

**Do this instead:**
- Keep `postinstall` under 5 seconds
- Defer heavy work to first run
- Use `prepare` for build steps (runs at publish time, not install)

## Recommended Architecture

### Minimal Lifecycle Integration

```json
// package.json
{
  "scripts": {
    "prepare": "node scripts/validate-package.js",
    "postinstall": "node bin/install.js --auto-detect"
  },
  "bin": {
    "gsd-opencode": "bin/install.js"
  }
}
```

```javascript
// bin/install.js (augmented)
#!/usr/bin/env node

const isPostinstall = process.env.npm_lifecycle_event === 'postinstall';

if (isPostinstall) {
  // Running as npm postinstall - auto-detect global vs local
  const isGlobalInstall = process.env.npm_config_global === 'true';
  if (isGlobalInstall) {
    install(true); // Global install
  } else {
    // Local install - skip or do minimal setup
    console.log('gsd-opencode: Local install detected. Run "npx gsd-opencode" to set up.');
    process.exit(0);
  }
} else {
  // Running directly (npx gsd-opencode) - show interactive prompt
  promptLocation();
}
```

### Hook System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    gsd-opencode Hook System                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Hook Registry (lib/hooks/registry.js)                    ││
│  │ - Load hooks from ~/.config/opencode/hooks/              ││
│  │ - Register built-in hooks (statusline, update-check)     ││
│  │ - Execute hooks by lifecycle event                       ││
│  └─────────────────────────────────────────────────────────┘│
│                          │                                   │
│          ┌───────────────┼───────────────┐                   │
│          ▼               ▼               ▼                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │ pre-install  │ │post-install  │ │   update     │         │
│  │   hooks      │ │   hooks      │ │   hooks      │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Sources

- npm CLI Documentation: https://docs.npmjs.com/cli/v10/using-npm/scripts (HIGH confidence - official docs)
- npm package.json spec: https://docs.npmjs.com/cli/v10/configuring-npm/package-json (HIGH confidence - official docs)
- npm developers guide: https://docs.npmjs.com/cli/v10/using-npm/developers (HIGH confidence - official docs)
- gsd-opencode source code: `bin/install.js`, `package.json` (HIGH confidence - direct observation)

---
*Architecture research for: npm CLI lifecycle integration with gsd-opencode*
*Researched: 2026-02-01*
