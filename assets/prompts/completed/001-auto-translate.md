<objective>
Migrate all prompt and agent files from the original TACHES repository (Claude Code format) in `original/` to OpenCode-compatible format in `gsd-opencode/`. This is an automated translation pipeline that copies files, applies text transformations via a JSON config, and iteratively refines until all forbidden patterns are eliminated and the output fully complies with the translation mapping.
</objective>

<context>
This project maintains a "get-shit-done" (GSD) meta-prompt system. The upstream source lives in `original/get-shit-done/` (a git submodule) and is written for Claude Code. The target `gsd-opencode/` folder must contain functionally equivalent prompts adapted for OpenCode.

Key differences between the systems include: command naming (`gsd:X` to `gsd-X`), tool name casing (`Read` to `read`), frontmatter format changes (tools as map instead of list, hex colors instead of named colors), path transformations (`~/.claude/` to `~/.config/opencode/`), URL transformations, and tag syntax changes (`<sub>` to `*`).

Three automated scripts exist:
- `assets/bin/gsd-copy-from-original.js` - Copies files from original/ to gsd-opencode/ (use `--apply` to execute, default is dry-run)
- `assets/bin/translate.js` - Applies JSON-config-driven text replacements to files in gsd-opencode/ (use `--apply` to execute, default is dry-run)
- `assets/bin/check-forbidden-strings.js` - Scans gsd-opencode/ for strings that must not appear in the translated output

Reference files you MUST read before starting:
- `assets/prompts/TRANSLATION-MAPPING.md` — the authoritative source of all CC-to-OC transformations
- `assets/antipatterns.toml` — defines the forbidden strings that must not remain after translation
</context>

<requirements>
Thoroughly analyze the TRANSLATION-MAPPING.md file and antipatterns.toml before generating any config. Every transformation category must be covered. Consider edge cases like partial matches and ordering of replacement rules (longer/more-specific patterns first to avoid partial replacements).

Complete the following tasks in strict sequential order:

```bash
CURRENT_ORIGINAL_VERSION=v1.20.5
```

## Task 1: Copy Files from Original

Run the copy script to sync all files from `original/` to `gsd-opencode/`:

```
node assets/bin/gsd-copy-from-original.js --apply --force --verbose
```

Verify the output shows files were copied successfully. If there are errors, diagnose and resolve them before proceeding.


## Task 2: Run Translation

Execute the translation with the config:

if `assets/configs/${CURRENT_ORIGINAL_VERSION}.json` does NOT exist:

``` bash
node assets/bin/translate.js assets/configs/config.json --apply --show-diff
```

if `assets/configs/${CURRENT_ORIGINAL_VERSION}.json` exist:


``` bash
node assets/bin/translate.js assets/configs/config.json  assets/configs/${CURRENT_ORIGINAL_VERSION}.json --apply --show-diff
```

Review the output carefully. Note any errors or warnings.

## Task 3: Check Forbidden Strings

Run the forbidden-string checker:


``` bash
node assets/bin/check-forbidden-strings.js  assets/antipatterns.toml
```

If **zero violations** are found, proceed to Task 5.
If violations are found, proceed to Task 4.

## Task 4: Fix Config Rules (Iterative)

For each violation reported in Task 3:
1. Identify which forbidden string was found and in which file/line
2. Create what translation rule is missing or incorrect in `assets/configs/${CURRENT_ORIGINAL_VERSION}.json`
3. Add or fix the rule in the `assets/configs/${CURRENT_ORIGINAL_VERSION}.json`

After updating the config, go back to Task 2 (re-run translation and re-check).

**Iteration limit**: If you have iterated more than 5 times without reaching zero violations, stop and report the remaining violations in the conversion report with analysis of why they persist. Some violations may require manual intervention or be false positives.

## Task 5: Manual Compliance Verification

After forbidden strings are cleared, perform a thorough manual review:

1. Read 2-4 representative files from `gsd-opencode/` (at least one agent, one command, and one reference/template file)
2. Compare each against `TRANSLATION-MAPPING.md` requirements section by section:
   - Command names use `-` not `:`
   - Tool names are lowercase
   - Frontmatter uses YAML map format for tools with `true` values
   - Colors use hex codes not names
   - Paths reference `~/.config/opencode/` not `~/.claude/`
   - URLs point to `rokicool/gsd-opencode`
   - No `<sub>` tags remain
   - `$ARGUMENTS` variable usage is preserved
3. If inconsistencies are found, update `assets/configs/1-20-5.json` and go back to Task 3

## Task 6: Generate Conversion Report

Create `CONV-REPORT.md` in the project root with:

- **Summary**: Number of files processed, total rules applied, iterations needed
- **Translation Config**: Path to the config file used, total number of rules
- **Rule Categories**: Breakdown of rules by category (URLs, commands, tools, paths, etc.)
- **Iterations Log**: How many translate/check cycles were needed and what was fixed in each
- **Remaining Issues**: Any known issues, edge cases, or items needing manual review
- **Files Changed**: List of all files that were modified during translation
- **Verification Status**: Results of the manual compliance check from Task 6
</requirements>

<constraints>
- Always run scripts with `--apply` flag when you intend to make actual changes (default is dry-run)
- Never modify files in `original/` — that is the upstream source of truth
- The JSON config must be valid JSON — test-parse it before using it
- Rule ordering in the config matters: more specific patterns must come before generic ones to prevent partial replacements
- If `translate.js` or `check-forbidden-strings.js` exits with a non-zero code, treat it as an actionable failure that needs resolution, not a fatal error to abandon the task
- Preserve any OpenCode-specific files already in `gsd-opencode/` that do not have counterparts in `original/` (the copy script reports these as "orphans")
</constraints>

<verification>
Before declaring this task complete, verify ALL of the following:

1. `node assets/bin/check-forbidden-strings.js assets/antipatterns.toml` exits with code 0 (no violations)
2. At least 3 representative files in `gsd-opencode/` have been manually inspected against TRANSLATION-MAPPING.md
3. The config file `assets/configs/1-20-5.json` exists and is valid JSON
4. `CONV-REPORT.md` exists in the project root with all required sections
5. No files in `original/` were modified (run `git diff original/` to confirm)
</verification>

<success_criteria>
- All files from original/ are copied and translated in gsd-opencode/
- Zero forbidden strings remain (check-forbidden-strings exits clean)
- All TRANSLATION-MAPPING.md transformation categories are covered by config rules
- CONV-REPORT.md provides a complete audit trail of the conversion
- The translation config is reusable for future syncs from upstream
</success_criteria>
