<purpose>
Quick validation workflow that checks both opencode.json and .planning/config.json for profile/model configuration issues.

Fast path: "✓ Profile configuration valid" when both checks pass
Detailed path: Structured error display with what's wrong and how to fix
</purpose>

<required_reading>
read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="check_opencode_json">
Run validation on opencode.json:

```bash
OPENCODE_RESULT=$(node gsd-opencode/get-shit-done/bin/gsd-oc-tools.cjs check-opencode-json 2>&1)
OPENCODE_EXIT=$?
```

Parse JSON output:
- If exit code 0: opencode.json is valid
- If exit code 1: opencode.json has invalid model IDs
- Extract error details from JSON output
</step>

<step name="check_config_json">
Run validation on .planning/config.json:

```bash
CONFIG_RESULT=$(node gsd-opencode/get-shit-done/bin/gsd-oc-tools.cjs check-config-json 2>&1)
CONFIG_EXIT=$?
```

Parse JSON output:
- If exit code 0: config.json is valid
- If exit code 1: config.json has invalid profile configurations
- Extract error details from JSON output
</step>

<step name="evaluate_results">
Evaluate both validation results:

```
if OPENCODE_EXIT == 0 AND CONFIG_EXIT == 0:
  Display success message
  EXIT 0

else:
  Display detailed error report
  Display /gsd-set-profile recommendation
  EXIT 1
```
</step>

<step name="display_success">
When both checks pass:

```
✓ Profile configuration valid

  opencode.json:        ✓ All model IDs valid
  .planning/config.json: ✓ Profile configuration valid

All GSD agents are properly configured.
```
</step>

<step name="display_errors">
When validation fails:

```
✗ Profile configuration issues found

=== opencode.json ===
[If OPENCODE_EXIT == 0]
✓ All model IDs valid

[If OPENCODE_EXIT == 1]
✗ {N} invalid model ID(s) found:

  Agent: {agent_name}
  Current: {invalid_model_id}
  Issue: {error_reason}

=== .planning/config.json ===
[If CONFIG_EXIT == 0]
✓ Profile configuration valid

[If CONFIG_EXIT == 1]
✗ {N} invalid profile configuration(s) found:

  Field: {field_name}
  Current: {current_value}
  Issue: {error_reason}

=== How to Fix ===

1. Review the issues above
2. Run /gsd-set-profile <profile> to apply a valid profile
   Available profiles: simple, smart, genius
3. Or manually edit opencode.json / .planning/config.json

Example:
  /gsd-set-profile smart
```
</step>

<step name="verbose_output">
When --verbose flag is provided:

```bash
if flags.includes('--verbose'):
  echo "[verbose] Checking opencode.json..."
  echo "[verbose] Checking .planning/config.json..."
  echo "[verbose] opencode.json result: {valid|invalid}"
  echo "[verbose] config.json result: {valid|invalid}"
  echo "[verbose] Validation complete"
```
</step>

</process>

<success_criteria>
- [ ] opencode.json validated against model catalog
- [ ] .planning/config.json validated for profile configuration
- [ ] Clear pass/fail output displayed
- [ ] /gsd-set-profile recommendation provided when issues found
- [ ] Fast path when both checks pass
- [ ] Detailed error explanations when checks fail
</success_criteria>
