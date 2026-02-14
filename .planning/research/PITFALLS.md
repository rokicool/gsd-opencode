# Pitfalls Research: CLI Package Management Tools

**Domain:** CLI tool for file installation with path replacement (GSD-OpenCode distribution manager)
**Researched:** February 9, 2026
**Confidence:** HIGH

---

## Critical Pitfalls

### Pitfall 1: Untrusted Path Traversal in File Installation

**What goes wrong:**
A malicious or malformed package could contain file paths that escape the installation directory (e.g., `../../sensitive/file`). When the CLI extracts and writes files without path validation, it can overwrite arbitrary files on the user's system, potentially causing system damage, data loss, or code execution.

**Why it happens:**
Developers often assume package contents are benign or fail to properly normalize and validate paths before file operations. The `@gsd-opencode/` path replacement logic can inadvertently create paths that traverse directories if the replacement value isn't properly sanitized.

**How to avoid:**
1. **Always validate target paths** - Resolve all paths using `path.resolve()` and verify they remain within the intended installation directory
2. **Use path normalization** - Call `path.normalize()` on all input paths and check for `..` segments after normalization
3. **Implement a whitelist approach** - Only allow files to be written to explicitly approved directories
4. **Test with malicious inputs** - Create test cases with paths like `../../../etc/passwd`, `..\..\windows\system32`, and encoded variants (`%2e%2e/`, `....//`)

```javascript
// Safe path validation pattern
const path = require('path');

function validateInstallPath(targetPath, baseDir) {
  const resolvedTarget = path.resolve(baseDir, targetPath);
  const resolvedBase = path.resolve(baseDir);
  
  // Ensure target is within base directory
  if (!resolvedTarget.startsWith(resolvedBase + path.sep) && 
      resolvedTarget !== resolvedBase) {
    throw new Error(`Path traversal detected: ${targetPath}`);
  }
  
  return resolvedTarget;
}
```

**Warning signs:**
- Files appearing outside the installation directory after package extraction
- Permission errors when installing to directories that should be writable
- Error reports mentioning "permission denied" for system directories
- Test failures on paths containing `..` segments

**Phase to address:** Phase 1 - Core Installation Logic

---

### Pitfall 2: Corrupted or Partial Installation Cleanup Failures

**What goes wrong:**
When an installation fails partway through (network error, disk full, permission denied), the CLI may leave behind partially written files. Subsequent installation attempts may fail due to corrupted state, or worse, may appear to succeed while silently using corrupted files. This is especially dangerous when path replacement leaves files in an inconsistent state.

**Why it happens:**
Most CLI tools don't implement proper atomic installation. They write files directly to the target location without staging, making rollback impossible. The path replacement operation may succeed on some files but fail on others, leaving a mix of processed and unprocessed references.

**How to avoid:**
1. **Implement atomic installation** - Write to a temporary directory first, then move/rename to final location only after all operations succeed
2. **Use transactional semantics** - Maintain a manifest of installed files; on failure, remove all files in the manifest
3. **Validate integrity before activation** - Check file hashes or checksums before finalizing installation
4. **Implement cleanup on interrupt** - Handle SIGINT/SIGTERM to clean up partial installations

```javascript
// Atomic installation pattern
async function atomicInstall(sourceFiles, targetDir) {
  const tempDir = path.join(os.tmpdir(), `gsd-install-${Date.now()}`);
  const manifest = [];
  
  try {
    // Stage files in temp directory
    for (const file of sourceFiles) {
      const tempPath = path.join(tempDir, file.name);
      await fs.ensureDir(path.dirname(tempPath));
      await fs.writeFile(tempPath, await processFile(file));
      manifest.push({ temp: tempPath, final: path.join(targetDir, file.name) });
    }
    
    // Atomic move to final location
    for (const entry of manifest) {
      await fs.move(entry.temp, entry.final, { overwrite: true });
    }
  } catch (error) {
    // Cleanup on failure
    await fs.remove(tempDir);
    throw error;
  }
}
```

**Warning signs:**
- Installation succeeds but files are incomplete or corrupted
- Repeated installations fail with "file already exists" errors
- Files contain a mix of processed and unprocessed `@gsd-opencode/` references
- File size mismatches between source and installed files

**Phase to address:** Phase 1 - Core Installation Logic

---

### Pitfall 3: Cross-Platform Path Separator Inconsistencies

**What goes wrong:**
The CLI handles paths differently on macOS/Linux (`/`) vs Windows (`\`). Path replacement logic that works on one platform may fail on another, especially when:
- Hardcoding forward slashes in regex patterns
- Using platform-specific path operations without normalization
- Assuming case-sensitivity (Windows is case-insensitive, macOS can be either)
- Handling absolute paths that use different drive letter conventions

**Why it happens:**
Node.js provides `path.sep` and `path.posix`/`path.win32`, but developers often hardcode `/` or use string manipulation instead of proper path utilities. The `@gsd-opencode/` replacement logic must handle both `import @gsd-opencode/pkg` (forward slash) and Windows path resolution correctly.

**How to avoid:**
1. **Always use path module** - Never concatenate paths with `+ '/' +`; use `path.join()`, `path.resolve()`, `path.normalize()`
2. **Normalize before regex** - Convert paths to consistent format before pattern matching
3. **Test on all target platforms** - Use CI/CD with Windows, macOS, and Linux runners
4. **Handle drive letters** - On Windows, account for paths like `C:\Users\...` vs `\\server\share`

```javascript
// Cross-platform path replacement
const path = require('path');

function replaceGsdReferences(content, packagePath, targetPath) {
  // Normalize paths for consistent matching
  const normalizedPackage = path.normalize(packagePath);
  const normalizedTarget = path.normalize(targetPath);
  
  // Handle both forward and backward slashes in regex
  const pattern = /@gsd-opencode\/([^"'\s]+)/g;
  
  return content.replace(pattern, (match, pkgName) => {
    // Resolve relative to installation location
    const resolved = path.resolve(normalizedTarget, 'node_modules', pkgName);
    // Convert to forward slashes for JS imports
    return resolved.replace(/\\/g, '/');
  });
}
```

**Warning signs:**
- Tests pass on macOS/Linux but fail on Windows
- Path replacement leaves backslashes in JS imports (which should use forward slashes)
- `ENOENT` errors for files that exist but with different casing
- Installation fails with "path not found" errors on Windows only

**Phase to address:** Phase 1 - Core Installation Logic (with CI testing)

---

### Pitfall 4: Permission Errors with System Directories and Protected Files

**What goes wrong:**
The CLI fails with `EACCES` or `EPERM` errors when:
- Installing to system directories (e.g., `/usr/local`, `C:\Program Files`)
- Overwriting files that are read-only or locked by another process
- Attempting to modify files without proper ownership
- Running in CI/CD environments with restricted permissions

**Why it happens:**
Package managers often need elevated permissions for global installations. Developers may not account for:
- Files marked as read-only (common in Windows Program Files)
- Antivirus software locking files during scanning
- Running as non-root user on Linux/macOS
- GitHub Actions runners with restricted file system access

**How to avoid:**
1. **Check permissions before writing** - Use `fs.access()` to verify write permissions
2. **Request elevation only when needed** - Try operation first, then prompt for elevation if `EACCES`
3. **Handle locked files gracefully** - Implement retry logic with exponential backoff
4. **Support user-local installation** - Allow installation to user directories without elevation
5. **Clear read-only flags on Windows** - Use `fs.chmod()` to make files writable before modification

```javascript
// Permission-aware file writing
const fs = require('fs-extra');

async function writeWithRetry(filePath, content, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await fs.writeFile(filePath, content);
      return;
    } catch (error) {
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        // Try to fix permissions
        try {
          await fs.chmod(filePath, 0o644);
          continue; // Retry
        } catch {
          // Permission change failed, will throw below
        }
      }
      
      if (attempt === maxRetries - 1) {
        throw new Error(`Cannot write to ${filePath}: ${error.message}. ` +
          `Try running with elevated permissions or installing to a user directory.`);
      }
      
      // Wait before retry
      await new Promise(r => setTimeout(r, 100 * Math.pow(2, attempt)));
    }
  }
}
```

**Warning signs:**
- Installation fails with `EACCES: permission denied`
- Installation works locally but fails in CI/CD
- Users report needing `sudo` or Administrator privileges
- Error messages about files being locked by another process

**Phase to address:** Phase 2 - Error Handling & Edge Cases

---

### Pitfall 5: Silent Version Conflicts and Dependency Hell

**What goes wrong:**
When installing packages that have conflicting version requirements, the CLI may:
- Silently overwrite newer versions with older ones
- Fail to detect incompatible peer dependencies
- Leave orphaned files from previous versions
- Install multiple versions without proper isolation

**Why it happens:**
Path replacement logic assumes a flat structure, but npm/yarn may create nested `node_modules` to resolve conflicts. The CLI may overwrite files without checking if the existing version is compatible or if other packages depend on it.

**How to avoid:**
1. **Implement version checking** - Read existing `package.json` and compare versions before overwriting
2. **Support semantic versioning** - Respect semver ranges (`^`, `~`, `>=`)
3. **Warn about conflicts** - Alert users when installing would downgrade a package
4. **Track installed versions** - Maintain a lockfile or manifest of installed versions
5. **Isolate by version** - Consider installing to versioned directories (`pkg@1.2.3`)

```javascript
// Version conflict detection
const semver = require('semver');

async function checkVersionConflict(targetPath, newVersion) {
  const pkgJsonPath = path.join(targetPath, 'package.json');
  
  if (await fs.pathExists(pkgJsonPath)) {
    const existing = await fs.readJson(pkgJsonPath);
    const comparison = semver.compare(newVersion, existing.version);
    
    if (comparison < 0) {
      throw new Error(
        `Version conflict: Trying to install ${newVersion} but ` +
        `${existing.version} is already installed. Use --force to downgrade.`
      );
    } else if (comparison === 0) {
      console.log(`Package already at version ${newVersion}, skipping`);
      return false; // Skip installation
    }
  }
  
  return true; // Proceed with installation
}
```

**Warning signs:**
- Runtime errors after installation mentioning missing methods
- `package.json` version doesn't match installed files
- Multiple versions of the same package causing runtime conflicts
- Tests pass locally but fail in CI due to different dependency resolution

**Phase to address:** Phase 3 - Version Management

---

### Pitfall 6: Poor Signal Handling and Interrupt Safety

**What goes wrong:**
When users press Ctrl+C during installation, the CLI may:
- Leave partial files in an inconsistent state
- Not clean up temporary directories
- Leave the installation directory in a corrupted state
- Not properly close file handles, causing resource leaks

**Why it happens:**
Node.js processes don't automatically clean up on SIGINT. Async file operations may complete after the process has "exited", leaving partial state. Path replacement operations interrupted mid-stream leave files with mixed content.

**How to avoid:**
1. **Install signal handlers** - Catch SIGINT, SIGTERM, and SIGHUP for cleanup
2. **Use atomic operations** - Write to temp files and rename (atomic on POSIX)
3. **Implement cleanup registry** - Track temp files and remove on interrupt
4. **Add installation locks** - Prevent concurrent installations that could corrupt state

```javascript
// Signal-safe installation
const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];
let cleanupScheduled = false;
const tempFiles = new Set();

function setupCleanup() {
  signals.forEach(signal => {
    process.on(signal, async () => {
      if (cleanupScheduled) return;
      cleanupScheduled = true;
      
      console.error('\n\nInstallation interrupted. Cleaning up...');
      
      // Clean up temp files
      for (const tempFile of tempFiles) {
        try {
          await fs.remove(tempFile);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      
      process.exit(1);
    });
  });
}

// Usage in installation
async function installPackage(source, target) {
  setupCleanup();
  const tempDir = path.join(os.tmpdir(), `gsd-${Date.now()}`);
  tempFiles.add(tempDir);
  
  try {
    // Perform installation...
    await extractToTemp(source, tempDir);
    await processFiles(tempDir);
    await fs.move(tempDir, target, { overwrite: true });
  } finally {
    tempFiles.delete(tempDir);
    await fs.remove(tempDir).catch(() => {});
  }
}
```

**Warning signs:**
- Temp directories accumulating in `/tmp` or `%TEMP%`
- Partial installations after interrupted runs
- "Resource busy" or "file in use" errors on subsequent runs
- Users reporting they "had to manually clean up" after failed installs

**Phase to address:** Phase 2 - Error Handling & Edge Cases

---

### Pitfall 7: Inadequate Error Messages and Debugging Information

**What goes wrong:**
When installation fails, the CLI provides unhelpful error messages like:
- `Error: ENOENT` without context about which file or why
- Stack traces showing internal implementation details
- Generic "Installation failed" without actionable next steps
- No indication of whether the failure was network, permission, or disk space related

**Why it happens:**
Developers often let errors bubble up without context, or catch and re-throw without preserving the original error details. CLI tools are used by humans who need actionable guidance, not raw error codes.

**How to avoid:**
1. **Wrap errors with context** - Add file paths, operation names, and suggestions
2. **Categorize errors** - Distinguish between user errors, system errors, and network errors
3. **Suggest fixes** - Include "Try running with sudo" or "Check your internet connection"
4. **Provide verbose mode** - Add `--verbose` flag for detailed debugging output
5. **Log to file** - Write detailed logs to `~/.gsd/logs/install.log` for troubleshooting

```javascript
// Contextual error handling
class InstallationError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
  
  toString() {
    let msg = `Installation Error [${this.code}]: ${this.message}\n`;
    msg += `  File: ${this.details.file || 'N/A'}\n`;
    msg += `  Operation: ${this.details.operation || 'N/A'}\n`;
    if (this.details.suggestion) {
      msg += `\n  Suggestion: ${this.details.suggestion}\n`;
    }
    return msg;
  }
}

// Usage
async function installFile(source, target) {
  try {
    await fs.copy(source, target);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new InstallationError(
        `Source file not found: ${source}`,
        'SOURCE_NOT_FOUND',
        {
          file: source,
          operation: 'copy',
          suggestion: 'The package may be corrupted. Try reinstalling.'
        }
      );
    }
    throw error;
  }
}
```

**Warning signs:**
- Users file issues saying "it doesn't work" without helpful error context
- Error messages mention internal module names (e.g., `at Object.<anonymous> (/src/utils/fs.js:42)`)
- Users can't tell if errors are their fault or a bug
- Support requests require extensive back-and-forth to get basic error details

**Phase to address:** Phase 2 - Error Handling & Edge Cases

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip atomic installation | Simpler code, faster implementation | Partial installations, corruption on interrupt, support burden | Never - atomic operations are fundamental |
| Hardcode path separators | Less code to write | Platform-specific bugs, CI failures | Never - always use path module |
| Ignore version conflicts | Simpler logic, faster install | Silent overwrites, runtime errors, debugging nightmares | Never - version safety is critical |
| No cleanup on error | Less code | Orphaned temp files, disk space leaks | Only in MVP with documented cleanup command |
| Skip permission checks | Fewer lines of code | Cryptic errors, user frustration | Never - check and provide helpful messages |
| Use sync file operations | Simpler async handling | Blocks event loop, poor UX on large installs | Only for small config files, not bulk operations |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| **GitHub Actions** | Not using `::add-mask::` for tokens in output | Mask all sensitive data before any console output |
| **GitHub Releases** | Downloading assets without verifying checksums | Always verify SHA256 checksums of downloaded tarballs |
| **npm registry** | Trusting package metadata without verification | Verify package integrity with npm's integrity hashes |
| **GitHub Actions cache** | Caching partial installations | Only cache completed, validated installations |
| **Cross-platform CI** | Testing only on Ubuntu | Run CI on `ubuntu-latest`, `macos-latest`, and `windows-latest` |
| **GitHub token** | Using hardcoded token in code | Read from `GITHUB_TOKEN` env var, never commit tokens |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| **Sync file operations in loop** | UI freezing, high CPU usage, slow installs | Use async/await with Promise.all for concurrent operations | >50 files |
| **No download resume** | Full re-download on network hiccup | Implement HTTP Range requests for partial resume | >10MB packages, slow networks |
| **Memory exhaustion reading large files** | `JavaScript heap out of memory` crashes | Use streaming for files >10MB | >100MB packages |
| **Excessive stat calls** | Slow installation on network drives | Cache stat results, batch operations | Network filesystems, slow drives |
| **Inefficient path replacement** | Slow text processing on large files | Use streaming transforms, not string replace | >1MB files |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| **No path traversal validation** | Arbitrary file write, system compromise | Always validate paths are within target directory |
| **Executing install scripts without sandbox** | Arbitrary code execution during install | Use `--ignore-scripts` equivalent, validate scripts |
| **Downloading over HTTP** | MITM attacks, malicious package injection | Always use HTTPS, verify TLS certificates |
| **Not verifying package signatures** | Installing tampered packages | Verify GPG signatures or npm provenance attestations |
| **Logging sensitive paths** | Credential leakage in logs | Mask paths containing `.npmrc`, `.env`, tokens |
| **Storing credentials in world-readable files** | Credential theft | Use 0o600 permissions for credential files |
| **Not sanitizing error messages** | Information disclosure | Don't include full paths or internal details in user-facing errors |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| **No progress indication** | Users think tool is frozen, interrupt it | Show progress bar with file count and current operation |
| **Silent success** | Users unsure if anything happened | Confirm success: "Installed 15 files to /path" |
| **Wall of text errors** | Users can't find the actual problem | Highlight error in red, show summary, log details to file |
| **No dry-run option** | Users afraid to run destructive commands | Implement `--dry-run` to show what would happen |
| **Inconsistent exit codes** | Scripts can't detect failures | Exit 0 on success, non-zero on any failure, document codes |
| **No update notification** | Users run old versions with known bugs | Check for updates weekly, show banner if outdated |
| **Assuming TTY** | Piped output contains colors/progress | Check `process.stdout.isTTY`, use `--no-color` |
| **Poor Windows support** | Windows users abandon tool | Test on Windows, handle paths correctly, use `.cmd` wrapper |

---

## "Looks Done But Isn't" Checklist

- [ ] **Path validation:** Often missing traversal checks — verify `../` paths are rejected
- [ ] **Cleanup on interrupt:** Often missing signal handlers — test with Ctrl+C mid-install
- [ ] **Windows paths:** Often missing backslash handling — test on Windows CI
- [ ] **Large file handling:** Often loads entire files into memory — test with >100MB files
- [ ] **Permission errors:** Often shows raw `EACCES` — verify helpful error messages
- [ ] **Partial install detection:** Often doesn't check integrity — verify checksum validation
- [ ] **Network failures:** Often doesn't retry — test with simulated network errors
- [ ] **Version conflicts:** Often silently overwrites — test installing older over newer
- [ ] **GitHub Actions:** Often doesn't mask secrets — verify `::add-mask::` usage
- [ ] **Atomic operations:** Often writes directly to target — verify temp-then-move pattern

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Path traversal exploited | HIGH | Audit all written files, reinstall from clean backup, revoke leaked credentials |
| Partial installation | LOW | Run cleanup command, delete target directory, reinstall |
| Version conflict | MEDIUM | Check `package.json`, uninstall conflicting version, reinstall with `--force` |
| Permission denied | LOW | Run with elevated permissions or install to user directory (`~/.local` or `%LOCALAPPDATA%`) |
| Corrupted download | LOW | Clear cache (`gsd cache clean`), retry installation |
| Lock file left behind | LOW | Delete stale lock files in temp directory |
| Orphaned temp files | LOW | Run cleanup command, delete `/tmp/gsd-*` manually |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Path traversal | Phase 1 - Core Installation | Test with `../../../etc/passwd` paths; verify all writes constrained |
| Partial installation cleanup | Phase 1 - Core Installation | Interrupt test runs, verify no partial state remains |
| Cross-platform paths | Phase 1 - Core Installation | CI passes on macOS, Linux, Windows |
| Permission errors | Phase 2 - Error Handling | Install to restricted directories, verify helpful messages |
| Version conflicts | Phase 3 - Version Management | Install conflicting versions, verify detection and warnings |
| Signal handling | Phase 2 - Error Handling | Send SIGINT during operations, verify cleanup |
| Error messages | Phase 2 - Error Handling | Trigger all error conditions, verify helpful output |
| GitHub Actions integration | Phase 4 - CI/CD Pipeline | Run in GitHub Actions, verify artifacts and security |

---

## Phase-Specific Warnings

### Phase 1: Core Installation Logic
- **Highest risk:** Path traversal, atomic installation, cross-platform compatibility
- **Must have:** Comprehensive test suite with malicious inputs
- **Red flag:** Direct file writes without staging, no path validation

### Phase 2: Error Handling & Edge Cases
- **Highest risk:** Poor UX, resource leaks, interrupt handling
- **Must have:** Signal handlers, cleanup logic, helpful error messages
- **Red flag:** Raw error codes shown to users, no cleanup on failure

### Phase 3: Version Management
- **Highest risk:** Silent conflicts, dependency hell
- **Must have:** Lockfile support, semver handling, conflict detection
- **Red flag:** No version checking, silent overwrites

### Phase 4: CI/CD Pipeline
- **Highest risk:** Security leaks in logs, Windows failures
- **Must have:** GitHub Actions workflow, secret masking, cross-platform testing
- **Red flag:** No CI testing, hardcoded credentials, no artifact verification

---

## Sources

- [Command Line Interface Guidelines](https://clig.dev/) - CLI design best practices
- [Snyk: 10 npm Security Best Practices](https://snyk.io/blog/ten-npm-security-best-practices/) - Security pitfalls
- [npm Documentation: Install](https://docs.npmjs.com/cli/v11/configuring-npm/install) - Official npm installation docs
- [rimraf](https://github.com/isaacs/rimraf) - Cross-platform file deletion edge cases
- [fs-extra](https://github.com/jprichardson/node-fs-extra) - File operation utilities and patterns
- [execa](https://github.com/sindresorhus/execa) - Process execution best practices
- [oclif](https://github.com/oclif/oclif) - CLI framework patterns
- [GitHub Actions: Workflow Commands](https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions) - CI integration

---

*Pitfalls research for: GSD-OpenCode CLI Package Manager*
*Researched: February 9, 2026*
