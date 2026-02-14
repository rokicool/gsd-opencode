# Architecture Research: CLI Package Management Tools

**Domain:** Node.js CLI Tools with Subcommand Architecture  
**Researched:** February 9, 2026  
**Confidence:** HIGH (based on Commander.js official docs, npm CLI patterns, industry standards)

## Current State Analysis

### Existing Architecture

```
Current: Single-file monolith (bin/install.js, 324 lines)
├── Argument parsing (manual)
├── Interactive prompts (readline)
├── File operations (copyWithPathReplacement)
├── Path resolution (global/local scope)
└── Validation (sanity checks)
```

**Problems with current approach:**
- All logic in one file
- No separation of concerns
- Hard to add new commands (install only)
- No shared utilities between operations
- Manual argument parsing error-prone

## Recommended Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLI Entry Point                             │
│                        (bin/gsd.js)                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Commander.js Program Setup                                 │ │
│  │  - Version, description, global options                     │ │
│  └───────────────────────┬────────────────────────────────────┘ │
└──────────────────────────┼───────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
┌──────────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│    install      │ │  uninstall  │ │    check    │
│   Command       │ │   Command   │ │   Command   │
└────────┬────────┘ └──────┬──────┘ └──────┬──────┘
         │                 │               │
┌────────▼─────────────────▼───────────────▼────────┐
│              Shared Services Layer                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │
│  │   Scope     │ │   File      │ │   Config    │  │
│  │  Manager    │ │  Operations │ │   Manager   │  │
│  └─────────────┘ └─────────────┘ └─────────────┘  │
└────────────────────────┬──────────────────────────┘
                         │
┌────────────────────────▼──────────────────────────┐
│              Utilities Layer                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │
│  │    Path     │ │   Logger    │ │ Interactive │  │
│  │  Resolver   │ │             │ │   Prompts   │  │
│  └─────────────┘ └─────────────┘ └─────────────┘  │
└───────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| **CLI Entry** | Parse args, route to commands, global flags | `bin/gsd.js` using Commander.js |
| **Commands** | Implement specific CLI operations | `src/commands/*.js` (install, uninstall, check, repair, update) |
| **Scope Manager** | Resolve global vs local paths, environment detection | `src/services/scope-manager.js` |
| **File Operations** | Copy with path replacement, verification | `src/services/file-ops.js` |
| **Config Manager** | Read/write configuration, version tracking | `src/services/config.js` |
| **Path Resolver** | Handle ~ expansion, path normalization | `src/utils/path-resolver.js` |
| **Logger** | Colored output, spinners, progress | `src/utils/logger.js` (wraps ora/chalk) |
| **Interactive** | User prompts when flags not provided | `src/utils/interactive.js` |

## Recommended Project Structure

```
gsd-opencode/
├── bin/
│   ├── gsd.js                    # New main entry (replaces install.js)
│   └── gsd-install.js            # Legacy compatibility alias
├── src/
│   ├── commands/
│   │   ├── index.js              # Command registry
│   │   ├── install.js            # Install command implementation
│   │   ├── uninstall.js          # Uninstall command
│   │   ├── check.js              # Check installation integrity
│   │   ├── repair.js             # Repair broken installation
│   │   └── update.js             # Update to latest version
│   ├── services/
│   │   ├── scope-manager.js      # Global/local scope resolution
│   │   ├── file-ops.js           # File operations with path replacement
│   │   └── config.js             # Configuration management
│   └── utils/
│       ├── path-resolver.js      # Path expansion/normalization
│       ├── logger.js             # Terminal output utilities
│       └── interactive.js        # User prompts
├── lib/
│   └── constants.js              # Shared constants (paths, regexes)
├── package.json
└── README.md
```

### Structure Rationale

- **`bin/`:** Entry points required by npm. Separate CLI from implementation.
- **`src/commands/`:** Each command is self-contained, making it easy to add new operations.
- **`src/services/`:** Shared business logic between commands (scope resolution, file ops).
- **`src/utils/`:** Pure utilities with no business logic, easily testable.
- **`lib/`:** Static data and constants that don't change often.

## Architectural Patterns

### Pattern 1: Command Pattern with Commander.js

**What:** Use Commander.js to define subcommands with action handlers.

**When to use:** When CLI has multiple distinct operations (install, uninstall, check, etc.).

**Trade-offs:** 
- ✅ Automatic help generation, argument parsing, validation
- ✅ Consistent with Node.js ecosystem (npm, yarn, vercel)
- ⚠️ Adds dependency (commander ~1MB)

**Example:**
```javascript
// bin/gsd.js
const { Command } = require('commander');
const installCommand = require('../src/commands/install');
const uninstallCommand = require('../src/commands/uninstall');

const program = new Command();

program
  .name('gsd-opencode')
  .description('GSD-OpenCode distribution manager')
  .version(require('../package.json').version);

program
  .command('install')
  .description('Install GSD-OpenCode distribution')
  .option('-g, --global', 'Install globally')
  .option('-l, --local', 'Install locally')
  .option('-c, --config-dir <path>', 'Custom config directory')
  .action(installCommand);

program
  .command('uninstall')
  .description('Remove GSD-OpenCode installation')
  .option('-g, --global', 'Uninstall globally')
  .option('-l, --local', 'Uninstall locally')
  .action(uninstallCommand);

// Legacy: default to install if no command provided
if (process.argv.length <= 2) {
  process.argv.push('install');
}

program.parse();
```

### Pattern 2: Scope Management Service

**What:** Centralized service to resolve installation targets (global vs local).

**When to use:** When CLI needs to operate in multiple contexts (user home vs project directory).

**Trade-offs:**
- ✅ Single source of truth for path resolution
- ✅ Environment variable handling in one place
- ⚠️ Must be initialized early and passed to commands

**Example:**
```javascript
// src/services/scope-manager.js
const os = require('os');
const path = require('path');

class ScopeManager {
  constructor(options = {}) {
    this.globalDir = options.configDir || 
                     process.env.OPENCODE_CONFIG_DIR ||
                     path.join(os.homedir(), '.config', 'opencode');
    this.localDir = path.join(process.cwd(), '.opencode');
    this.scope = options.scope || this.detectScope();
  }

  detectScope() {
    // Auto-detect based on flags or default to interactive
    if (options.global) return 'global';
    if (options.local) return 'local';
    return null; // Trigger interactive prompt
  }

  getTargetDir() {
    return this.scope === 'global' ? this.globalDir : this.localDir;
  }

  getPathPrefix() {
    if (this.scope === 'global') {
      return this.isCustomConfig() 
        ? `${this.globalDir}/`
        : '~/.config/opencode/';
    }
    return './.opencode/';
  }

  isCustomConfig() {
    return !!process.env.OPENCODE_CONFIG_DIR || this.customConfigDir;
  }
}

module.exports = ScopeManager;
```

### Pattern 3: Service Layer for Shared Operations

**What:** Extract file operations and config management into reusable services.

**When to use:** When multiple commands need same operations (install and repair both copy files).

**Trade-offs:**
- ✅ DRY - code reuse across commands
- ✅ Easier to test business logic in isolation
- ⚠️ Requires dependency injection or module exports

**Example:**
```javascript
// src/services/file-ops.js
const fs = require('fs');
const path = require('path');

class FileOperations {
  constructor(scopeManager, logger) {
    this.scope = scopeManager;
    this.logger = logger;
  }

  async copyWithPathReplacement(srcDir, destDir) {
    const pathPrefix = this.scope.getPathPrefix();
    // Implementation from current install.js, but as reusable method
  }

  async verifyInstallation(targetDir) {
    // Check for unresolved tokens, missing files
  }

  async removeInstallation(targetDir) {
    // Safe removal with confirmation
  }
}

module.exports = FileOperations;
```

### Pattern 4: Backward Compatibility Shim

**What:** Maintain legacy CLI interface while migrating to new architecture.

**When to use:** When existing users rely on current `npx gsd-opencode --global` behavior.

**Trade-offs:**
- ✅ No breaking changes for existing users
- ✅ Migration can happen gradually
- ⚠️ Temporary complexity, should deprecate eventually

**Example:**
```javascript
// bin/gsd-install.js (legacy compatibility)
#!/usr/bin/env node

// Detect legacy usage and redirect to new command
const args = process.argv.slice(2);

// If called with --global or --local but no subcommand, use install
if (args.includes('--global') || args.includes('--local') || args.length === 0) {
  // Convert to new command format
  const newArgs = ['install', ...args];
  process.argv = [...process.argv.slice(0, 2), ...newArgs];
}

require('./gsd.js');
```

## Data Flow

### Installation Flow

```
User Input
    ↓
CLI Parser (Commander.js)
    ↓
Command Handler (install.js)
    ↓
Scope Manager (resolve target)
    ↓
Interactive Prompt (if needed)
    ↓
File Operations (copy with replacement)
    ↓
Verification (sanity check)
    ↓
Logger (success/failure output)
```

### Command Context Flow

```
┌─────────────────────────────────────────────────────┐
│  bin/gsd.js                                         │
│  - Parse global options                             │
│  - Create ScopeManager instance                     │
│  - Route to command handler                         │
└──────────────┬──────────────────────────────────────┘
               │ passes context
               ↓
┌─────────────────────────────────────────────────────┐
│  Command Handler (e.g., install.js)                 │
│  - Receive { scopeManager, logger, options }        │
│  - Execute business logic                           │
│  - Use services for operations                      │
└──────────────┬──────────────────────────────────────┘
               │ uses
               ↓
┌─────────────────────────────────────────────────────┐
│  Services (file-ops.js, config.js)                  │
│  - Receive scopeManager for paths                   │
│  - Receive logger for output                        │
│  - Perform operations                               │
└─────────────────────────────────────────────────────┘
```

## Build Order Implications

Based on dependencies between components, recommended implementation order:

### Phase 1: Foundation (No dependencies)
1. **Utils layer** (`src/utils/`)
   - `path-resolver.js` - Pure functions, no deps
   - `logger.js` - Console output, colors
   - `interactive.js` - User prompts

### Phase 2: Services (Depends on Utils)
2. **Scope Manager** (`src/services/scope-manager.js`)
   - Depends on: path-resolver
   - Critical path: All other services need this
3. **Config Manager** (`src/services/config.js`)
   - Depends on: scope-manager, path-resolver
4. **File Operations** (`src/services/file-ops.js`)
   - Depends on: scope-manager, logger
   - Can reuse logic from current install.js

### Phase 3: Commands (Depends on Services)
5. **Install Command** (`src/commands/install.js`)
   - Most complex, migrate from existing code
   - Depends on: file-ops, scope-manager, interactive
6. **Check Command** (`src/commands/check.js`)
   - Reuses file-ops verification logic
7. **Uninstall Command** (`src/commands/uninstall.js`)
   - Simpler, good for testing pattern
8. **Repair/Update Commands** (`src/commands/repair.js`, `update.js`)
   - Combine check + install patterns

### Phase 4: CLI Integration (Depends on Everything)
9. **Main Entry** (`bin/gsd.js`)
   - Wire up all commands with Commander.js
10. **Legacy Shim** (`bin/gsd-install.js`)
    - Backward compatibility layer

**Critical Path:** Utils → Scope Manager → File Operations → Install Command → CLI Entry

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (single user) | Monolithic commands fine. No need for async queue. |
| Team usage (10-100 users) | Add lock files to prevent concurrent installs. Cache downloaded assets. |
| Enterprise (CI/CD integration) | Add `--yes` flag for non-interactive mode. JSON output mode. Error codes for scripting. |

### Scaling Priorities

1. **First bottleneck:** Concurrent installs corrupting files
   - Fix: Add file locking mechanism
   
2. **Second bottleneck:** Slow repeated installs
   - Fix: Cache verification results, incremental updates

## Anti-Patterns to Avoid

### Anti-Pattern 1: Global State in Commands

**What people do:** Commands access `process.env` or global variables directly.

**Why it's wrong:** Makes testing hard, unpredictable behavior, can't run multiple commands in parallel.

**Do this instead:** Pass configuration via context object (dependency injection).

```javascript
// BAD
function install() {
  const configDir = process.env.OPENCODE_CONFIG_DIR; // Global access
}

// GOOD
function install({ scopeManager, config }) {
  const configDir = scopeManager.getTargetDir(); // Injected dependency
}
```

### Anti-Pattern 2: Mixing CLI and Business Logic

**What people do:** Commands directly print to console and exit with process.exit().

**Why it's wrong:** Can't test without mocking process, can't reuse logic in other contexts.

**Do this instead:** Return results, let CLI layer handle output and exit codes.

```javascript
// BAD
function install() {
  if (error) {
    console.error('Failed');
    process.exit(1);
  }
}

// GOOD
async function install(context) {
  try {
    await performInstall(context);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}
```

### Anti-Pattern 3: Deeply Nested Callbacks

**What people do:** Chaining callbacks for file operations (common in old Node.js code).

**Why it's wrong:** Hard to follow control flow, error handling scattered.

**Do this instead:** Use async/await consistently.

```javascript
// BAD
fs.mkdir(dir, () => {
  fs.copyFile(src, dest, () => {
    fs.writeFile(version, () => {
      // ... callback hell
    });
  });
});

// GOOD
await fs.promises.mkdir(dir, { recursive: true });
await fs.promises.copyFile(src, dest);
await fs.promises.writeFile(version, content);
```

## Integration Points

### External Dependencies

| Library | Purpose | Integration |
|---------|---------|-------------|
| **commander** | CLI framework | Main entry point, command routing |
| **chalk** | Terminal colors | Logger utility |
| **ora** | Loading spinners | Long-running operations |
| **inquirer** | Interactive prompts | When flags not provided |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| CLI ↔ Commands | Function calls with context object | Commands should be pure-ish |
| Commands ↔ Services | Service instances passed in | Dependency injection pattern |
| Services ↔ Utils | Direct imports | Utils are pure functions |

## Backward Compatibility Strategy

### Current Usage to Preserve

```bash
# Must continue to work:
npx gsd-opencode                    # Interactive install prompt
npx gsd-opencode --global           # Global install
npx gsd-opencode --local            # Local install
npx gsd-opencode -g -c ~/.opencode  # Custom config dir
npx gsd-opencode --help             # Help text
```

### Migration Path

**Step 1:** Create new `bin/gsd.js` with Commander.js, keep `bin/install.js` as alias.

**Step 2:** Detect when called as `install.js` and auto-convert args:
- `npx gsd-opencode --global` → `gsd install --global`
- `npx gsd-opencode` → `gsd install` (triggers interactive)

**Step 3:** Update package.json bin entry to point to `gsd.js` eventually.

**Step 4:** Deprecate and remove `install.js` in future major version.

## Sources

- [Commander.js Documentation](https://github.com/tj/commander.js) - Official docs, subcommand patterns, action handlers
- [npm CLI Architecture](https://github.com/npm/cli) - Industry standard CLI structure, lib/ + bin/ separation
- [ora GitHub](https://github.com/sindresorhus/ora) - Terminal spinner patterns
- Current codebase analysis: `bin/install.js` structure and requirements

---
*Architecture research for: GSD-OpenCode CLI Tool Evolution*
*Researched: February 9, 2026*
