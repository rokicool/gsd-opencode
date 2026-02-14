# Phase 4: Self-Healing - Research

**Researched:** 2026-02-10
**Domain:** CLI Repair Commands, File Restoration, Backup Strategies
**Confidence:** HIGH

## Summary

The Self-Healing phase implements a `gsd-opencode repair` command that automatically detects and fixes broken installations. Research reveals established patterns from CLI tools like Homebrew (`brew doctor`), npm (`npm doctor`), and Git (`git restore`) for detecting issues, presenting summaries, and performing repairs safely.

Key findings:
1. **Detection-First Pattern**: Repair commands build on existing check infrastructure (Phase 3's HealthChecker)
2. **Summary-Then-Confirm**: Users must see what will be repaired before destructive actions
3. **Backup Before Overwrite**: Any file modification requires preserving originals
4. **Partial Success Handling**: Continue repairing other items even if one fails

**Primary recommendation:** Leverage existing HealthChecker service for detection, implement a `RepairService` that orchestrates the repair workflow with backup safety, and follow the established CLI patterns for confirmation and progress reporting.

## Standard Stack

### Core Infrastructure (Already Exists)
| Component | Purpose | How Repair Uses It |
|-----------|---------|-------------------|
| HealthChecker | Detect installation issues | Identify what needs repair (missing, corrupted, path issues) |
| FileOperations | Atomic file installation | Reinstall missing/corrupted files with path replacement |
| ScopeManager | Path resolution | Determine target directory for repairs |
| Logger | User feedback | Display summary and progress |
| Interactive | User confirmation | Confirm before destructive changes |

### Domain-Specific Patterns
| Pattern | Source | Application |
|---------|--------|-------------|
| Detect → Confirm → Repair → Report | Homebrew brew doctor, npm doctor | Core workflow for repair command |
| Backup-then-overwrite | Git, rsync | Safety strategy for file modifications |
| All-or-nothing confirmation | User decision in CONTEXT.md | Don't allow selective repairs |
| Progress aggregation | npm doctor, yarn doctor | Show progress during repairs, not per-file |

## Architecture Patterns

### Recommended Repair Service Structure
```
src/
├── services/
│   ├── repair-service.js      # Main orchestration
│   └── backup-manager.js      # Backup lifecycle
├── commands/
│   └── repair.js              # CLI command
└── utils/
    └── repair-helpers.js      # Shared repair logic
```

### Pattern 1: Issue Categorization
**What:** Group detected issues into categories for clear presentation
**When to use:** Always - users need to understand what types of problems exist
**Example:**
```javascript
// From HealthChecker.checkAll() results
categories: {
  missing: { files: [], count: 0 },    // Files that don't exist
  corrupted: { files: [], count: 0 },   // Files with integrity failures
  paths: { files: [], count: 0 }        // .md files with broken @gsd-opencode/ refs
}
```

### Pattern 2: RepairOrchestrator Pattern
**What:** Central service that coordinates detection, backup, repair, and reporting
**When to use:** Complex multi-step repair operations
**Example:**
```javascript
class RepairService {
  constructor(healthChecker, fileOps, backupManager, scopeManager) {
    this.healthChecker = healthChecker;
    this.fileOps = fileOps;
    this.backupManager = backupManager;
    this.scopeManager = scopeManager;
  }

  async repair(options = {}) {
    // 1. Detect issues
    const issues = await this.detectIssues();
    
    // 2. Build repair plan
    const plan = this.buildRepairPlan(issues);
    
    // 3. Get confirmation if needed
    if (!options.force && plan.hasDestructiveChanges) {
      const confirmed = await this.confirmRepair(plan);
      if (!confirmed) return { cancelled: true };
    }
    
    // 4. Execute repairs with backups
    const results = await this.executeRepairs(plan);
    
    // 5. Report results
    return this.buildReport(results);
  }
}
```

### Pattern 3: Backup Manager Pattern
**What:** Encapsulate backup logic: creation, storage, cleanup
**When to use:** When overwriting existing files
**Example:**
```javascript
class BackupManager {
  constructor(targetDir) {
    this.targetDir = targetDir;
    this.backupDir = path.join(targetDir, '.backups');
    this.datePrefix = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  }

  async backupFile(filePath) {
    const relativePath = path.relative(this.targetDir, filePath);
    const backupSubdir = path.dirname(relativePath);
    const fileName = path.basename(filePath);
    const backupFileName = `${this.datePrefix}_${fileName}`;
    
    const backupPath = path.join(this.backupDir, backupSubdir, backupFileName);
    
    // Ensure backup subdirectory exists
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    
    // Move (not copy) to backup - preserves metadata, faster
    await fs.rename(filePath, backupPath);
    
    return backupPath;
  }

  async cleanupOldBackups(retentionCount = 5) {
    // Keep last N backups, remove oldest
    const backups = await this.listBackups();
    if (backups.length > retentionCount) {
      const toRemove = backups.slice(0, backups.length - retentionCount);
      for (const backup of toRemove) {
        await fs.rm(backup, { recursive: true, force: true });
      }
    }
  }
}
```

### Pattern 4: Surgical Path Replacement
**What:** Only replace specific patterns in files, preserve user edits
**When to use:** For .md files that may contain user customizations
**Example:**
```javascript
async function fixPathReferences(filePath, targetDir) {
  const content = await fs.readFile(filePath, 'utf-8');
  
  // Only replace @gsd-opencode/ references
  const fixedContent = content.replace(
    /@gsd-opencode\//g,
    targetDir + '/'
  );
  
  // Only write if changed
  if (content !== fixedContent) {
    await fs.writeFile(filePath, fixedContent, 'utf-8');
    return true; // Was modified
  }
  
  return false; // No changes needed
}
```

### Anti-Patterns to Avoid

1. **Immediate Repair Without Summary:** Don't fix issues without showing user what will change
   - Why: Users need to understand scope before committing
   - Instead: Always show summary first

2. **In-Place Modification Without Backup:** Don't overwrite files without preserving originals
   - Why: Enables recovery from failed repairs
   - Instead: Move to backup before writing new content

3. **Per-File Confirmation:** Don't prompt for each file repair
   - Why: Annoying for users with many issues
   - Instead: All-or-nothing at summary level

4. **Stop on First Failure:** Don't abort entire repair if one file fails
   - Why: Partial fix is better than no fix
   - Instead: Continue and report failures at end

5. **Silent Success:** Don't repair without telling user what was fixed
   - Why: Users need confirmation that issues were resolved
   - Instead: Detailed post-repair report

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Issue detection | Custom file checking logic | HealthChecker from Phase 3 | Already implements verifyFiles(), verifyIntegrity() |
| File copying | Manual fs.copyFile | FileOperations.install() | Handles path replacement, atomic moves, progress |
| User confirmation | process.stdin prompts | interactive.promptConfirmation() | Consistent with uninstall command, handles Ctrl+C |
| Progress display | Manual console.log | Logger with spinner | Consistent with install command patterns |
| Path resolution | Manual path.join | ScopeManager | Handles global vs local, custom config dirs |
| Backup rotation | Custom cleanup logic | BackupManager with retention | Standard pattern, configurable N value |

**Key insight:** The existing infrastructure (HealthChecker, FileOperations, ScopeManager) provides 80% of what repair needs. Focus on orchestration, not reimplementation.

## Common Pitfalls

### Pitfall 1: Losing User Customizations
**What goes wrong:** Overwriting .md files destroys user's custom edits
**Why it happens:** Blindly replacing entire files instead of surgical updates
**How to avoid:** 
- For missing files: Use FileOperations.install() (full copy)
- For corrupted files: Use FileOperations.install() after backup
- For path issues: Use surgical regex replacement only on @gsd-opencode/ refs
**Warning signs:** Any repair that replaces entire .md files without checking if they have user content

### Pitfall 2: Permission Errors During Repair
**What goes wrong:** Repair fails mid-way due to EACCES, leaving system partially fixed
**Why it happens:** Not checking permissions before starting repairs
**How to avoid:**
- Verify write access to targetDir before starting
- Handle EACCES gracefully, continue with other repairs
- Report permission failures clearly at end
**Warning signs:** Errors mentioning "Permission denied" during file operations

### Pitfall 3: Backup Accumulation
**What goes wrong:** Backups accumulate indefinitely, consuming disk space
**Why it happens:** No cleanup strategy for old backups
**How to avoid:**
- Implement retention policy (default: keep last 5 backups)
- Run cleanup after successful repairs
- Store backups in subdirectory (.backups/) for easy management
**Warning signs:** Multiple backup files with different dates

### Pitfall 4: Confusion Between Missing vs Corrupted
**What goes wrong:** Treating corrupted files as missing (or vice versa) leads to wrong repair strategy
**Why it happens:** HealthChecker returns different error types that must be categorized correctly
**How to avoid:**
- Categorize issues by type from HealthChecker results
- Missing: File doesn't exist (ENOENT)
- Corrupted: File exists but fails integrity check
- Path issues: File exists but contains wrong @gsd-opencode/ refs
**Warning signs:** Repair trying to backup non-existent files or skipping corrupted ones

### Pitfall 5: Race Conditions During Backup
**What goes wrong:** File changes between backup and repair
**Why it happens:** No locking mechanism, async operations
**How to avoid:**
- Move (not copy) to backup - atomic operation
- Perform backup immediately before replacement
- Don't repair across long time spans
**Warning signs:** Inconsistent backup contents vs expected

## Code Examples

### Detecting Issues from HealthChecker
```javascript
// Source: Existing codebase + best practices
async function categorizeIssues(healthResult) {
  const issues = {
    missing: [],
    corrupted: [],
    pathIssues: []
  };

  // Check file existence
  for (const check of healthResult.categories.files.checks) {
    if (!check.passed) {
      issues.missing.push({
        type: 'missing',
        path: check.path,
        name: check.name,
        error: check.error
      });
    }
  }

  // Check integrity
  for (const check of healthResult.categories.integrity.checks) {
    if (!check.passed && !issues.missing.find(i => i.path === check.file)) {
      issues.corrupted.push({
        type: 'corrupted',
        path: check.file,
        relative: check.relative,
        error: check.error
      });
    }
  }

  // Check path references in existing .md files
  // This requires separate check not in HealthChecker
  issues.pathIssues = await checkPathReferences(healthResult);

  return issues;
}
```

### Executing Repairs with Progress
```javascript
// Source: Pattern from FileOperations + npm doctor
async function executeRepairs(plan, logger) {
  const results = {
    success: [],
    failed: []
  };

  const total = plan.repairs.length;
  let current = 0;

  for (const repair of plan.repairs) {
    current++;
    logger.info(`Repairing ${current} of ${total}...`);

    try {
      if (repair.requiresBackup) {
        await backupManager.backupFile(repair.path);
      }

      await performRepair(repair);
      results.success.push(repair);
    } catch (error) {
      results.failed.push({
        repair,
        error: error.message
      });
      // Continue with next repair - don't stop on failure
    }
  }

  return results;
}
```

### Building Repair Summary
```javascript
// Source: Pattern from uninstall command
function buildRepairSummary(issues) {
  const lines = [];
  
  lines.push('The following issues will be fixed:\n');
  
  if (issues.missing.length > 0) {
    lines.push(`Missing Files (${issues.missing.length}):`);
    for (const issue of issues.missing) {
      lines.push(`  ${issue.name}`);
    }
    lines.push('');
  }
  
  if (issues.corrupted.length > 0) {
    lines.push(`Corrupted Files (${issues.corrupted.length}):`);
    for (const issue of issues.corrupted) {
      lines.push(`  ${issue.relative}`);
    }
    lines.push('  ⚠️  Existing files will be backed up before replacement\n');
  }
  
  if (issues.pathIssues.length > 0) {
    lines.push(`Path References (${issues.pathIssues.length}):`);
    for (const issue of issues.pathIssues) {
      lines.push(`  ${issue.file}`);
    }
    lines.push('');
  }
  
  return lines.join('\n');
}
```

## Integration with Existing Infrastructure

### HealthChecker Integration Points
```javascript
// Use existing methods to detect issues
const health = new HealthChecker(scopeManager);

// Detect missing files
const filesResult = await health.verifyFiles();
// Returns: { passed: boolean, checks: [{ name, passed, path, error }] }

// Detect corrupted files  
const integrityResult = await health.verifyIntegrity();
// Returns: { passed: boolean, checks: [{ file, hash, passed, error }] }

// Detect version mismatch
const versionResult = await health.verifyVersion(expectedVersion);
// Returns: { passed: boolean, installed, expected, checks: [] }

// Or run all checks at once
const allResults = await health.checkAll({ expectedVersion });
```

### FileOperations Integration Points
```javascript
// For reinstalling missing/corrupted files
const fileOps = new FileOperations(scopeManager, logger);

// Reinstalls entire directory with path replacement
await fileOps.install(sourceDir, targetDir);
// Handles:
// - Path replacement in .md files (@gsd-opencode/ -> actual path)
// - Atomic installation (temp-then-move)
// - Progress indication
// - Signal handling for cleanup
```

### ScopeManager Integration Points
```javascript
// Determine installation scope (global vs local)
const scopeManager = new ScopeManager({ scope: 'global' });

// Get target directory
const targetDir = scopeManager.getTargetDir();

// Check if installed
if (!scopeManager.isInstalled()) {
  throw new Error('No installation found to repair');
}

// Handle both scopes
const scopes = options.global ? ['global'] : 
               options.local ? ['local'] : 
               ['global', 'local'];

for (const scope of scopes) {
  const sm = new ScopeManager({ scope });
  if (sm.isInstalled()) {
    await repairScope(sm);
  }
}
```

## State of the Art

| Tool | Approach | What We Can Learn |
|------|----------|-------------------|
| Homebrew `brew doctor` | Detection only, no auto-fix | Clear categorization of issues, user decides how to fix |
| npm `npm doctor` | Detection + some auto-fix | Can repair some issues automatically (cache, permissions) |
| Git `git restore` | Source-based restore | Backup not needed - restore from known-good source |
| `rsync --backup` | Backup with rotation | Date-stamped backups, configurable retention |
| APT `apt --fix-broken` | Auto-repair dependencies | Fix missing dependencies automatically |

**Key insight:** Most CLI tools either (1) detect and report only (brew doctor), or (2) fix non-destructive issues automatically (npm doctor). The repair command bridges both: auto-fix non-destructive issues (missing files) but confirm before destructive ones (overwriting corrupted files).

## Open Questions

1. **Backup retention count (N value)**
   - What we know: Need to keep "last N backups" per CONTEXT.md
   - What's unclear: Exact N value (5? 10?)
   - Recommendation: Start with N=5, document as configurable

2. **Path reference detection mechanism**
   - What we know: Need to detect broken @gsd-opencode/ refs
   - What's unclear: Should we scan all .md files or only specific ones?
   - Recommendation: Scan all .md files in DIRECTORIES_TO_COPY directories

3. **Handling custom user files in installation directory**
   - What we know: Users might add their own files to installation dir
   - What's unclear: Should repair leave unknown files alone?
   - Recommendation: Yes - only touch files we manage (DIRECTORIES_TO_COPY + VERSION)

4. **Multiple scope repairs**
   - What we know: Can repair global, local, or both
   - What's unclear: Show separate summaries or combined?
   - Recommendation: Separate summaries per scope, clearer for user

## Implementation Recommendations

### Exit Codes
Following existing ERROR_CODES pattern:
- `0` - All repairs successful (or nothing to repair)
- `1` - Some repairs failed (partial success)
- `2` - Permission denied
- `130` - Interrupted by user

### Backup Directory Structure
```
~/.config/opencode/.backups/
└── 2026-02-10/
    ├── agents/
    │   └── gsd-executor.md
    ├── command/
    │   └── gsd/
    │       └── help.md
    └── VERSION
```

### Repair Order
1. Missing files (non-destructive, auto-fix)
2. Path references (surgical, low risk)
3. Corrupted files (destructive, needs backup)

### Progress Reporting
- Pre-repair: Summary of issues found by category
- During repair: "Repairing X of Y files..." (overall progress only)
- Post-repair: List of all repaired files with status
- Failures: Grouped at end with error messages

## Sources

### Primary (HIGH confidence)
- `/src/services/health-checker.js` - HealthChecker API and patterns
- `/src/services/file-ops.js` - FileOperations installation patterns
- `/src/services/scope-manager.js` - Scope handling
- `/src/commands/uninstall.js` - Confirmation and summary patterns
- `/src/commands/check.js` - Health check result display patterns
- `/.planning/phases/04-self-healing/04-CONTEXT.md` - User decisions

### Secondary (MEDIUM confidence)
- npm doctor documentation - Detection and repair patterns
- Homebrew brew doctor manpage - Issue categorization
- Git restore documentation - File restoration patterns
- CLI Guidelines (clig.dev) - Confirmation and safety patterns

### Tertiary (LOW confidence)
- Stack Overflow discussions on backup strategies (unverified)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Based on existing codebase patterns
- Architecture: HIGH - Based on existing service patterns
- Pitfalls: MEDIUM - Combination of codebase analysis and CLI best practices

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days for stable CLI patterns)

---

## RESEARCH COMPLETE

**Phase:** 4 - Self-Healing (Repair command)
**Confidence:** HIGH

### Key Findings

1. **Leverage existing infrastructure**: HealthChecker, FileOperations, and ScopeManager provide the foundation - don't reimplement
2. **Two-phase repair**: Non-destructive repairs (missing files) happen automatically; destructive repairs (corrupted files) require confirmation
3. **Backup strategy**: Move (not copy) files to date-stamped backup directory before overwriting; implement retention (N=5)
4. **Surgical updates**: Only replace @gsd-opencode/ references in .md files, preserving user customizations
5. **Continue on failure**: Attempt all repairs, report failures at end with non-zero exit code

### File Created

`.planning/phases/04-self-healing/04-RESEARCH.md`

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Standard stack | HIGH | Existing codebase provides clear patterns |
| Architecture | HIGH | Follows established service/command pattern |
| Pitfalls | MEDIUM | Based on codebase + CLI best practices |

### Open Questions

1. Exact backup retention count (recommend N=5)
2. Scope of path reference scanning (recommend all .md files in managed dirs)
3. Handling of user-added files in installation directory (recommend: leave alone)
4. Multiple scope repair presentation (recommend: separate summaries)

### Ready for Planning

Research complete. Planner can now create PLAN.md with tasks for:
- RepairService implementation
- BackupManager implementation  
- Repair command (CLI entry point)
- Integration with HealthChecker
- Progress reporting and summary display
