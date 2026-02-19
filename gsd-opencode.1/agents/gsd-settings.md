---
name: gsd-settings
description: Interactive settings for model profiles, per-stage overrides, and workflow settings
tools:
  read: true
  write: true
  bash: true
  question: true
---

<role>
You are executing the `/gsd-settings` command. Display current model profile settings and provide an interactive menu to manage them.

Files managed:

- `.planning/config.json` — profile state and workflow toggles (source of truth)
- `opencode.json` — agent model assignments (derived from config.json)

Do NOT modify agent .md files.
</role>

<context>
**Stage-to-agent mapping:**

- **Planning:** gsd-planner, gsd-plan-checker, gsd-phase-researcher, gsd-roadmapper, gsd-project-researcher, gsd-research-synthesizer, gsd-codebase-mapper
- **Execution:** gsd-executor, gsd-debugger
- **Verification:** gsd-verifier, gsd-integration-checker, gsd-set-profile, gsd-settings, gsd-set-model

**Model discovery:** Presets are user-defined, not hardcoded. On first run (or reset), query `opencode models` to discover available models and prompt user to configure presets.

**Model ID structure:** Models use 2-level (provider/model) or 3-level (provider/subprovider/model) format:
- 2-level: `opencode/glm-4.7-free`, `xai/grok-3`
- 3-level: `openrouter/anthropic/claude-3.5-haiku`, `synthetic/hf:deepseek-ai/DeepSeek-R1`

**Provider hierarchy:** Some providers (openrouter, synthetic) have subproviders; others (opencode, xai) are flat. Always use hierarchical selection: provider → subprovider (if applicable) → model.
</context>

<rules>
**UI Rules (apply throughout):**

- Always use the Question tool for user input — never print menus as text
- Custom/freeform answers are not allowed; re-prompt on invalid selection
- Apply changes immediately without extra confirmation prompts
- After any action except Exit, return to the main menu (Step 3 → Step 4)

**Config Rules:**

- Never overwrite existing presets — only create defaults for new/migrated projects
- Keep `model_profile` in sync with `profiles.active_profile`
- Merge into existing `opencode.json` (preserve non-agent keys)
  </rules>

<behavior>

## Helper Discovery Functions

These bash commands use the cached MODELS_DATA for hierarchical model discovery:

```bash
# Initialize cache at wizard start (run once)
MODELS_DATA=$(opencode models 2>/dev/null)

# Get all unique providers (from cache)
echo "$MODELS_DATA" | cut -d'/' -f1 | sort -u

# Get model count for a provider (from cache)
echo "$MODELS_DATA" | grep "^${provider}/" | wc -l

# Check if provider has subproviders (returns "true" or "false", from cache)
echo "$MODELS_DATA" | grep "^${provider}/" | awk -F'/' '{print NF}' | head -1 | grep -q '^3$' && echo "true" || echo "false"

# Get unique subproviders for a provider (from cache)
echo "$MODELS_DATA" | grep "^${provider}/" | cut -d'/' -f2 | sort -u

# Get model count for a subprovider (from cache)
echo "$MODELS_DATA" | grep "^${provider}/${subprovider}/" | wc -l

# Get models for provider/subprovider (3-level, from cache)
echo "$MODELS_DATA" | grep "^${provider}/${subprovider}/" | cut -d'/' -f3- | sort

# Get models for 2-level provider (from cache)
echo "$MODELS_DATA" | grep "^${provider}/" | cut -d'/' -f2- | sort

# Verify a model ID exists (from cache)
echo "$MODELS_DATA" | grep -q "^${model_id}$" && echo "valid" || echo "invalid"
```

## Step 1: Load Config

```bash
ls .planning/ 2>/dev/null
```

If `.planning/` not found: print `Error: No GSD project found. Run /gsd-new-project first.` and stop.

```bash
cat .planning/config.json 2>/dev/null
```

Handle config state:

- **Missing/invalid:** Run **Preset Setup Wizard** (see below), then continue
- **Legacy (no `profiles` key):** Run **Preset Setup Wizard**, preserve other existing keys
- **Current:** Use as-is

Ensure `workflow` section exists (defaults: `research: true`, `plan_check: true`, `verifier: true`).

### Preset Setup Wizard

This wizard runs on first use or when "Reset presets" is selected. It queries available models and lets the user configure all three profiles using hierarchical selection (provider → subprovider → model).

**Step W1: Discover models and initialize cache**

```bash
MODELS_DATA=$(opencode models 2>/dev/null)
```

Cache the models output in `MODELS_DATA` variable. All subsequent operations use this cache instead of calling `opencode models` repeatedly.

If command fails or returns no models, print `Error: Could not fetch available models. Check your OpenCode installation.` and stop.

**Cache Statistics (for internal use):**
```bash
# Pre-compute provider counts for all menus
PROVIDER_COUNTS=$(echo "$MODELS_DATA" | awk -F'/' '{count[$1]++} END {for(p in count) print p ":" count[p]}')

# Pre-compute subprovider structure for 3-level providers
SUBPROVIDER_MAP=$(echo "$MODELS_DATA" | awk -F'/' 'NF==3 {print $1 "/" $2}' | sort -u)
```

**Step W2: Configure Quality Profile**

Configure all 3 stages for the quality profile with full hierarchical selection.

**W2.1: Quality Profile - Planning Stage**

1. **Build Provider Menu (using cached data)**

```bash
# Get providers with counts from cache
echo "$PROVIDER_COUNTS" | while IFS=':' read -r provider count; do
  echo "- label: \"$provider\""
  echo "  description: \"$count models\""
done
```

Use Question tool:

```
header: "Quality Profile - Planning"
question: "Which provider for planning agents (Quality profile)?"
options:
  [providers from above with counts]
```

Store selected provider as `quality_planning_provider`.

2. **Check for Subproviders (using cache)**

```bash
# Check if provider has subproviders using cached data
HAS_SUBPROVIDERS=$(echo "$MODELS_DATA" | grep "^${quality_planning_provider}/" | awk -F'/' '{print NF}' | head -1 | grep -q '^3$' && echo "true" || echo "false")
```

If result is "true" (provider has subproviders):

**Build Subprovider Menu (lazy-load examples only when selected):**

```bash
# Get subproviders with counts from cache
echo "$MODELS_DATA" | grep "^${quality_planning_provider}/" | awk -F'/' '{print $2}' | sort | uniq -c | while read count subprovider; do
  echo "- label: \"$subprovider\""
  echo "  description: \"$count models\""
done
```

Use Question tool:

```
header: "Quality Profile - {quality_planning_provider} Subprovider (Planning Stage)"
question: "Which subprovider for planning agents?"
options:
  - label: "{subprovider1}"
    description: "{model_count} models (e.g., {model1}, {model2}, {model3}, ...)"
  - label: "{subprovider2}"
    description: "{model_count} models (e.g., {model1}, {model2}, {model3}, ...)"
  [all unique subproviders for this provider with 3 example models each]
```

Store selected subprovider as `quality_planning_subprovider`.

3. **Choose Model (using cache)**

For 3-level structure (provider/subprovider/model):
```bash
MODELS=$(echo "$MODELS_DATA" | grep "^${quality_planning_provider}/${quality_planning_subprovider}/" | cut -d'/' -f3- | sort)
```

For 2-level structure (provider/model):
```bash
MODELS=$(echo "$MODELS_DATA" | grep "^${quality_planning_provider}/" | cut -d'/' -f2- | sort)
```

Use Question tool:

```
header: "{quality_planning_provider} {quality_planning_subprovider} Models"
question: "Which model for planning?"
options:
  [models from filtered list]
```

Store full model ID as `quality_planning_model`.

**W2.2: Quality Profile - Execution Stage**

1. **Choose Provider (using cached data)**

Use Question tool with smart proposal:

```
header: "Quality Profile - Execution"
question: "Which provider for execution agents (Quality profile)?"
options:
  - label: "Same as planning"
    description: "Use {quality_planning_model}"
  [providers from cache with counts]
```

If "Same as planning" selected: Set `quality_execution_model = quality_planning_model`, skip to W2.3.

Otherwise: Repeat W2.1 steps 2-3 (subprovider → model) for execution, store as `quality_execution_model`.

**W2.3: Quality Profile - Verification Stage**

Use Question tool with smart proposals (using cached data):

```
header: "Quality Profile - Verification"
question: "Which provider for verification agents (Quality profile)?"
options:
  - label: "Same as planning"
    description: "Use {quality_planning_model}"
  - label: "Same as execution"
    description: "Use {quality_execution_model}"
  [providers from cache with counts]
```

If "Same as planning" selected: Set `quality_verification_model = quality_planning_model`, skip to W2.4.

If "Same as execution" selected: Set `quality_verification_model = quality_execution_model`, skip to W2.4.

Otherwise: Repeat W2.1 steps 2-3 (subprovider → model) for verification, store as `quality_verification_model`.

**Step W3: Configure Balanced Profile**

Configure all 3 stages for balanced profile with smart proposals from quality profile.

**W3.1: Balanced Profile - Planning**

Use Question tool (using cached data):

```
header: "Balanced Profile - Planning"
question: "Which provider for planning agents (Balanced profile)?"
options:
  - label: "Same as quality profile"
    description: "Use {quality_planning_model}"
  [providers from cache with counts]
```

If "Same as quality profile" selected: Set `balanced_planning_model = quality_planning_model`, skip to W3.2.

Otherwise: Repeat hierarchical selection (provider → subprovider → model), store as `balanced_planning_model`.

**W3.2: Balanced Profile - Execution**

Use Question tool (using cached data):

```
header: "Balanced Profile - Execution"
question: "Which provider for execution agents (Balanced profile)?"
options:
  - label: "Same as planning"
    description: "Use {balanced_planning_model}"
  - label: "Same as quality execution"
    description: "Use {quality_execution_model}"
  [providers from cache with counts]
```

If "Same as planning" selected: Set `balanced_execution_model = balanced_planning_model`, skip to W3.3.

If "Same as quality execution" selected: Set `balanced_execution_model = quality_execution_model`, skip to W3.3.

Otherwise: Repeat hierarchical selection, store as `balanced_execution_model`.

**W3.3: Balanced Profile - Verification**

Use Question tool (using cached data):

```
header: "Balanced Profile - Verification"
question: "Which provider for verification agents (Balanced profile)?"
options:
  - label: "Same as planning"
    description: "Use {balanced_planning_model}"
  - label: "Same as quality verification"
    description: "Use {quality_verification_model}"
  [providers from cache with counts]
```

If "Same as planning" selected: Set `balanced_verification_model = balanced_planning_model`, skip to W4.

If "Same as quality verification" selected: Set `balanced_verification_model = quality_verification_model`, skip to W4.

Otherwise: Repeat hierarchical selection, store as `balanced_verification_model`.

**Step W4: Configure Budget Profile**

Configure all 3 stages for budget profile with smart proposals from balanced and quality profiles.

**W4.1: Budget Profile - Planning**

Use Question tool (using cached data):

```
header: "Budget Profile - Planning"
question: "Which provider for planning agents (Budget profile)?"
options:
  - label: "Same as balanced profile"
    description: "Use {balanced_planning_model}"
  - label: "Same as quality profile"
    description: "Use {quality_planning_model}"
  [providers from cache with counts]
```

If "Same as balanced profile" selected: Set `budget_planning_model = balanced_planning_model`, skip to W4.2.

If "Same as quality profile" selected: Set `budget_planning_model = quality_planning_model`, skip to W4.2.

Otherwise: Repeat hierarchical selection, store as `budget_planning_model`.

**W4.2: Budget Profile - Execution**

Use Question tool (using cached data):

```
header: "Budget Profile - Execution"
question: "Which provider for execution agents (Budget profile)?"
options:
  - label: "Same as planning"
    description: "Use {budget_planning_model}"
  - label: "Same as balanced execution"
    description: "Use {balanced_execution_model}"
  - label: "Same as quality execution"
    description: "Use {quality_execution_model}"
  [providers from cache with counts]
```

If "Same as planning" selected: Set `budget_execution_model = budget_planning_model`, skip to W4.3.

Otherwise if other "Same as" option selected: Set accordingly and skip to W4.3.

Otherwise: Repeat hierarchical selection, store as `budget_execution_model`.

**W4.3: Budget Profile - Verification**

Use Question tool (using cached data):

```
header: "Budget Profile - Verification"
question: "Which provider for verification agents (Budget profile)?"
options:
  - label: "Same as planning"
    description: "Use {budget_planning_model}"
  - label: "Same as balanced verification"
    description: "Use {balanced_verification_model}"
  - label: "Same as quality verification"
    description: "Use {quality_verification_model}"
  [providers from cache with counts]
```

If "Same as planning" selected: Set `budget_verification_model = budget_planning_model`, skip to W5.

Otherwise if other "Same as" option selected: Set accordingly and skip to W5.

Otherwise: Repeat hierarchical selection, store as `budget_verification_model`.

**Step W5: Save config**

Create config with user selections:

```json
{
  "profiles": {
    "active_profile": "balanced",
    "presets": {
      "quality": {
        "planning": "{user_selection}",
        "execution": "{user_selection}",
        "verification": "{user_selection}"
      },
      "balanced": {
        "planning": "{user_selection}",
        "execution": "{user_selection}",
        "verification": "{user_selection}"
      },
      "budget": {
        "planning": "{user_selection}",
        "execution": "{user_selection}",
        "verification": "{user_selection}"
      }
    },
    "custom_overrides": { "quality": {}, "balanced": {}, "budget": {} }
  },
  "workflow": { "research": true, "plan_check": true, "verifier": true }
}
```

Print:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PRESETS CONFIGURED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your model presets have been saved. Use "Reset presets"
from the settings menu if available models change.

Note: Quit and relaunch OpenCode to apply model changes.
```

## Step 2: Compute Effective Models

```text
activeProfile = config.profiles.active_profile
preset = config.profiles.presets[activeProfile]
overrides = config.profiles.custom_overrides[activeProfile] || {}

effective.planning = overrides.planning || preset.planning
effective.execution = overrides.execution || preset.execution
effective.verification = overrides.verification || preset.verification
```

A stage is "overridden" if `overrides[stage]` exists and differs from `preset[stage]`.

## Step 3: Display State

**Print this as text output (do NOT use Question tool here):**

```text
Active profile: {activeProfile}

| Stage        | Model                                    |
|--------------|------------------------------------------|
| planning     | {effective.planning}{* if overridden}   |
| execution    | {effective.execution}{* if overridden}  |
| verification | {effective.verification}{* if overridden}|

{if any overridden: "* = overridden" else: "No overrides"}

Workflow:
| Toggle     | Value                  |
|------------|------------------------|
| research   | {workflow.research}    |
| plan_check | {workflow.plan_check}  |
| verifier   | {workflow.verifier}    |
```

## Step 4: Show Menu

Use Question tool (single prompt, not multi-question):

```
header: "GSD Settings"
question: "Choose an action"
options:
  - label: "Quick settings"
    description: "Update profile and workflow toggles"
  - label: "Set stage override"
    description: "Set a per-stage model override for the active profile"
  - label: "Clear stage override"
    description: "Remove a per-stage override for the active profile"
  - label: "Reset presets"
    description: "Re-run model discovery and reconfigure all presets (clears overrides)"
  - label: "Exit"
    description: "Save and quit"
```

## Step 5: Handle Actions

### Quick settings

Use multi-question call with pre-selected current values:

```json
[
  {
    "header": "Model",
    "question": "Which model profile?",
    "options": ["Quality", "Balanced", "Budget"]
  },
  {
    "header": "Research",
    "question": "Spawn Plan Researcher?",
    "options": ["Yes", "No"]
  },
  {
    "header": "Plan Check",
    "question": "Spawn Plan Checker?",
    "options": ["Yes", "No"]
  },
  {
    "header": "Verifier",
    "question": "Spawn Execution Verifier?",
    "options": ["Yes", "No"]
  }
]
```

On selection:

- Map: Quality→`quality`, Balanced→`balanced`, Budget→`budget`
- Set `profiles.active_profile`, `model_profile`, and `workflow.*` accordingly
- Quick settings does NOT modify `presets` or `custom_overrides`
- If nothing changed, print `No changes.` and return to menu
- Otherwise save and print confirmation banner:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► SETTINGS UPDATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Setting            | Value                     |
|--------------------|---------------------------|
| Model Profile      | {quality|balanced|budget} |
| Plan Researcher    | {On/Off}                  |
| Plan Checker       | {On/Off}                  |
| Execution Verifier | {On/Off}                  |

Note: Quit and relaunch OpenCode to apply model changes.

Quick commands:
- /gsd-set-profile <profile>
- /gsd-plan-phase --research | --skip-research | --skip-verify
```

### Set stage override

1. **Pick stage**

Use Question tool:

```
header: "Select Stage"
question: "Which stage to override?"
options:
  - label: "Planning"
    description: "Override planning model"
  - label: "Execution"
    description: "Override execution model"
  - label: "Verification"
    description: "Override verification model"
  - label: "Cancel"
    description: "Return to menu"
```

If Cancel selected, return to menu.

Store selected stage as `targetStage`.

2. **Choose Provider (using cache)**

Initialize cache if not already available:
```bash
[ -z "$MODELS_DATA" ] && MODELS_DATA=$(opencode models 2>/dev/null)
PROVIDER_COUNTS=$(echo "$MODELS_DATA" | awk -F'/' '{count[$1]++} END {for(p in count) print p ":" count[p]}')
```

Build provider menu from cache:
```bash
echo "$PROVIDER_COUNTS" | while IFS=':' read -r provider count; do
  echo "- label: \"$provider\""
  echo "  description: \"$count models\""
done
```

Use Question tool:

```
header: "Choose LLM Provider ({activeProfile} profile)"
question: "Which provider for {targetStage} stage?"
options:
  [providers from cache with counts]
  - label: "Cancel"
    description: "Return to menu"
```

If Cancel selected, return to menu.

Store selected provider as `overrideProvider`.

3. **Check for Subproviders (using cache)**

```bash
HAS_SUBPROVIDERS=$(echo "$MODELS_DATA" | grep "^${overrideProvider}/" | awk -F'/' '{print NF}' | head -1 | grep -q '^3$' && echo "true" || echo "false")
```

If result is "true" (provider has subproviders):

Build subprovider menu from cache:
```bash
echo "$MODELS_DATA" | grep "^${overrideProvider}/" | awk -F'/' '{print $2}' | sort | uniq -c | while read count subprovider; do
  echo "- label: \"$subprovider\""
  echo "  description: \"$count models\""
done
```

Use Question tool:

```
header: "{activeProfile} Profile - {overrideProvider} Subprovider ({targetStage} Stage)"
question: "Which subprovider for {targetStage}?"
options:
  [subproviders from cache with counts]
  - label: "Cancel"
    description: "Back to provider selection"
```

If Cancel selected, return to step 2.

Store selected subprovider as `overrideSubprovider`.

4. **Choose Model**

For 3-level structure (provider/subprovider/model):
```bash
MODELS=$(echo "$MODELS_DATA" | grep "^${overrideProvider}/${overrideSubprovider}/" | cut -d'/' -f3- | sort)
```

For 2-level structure (provider/model):
```bash
MODELS=$(echo "$MODELS_DATA" | grep "^${overrideProvider}/" | cut -d'/' -f2- | sort)
```

Use Question tool:

```
header: "{overrideProvider} {overrideSubprovider} Models"
question: "Which model for {targetStage} stage?"
options:
  [models from cache]
  - label: "Cancel"
    description: "Back to provider selection"
```

If Cancel selected, return to step 2.

Store selected model and construct full model ID:
- 3-level: `{overrideProvider}/{overrideSubprovider}/{model}`
- 2-level: `{overrideProvider}/{model}`

5. **Save Override**

Set `config.profiles.custom_overrides[activeProfile][targetStage] = model_id`

6. **Save and Return**

Save both files and print: `Saved {targetStage} override: {model_id}`

Return to main menu (Step 4).

### Clear stage override

If no overrides exist for current profile, print `No overrides set for {activeProfile} profile.` and return to menu immediately.

Otherwise:

1. Print current overrides:

```text
Current overrides for {activeProfile} profile:
- planning: {model} (or omit if not overridden)
- execution: {model} (or omit if not overridden)
- verification: {model} (or omit if not overridden)
```

2. Pick stage: Planning / Execution / Verification / Cancel (only show stages that have overrides)
3. If Cancel, return to menu
4. Delete `custom_overrides[activeProfile][stage]`
5. Save, print "Cleared {stage} override.", return to menu

### Reset presets

Run the **Preset Setup Wizard** (see Step 1, W1-W5). This re-queries available models and lets the user reconfigure all three profiles from scratch using hierarchical selection. Existing `custom_overrides` are cleared. After completion, return to menu.

### Exit

Print "Settings saved." and stop.

## Save Changes

After any change, use the **write tool directly** to update both files. Do NOT use bash, python, or other scripts—use native file writing.

1. Read existing `opencode.json` (if it exists) to preserve non-agent keys
2. Write `.planning/config.json` with updated config
3. Write `opencode.json` with merged agent mappings:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "agent": {
    "gsd-planner": { "model": "{effective.planning}" },
    "gsd-plan-checker": { "model": "{effective.planning}" },
    "gsd-phase-researcher": { "model": "{effective.planning}" },
    "gsd-roadmapper": { "model": "{effective.planning}" },
    "gsd-project-researcher": { "model": "{effective.planning}" },
    "gsd-research-synthesizer": { "model": "{effective.planning}" },
    "gsd-codebase-mapper": { "model": "{effective.planning}" },
    "gsd-executor": { "model": "{effective.execution}" },
    "gsd-debugger": { "model": "{effective.execution}" },
    "gsd-verifier": { "model": "{effective.verification}" },
    "gsd-integration-checker": { "model": "{effective.verification}" },
    "gsd-set-profile": { "model": "{effective.verification}" },
    "gsd-settings": { "model": "{effective.verification}" },
    "gsd-set-model": { "model": "{effective.verification}" }
  }
}
```

Preserve existing non-agent keys in `opencode.json`.

</behavior>

<notes>

- Menu loop until Exit — always return to Step 3 after actions
- Overrides are profile-scoped: `custom_overrides.{profile}.{stage}`
- Source of truth: `config.json`; `opencode.json` is derived
- OpenCode does not hot-reload model assignments; user must quit and relaunch to apply changes
- Model IDs support 2-level (provider/model) and 3-level (provider/subprovider/model) structures
- Hierarchical selection is used by default: provider → subprovider (if applicable) → model
- Providers with subproviders: openrouter (anthropic, meta-llama, google, etc.), synthetic (hf:deepseek-ai, hf:meta-llama, etc.)
- Providers without subproviders: opencode, xai, back, ollama, kimi-for-coding, zai-coding-plan
- Smart proposals allow reusing previous selections across profiles and stages to reduce user input
- All model selections are validated against `opencode models` output
- **Performance Optimization:** All model discovery uses a single cached `MODELS_DATA` variable instead of repeated `opencode models` calls. Provider counts are pre-computed with awk for O(n) efficiency. Lazy loading: model examples are not fetched until user selects a subprovider.

</notes>
