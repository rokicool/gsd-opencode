# Phase 13: copy-from-original script - Research

**Researched:** 2026-02-22
**Domain:** Git submodule synchronization, file copying with transformation, CLI tooling
**Confidence:** HIGH

## Summary

Phase 13 implements a "copy-from-original" script that synchronizes changes from the upstream TÂCHES repository (git submodule at `original/get-shit-done/`) to the OpenCode adaptation (`gsd-opencode/`). This is a critical maintenance tool for keeping the OpenCode fork in sync with upstream changes.

The script must:
1. **Detect changes** between the git submodule and the adaptation
2. **Copy files** from original to gsd-opencode while preserving directory structure
3. **Track sync state** to know what has been synchronized
4. **Provide dry-run mode** for safe previewing

This builds on the translation infrastructure from Phase 10 (`translate.js`) but adds git submodule awareness and bidirectional sync capabilities.

**Primary recommendation:** Create a CLI command `assets/bin/copy-from-original` that detects upstream changes, copies files defined in copy-from-original.json rules file (basically from 'original/' to 'gsd-opencode'), tracks sync status using a manifest file and perform a backup of all replaced files.

## User Constraints

No CONTEXT.md exists for this phase. Research scope is exploratory.

1. **Don't apply transformations** (Claude Code → OpenCode adaptations). This operation is supposed to be performed by another script: assets/bin/translate.js.
2. **Workflow** This copy-from-original operation must copy all significant files to gsd-opencode/ folder. This folder is to be processed by 'translate.js' later. And that is outside of the scope of this operation.


### Prior Decisions (from project history)
- **ES Modules**: Project uses ES Modules with `type: module`
- **Service Layer Pattern**: Business logic in services, CLI is thin wrapper
- **Atomic File Operations**: Temp-then-move pattern for safety
- **Progress Indication**: Uses `ora` for CLI progress
- **Git Submodule**: `original/get-shit-done/` tracks TÂCHES repo at v1.20.5

### The assistant's Discretion
- Exact CLI command name and flags
- Sync tracking format (JSON manifest)
- Transformation rule configuration approach
- Interactive vs automatic conflict resolution

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js fs/promises | Built-in | Async file operations | Native, no dependencies, Promise-based |
| Node.js child_process | Built-in | Git operations | Execute git commands for submodule info |
| Commander.js | ^11.x | CLI framework | Already used throughout project |
| ora | ^8.x | Progress spinners | Already used for progress indication |
| chalk | ^5.x | Terminal colors | Already used for formatted output |
| tinyglobby | ^2.x | File globbing | Used by translate.js, ESM-native |
| diff | ^5.x | Text diffing | Show changes between versions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| semver | ^7.x | Version comparison | Compare upstream vs current versions |
| fast-json-diff | ^1.x | JSON comparison | Detect changes in structured files |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| child_process | simple-git | simple-git adds dependency; child_process sufficient |
| diff | diff-match-patch | diff is simpler for line-by-line comparison |
| Custom manifest | Git notes | Git notes harder to inspect/debug |

**Installation:**
```bash
npm install commander ora chalk tinyglobby semver diff
```

## Architecture Patterns

### Recommended Project Structure
```
assets/
├── bin/
│   └── copy-from-original.js     # CLI command handler
├── copy-services/
│   ├── SubmoduleService.js    # Git submodule operations
│   ├── SyncService.js         # Copy with transformation
│   └── SyncManifest.js        # Track sync state
└── utils/
    ├── file-diff.js           # Compare file contents
    └── version-compare.js      # Semver utilities
```

### Pattern 1: Selective Copy with Transformation
**What:** Copy files from source to destination with text transformation
**When to use:** When syncing files that need CC→OC adaptation

### Pattern 2: Sync Manifest Tracking
**What:** JSON file tracking which files synced from which commit
**When to use:** To know what's been copied and detect drift
**Example:**
```javascript
// Source: Project conventions from Phase 7 manifest pattern
const manifest = {
  version: '1.0.0',
  lastSync: {
    commit: '131f24b5cd9014a1e910807565ad522416932053',
    date: '2026-02-22T10:30:00Z',
    version: 'v1.20.5'
  },
  files: {
    'agents/gsd-planner.md': {
      syncedAt: '2026-02-22T10:30:00Z',
      sourceHash: 'sha256:abc123...',
      destHash: 'sha256:def456...',
      transformed: true
    }
  }
};
```

### Pattern 3: Atomic Batch Operations
**What:** Collect all changes, validate, then apply atomically
**When to use:** To prevent partial sync state
**Example:**
```javascript
// Source: Project patterns from FileOperations service
async function atomicSync(operations) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-'));
  
  try {
    // Stage all changes to temp
    for (const op of operations) {
      const tempPath = path.join(tempDir, op.relativePath);
      await fs.mkdir(path.dirname(tempPath), { recursive: true });
      await fs.writeFile(tempPath, op.content, 'utf-8');
    }
    
    // Validate (dry-run checks)
    await validateSync(operations);
    
    // Apply atomically
    for (const op of operations) {
      const tempPath = path.join(tempDir, op.relativePath);
      await fs.rename(tempPath, op.targetPath);
    }
    
    await manifest.update(operations);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
```

### Anti-Patterns to Avoid
- **In-place transformation**: Should not perform any transformation in place
- **Synchronous git operations in loops**: Use async/await for concurrent operations
- **Ignoring binary files**: Detect and skip binaries (check null bytes)
- **No dry-run mode**: Always provide preview before destructive changes

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File globbing | Custom regex | tinyglobby | Battle-tested, handles edge cases, fast |
| Text diff | Line-by-line comparison | diff library | Unified diff format, context lines |
| Version comparison | String comparison | semver | Handles prerelease, build metadata |
| Progress bars | Manual stdout writes | ora | Spinner, colors, ETA calculations |
| Case preservation | Manual string checks | Regex with callback | Cleaner, handles all edge cases |

**Key insight:** The project already uses these libraries (translate.js uses tinyglobby). 

## Common Pitfalls

### Pitfall 1: Submodule Not Initialized
**What goes wrong:** Script fails with "path not found" if user hasn't run `git submodule update --init`
**Why it happens:** Submodule directory exists but is empty
**How to avoid:** Check for `.git` file in submodule, prompt user to initialize
**Warning signs:** `original/get-shit-done/` exists but has no files

### Pitfall 2: Partial Sync State
**What goes wrong:** Crash mid-sync leaves some files updated, others not
**Why it happens:** No atomic transaction around sync operations
**How to avoid:** Use atomic batch pattern (stage to temp, then move)
**Warning signs:** Manifest shows some files synced, others don't exist

### Pitfall 3: Overwriting Local Modifications
**What goes wrong:** Script copies from original and overwrites OpenCode-specific changes
**Why it happens:** No detection of divergent files
**How to avoid:** Check file hashes before sync, warn on divergent files
**Warning signs:** Files in gsd-opencode/ have newer mtime than last sync

### Pitfall 4: Binary File Corruption
**What goes wrong:** Text transformation applied to binary files (images, etc.)
**Why it happens:** Not checking for binary before regex replacement
**How to avoid:** Check first 512 bytes for null bytes, skip if found
**Warning signs:** Image files become corrupted after sync

### Pitfall 5: Circular Transformations
**What goes wrong:** Pattern "gsd" → "gsd-opencode" then "gsd-opencode" → "gsd-opencode-opencode"
**Why it happens:** Replacement matches its own output
**How to avoid:** Use word boundaries, check file hasn't already been transformed
**Warning signs:** Double-transformed strings appear in output

## Code Examples

### Detecting Submodule Changes
```javascript
// Source: Git documentation + project conventions
import { execSync } from 'child_process';
import { readFile } from 'fs/promises';

const SUBMODULE_PATH = './original/get-shit-done';
const MANIFEST_PATH = './.planning/sync-manifest.json';

async function detectChanges() {
  // Check submodule initialized
  try {
    await readFile(`${SUBMODULE_PATH}/.git`, 'utf-8');
  } catch {
    throw new Error('Submodule not initialized. Run: git submodule update --init --recursive');
  }
  
  // Get current commit
  const currentCommit = execSync('git rev-parse HEAD', {
    cwd: SUBMODULE_PATH,
    encoding: 'utf-8'
  }).trim();
  
  // Get last synced commit
  let lastCommit = null;
  try {
    const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf-8'));
    lastCommit = manifest.lastSync?.commit;
  } catch {
    // No manifest yet - first sync
    console.log('No previous sync found. Will perform full copy.');
  }
  
  if (lastCommit === currentCommit) {
    return { hasChanges: false, message: 'Already up to date' };
  }
  
  // Get changed files
  const range = lastCommit ? `${lastCommit}..${currentCommit}` : 'HEAD';
  const output = execSync(
    `git diff-tree --no-commit-id --name-only -r ${range}`,
    { cwd: SUBMODULE_PATH, encoding: 'utf-8' }
  );
  
  return {
    hasChanges: true,
    fromCommit: lastCommit || 'none',
    toCommit: currentCommit,
    files: output.split('\n').filter(Boolean)
  };
}
```

### Copy with Directory Mapping
```javascript
// Source: Phase 10 patterns + project directory structure
const DIRECTORY_MAPPING = {
  'agents/': 'gsd-opencode/agents/',
  'commands/gsd/': 'gsd-opencode/commands/gsd/',
  'get-shit-done/references/': 'gsd-opencode/get-shit-done/references/',
  'get-shit-done/templates/': 'gsd-opencode/get-shit-done/templates/',
  'get-shit-done/workflows/': 'gsd-opencode/get-shit-done/workflows/'
};

function getTargetPath(sourcePath) {
  for (const [from, to] of Object.entries(DIRECTORY_MAPPING)) {
    if (sourcePath.startsWith(from)) {
      return sourcePath.replace(from, to);
    }
  }
  return null; // Skip files not in mapping
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual file copying | Automated sync with manifest | Phase 13 | Reliable upstream tracking |
| Ad-hoc translation | Structured rule-based transformation | Phase 10 | Consistent, testable |
| No change detection | Git diff-based detection | Phase 13 | Only sync what's needed |
| Overwrite without warning | Divergence detection | Phase 13 | Protects local modifications |

**Deprecated/outdated:**
- Manual copy-paste from original repo: Error-prone, tedious
- Full overwrite sync: Loses OpenCode-specific adaptations
- Sync without dry-run: Risky, no preview

## Open Questions

1. **How to handle merge conflicts?**
   - What we know: Files may diverge between original and OpenCode
   - What's unclear: Should we auto-overwrite, prompt, or skip?
   - Recommendation: Provide `--force` flag, default to warning on divergent files

2. **What about deleted files in original?**
   - What we know: Original may delete files we still need
   - What's unclear: Should sync delete files from gsd-opencode?
   - Recommendation: Never auto-delete; report orphaned files

3. **How to track OpenCode-specific additions?**
   - What we know: gsd-opencode has files not in original (e.g., OpenCode-specific agents)
   - What's unclear: Should these be in a separate directory or marked?
   - Recommendation: Keep in gsd-opencode/, mark in manifest as "local-only"

4. **Should sync update submodule pointer?**
   - What we know: Submodule can be at any commit
   - What's unclear: Should copy-from-original also commit submodule update?
   - Recommendation: No, keep separate. Copy script only copies, git commands manage submodule

5. **How to handle new file types?**
   - What we know: Original may add .ts, .yaml, etc.
   - What's unclear: Should transformation rules be per-file-type?
   - Recommendation: Default rules apply to all text files, file-type rules can extend

## Sources

### Primary (HIGH confidence)
- `original/get-shit-done/` - Git submodule at v1.20.5, source of truth for upstream
- `gsd-opencode/` - Current OpenCode adaptation, target for sync
- `assets/bin/translate.js` - Existing translation infrastructure (Phase 10)
- `assets/bin/TRANSLATION.md` - Translation patterns and conventions
- `assets/prompts/TRANSLATION-MAPPING.md` - Comprehensive mapping of CC→OC transformations

### Secondary (MEDIUM confidence)
- Phase 10 plans (10-01-PLAN.md) - Translation service architecture
- Phase 7 manifest pattern - File tracking via JSON manifest
- Git submodule documentation - Change detection strategies

### Tertiary (LOW confidence)
- Generic "upstream sync" patterns from other open-source projects
- Submodule workflow best practices (varies by project)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses existing project libraries
- Architecture: HIGH - Follows established service layer pattern
- Pitfalls: MEDIUM - Based on Phase 10 experience + common sync issues

**Research date:** 2026-02-22
**Valid until:** 30 days (stable domain - git submodules, file operations)

---

**Phase Context:**
- Depends on: Phase 12 (Simple Profiles System)
- No specific requirements defined yet - this research establishes the foundation
- Related to: Phase 10 (translation infrastructure), git submodule management
