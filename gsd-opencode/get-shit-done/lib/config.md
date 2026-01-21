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

Built-in defaults live in code (this library), not in config.json. The file stores **only overrides** and the user's active profile.

Default values:

- `profiles.active_profile`: `"balanced"`
- `profiles.custom_overrides`: `{}`

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
