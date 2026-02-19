---
phase: 10-create-node-js-script-to-translate-gsd-to-gsd-opencode
plan: 01
type: execute
subsystem: translator
autonomous: true
wave: 1
requirements:
  - TRANS-01
  - TRANS-02
  - TRANS-03
  - TRANS-04
  - TRANS-05
  - TRANS-06
depends_on: []
tech-stack:
  added:
    - Node.js 18+ (ES modules)
    - tinyglobby (glob pattern matching)
    - diff (unified diff generation)
    - Vitest (testing framework)
  patterns:
    - ES modules with type: module
    - Class-based service architecture
    - Async/await for file operations
    - Word boundary regex matching
    - Case preservation on replacement
key-files:
  created:
    - assets/lib/translator.js (TextTranslator class)
    - assets/lib/cli.js (CliFormatter class)
    - assets/lib/backup-manager.js (BackupManager class)
    - assets/lib/git-checker.js (GitChecker class)
    - assets/lib/validator.js (Validator class)
    - assets/bin/translate.js (CLI entry point)
    - assets/package.json (ES module config)
    - assets/tests/translator.test.js (24 unit tests)
    - assets/tests/backup-manager.test.js (23 unit tests)
    - assets/tests/validator.test.js (24 unit tests)
    - assets/tests/translate.test.js (20 integration tests)
decisions:
  - "Word boundary matching (\\b) prevents partial matches like 'mygsd'"
  - "Case preservation: GSD -> GSD-OPENCODE, gsd -> gsd-opencode, Gsd -> Gsd-opencode"
  - "Dry-run mode by default for safety, --apply for modifications"
  - "Automatic backups in .translate-backups/ before modifications"
  - "Git warnings displayed but not blocking (no interactive prompts)"
  - "Post-translation validation detects remaining forbidden strings"
  - "Exit codes: 0 (success), 1 (validation error), 2 (runtime error)"
  - "Binary file detection via null byte check in first 512 bytes"
  - "Max file size enforcement (10MB default)"
metrics:
  duration: "90 minutes"
  completed_date: "2026-02-19"
---

# Phase 10 Plan 01: Create Node.js Translation Script Summary

**One-liner:** Standalone Node.js translation utility that replaces "gsd" with "gsd-opencode" using regex word boundaries, case preservation, dry-run mode, automatic backups, and post-translation validation.

---

## What Was Built

A complete translation script suite in `assets/` directory:

### Core Modules (5 classes)

| Module | Purpose | Key Features |
|--------|---------|--------------|
| `TextTranslator` | Text replacement engine | Word boundaries, case preservation, binary detection |
| `CliFormatter` | Output formatting | Summary tables, diffs, progress bars, colored output |
| `BackupManager` | File backup service | Timestamped backups, cleanup, restore |
| `GitChecker` | Git integration | Uncommitted change detection, warnings |
| `Validator` | Post-translation validation | Forbidden pattern detection, exception handling |

### CLI Entry Point

`assets/bin/translate.js` - Command-line interface:
- `node translate.js <config.json>` - Dry-run mode (default)
- `node translate.js <config.json> --apply` - Apply changes
- `node translate.js <config.json> --show-diff` - Show diffs
- `node translate.js --help` - Usage information

### Configuration

JSON config file format:
```json
{
  "patterns": ["**/*.md", "**/*.js"],
  "exclude": ["node_modules/**"],
  "rules": [
    {"pattern": "gsd", "replacement": "gsd-opencode"},
    {"pattern": "get-shit-done", "replacement": "gsd-opencode"}
  ],
  "maxFileSize": 10485760
}
```

### Test Suite (91 tests)

| Test File | Tests | Coverage |
|-----------|-------|----------|
| translator.test.js | 24 | Unit tests for TextTranslator |
| backup-manager.test.js | 23 | Unit tests for BackupManager |
| validator.test.js | 24 | Unit tests for Validator |
| translate.test.js | 20 | Integration tests for CLI |

**All 91 tests passing.**

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed unicode escape in validator.js**
- **Found during:** Task 3
- **Issue:** Literal `\n` in exceptions array caused "Expected unicode escape" error
- **Fix:** Removed literal `\n` character, replaced with proper array syntax
- **Files modified:** assets/lib/validator.js

**2. [Rule 2 - Critical] Enhanced exception handling in Validator**
- **Found during:** Task 3
- **Issue:** Validator was flagging "gsd" within "gsd-opencode" as violation
- **Fix:** Added check for "-opencode" suffix after match to skip false positives
- **Files modified:** assets/lib/validator.js

**3. [Rule 1 - Bug] Fixed case preservation for Title Case**
- **Found during:** Task 3
- **Issue:** "Gsd" was being replaced with "gsd-opencode" instead of "Gsd-opencode"
- **Fix:** Enhanced applyRule to check first character case and preserve it
- **Files modified:** assets/lib/translator.js

**4. [Rule 1 - Bug] Fixed file error handling in translator.js**
- **Found during:** Task 3
- **Issue:** Missing files were reported as "File exceeds max size" instead of ENOENT
- **Fix:** Modified translateFile to propagate actual error messages from checkFileSize
- **Files modified:** assets/lib/translator.js

**5. [Rule 3 - Blocking] Fixed backup timestamp regex**
- **Found during:** Task 3
- **Issue:** Timestamp regex `[\d-T]+` didn't match colons in ISO timestamps
- **Fix:** Changed regex to `[\d-TZ-]+` to handle full ISO format
- **Files modified:** assets/lib/backup-manager.js

---

## Verification Results

### Translation Accuracy
- 'gsd' -> 'gsd-opencode' with word boundaries (verified in tests)
- 'GSD' -> 'GSD-OPENCODE' case preservation (verified in tests)
- 'mygsd' remains unchanged - partial match avoided (verified in tests)
- Binary files detected and skipped (verified in tests)
- Max file size enforced (verified in tests)

### Safety Features
- Backups created in `.translate-backups/` before modification (verified in integration tests)
- Git warnings displayed for uncommitted changes (tested in unit tests)
- No interactive prompts (locked decision honored)

### Validation
- Post-translation validation runs after --apply (verified in integration tests)
- Forbidden string detection works (verified in unit tests)
- Exception handling for "gsd-opencode" works (verified in unit tests)

### CLI Functionality
- Dry-run mode shows summary without modifications (verified in integration tests)
- --apply flag applies changes (verified in integration tests)
- --show-diff displays unified diffs (verified in integration tests)
- --no-color disables ANSI codes (verified in integration tests)
- Exit codes: 0 (success), 1 (validation), 2 (runtime) (verified in integration tests)

---

## Commits

1. `1de2d19` feat(10-01): create core translation infrastructure
2. `bdf62ca` feat(10-01): add comprehensive tests and validation

---

## Usage Examples

### Dry-run (preview changes)
```bash
cd assets
node bin/translate.js config.json
```

### Apply changes
```bash
cd assets
node bin/translate.js config.json --apply
```

### Show diffs
```bash
cd assets
node bin/translate.js config.json --show-diff
```

### Run tests
```bash
cd assets
npm test
```

---

## Notes

- The script is standalone and does not integrate with the gsd-opencode CLI (per locked decision)
- All file operations are async using fs/promises
- Word boundary matching uses `\b` regex anchors
- Case preservation handles: lowercase, UPPERCASE, and Title Case
- Backup filenames include sanitized path and ISO timestamp
- GitChecker uses `git status --porcelain` for reliable parsing
