# Phase 05: Lifecycle Management - Research

**Researched:** 2026-02-10
**Domain:** CLI Update Mechanism, NPM Registry Integration, Version Management
**Confidence:** HIGH

## Summary

This research covers the implementation of the `gsd-opencode update` command for Phase 05: Lifecycle Management. The update command must enable users to update their GSD-OpenCode installation to newer versions from npm registry, with support for beta releases and specific version targeting.

**Key findings:**
1. NPM registry provides comprehensive version querying via `npm view` command
2. Both public (`gsd-opencode`) and scoped (`@rokicool/gsd-opencode`) packages are available
3. Current latest: `gsd-opencode@1.9.2`, Beta: `@rokicool/gsd-opencode@1.9.2-dev-8a05`
4. Existing infrastructure (ScopeManager, FileOperations, HealthChecker, BackupManager) can be leveraged for update workflow
5. Update workflow should follow pattern: detect scope → check version → confirm → backup → install → verify

**Primary recommendation:** Implement an `UpdateService` class that orchestrates the update workflow, reusing existing FileOperations for atomic installation, HealthChecker for pre/post validation, and BackupManager for safety. Use `npm view` programmatically via child_process to query registry versions.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| npm CLI | built-in | Registry queries, version checking | Native, no dependencies |
| child_process | built-in | Execute npm commands | Node.js standard |
| fs/promises | built-in | File operations | Already used in codebase |
| semver | optional | Version comparison | Industry standard (not required for MVP) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @inquirer/prompts | ^8.2.0 | User confirmation | Already in project |
| ora | ^9.3.0 | Progress indicators | Already in project |

**No additional dependencies required** - update functionality can be built using existing stack plus Node.js built-ins.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── commands/
│   └── update.js          # Update command handler
├── services/
│   └── update-service.js  # Core update orchestration
├── utils/
│   └── npm-registry.js    # NPM registry query utilities
```

### Pattern 1: UpdateService Orchestration

**What:** Central service class that coordinates the entire update workflow, delegating to existing services for specific operations.

**When to use:** This is the primary pattern for the update command - encapsulates complexity while reusing proven components.

**Example:**
```javascript
// src/services/update-service.js
export class UpdateService {
  constructor(scopeManager, logger, options = {}) {
    this.scopeManager = scopeManager;
    this.logger = logger;
    this.options = options;
    this.fileOps = new FileOperations(scopeManager, logger);
    this.healthChecker = new HealthChecker(scopeManager);
    this.backupManager = new BackupManager(scopeManager, logger);
  }

  async update(targetVersion = null) {
    // 1. Get current version
    const currentVersion = this.scopeManager.getInstalledVersion();
    
    // 2. Determine target version (latest, beta, or specific)
    const resolvedVersion = targetVersion || await this._fetchLatestVersion();
    
    // 3. Check if update needed
    if (currentVersion === resolvedVersion) {
      return { updated: false, reason: 'already-up-to-date' };
    }
    
    // 4. Pre-update health check
    const health = await this.healthChecker.checkAll({ expectedVersion: currentVersion });
    if (!health.passed) {
      throw new Error('Pre-update health check failed. Run repair first.');
    }
    
    // 5. User confirmation
    if (!await this._confirmUpdate(currentVersion, resolvedVersion)) {
      return { updated: false, reason: 'user-cancelled' };
    }
    
    // 6. Backup current installation
    await this._backupInstallation();
    
    // 7. Download and install new version
    const tempDir = await this._downloadPackage(resolvedVersion);
    
    // 8. Atomic replacement using FileOperations
    await this.fileOps.install(tempDir, this.scopeManager.getTargetDir());
    
    // 9. Post-update verification
    const verify = await this.healthChecker.checkAll({ expectedVersion: resolvedVersion });
    
    return { updated: true, from: currentVersion, to: resolvedVersion };
  }
}
```

### Pattern 2: NPM Registry Query Utility

**What:** Utility module for querying npm registry using the `npm view` command.

**When to use:** Isolate npm registry interactions for testability and error handling.

**Example:**
```javascript
// src/utils/npm-registry.js
import { execSync } from 'child_process';

export class NpmRegistry {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Get latest version from npm registry
   * @param {string} packageName - Package name (e.g., 'gsd-opencode' or '@rokicool/gsd-opencode')
   * @returns {Promise<string>} Latest version
   */
  async getLatestVersion(packageName = 'gsd-opencode') {
    try {
      const result = execSync(`npm view ${packageName}@latest version`, {
        encoding: 'utf-8',
        timeout: 10000
      });
      return result.trim();
    } catch (error) {
      throw new Error(`Failed to query npm registry: ${error.message}`);
    }
  }

  /**
   * Get all available versions
   * @param {string} packageName - Package name
   * @returns {Promise<string[]>} Array of versions
   */
  async getVersions(packageName = 'gsd-opencode') {
    try {
      const result = execSync(`npm view ${packageName} versions --json`, {
        encoding: 'utf-8',
        timeout: 10000
      });
      return JSON.parse(result);
    } catch (error) {
      throw new Error(`Failed to fetch versions: ${error.message}`);
    }
  }

  /**
   * Get dist-tags for a package
   * @param {string} packageName - Package name
   * @returns {Promise<Object>} Dist-tags object
   */
  async getDistTags(packageName = 'gsd-opencode') {
    try {
      const result = execSync(`npm view ${packageName} dist-tags --json`, {
        encoding: 'utf-8',
        timeout: 10000
      });
      return JSON.parse(result);
    } catch (error) {
      throw new Error(`Failed to fetch dist-tags: ${error.message}`);
    }
  }

  /**
   * Verify if a version exists
   * @param {string} version - Version to check
   * @param {string} packageName - Package name
   * @returns {Promise<boolean>} True if version exists
   */
  async versionExists(version, packageName = 'gsd-opencode') {
    try {
      execSync(`npm view ${packageName}@${version} version`, {
        encoding: 'utf-8',
        timeout: 10000
      });
      return true;
    } catch {
      return false;
    }
  }
}
```

### Pattern 3: Update Command Integration

**What:** Command handler that integrates with Commander.js CLI framework.

**When to use:** Standard CLI command implementation following existing patterns.

**Example:**
```javascript
// src/commands/update.js
export async function updateCommand(options = {}) {
  const verbose = options.verbose || false;
  setVerbose(verbose);

  try {
    // Detect scope if not explicitly provided
    let scope = options.global ? 'global' : options.local ? 'local' : null;
    
    if (!scope) {
      // Auto-detect from existing installation
      const globalScope = new ScopeManager({ scope: 'global' });
      const localScope = new ScopeManager({ scope: 'local' });
      
      if (globalScope.isInstalled() && !localScope.isInstalled()) {
        scope = 'global';
      } else if (localScope.isInstalled() && !globalScope.isInstalled()) {
        scope = 'local';
      } else if (globalScope.isInstalled() && localScope.isInstalled()) {
        // Both installed - prompt user or use explicit flag
        scope = await promptUpdateScope();
      } else {
        logger.error('No existing installation found. Use "gsd-opencode install" instead.');
        return ERROR_CODES.GENERAL_ERROR;
      }
    }

    // Determine package name based on --beta flag
    const packageName = options.beta ? '@rokicool/gsd-opencode' : 'gsd-opencode';
    
    // Create update service
    const scopeManager = new ScopeManager({ scope });
    const updateService = new UpdateService(scopeManager, logger, {
      packageName,
      beta: options.beta || false
    });

    // Execute update
    const result = await updateCommand.update(options.version);
    
    // Handle result
    if (result.updated) {
      logger.success(`Updated from ${result.from} to ${result.to}`);
      return ERROR_CODES.SUCCESS;
    } else if (result.reason === 'already-up-to-date') {
      logger.info('Already up to date');
      return ERROR_CODES.SUCCESS;
    } else {
      logger.info('Update cancelled');
      return ERROR_CODES.INTERRUPTED;
    }
  } catch (error) {
    return handleError(error, verbose);
  }
}
```

### Anti-Patterns to Avoid

- **Don't use npm programmatic API** (`npm.install()`): It requires loading the entire npm module, which is heavy and has complex state management
- **Don't modify files in-place**: Always use atomic replacement (temp-then-move) via FileOperations
- **Don't skip health checks**: Pre-update verification is critical for detecting issues before changes
- **Don't hardcode registry URLs**: Use npm's configured registry (respects .npmrc, private registries)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Version comparison logic | Custom parsing | Simple string compare or semver | npm already validates versions, string equality works for exact matches |
| HTTP requests to registry | fetch/axios | `npm view` command | npm handles auth, proxies, registries, caching |
| Package download/extraction | Manual tarball handling | `npm pack` + extraction | npm handles auth, checksums, extraction |
| Atomic file operations | Custom temp-move logic | Existing `FileOperations` class | Already proven, handles edge cases |
| Health verification | Custom checks | Existing `HealthChecker` class | Already implements file/version/integrity checks |
| Backup creation | Manual file copying | Existing `BackupManager` class | Already implements retention and cleanup |

**Key insight:** The existing infrastructure from Phases 1-4 covers 80% of update functionality. Focus on orchestration, not reimplementation.

## Common Pitfalls

### Pitfall 1: NPM Registry Unavailability
**What goes wrong:** Network issues, npm registry down, proxy misconfiguration causes update to fail
**Why it happens:** External dependency outside our control
**How to avoid:** 
- Add timeout to npm commands (10s default)
- Provide clear error messages about network issues
- Allow `--offline` mode to skip version check (use local package)
- Cache latest version info locally with timestamp

**Warning signs:** Timeout errors, ENOTFOUND, ECONNREFUSED

### Pitfall 2: Permission Errors During Update
**What goes wrong:** User runs update without sufficient permissions for the installation directory
**Why it happens:** Global installs often require elevated permissions that the user forgets
**How to avoid:**
- Check permissions before starting update (reuse preflight checks)
- Show clear message about required permissions
- Suggest `--local` migration if global fails
- Never suggest sudo blindly (security risk)

### Pitfall 3: Partial Update Corruption
**What goes wrong:** Process interrupted mid-update leaves installation in broken state
**Why it happens:** SIGINT, power loss, or error during file operations
**How to avoid:**
- Atomic operations via FileOperations (temp-then-move)
- Signal handlers for cleanup
- Backup before update for rollback capability
- Health check after update to verify success

### Pitfall 4: Version Mismatch Confusion
**What goes wrong:** User sees "already up to date" but expected a newer version
**Why it happens:** Dist-tags confusion (latest vs beta), caching issues, or registry sync delays
**How to avoid:**
- Always show both current and target versions in confirmation
- Clarify which dist-tag is being checked (latest vs beta)
- Show timestamp of when version info was fetched
- Support `--force` to reinstall same version

### Pitfall 5: Scope Detection Errors
**What goes wrong:** Update affects wrong scope (global instead of local or vice versa)
**Why it happens:** Multiple installations exist, or user forgets which they used
**How to avoid:**
- Always show detected scope before proceeding
- Require explicit confirmation when multiple installations exist
- Support explicit `--global` or `--local` flags to override
- Show paths in confirmation prompt

## Code Examples

### NPM Registry Query

```javascript
// Source: Verified with npm CLI documentation
import { execSync } from 'child_process';

/**
 * Query npm registry for package information
 * Uses npm view which respects .npmrc, auth, and registry configuration
 */
function queryNpm(packageName, field, options = {}) {
  const { json = false, timeout = 10000 } = options;
  const jsonFlag = json ? ' --json' : '';
  
  const result = execSync(
    `npm view ${packageName} ${field}${jsonFlag}`,
    { 
      encoding: 'utf-8',
      timeout,
      stdio: ['pipe', 'pipe', 'pipe']
    }
  );
  
  return json ? JSON.parse(result) : result.trim();
}

// Get latest version
const latest = queryNpm('gsd-opencode', 'version');
// Output: "1.9.2"

// Get all versions
const versions = queryNpm('gsd-opencode', 'versions', { json: true });
// Output: ["1.3.31", "1.3.32", ..., "1.9.2"]

// Get dist-tags
const tags = queryNpm('gsd-opencode', 'dist-tags', { json: true });
// Output: { latest: "1.9.2" }

// Get beta version
const beta = queryNpm('@rokicool/gsd-opencode', 'version');
// Output: "1.9.2-dev-8a05"
```

### Package Download via NPM

```javascript
// Source: Verified with npm CLI documentation
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * Download package tarball using npm pack
 * Returns path to downloaded tarball
 */
async function downloadPackage(packageName, version, targetDir) {
  const fullName = `${packageName}@${version}`;
  
  // npm pack downloads to current directory
  const originalCwd = process.cwd();
  process.chdir(targetDir);
  
  try {
    const result = execSync(`npm pack ${fullName}`, {
      encoding: 'utf-8',
      timeout: 60000
    });
    
    // Result contains tarball filename
    const tarballName = result.trim();
    return path.join(targetDir, tarballName);
  } finally {
    process.chdir(originalCwd);
  }
}

// Download to temp directory
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gsd-update-'));
const tarball = await downloadPackage('gsd-opencode', '1.9.2', tempDir);
```

### Version Comparison

```javascript
/**
 * Compare two version strings
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 * 
 * Note: Simple implementation for exact matching.
 * For complex semver comparison, use semver package.
 */
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const a = parts1[i] || 0;
    const b = parts2[i] || 0;
    
    if (a < b) return -1;
    if (a > b) return 1;
  }
  
  return 0;
}

// Usage
if (compareVersions(current, latest) < 0) {
  console.log('Update available');
}
```

### Update Confirmation Prompt

```javascript
// Source: Pattern from existing interactive.js
import { confirm } from '@inquirer/prompts';

async function promptUpdateConfirmation(currentVersion, targetVersion, scope) {
  const scopeLabel = scope === 'global' ? 'Global' : 'Local';
  
  try {
    const answer = await confirm({
      message: `${scopeLabel} update: ${currentVersion} → ${targetVersion}. Proceed?`,
      default: false  // Destructive operation - default to false
    });
    
    return answer;
  } catch (error) {
    if (error.name === 'AbortPromptError') {
      return null;  // User cancelled
    }
    throw error;
  }
}
```

## State of the Art

### NPM Registry Capabilities

| Feature | NPM CLI Command | Purpose |
|---------|----------------|---------|
| Latest version | `npm view pkg@latest version` | Get latest stable |
| Dist-tags | `npm view pkg dist-tags --json` | Get all tagged versions |
| Version list | `npm view pkg versions --json` | Get all published versions |
| Specific version | `npm view pkg@version` | Verify version exists |
| Download | `npm pack pkg@version` | Download tarball |

### Existing Code Reuse Opportunities

| Component | Location | Reuse in Update |
|-----------|----------|-----------------|
| ScopeManager | `src/services/scope-manager.js` | Detect installation scope |
| FileOperations | `src/services/file-ops.js` | Atomic installation |
| HealthChecker | `src/services/health-checker.js` | Pre/post verification |
| BackupManager | `src/services/backup-manager.js` | Backup before update |
| interactive.js | `src/utils/interactive.js` | Confirmation prompts |
| logger.js | `src/utils/logger.js` | Consistent output |
| ERROR_CODES | `lib/constants.js` | Exit codes |

### Package Registry Details

**Public Package:** `gsd-opencode`
- Latest: `1.9.2`
- Dist-tags: `{ latest: "1.9.2" }`
- Registry: https://registry.npmjs.org/gsd-opencode

**Scoped Package:** `@rokicool/gsd-opencode`
- Latest: `1.9.2-dev-8a05`
- Dist-tags: `{ latest: "1.9.2-dev-8a05" }`
- Registry: https://registry.npmjs.org/@rokicool/gsd-opencode

## Open Questions

### 1. Beta Version Handling
**What we know:** Beta versions are published to `@rokicool/gsd-opencode`
**What's unclear:** Should we support switching from public to scoped package (and vice versa)?
**Recommendation:** Yes - allow `--beta` flag to switch registries. Store which registry was used in VERSION file or separate metadata file.

### 2. Rollback Strategy
**What we know:** BackupManager creates backups before changes
**What's unclear:** Should we support automatic rollback on failed update?
**Recommendation:** Implement rollback capability in UpdateService - if post-update health check fails, automatically restore from backup.

### 3. Version Pinning
**What we know:** Users can specify exact version: `gsd-opencode update 2.0.0`
**What's unclear:** How to handle downgrade scenarios (2.0.0 → 1.9.2)?
**Recommendation:** Allow downgrades with explicit confirmation. Show warning that downgrades may cause compatibility issues.

### 4. Offline Mode
**What we know:** Network operations may fail
**What's unclear:** Should we cache version info or support offline updates?
**Recommendation:** Not for MVP. Document that network is required for update. Future enhancement could cache last-known version.

## Sources

### Primary (HIGH confidence)
- NPM CLI Documentation (https://docs.npmjs.com/cli/v10/commands/npm-view) - Official npm view command reference
- Local npm queries verified:
  - `npm view gsd-opencode version` → "1.9.2"
  - `npm view @rokicool/gsd-opencode version` → "1.9.2-dev-8a05"
  - `npm dist-tag ls gsd-opencode` → "latest: 1.9.2"
  - `npm dist-tag ls @rokicool/gsd-opencode` → "latest: 1.9.2-dev-8a05"

### Secondary (MEDIUM confidence)
- Existing codebase patterns from Phases 1-4:
  - Service layer architecture (ScopeManager, FileOperations, etc.)
  - Error handling patterns in install.js
  - Interactive prompt patterns in interactive.js
  - Commander.js integration in gsd.js

### Tertiary (LOW confidence)
- General CLI update best practices from similar tools (npm, yarn, pnpm)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified npm CLI commands and existing codebase
- Architecture: HIGH - Established patterns from Phases 1-4
- Pitfalls: MEDIUM - Based on common CLI patterns, limited real-world validation

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (npm registry APIs are stable, but package versions will change)

**Dependencies verified:**
- Node.js child_process: built-in
- NPM CLI: bundled with Node.js
- All other dependencies already in package.json
