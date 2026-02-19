---
phase: quick/1-add-include-option-to-translate-js-confi
plan: 1
type: execute
subsystem: translation-utility
completed_date: 2026-02-18
tags:
  - config
  - filtering
  - whitelist
  - include
  - translate.js
---

# Phase quick/1 Plan 1: Add include option to translate.js - Summary

## Overview

Added an `include` option to the translate.js CLI configuration that acts as a whitelist, filtering files before the `exclude` patterns are applied. This allows users to precisely control which files are processed.

## What Was Built

### 1. Config Loading with include Support (Task 1)

**File:** `assets/bin/translate.js`

- Added default value for `config.include` (empty array)
- Added validation to ensure include is an array of strings
- Implemented include filtering logic:
  - If `include` has items: first glob with include patterns, then apply exclude
  - If `include` is empty: use existing patterns behavior (backward compatible)

**Key implementation detail:**
```javascript
// If include patterns are specified, use them as whitelist first
if (config.include.length > 0) {
  const includedFiles = await glob(config.include, { onlyFiles: true });
  const excludedSet = new Set(await glob(config.include, {
    ignore: config.exclude,
    onlyFiles: true
  }));
  files = includedFiles.filter(f => excludedSet.has(f));
} else {
  // Use patterns with exclude (existing behavior)
  files = await glob(config.patterns, { ignore: config.exclude, onlyFiles: true });
}
```

### 2. Documentation Updates (Task 2)

**File:** `assets/bin/TRANSLATION.md`

- Added `include` field to JSON config example
- Updated `patterns` field description to clarify it's ignored when `include` is specified
- Added `include` row to fields table
- Added new "Include Option" subsection under Advanced Usage with:
  - Explanation of whitelist behavior
  - Processing order: include (whitelist) -> exclude (blacklist) -> translate
  - Example configs for selective processing
  - Behavior summary table

### 3. Test Coverage (Task 3)

**File:** `assets/tests/translate.test.js`

Added 3 new integration tests:

1. **include patterns as whitelist**: Verifies that only files matching include patterns are processed
2. **include + exclude together**: Verifies that exclude is applied after include
3. **empty include falls back to patterns**: Verifies backward compatibility

All 94 tests pass (91 existing + 3 new).

## Files Modified

| File | Lines Changed | Description |
|------|---------------|-------------|
| `assets/bin/translate.js` | +30 lines | Added include config default, validation, and filtering logic |
| `assets/bin/TRANSLATION.md` | +40 lines | Added include option documentation |
| `assets/tests/translate.test.js` | +74 lines | Added 3 integration tests for include functionality |

## Commits

| Hash | Message |
|------|---------|
| 55ac8a5 | feat(quick/1): add include option to translate.js |
| c5b596d | docs(quick/1): document include option in TRANSLATION.md |
| 6830b95 | test(quick/1): add tests for include option functionality |

## Usage Example

```json
{
  "include": ["src/**/*.js", "docs/**/*.md"],
  "exclude": ["**/*.test.js"],
  "rules": [
    {"pattern": "gsd", "replacement": "gsd-opencode"}
  ]
}
```

This config will:
1. Include only `.js` files in `src/` and `.md` files in `docs/`
2. Exclude any test files (`*.test.js`) from those
3. Apply translation rules to remaining files

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria Verification

| Criteria | Status |
|----------|--------|
| include option accepted in config JSON | Pass |
| When include specified, only matching files are candidates | Pass |
| Exclude patterns still applied after include filtering | Pass |
| Existing configs without include work unchanged | Pass |
| Documentation updated with include usage | Pass |
| All tests pass including new include tests | Pass (94/94) |

## Self-Check: PASSED

- [x] Created files exist: translate.js, TRANSLATION.md, translate.test.js
- [x] Commits exist: 55ac8a5, c5b596d, 6830b95
- [x] All tests pass: 94/94
- [x] Documentation includes include option
