---
phase: 09-fix-support-for-local-install
plan: 01
type: execute
subsystem: file-operations
tags:
  - bug-fix
  - path-replacement
  - local-install
  - javascript
  - regex
requires:
  - file-ops.js
provides:
  - Fixed _copyFile method with proper path replacement
  - Local scope path replacement tests
  - Integration test verification
key-files:
  created: []
  modified:
    - gsd-opencode/src/services/file-ops.js
    - gsd-opencode/test/unit/file-ops.test.js
    - gsd-opencode/test/helpers/path-replacement-helpers.js
decisions: []
metrics:
  duration: "4 minutes"
  completed-date: "2026-02-17"
---

# Phase 9 Plan 1: Fix Local Install Path Replacement Bug Summary

## Overview

Fixed a critical bug in the `_copyFile` method where path replacement failed for local scope installations due to special characters (like `$`) being interpreted as replacement patterns in JavaScript's `String.prototype.replace()`.

## One-Liner

Fixed path replacement bug by using function-based replacement to handle special characters in local install paths.

## Root Cause Analysis

The bug was in `/Users/roki/github/gsd-opencode/gsd-opencode/src/services/file-ops.js` lines 479-482:

```javascript
content = content.replace(
  PATH_PATTERNS.gsdReference,
  targetDir + '/'
);
```

When `targetDir` contained special characters like `$`, JavaScript's `String.prototype.replace()` interpreted them as replacement patterns:
- `$$` - inserts a literal `$`
- `$&` - inserts the matched substring
- `$'` - inserts the portion after the match
- `$`` - inserts the portion before the match

This caused incorrect path replacement when the target directory path contained these characters.

## Changes Made

### 1. Fixed _copyFile method (file-ops.js)

**Before:**
```javascript
content = content.replace(
  PATH_PATTERNS.gsdReference,
  targetDir + '/'
);
```

**After:**
```javascript
// Optimization: Skip files that don't contain @gsd-opencode/ references
if (!PATH_PATTERNS.gsdReference.test(content)) {
  await fs.copyFile(sourcePath, targetPath, fsConstants.COPYFILE_FICLONE);
  return;
}

// Replace @gsd-opencode/ references with actual path
// Use function-based replacement to avoid issues with special characters
const targetDir = this.scopeManager.getTargetDir();
content = content.replace(
  PATH_PATTERNS.gsdReference,
  () => targetDir + '/'
);
```

**Key improvements:**
- Uses function-based replacement `() => targetDir + '/'` which treats the path as a literal string
- Added optimization to skip files that don't contain `@gsd-opencode/` references
- Preserves existing behavior for global scope while fixing local scope

### 2. Added Comprehensive Tests (file-ops.test.js)

Added 3 new test cases:

1. **"local install replaces all @gsd-opencode/ references with absolute path"**
   - Verifies all references are replaced
   - Confirms absolute path is used (not relative)
   - Tests multiple reference patterns

2. **"should handle special characters in local path replacement"**
   - Verifies function-based replacement handles special chars

3. **"should handle paths with dollar signs correctly"**
   - Specifically tests the `$` character bug that was fixed

### 3. Fixed Test Helper (path-replacement-helpers.js)

Fixed a pre-existing bug where the mock source directory used `command/gsd` instead of `commands/gsd`.

## Verification Results

### Unit Tests
```
✓ 24 tests passed (21 existing + 3 new)
✓ All local scope path replacement tests pass
✓ Global scope tests continue to pass
```

### Integration Tests
```
✓ 13 tests passed
✓ "local install replaces @gsd-opencode/ with actual path" passes
✓ All path replacement scenarios verified
```

### Requirements Satisfied

| Requirement | Status | Verification |
|-------------|--------|--------------|
| LOCAL-01: Local installs replace @gsd-opencode/ with absolute local .opencode/ path | PASS | Unit tests + Integration tests |
| LOCAL-02: Manifest CRC checksums are correct after path replacement | PASS | Existing tests still pass |
| LOCAL-03: Only files containing @gsd-opencode/ are processed | PASS | New optimization added |
| LOCAL-04: Global install behavior maintained | PASS | All global tests pass |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test helper directory structure**
- **Found during:** Task 3 (integration test verification)
- **Issue:** Mock source helper created `command/gsd` instead of `commands/gsd`
- **Fix:** Updated test helper to use correct plural form
- **Files modified:** `test/helpers/path-replacement-helpers.js`
- **Commit:** `34ce0d4`

## Commits

1. `132058c` - fix(09-01): fix path replacement bug in _copyFile method
2. `2c99217` - test(09-01): add comprehensive tests for local scope path replacement
3. `34ce0d4` - test(09-01): fix test helper to use correct source directory structure

## Self-Check: PASSED

- [x] file-ops.js modified with fix
- [x] Unit tests pass (24/24)
- [x] Integration tests pass (13/13)
- [x] Path replacement works for local scope
- [x] Path replacement works for global scope
- [x] All commits created with proper messages
