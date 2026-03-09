---
name: gsd-check-profile
description: Validate gsd-opencode profile configuration
permissions:
  read: true
  bash: true
---
<objective>
Validate gsd-opencode profile configuration across both `opencode.json` and `.planning/oc_config.json`, then report results.

Routes to the oc-check-profile workflow which handles:
- Validating all agent model IDs exist in the opencode models catalog
- Validating gsd-opencode profile structure and current profile exists
- Reporting results with severity classification (OK/WARNING/ERROR)
- Recommending /gsd-set-profile when issues are found
</objective>

<execution_context>
@~/.config/opencode/get-shit-done/workflows/oc-check-profile.md
</execution_context>

<process>
**Follow the oc-check-profile workflow** from `@~/.config/opencode/get-shit-done/workflows/oc-check-profile.md`.

The workflow handles all logic including:
1. Running both validations (check-opencode-json and check-config-json)
2. Classifying results by severity (OK/WARNING/ERROR)
3. Reporting results with structured diagnostic output
4. Recommending /gsd-set-profile when errors are found
</process>
