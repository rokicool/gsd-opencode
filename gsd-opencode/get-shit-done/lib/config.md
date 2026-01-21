# Config Helper Library (Phase 01-01)

This file is designed to be **@-referenced** by other GSD commands that need to read/write project configuration.

It manages the project's config file at:

- `.planning/config.json`

## Config Schema

**Note:** JSON does not support comments. The comments below are documentation only.

```jsonc
{
  "mode": "...",            // existing (pre-phase)
  "depth": "...",           // existing (pre-phase)
  "parallelization": true,    // existing (pre-phase)

  "profiles": {               // new in Phase 1
    "active_profile": "balanced",
    "custom_overrides": {}
  }
}
```

### Defaults (built-in)

Built-in defaults live in code (this library). The file stores the user's active profile and any editable mappings (like preset definitions).

### Key preservation note (why different repos may have more config keys)

This repository’s `.planning/config.json` started as a **minimal baseline** (pre-phase keys):

- `mode`
- `depth`
- `parallelization`

Other repositories (or older/newer templates) may legitimately include **additional top-level keys** (for example: `gates`, richer `parallelization` objects, etc.). Those differences come from *how the repo was initialized*, not from profile work removing keys.

**Intended guarantee:** `writeConfig()` must **deep-merge overlays** and **preserve all existing/unknown keys**. Profile-related work should only add/update `profiles.*` and must never delete unrelated settings.

**Reproducible verification (git):**

```bash
git log --oneline -- .planning/config.json
git show ec90fca:.planning/config.json
git show 418cff8:.planning/config.json
```

When you compare these snapshots/diffs, changes should be additive under `profiles.*` (no commits removing other top-level keys).

Default values:

- `profiles.active_profile`: `"balanced"`
- `profiles.custom_overrides`: `{}`
- `profiles.presets`: built-in defaults for `quality`, `balanced`, and `budget` (can be overridden by config.json)

## Procedures

> The procedures below are written as language-agnostic pseudocode so they can be translated into whichever runtime the command is implemented in.

---

### readConfig()

**Purpose:** Read and parse `.planning/config.json`.

**Behavior:**

1. If `.planning/config.json` does not exist:
   - return a default config object
2. If file exists:
   - parse as JSON
   - if JSON is invalid:
     - log warning: `"Config file corrupted, using defaults"`
     - attempt to back up the corrupted file to `.planning/config.json.bak` **before** any future overwrite
     - return defaults (do not crash)
3. Auto-heal:
   - ensure required keys exist (currently: `profiles`, `profiles.active_profile`, `profiles.custom_overrides`)
   - if keys were restored, log: `"Restored missing config keys: profiles.active_profile"` (comma-separated)
4. Lenient parsing:
   - preserve unknown keys (do not strip)
   - optionally warn: `"Unknown config key: 'foo' - ignoring"`

**Returns:** A config object.

**Pseudocode:**

```ts
function readConfig() {
  const DEFAULTS = {
    profiles: {
      active_profile: "balanced",
      presets: {
        quality: {
          planning: "opencode/glm-4.7-free",
          execution: "opencode/glm-4.7-free",
          verification: "opencode/glm-4.7-free",
        },
        balanced: {
          planning: "opencode/glm-4.7-free",
          execution: "opencode/minimax-m2.1-free",
          verification: "opencode/glm-4.7-free",
        },
        budget: {
          planning: "opencode/minimax-m2.1-free",
          execution: "opencode/grok-code",
          verification: "opencode/minimax-m2.1-free",
        },
      },
      custom_overrides: {},
    },
  };

  // If file is missing, return defaults.
  if (!exists(".planning/config.json")) {
    return DEFAULTS;
  }

  const raw = readFile(".planning/config.json");
  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    warn("Config file corrupted, using defaults");

    // Backup corrupted file for recovery/debugging.
    // Best-effort: failure to back up should not crash.
    try {
      writeFile(".planning/config.json.bak", raw);
    } catch {}

    return DEFAULTS;
  }

  const { healedConfig, restoredKeys, unknownKeys } = autoHealConfig(parsed, DEFAULTS);

  if (restoredKeys.length > 0) {
    warn(`Restored missing config keys: ${restoredKeys.join(", ")}`);
  }

  for (const key of unknownKeys) {
    warn(`Unknown config key: '${key}' - ignoring`);
  }

  return healedConfig;
}
```

**Example scenarios:**

- **Missing file**: `.planning/config.json` doesn't exist → returns defaults
- **Corrupted JSON**: file contains `{"mode":` (truncated) → warns and returns defaults, writes `.planning/config.json.bak`
- **Missing keys**: file exists but missing `profiles.active_profile` → warns keys restored and returns healed config
- **Unknown keys**: file contains `{ "foo": 1 }` → warns unknown key but keeps it in the returned object

---

### writeConfig(config)

**Purpose:** Persist configuration to `.planning/config.json`.

**Behavior:**

1. Validate `.planning/` directory exists
   - If missing: error: `"No .planning directory found. Run /gsd-new-project first."`
2. Read existing config (if any)
   - if existing config is corrupted, follow the same backup/recovery behavior as `readConfig()`
3. Merge:
   - preserve all existing keys (including unknown)
   - apply the incoming `config` as an overlay (do not replace the entire file)
4. Write JSON with **2-space indent** and trailing newline

**Pseudocode:**

```ts
function writeConfig(config) {
  if (!existsDir(".planning")) {
    return { ok: false, error: "No .planning directory found. Run /gsd-new-project first." };
  }

  const existing = exists(".planning/config.json")
    ? safeReadConfigFile(".planning/config.json")
    : {};

  const merged = deepMerge(existing, config);
  writeFile(".planning/config.json", JSON.stringify(merged, null, 2) + "\n");
  return { ok: true };
}
```

**Example scenarios:**

- **Missing .planning/**: returns `{ ok: false, error: "No .planning directory found. Run /gsd-new-project first." }`
- **Safe merge**: existing config has `mode`, `depth`, `parallelization` and new `profiles` is added without clobbering

---

### validateProfile(profileName)

**Purpose:** Validate profile names against known options.

**Known profiles:**

- `quality`
- `balanced`
- `budget`

**Returns:**

- `{ valid: true }`, or
- `{ valid: false, error: string, validOptions: string[] }`

**Pseudocode:**

```ts
function validateProfile(profileName) {
  const validOptions = ["quality", "balanced", "budget"];
  if (validOptions.includes(profileName)) {
    return { valid: true };
  }

  // Optional: suggest closest match if obvious.
  // (Example heuristic: Levenshtein distance or prefix match.)
  const suggestion = suggestClosest(profileName, validOptions); // returns string | null

  const suggestionMsg = suggestion ? ` Did you mean '${suggestion}'?` : "";
  return {
    valid: false,
    error: `Invalid profile '${profileName}'. Valid options: ${validOptions.join(", ")}.${suggestionMsg}`,
    validOptions,
  };
}
```

**Example scenarios:**

- `validateProfile("quality")` → `{ valid: true }`
- `validateProfile("balnced")` → `{ valid: false, error: "Invalid profile 'balnced'. Valid options: quality, balanced, budget. Did you mean 'balanced'?", validOptions: [...] }`

---

### getActiveProfile()

**Purpose:** Get the currently active profile.

**Behavior:**

- Reads config via `readConfig()`
- Returns `config.profiles.active_profile`
- Defaults to `"balanced"`

**Pseudocode:**

```ts
function getActiveProfile() {
  const config = readConfig();
  return config?.profiles?.active_profile ?? "balanced";
}
```

---

### setActiveProfile(profileName)

**Purpose:** Set the active profile in config.

**Behavior:**

1. Validate via `validateProfile(profileName)`
2. If invalid, return failure with error
3. If valid:
   - read existing config
   - set `profiles.active_profile`
   - persist via `writeConfig()`

**Returns:** `{ ok: true }` or `{ ok: false, error: string }`

**Pseudocode:**

```ts
function setActiveProfile(profileName) {
  const validation = validateProfile(profileName);
  if (!validation.valid) {
    return { ok: false, error: validation.error };
  }

  const config = readConfig();
  const updated = {
    ...config,
    profiles: {
      ...(config.profiles ?? {}),
      active_profile: profileName,
    },
  };

  return writeConfig(updated);
}
```

**Example scenarios:**

- Set to valid profile: `setActiveProfile("budget")` → persists `profiles.active_profile = "budget"`
- Set to invalid profile: `setActiveProfile("cheap")` → returns `{ ok: false, error: "Invalid profile 'cheap'. Valid options: ..." }`

---

## Preset Definitions

Presets are semantic, user-editable stage-to-model mappings stored under `profiles.presets`.

### Preset schema (profiles.presets)

```jsonc
{
  "profiles": {
    "active_profile": "balanced",
    "presets": {
      "quality": {
        "planning": "opencode/glm-4.7-free",
        "execution": "opencode/glm-4.7-free",
        "verification": "opencode/glm-4.7-free"
      },
      "balanced": {
        "planning": "opencode/glm-4.7-free",
        "execution": "opencode/minimax-m2.1-free",
        "verification": "opencode/glm-4.7-free"
      },
      "budget": {
        "planning": "opencode/minimax-m2.1-free",
        "execution": "opencode/grok-code",
        "verification": "opencode/minimax-m2.1-free"
      }
    },
    "custom_overrides": {}
  }
}
```

### Agent-to-stage mapping

| Stage | Agents |
|-------|--------|
| planning | gsd-planner, gsd-plan-checker, gsd-phase-researcher, gsd-roadmapper, gsd-project-researcher, gsd-research-synthesizer, gsd-codebase-mapper |
| execution | gsd-executor, gsd-debugger |
| verification | gsd-verifier, gsd-integration-checker |

---

### getPresetConfig(presetName)

**Purpose:** Get the stage-to-model mappings for a preset.

**Important:** `getPresetConfig()` returns the **raw preset mapping** only. It does **not** apply any per-stage overrides from `profiles.custom_overrides`. If you need the models that will actually be applied at runtime (including overrides), use `getEffectiveStageModels()`.

**Behavior:**

1. Validate `presetName` via `validateProfile()`
2. Read config via `readConfig()`
3. Return the preset's stage mappings from `config.profiles.presets[presetName]`
4. If preset not found in config (should not happen with proper seeding), use built-in defaults

**Returns:** Object with `{ planning: string, execution: string, verification: string }`

**Pseudocode:**

```ts
function getPresetConfig(presetName) {
  const validation = validateProfile(presetName);
  if (!validation.valid) {
    return { ok: false, error: validation.error };
  }

  const BUILTIN_DEFAULTS = {
    quality: {
      planning: "opencode/glm-4.7-free",
      execution: "opencode/glm-4.7-free",
      verification: "opencode/glm-4.7-free",
    },
    balanced: {
      planning: "opencode/glm-4.7-free",
      execution: "opencode/minimax-m2.1-free",
      verification: "opencode/glm-4.7-free",
    },
    budget: {
      planning: "opencode/minimax-m2.1-free",
      execution: "opencode/grok-code",
      verification: "opencode/minimax-m2.1-free",
    },
  };

  const config = readConfig();
  const presets = config?.profiles?.presets ?? BUILTIN_DEFAULTS;
  const preset = presets[presetName] ?? BUILTIN_DEFAULTS[presetName];

  return {
    ok: true,
    preset: {
      planning: preset.planning,
      execution: preset.execution,
      verification: preset.verification,
    },
  };
}
```

---

### getEffectiveStageModels(presetName)

**Purpose:** Get the **effective** stage-to-model mapping that should be used at runtime when rewriting agent frontmatter.

This is the canonical helper whenever you need the stage models OpenCode will actually use:

- Start from the preset mapping (via `getPresetConfig(presetName)`)
- Overlay per-stage overrides from `config.profiles.custom_overrides.{stage}`

**Behavior requirements:**

1. Validate `presetName` via `validateProfile()`
2. Read config via `readConfig()`
3. Read the raw preset mapping via `getPresetConfig(presetName)`
4. Overlay `config.profiles.custom_overrides` on top of the preset mapping:
   - Only apply known stages: `planning | execution | verification`
   - Only apply override values that are **non-empty strings**
   - Ignore any unknown keys in `custom_overrides`

**Returns:**

- Success: `{ ok: true, stageModels: { planning, execution, verification } }`
- Failure: `{ ok: false, error: string }`

**Pseudocode:**

```ts
function getEffectiveStageModels(presetName) {
  // 1) Validate preset name
  const validation = validateProfile(presetName);
  if (!validation.valid) {
    return { ok: false, error: validation.error };
  }

  // 2) Read config (contains custom overrides)
  const config = readConfig();

  // 3) Start with the raw preset mapping
  const presetResult = getPresetConfig(presetName);
  if (!presetResult.ok) {
    return { ok: false, error: presetResult.error };
  }

  const stageModels = { ...presetResult.preset };

  // 4) Overlay per-stage overrides (only known stages; only non-empty strings)
  const overrides = config?.profiles?.custom_overrides ?? {};
  const stages = ["planning", "execution", "verification"];

  for (const stage of stages) {
    const override = overrides?.[stage];
    if (typeof override === "string" && override.trim() !== "") {
      stageModels[stage] = override;
    }
  }

  return { ok: true, stageModels };
}
```

**Usage note:** Use `getEffectiveStageModels()` anywhere you need the models that will actually be applied (for example: `applyProfile()` when rewriting agent frontmatter).

### getAgentsForStage(stage)

**Purpose:** Return the list of agents that belong to a given stage.

**Pseudocode:**

```ts
function getAgentsForStage(stage) {
  const STAGE_AGENTS = {
    planning: [
      "gsd-planner",
      "gsd-plan-checker",
      "gsd-phase-researcher",
      "gsd-roadmapper",
      "gsd-project-researcher",
      "gsd-research-synthesizer",
      "gsd-codebase-mapper",
    ],
    execution: ["gsd-executor", "gsd-debugger"],
    verification: ["gsd-verifier", "gsd-integration-checker"],
  };

  return STAGE_AGENTS[stage] ?? [];
}
```

## Usage

Reference this file in commands that need config access:

```markdown
@~/.config/opencode/get-shit-done/lib/config.md
```

### Reading config

- Call `readConfig()` to get the current configuration.
- It returns an object that includes both:
  - existing keys (like `mode`, `depth`, `parallelization`)
  - new keys (like `profiles.active_profile`)

### Changing active profile

1. Call `validateProfile(name)` first
2. If valid, call `setActiveProfile(name)`
3. Provide user feedback on success/failure

Example:

```ts
const validation = validateProfile(input);
if (!validation.valid) {
  // Show validation.error to user
  return;
}

const result = setActiveProfile(input);
if (!result.ok) {
  // Show result.error to user
  return;
}

// Success message: "Active profile set to <input>"
```

### Extending config

To add new config sections in future phases:

1. Read existing config with `readConfig()`
2. Add your keys to the object
3. Write back with `writeConfig()` — existing keys are preserved

Example:

```ts
const config = readConfig();
config.some_future_section = { enabled: true };
writeConfig(config);
```

## Manual Editing Notes

- `.planning/config.json` is meant to be **human-editable**.
- It is written with 2-space indentation for readability.
- JSON does **not** support comments.
- If a manual edit makes the file invalid JSON, the next `readConfig()` call will:
  - warn (`"Config file corrupted, using defaults"`)
  - back up the bad content to `.planning/config.json.bak`
  - continue using defaults (no crash)
