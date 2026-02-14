# Phase 2: Uninstall & Configuration - Research

**Researched:** 2026-02-09
**Domain:** CLI command patterns (uninstall, config management)
**Confidence:** HIGH

## Summary

Phase 2 extends the GSD-OpenCode CLI with two critical user-facing features: **uninstall** for safe system removal and **config** for persistent settings management. Both features must integrate seamlessly with Phase 1's service-oriented architecture while following established CLI patterns from npm, yarn, gh CLI, and other mature tools.

**Primary recommendation:** 
- Implement `uninstall` with interactive confirmation by default, `--force` flag for scripting, and comprehensive pre-deletion summary
- Implement `config` with subcommand pattern (`config get|set|reset|list`), JSON-based storage with atomic writes, and dot-notation key access

## Standard Stack

### Core (Already Established in Phase 1)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| commander | ^12.1.0 | CLI framework | Established in Phase 1, supports subcommands natively |
| @inquirer/prompts | ^8.2.0 | Interactive prompts | Already used for scope selection in Phase 1 |
| chalk | ^5.6.2 | Terminal colors | Established in Phase 1, stderr-only logging |

### New/Extended
| Component | Type | Purpose | Notes |
|-----------|------|---------|-------|
| fs/promises | Node.js native | Atomic file operations | Use for config writes (write-temp-then-rename) |
| path | Node.js native | Path resolution | Already used in Phase 1 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual JSON storage | `conf` library | `conf` adds dependency but provides migrations, schema validation; manual JSON is simpler and sufficient for this use case |
| JSON config | YAML config | YAML is more human-readable but adds complexity; JSON is standard for CLI configs |
| Dot-notation keys | Flat keys | Dot-notation (e.g., `user.name`) is standard (git config, npm config) and enables nested objects |

## Architecture Patterns

### Recommended Project Structure
```
src/
├── commands/
│   ├── install.js       # (existing)
│   ├── list.js          # (existing)
│   ├── uninstall.js     # NEW: Remove GSD-OpenCode installation
│   └── config.js        # NEW: Configuration management
├── services/
│   ├── scope-manager.js # (existing - use for target path resolution)
│   ├── config.js        # (existing - use for VERSION file)
│   └── settings.js      # NEW: User settings persistence layer
└── utils/
    ├── logger.js        # (existing)
    ├── interactive.js   # (existing - add uninstall confirmation)
    └── path-resolver.js # (existing)
```

### Pattern 1: Uninstall with Confirmation and Force Flag
**What:** Destructive operation requiring user confirmation by default, with escape hatch for automation
**When to use:** All destructive operations (file/directory removal)
**Example:**
```javascript
// Source: clig.dev destructive operations guidelines
export async function uninstallCommand(options = {}) {
  const { force, verbose } = options;
  
  // Check what will be removed
  const targets = await identifyTargets(scope);
  
  // Show summary
  logger.heading('Uninstall GSD-OpenCode');
  logger.info('The following will be removed:');
  targets.forEach(t => logger.dim(`  - ${t.path}`));
  
  // Require confirmation unless --force
  if (!force) {
    const confirmed = await promptConfirmation(
      'Are you sure you want to proceed?',
      false  // Default to false for safety
    );
    if (!confirmed) {
      logger.info('Uninstall cancelled');
      return ERROR_CODES.INTERRUPTED;
    }
  }
  
  // Perform removal
  await removeTargets(targets);
  logger.success('GSD-OpenCode has been uninstalled');
}
```

### Pattern 2: Config Subcommand Pattern
**What:** Git-style subcommands for configuration operations
**When to use:** Multiple related operations on the same domain (get, set, reset, list)
**Example:**
```javascript
// Source: gh CLI config pattern (github.com/cli/cli)
program
  .command('config')
  .description('Manage configuration settings')
  .addCommand(
    new Command('get')
      .description('Get a configuration value')
      .argument('<key>', 'Configuration key (supports dot-notation)')
      .action(configGetCommand)
  )
  .addCommand(
    new Command('set')
      .description('Set a configuration value')
      .argument('<key>', 'Configuration key')
      .argument('<value>', 'Value to set')
      .action(configSetCommand)
  )
  .addCommand(
    new Command('reset')
      .description('Reset configuration to defaults')
      .option('--all', 'Reset all settings')
      .argument('[key]', 'Specific key to reset')
      .action(configResetCommand)
  )
  .addCommand(
    new Command('list')
      .alias('ls')
      .description('List all configuration settings')
      .option('--json', 'Output as JSON')
      .action(configListCommand)
  );
```

### Pattern 3: Settings Service with Atomic Writes
**What:** Dedicated service for configuration persistence with safe write operations
**When to use:** Any user-modifiable configuration that must survive crashes
**Example:**
```javascript
// Source: Based on npm's config handling and sindresorhus/conf patterns
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export class SettingsManager {
  constructor() {
    // Follow XDG Base Directory spec
    const configDir = process.env.XDG_CONFIG_HOME || 
                      path.join(os.homedir(), '.config');
    this.configPath = path.join(configDir, 'gsd-opencode', 'settings.json');
    this.defaults = {
      'install.scope': 'global',
      'ui.color': true,
      'ui.progress': true
    };
  }
  
  async get(key) {
    const config = await this._load();
    return this._getNested(config, key) ?? this._getNested(this.defaults, key);
  }
  
  async set(key, value) {
    const config = await this._load();
    this._setNested(config, key, value);
    await this._save(config);
  }
  
  async _save(config) {
    // Atomic write: write to temp, then rename
    const dir = path.dirname(this.configPath);
    await fs.mkdir(dir, { recursive: true });
    const tempPath = `${this.configPath}.tmp.${Date.now()}`;
    await fs.writeFile(tempPath, JSON.stringify(config, null, 2));
    await fs.rename(tempPath, this.configPath);
  }
  
  _getNested(obj, key) {
    return key.split('.').reduce((o, k) => o?.[k], obj);
  }
  
  _setNested(obj, key, value) {
    const keys = key.split('.');
    const last = keys.pop();
    const target = keys.reduce((o, k) => o[k] ??= {}, obj);
    target[last] = value;
  }
}
```

### Pattern 4: Integration with Existing ScopeManager
**What:** Reuse Phase 1's scope detection for uninstall targeting
**When to use:** When uninstall needs to know installation location
**Example:**
```javascript
// Integrates with existing Phase 1 architecture
import { ScopeManager } from '../services/scope-manager.js';

export async function uninstallCommand(options = {}) {
  const scopeManager = new ScopeManager({ 
    scope: options.global ? 'global' : options.local ? 'local' : undefined 
  });
  
  // Check if installed
  if (!scopeManager.isInstalled()) {
    logger.warning(`No ${scopeManager.getScope()} installation found`);
    return ERROR_CODES.GENERAL_ERROR;
  }
  
  const targetDir = scopeManager.getTargetDir();
  // ... proceed with uninstall
}
```

### Anti-Patterns to Avoid
- **No confirmation on destructive operations:** Always require confirmation for destructive ops unless --force is passed
- **Mixed concerns in commands:** Don't let uninstall command handle config operations; keep them separate
- **Synchronous file operations:** All file operations must be async to avoid blocking
- **Non-atomic config writes:** Config corruption on crash; always use atomic writes
- **Flat config keys:** Use dot-notation (e.g., `user.name`) instead of flat keys for better organization

## Don't Hand-Roll

Problems that look simple but have existing solutions or established patterns:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Config file location | Hardcode paths | Follow XDG Base Directory spec | Different conventions on macOS (~/.config vs ~/Library), Linux, Windows |
| Config validation | Manual checks | JSON Schema or simple type checking | Validation rules get complex; schema provides structure |
| Dot-notation parsing | String.split() | Established dot-prop pattern | Edge cases with escaped dots, arrays |
| Atomic file writes | fs.writeFile() directly | Write-temp-then-rename pattern | Prevents corruption on crash or power loss |
| Interactive detection | process.stdin.isTTY only | Check both stdin AND stdout | Some environments have weird TTY setups |
| Confirmation prompts | console.log + readline | @inquirer/prompts (already in project) | Handles Ctrl+C, validation, cross-platform quirks |

**Key insight:** The `conf` library (sindresorhus/conf) handles many of these concerns but adds a dependency. For GSD-OpenCode's relatively simple config needs, implementing a lightweight SettingsManager following the same patterns is preferable to adding a dependency.

## Common Pitfalls

### Pitfall 1: Uninstall Removes Wrong Directory
**What goes wrong:** Path traversal or incorrect scope detection leads to deleting user files
**Why it happens:** Reusing paths without validation, not checking isInstalled() first
**How to avoid:** 
- Always verify VERSION file exists before removing anything
- Validate paths match expected patterns
- Show what will be removed and require confirmation
- Use `path.resolve()` and compare against allowed base directories

**Warning signs:**
- Code removes directories without checking VERSION file
- No validation of resolved paths
- Test only with mock paths, not real scenarios

### Pitfall 2: Config Corruption on Crash
**What goes wrong:** Partial write leaves config file in invalid JSON state
**Why it happens:** Using fs.writeFile() directly without atomic pattern
**How to avoid:**
- Always write to temp file first
- Use fs.rename() (atomic on most filesystems)
- Handle cleanup of temp files on error

**Example safe pattern:**
```javascript
async function atomicWrite(path, data) {
  const temp = `${path}.tmp.${Date.now()}`;
  try {
    await fs.writeFile(temp, data);
    await fs.rename(temp, path);
  } catch (error) {
    await fs.unlink(temp).catch(() => {}); // Cleanup
    throw error;
  }
}
```

### Pitfall 3: Config Not Persisting Across Invocations
**What goes wrong:** Config written to wrong location or not following XDG spec
**Why it happens:** Hardcoding ~/.config without checking XDG_CONFIG_HOME
**How to avoid:**
- Check XDG_CONFIG_HOME environment variable first
- Fall back to ~/.config on Unix, appropriate paths on macOS/Windows
- Log config path in verbose mode for debugging

**Warning signs:**
- Config works in dev but not for users
- Different behavior on different OSes
- Users report settings not saving

### Pitfall 4: Dot-Notation Key Access Fails
**What goes wrong:** Keys like `user.name` interpreted as literal key instead of nested
**Why it happens:** Not parsing dot-notation, or parsing incorrectly
**How to avoid:**
- Use proper dot-notation parsing (split on '.', but handle edge cases)
- Support both get and set with nested objects
- Document that dot-notation is supported

**Example:**
```javascript
// Wrong
config['user.name'] = value;  // Creates key literally named "user.name"

// Right
setNested(config, 'user.name', value);  // Sets config.user.name
```

### Pitfall 5: Uninstall in Non-Interactive Environment Hangs
**What goes wrong:** Command prompts for confirmation in CI/scripting environment
**Why it happens:** Not checking TTY or providing --force flag
**How to avoid:**
- Check `process.stdin.isTTY` before prompting
- Require `--force` flag when not TTY
- Provide clear error message: "Non-interactive environment, use --force to uninstall"

## Code Examples

### Uninstall Command - Full Implementation Pattern
```javascript
// src/commands/uninstall.js
import { ScopeManager } from '../services/scope-manager.js';
import { logger, setVerbose } from '../utils/logger.js';
import { promptConfirmation } from '../utils/interactive.js';
import { ERROR_CODES, DIRECTORIES_TO_COPY } from '../../lib/constants.js';
import fs from 'fs/promises';
import path from 'path';

export async function uninstallCommand(options = {}) {
  setVerbose(options.verbose);
  
  try {
    // Determine scope
    let scope = options.global ? 'global' : 
                options.local ? 'local' : null;
    
    if (!scope) {
      // Default to checking both, prefer global if both exist
      const globalScope = new ScopeManager({ scope: 'global' });
      const localScope = new ScopeManager({ scope: 'local' });
      
      if (globalScope.isInstalled() && localScope.isInstalled()) {
        logger.warning('Both global and local installations found');
        logger.info('Use --global or --local to specify which to remove');
        return ERROR_CODES.GENERAL_ERROR;
      }
      
      scope = globalScope.isInstalled() ? 'global' : 
              localScope.isInstalled() ? 'local' : null;
    }
    
    if (!scope) {
      logger.warning('No GSD-OpenCode installation found');
      return ERROR_CODES.GENERAL_ERROR;
    }
    
    const scopeManager = new ScopeManager({ scope });
    const targetDir = scopeManager.getTargetDir();
    
    // Identify what will be removed
    const itemsToRemove = [];
    
    // Check for VERSION file
    const versionPath = path.join(targetDir, 'VERSION');
    try {
      await fs.access(versionPath);
      itemsToRemove.push({ type: 'file', path: versionPath, name: 'VERSION' });
    } catch { /* VERSION doesn't exist */ }
    
    // Check for directories
    for (const dir of DIRECTORIES_TO_COPY) {
      const dirPath = path.join(targetDir, dir);
      try {
        const stat = await fs.stat(dirPath);
        if (stat.isDirectory()) {
          itemsToRemove.push({ type: 'directory', path: dirPath, name: dir });
        }
      } catch { /* Directory doesn't exist */ }
    }
    
    if (itemsToRemove.length === 0) {
      logger.warning('No GSD-OpenCode files found in ' + scopeManager.getPathPrefix());
      return ERROR_CODES.GENERAL_ERROR;
    }
    
    // Show summary
    logger.heading('Uninstall GSD-OpenCode');
    logger.info(`Scope: ${scope}`);
    logger.info(`Location: ${scopeManager.getPathPrefix()}`);
    logger.dim('');
    logger.info('The following items will be removed:');
    itemsToRemove.forEach(item => {
      logger.dim(`  ${item.type === 'directory' ? '📁' : '📄'} ${item.name}`);
    });
    logger.dim('');
    
    // Require confirmation
    if (!options.force) {
      const confirmed = await promptConfirmation(
        'Are you sure you want to proceed?',
        false
      );
      
      if (confirmed === null) {
        logger.info('Uninstall cancelled');
        return ERROR_CODES.INTERRUPTED;
      }
      
      if (!confirmed) {
        logger.info('Uninstall cancelled');
        return ERROR_CODES.SUCCESS;
      }
    }
    
    // Perform removal
    logger.info('Removing files...');
    
    for (const item of itemsToRemove) {
      await fs.rm(item.path, { recursive: true, force: true });
      logger.debug(`Removed: ${item.path}`);
    }
    
    // Try to remove parent directory if empty
    try {
      await fs.rmdir(targetDir);
      logger.debug(`Removed empty directory: ${targetDir}`);
    } catch {
      // Directory not empty or other error, ignore
    }
    
    logger.success('GSD-OpenCode has been successfully uninstalled');
    logger.dim(`Removed ${itemsToRemove.length} item(s) from ${scopeManager.getPathPrefix()}`);
    
    return ERROR_CODES.SUCCESS;
    
  } catch (error) {
    if (error.name === 'AbortPromptError') {
      logger.info('Uninstall cancelled');
      return ERROR_CODES.INTERRUPTED;
    }
    
    if (error.code === 'EACCES') {
      logger.error('Permission denied: Cannot remove installation directory');
      logger.dim('Suggestion: Check directory permissions or run with appropriate privileges');
      return ERROR_CODES.PERMISSION_ERROR;
    }
    
    logger.error(`Uninstall failed: ${error.message}`);
    return ERROR_CODES.GENERAL_ERROR;
  }
}
```

### Settings Service - Full Implementation Pattern
```javascript
// src/services/settings.js
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export class SettingsManager {
  constructor() {
    // Follow XDG Base Directory Specification
    const xdgConfig = process.env.XDG_CONFIG_HOME;
    const baseDir = xdgConfig || path.join(os.homedir(), '.config');
    this.configDir = path.join(baseDir, 'gsd-opencode');
    this.configPath = path.join(this.configDir, 'settings.json');
    
    // Default configuration values
    this.defaults = {
      'install.defaultScope': 'global',
      'ui.colors': true,
      'ui.progressBars': true,
      'behavior.confirmDestructive': true,
      'logging.verbose': false
    };
    
    // In-memory cache
    this._cache = null;
    this._cacheValid = false;
  }
  
  /**
   * Get a configuration value by key (supports dot-notation)
   * @param {string} key - Configuration key (e.g., 'ui.colors')
   * @returns {Promise<any>} Configuration value or undefined
   */
  async get(key) {
    const config = await this._load();
    const value = this._getNested(config, key);
    return value !== undefined ? value : this._getNested(this.defaults, key);
  }
  
  /**
   * Set a configuration value by key (supports dot-notation)
   * @param {string} key - Configuration key
   * @param {any} value - Value to set
   * @returns {Promise<void>}
   */
  async set(key, value) {
    const config = await this._load();
    this._setNested(config, key, value);
    await this._save(config);
    this._cache = config;
    this._cacheValid = true;
  }
  
  /**
   * Reset configuration to defaults
   * @param {string} [key] - Specific key to reset, or reset all if omitted
   * @returns {Promise<void>}
   */
  async reset(key) {
    if (key) {
      const config = await this._load();
      this._deleteNested(config, key);
      await this._save(config);
    } else {
      // Reset all - delete config file
      try {
        await fs.unlink(this.configPath);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    this._cacheValid = false;
  }
  
  /**
   * List all configuration values (merged with defaults)
   * @returns {Promise<Object>} All configuration values
   */
  async list() {
    const config = await this._load();
    return this._deepMerge({}, this.defaults, config);
  }
  
  /**
   * Get raw user config (without defaults)
   * @returns {Promise<Object>} User configuration only
   */
  async getRaw() {
    return this._load();
  }
  
  /**
   * Get configuration file path
   * @returns {string} Absolute path to config file
   */
  getConfigPath() {
    return this.configPath;
  }
  
  // Private methods
  
  async _load() {
    // Return cached config if valid
    if (this._cacheValid && this._cache) {
      return this._cache;
    }
    
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      const config = JSON.parse(content);
      this._cache = config;
      this._cacheValid = true;
      return config;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Config doesn't exist yet, return empty object
        this._cache = {};
        this._cacheValid = true;
        return {};
      }
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid configuration file: ${error.message}`);
      }
      throw error;
    }
  }
  
  async _save(config) {
    // Ensure config directory exists
    await fs.mkdir(this.configDir, { recursive: true });
    
    // Atomic write: write to temp file, then rename
    const tempPath = `${this.configPath}.tmp.${Date.now()}`;
    const content = JSON.stringify(config, null, 2);
    
    try {
      await fs.writeFile(tempPath, content, 'utf-8');
      await fs.rename(tempPath, this.configPath);
    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.unlink(tempPath);
      } catch { /* ignore cleanup error */ }
      throw error;
    }
  }
  
  _getNested(obj, key) {
    const keys = key.split('.');
    let result = obj;
    for (const k of keys) {
      if (result === null || result === undefined) return undefined;
      result = result[k];
    }
    return result;
  }
  
  _setNested(obj, key, value) {
    const keys = key.split('.');
    const last = keys.pop();
    let target = obj;
    
    for (const k of keys) {
      if (!(k in target) || typeof target[k] !== 'object' || target[k] === null) {
        target[k] = {};
      }
      target = target[k];
    }
    
    target[last] = value;
  }
  
  _deleteNested(obj, key) {
    const keys = key.split('.');
    const last = keys.pop();
    let target = obj;
    
    for (const k of keys) {
      if (!(k in target)) return;
      target = target[k];
    }
    
    delete target[last];
  }
  
  _deepMerge(target, ...sources) {
    for (const source of sources) {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          target[key] = this._deepMerge(target[key] || {}, source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
    return target;
  }
}
```

### Config Command - Implementation Pattern
```javascript
// src/commands/config.js
import { SettingsManager } from '../services/settings.js';
import { logger, setVerbose } from '../utils/logger.js';
import { ERROR_CODES } from '../../lib/constants.js';

export async function configGetCommand(key, options) {
  setVerbose(options.verbose);
  
  try {
    const settings = new SettingsManager();
    
    if (!key) {
      logger.error('Configuration key is required');
      logger.dim('Usage: gsd-opencode config get <key>');
      return ERROR_CODES.GENERAL_ERROR;
    }
    
    const value = await settings.get(key);
    
    if (value === undefined) {
      logger.error(`Configuration key '${key}' not found`);
      return ERROR_CODES.GENERAL_ERROR;
    }
    
    // Output raw value for piping
    console.log(typeof value === 'object' ? JSON.stringify(value) : String(value));
    return ERROR_CODES.SUCCESS;
    
  } catch (error) {
    logger.error(`Failed to get configuration: ${error.message}`);
    return ERROR_CODES.GENERAL_ERROR;
  }
}

export async function configSetCommand(key, value, options) {
  setVerbose(options.verbose);
  
  try {
    const settings = new SettingsManager();
    
    if (!key || value === undefined) {
      logger.error('Both key and value are required');
      logger.dim('Usage: gsd-opencode config set <key> <value>');
      return ERROR_CODES.GENERAL_ERROR;
    }
    
    // Parse value (handle booleans, numbers, JSON)
    let parsedValue = value;
    if (value === 'true') parsedValue = true;
    else if (value === 'false') parsedValue = false;
    else if (!isNaN(value) && value.trim() !== '') parsedValue = Number(value);
    else if (value.startsWith('{') || value.startsWith('[')) {
      try {
        parsedValue = JSON.parse(value);
      } catch { /* Keep as string */ }
    }
    
    await settings.set(key, parsedValue);
    logger.success(`Set ${key} = ${JSON.stringify(parsedValue)}`);
    
    return ERROR_CODES.SUCCESS;
    
  } catch (error) {
    logger.error(`Failed to set configuration: ${error.message}`);
    return ERROR_CODES.GENERAL_ERROR;
  }
}

export async function configResetCommand(key, options) {
  setVerbose(options.verbose);
  
  try {
    const settings = new SettingsManager();
    
    if (options.all) {
      await settings.reset();
      logger.success('All configuration reset to defaults');
    } else if (key) {
      await settings.reset(key);
      logger.success(`Reset ${key} to default`);
    } else {
      logger.error('Specify a key to reset or use --all to reset all');
      return ERROR_CODES.GENERAL_ERROR;
    }
    
    return ERROR_CODES.SUCCESS;
    
  } catch (error) {
    logger.error(`Failed to reset configuration: ${error.message}`);
    return ERROR_CODES.GENERAL_ERROR;
  }
}

export async function configListCommand(options) {
  setVerbose(options.verbose);
  
  try {
    const settings = new SettingsManager();
    const config = await settings.list();
    
    if (options.json) {
      console.log(JSON.stringify(config, null, 2));
    } else {
      logger.heading('Configuration');
      logger.dim(`Source: ${settings.getConfigPath()}`);
      logger.dim('');
      
      // Flatten and display
      const flattened = flattenObject(config);
      const maxKeyLength = Math.max(...Object.keys(flattened).map(k => k.length));
      
      for (const [key, value] of Object.entries(flattened)) {
        const paddedKey = key.padEnd(maxKeyLength);
        logger.info(`${paddedKey}  ${formatValue(value)}`);
      }
    }
    
    return ERROR_CODES.SUCCESS;
    
  } catch (error) {
    logger.error(`Failed to list configuration: ${error.message}`);
    return ERROR_CODES.GENERAL_ERROR;
  }
}

function flattenObject(obj, prefix = '', result = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenObject(value, fullKey, result);
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

function formatValue(value) {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}
```

### CLI Registration Pattern
```javascript
// In bin/gsd.js, add to main() function:

// Uninstall command
program
  .command('uninstall')
  .alias('rm')
  .description('Remove GSD-OpenCode installation')
  .option('-g, --global', 'Remove global installation')
  .option('-l, --local', 'Remove local installation')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(async (options, command) => {
    const globalOptions = command.parent.opts();
    const fullOptions = { ...options, verbose: globalOptions.verbose };
    const exitCode = await uninstallCommand(fullOptions);
    process.exit(exitCode);
  });

// Config command with subcommands
const configCmd = program
  .command('config')
  .description('Manage GSD-OpenCode configuration');

configCmd
  .command('get <key>')
  .description('Get a configuration value')
  .action(async (key, options, command) => {
    const globalOptions = command.parent.parent.opts();
    const exitCode = await configGetCommand(key, { ...options, verbose: globalOptions.verbose });
    process.exit(exitCode);
  });

configCmd
  .command('set <key> <value>')
  .description('Set a configuration value')
  .action(async (key, value, options, command) => {
    const globalOptions = command.parent.parent.opts();
    const exitCode = await configSetCommand(key, value, { ...options, verbose: globalOptions.verbose });
    process.exit(exitCode);
  });

configCmd
  .command('reset [key]')
  .description('Reset configuration to defaults')
  .option('--all', 'Reset all settings')
  .action(async (key, options, command) => {
    const globalOptions = command.parent.parent.opts();
    const exitCode = await configResetCommand(key, { ...options, verbose: globalOptions.verbose });
    process.exit(exitCode);
  });

configCmd
  .command('list')
  .alias('ls')
  .description('List all configuration settings')
  .option('--json', 'Output as JSON')
  .action(async (options, command) => {
    const globalOptions = command.parent.parent.opts();
    const exitCode = await configListCommand({ ...options, verbose: globalOptions.verbose });
    process.exit(exitCode);
  });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| INI format config | JSON/YAML | 2010s | JSON is standard for Node.js, easier to parse natively |
| Flat config keys | Dot-notation keys | Always been preferred | Enables nested objects, familiar from git/npm config |
| Sync file operations | Async with atomic writes | Node.js best practices | Prevents corruption, better performance |
| ~/.appname config | XDG Base Directory spec | ~2010 | Follows Linux conventions, cleaner home directory |
| Interactive-only uninstall | Interactive with --force flag | Modern CLI standards | Enables scripting while protecting users |

**Deprecated/outdated:**
- Synchronous config writes: Can corrupt config on crash
- Flat key-value configs: Don't scale well
- ~/.appname directories directly in home: Clutters home directory

## Open Questions

1. **Config Location on macOS**
   - What we know: XDG spec says ~/.config, but macOS prefers ~/Library/Application Support
   - What's unclear: Should we follow XDG (cross-platform consistency) or macOS conventions?
   - Recommendation: Follow XDG for simplicity (~/.config/gsd-opencode/settings.json), document the location clearly

2. **Config Value Types**
   - What we know: Need to support strings, booleans, numbers
   - What's unclear: Should we support arrays and nested objects from CLI?
   - Recommendation: Support basic types via automatic parsing (true/false/numbers), support JSON for complex values via `config set key '{"nested": "value"}'`

3. **Scope Ambiguity in Uninstall**
   - What we know: Both global and local can exist simultaneously
   - What's unclear: When user runs `uninstall` without flags, which should we remove?
   - Recommendation: If both exist, error and require --global or --local. If only one exists, remove that one. This is safe and explicit.

4. **Config and Installation Relationship**
   - What we know: Config is global (in ~/.config), installation can be global or local
   - What's unclear: Should `config` command work if no installation exists?
   - Recommendation: Yes, config is independent of installation. Settings like `install.defaultScope` are meaningful even before first install.

## Sources

### Primary (HIGH confidence)
- **clig.dev** - Command Line Interface Guidelines (clig.dev/#subcommands, clig.dev/#configuration)
  - Destructive operations must confirm by default, support --force
  - Subcommand patterns for complex operations
  - Exit codes and error handling guidelines
  - Configuration via files and environment variables

- **sindresorhus/conf** - GitHub README (github.com/sindresorhus/conf)
  - Atomic write patterns for config files
  - XDG Base Directory specification
  - Dot-notation key access patterns
  - Default values and schema validation patterns

- **GitHub CLI (gh)** - Manual (cli.github.com/manual/gh_config)
  - `gh config get/set` subcommand pattern
  - Config file location and format

### Secondary (MEDIUM confidence)
- **npm uninstall documentation** (docs.npmjs.com/cli/v10/commands/npm-uninstall)
  - --force flag patterns
  - Scope-based uninstall (global vs local)
  
- **fnm (Fast Node Manager)** - GitHub README (github.com/Schniz/fnm)
  - Simple uninstall instructions (delete directory)
  - Configuration patterns

### Tertiary (LOW confidence)
- **yarn unlink** - Documentation patterns
  - Link/unlink symmetry for install/uninstall

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already established in Phase 1
- Architecture patterns: HIGH - Based on clig.dev guidelines and mature CLI tools (gh, npm)
- Pitfalls: HIGH - Well-documented in CLI best practices and Node.js community
- Code examples: HIGH - Based on existing Phase 1 patterns extended with established practices

**Research date:** 2026-02-09
**Valid until:** 2026-06-09 (4 months - stable patterns, unlikely to change)

**Integration notes:**
- All patterns designed to integrate with existing Phase 1 architecture
- Uses existing service layer pattern (ScopeManager, ConfigManager)
- Uses existing utilities (logger, interactive prompts)
- Follows existing error handling and exit code conventions
- Maintains backward compatibility with Phase 1 commands
