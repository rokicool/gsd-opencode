# Features Research: Model Profile Management

**Domain:** Developer tool configuration/settings commands
**Researched:** 2026-01-20
**Confidence:** MEDIUM-HIGH

## Executive Summary

Model profile management for GSD-OpenCode needs to support three preset profiles (quality/balanced/budget), per-stage model overrides (planning/execution/verification), editable preset mappings, and agent frontmatter rewriting. This research identifies table stakes features for parity with established patterns, differentiators to improve on the original Claude Code GSD approach, and anti-features to deliberately avoid.

**Key finding:** The original Claude Code GSD does NOT have `/gsd:settings` or `/gsd:set-profile` commands — these are net-new features for OpenCode. Claude Code itself has model configuration via `/model` command and `settings.json`, but no preset-based profile system. This means we're building a differentiated feature, not porting an existing one.

---

## Table Stakes

Features users expect from any config/settings command in developer tools. Missing = feels broken.

### TS-01: View Current Settings
| Aspect | Detail |
|--------|--------|
| **Description** | Display current active profile and all model assignments per stage |
| **Why Expected** | Every config tool shows current state (npm config list, git config --list) |
| **Complexity** | Low |
| **Pattern Source** | npm config list, git config --list, Claude Code `/status` |

### TS-02: Quick Profile Switch
| Aspect | Detail |
|--------|--------|
| **Description** | One-command switch between preset profiles: `/gsd-set-profile quality` |
| **Why Expected** | Core use case — user shouldn't need interactive prompts for simple switch |
| **Complexity** | Low |
| **Pattern Source** | git checkout, aws configure --profile, Claude Code `/model sonnet` |

### TS-03: Profile Validation
| Aspect | Detail |
|--------|--------|
| **Description** | Validate profile name exists before switching, clear error if not |
| **Why Expected** | Basic UX — don't fail silently or with cryptic errors |
| **Complexity** | Low |
| **Pattern Source** | All CLI tools validate arguments |

### TS-04: Persistence Across Sessions
| Aspect | Detail |
|--------|--------|
| **Description** | Profile selection persists in `.planning/config.json` |
| **Why Expected** | Settings should survive session end/restart |
| **Complexity** | Low |
| **Pattern Source** | npm writes to `.npmrc`, git to `.gitconfig`, Claude Code to `~/.claude.json` |

### TS-05: Human-Readable Config Format
| Aspect | Detail |
|--------|--------|
| **Description** | Config stored as human-editable JSON/YAML (not binary) |
| **Why Expected** | Developers expect to hand-edit configs, commit to git |
| **Complexity** | Low |
| **Pattern Source** | Universal — JSON/YAML for dev tools |

### TS-06: Profile Display Names
| Aspect | Detail |
|--------|--------|
| **Description** | Show friendly profile descriptions, not just IDs |
| **Why Expected** | "quality" alone isn't descriptive; should show what models it uses |
| **Complexity** | Low |
| **Pattern Source** | Claude Code model config shows model names clearly |

---

## Differentiators

Features that set GSD-OpenCode apart. Not expected, but create real value vs. alternatives.

### DIFF-01: Preset Profiles with Semantic Names
| Aspect | Detail |
|--------|--------|
| **Description** | Three semantic presets: quality (opus/opus), balanced (opus for planning, sonnet for execution), budget (sonnet/sonnet) |
| **Value Proposition** | Maps to user intent, not technical model names. "I want quality results" vs "I want claude-4-opus-20240229" |
| **Complexity** | Low |
| **Why Differentiating** | Claude Code only has `opusplan` special mode; no named presets or budget option |

### DIFF-02: Per-Stage Model Overrides
| Aspect | Detail |
|--------|--------|
| **Description** | Override model for specific stages: planning, execution, verification |
| **Value Proposition** | Fine-grained control — use opus for planning, sonnet for bulk execution, opus for verification |
| **Complexity** | Medium |
| **Why Differentiating** | Claude Code's `opusplan` only handles plan vs execution; no verification stage differentiation |

### DIFF-03: Interactive Profile Editor
| Aspect | Detail |
|--------|--------|
| **Description** | `/gsd-settings` opens guided TUI for profile editing with explanations |
| **Value Proposition** | Discoverability — users learn what stages exist and how profiles work |
| **Complexity** | Medium |
| **Why Differentiating** | Claude Code `/config` opens settings menu but no profile-specific editor |

### DIFF-04: Editable Preset Mappings
| Aspect | Detail |
|--------|--------|
| **Description** | Users can modify what models each preset uses (e.g., make "quality" use sonnet-4-5 instead of opus) |
| **Value Proposition** | Future-proof — new models don't require code changes; local customization for cost constraints |
| **Complexity** | Medium |
| **Why Differentiating** | Claude Code aliases are hardcoded; can't redefine what "sonnet" means |

### DIFF-05: Agent Frontmatter Rewriting
| Aspect | Detail |
|--------|--------|
| **Description** | Profile changes automatically update agent `.md` frontmatter to match new model settings |
| **Value Proposition** | Single source of truth — profile change takes effect across all agents without manual editing |
| **Complexity** | High |
| **Why Differentiating** | Novel approach — most tools don't manage agent definitions dynamically |

### DIFF-06: Profile Preview/Dry-Run
| Aspect | Detail |
|--------|--------|
| **Description** | Show what would change before applying profile switch |
| **Value Proposition** | Safety — understand impact before committing, especially for frontmatter rewriting |
| **Complexity** | Low |
| **Why Differentiating** | Most config tools don't preview changes |

### DIFF-07: Cost Estimation per Profile
| Aspect | Detail |
|--------|--------|
| **Description** | Show estimated cost implications of each profile (quality costs ~3x budget) |
| **Value Proposition** | Informed decision making — users understand financial impact |
| **Complexity** | Medium |
| **Why Differentiating** | No CLI tools show cost estimates; usually requires external calculators |

---

## Anti-Features

Features to deliberately NOT build. Common mistakes or scope creep traps.

### AF-01: Per-Command Model Override
| Aspect | Detail |
|--------|--------|
| **What** | `/gsd-execute-phase --model opus` flag on every command |
| **Why Avoid** | Creates confusion — which model am I using? Profile or flag? Profiles are the abstraction |
| **What Instead** | Use profiles. If user needs temp override, switch profile then switch back |

### AF-02: Environment Variable Overrides
| Aspect | Detail |
|--------|--------|
| **What** | `GSD_MODEL=opus /gsd-execute-phase` env var support |
| **Why Avoid** | Conflicts with profile system; debugging nightmare; users forget env is set |
| **What Instead** | Profiles in config.json only. Simple, visible, debuggable |

### AF-03: Model Aliases/Nicknames
| Aspect | Detail |
|--------|--------|
| **What** | Let users create arbitrary model aliases like `my-favorite-model` → `claude-4-opus` |
| **Why Avoid** | Overengineering. Three preset profiles + editable mappings covers 99% of use cases |
| **What Instead** | Edit preset mappings if needed |

### AF-04: Per-Agent Model Override
| Aspect | Detail |
|--------|--------|
| **What** | Different models for gsd-planner vs gsd-executor vs gsd-verifier |
| **Why Avoid** | Complexity explosion. Stages (planning/execution/verification) map to agent types already |
| **What Instead** | Per-stage overrides cover this use case more intuitively |

### AF-05: Remote/Cloud Profile Sync
| Aspect | Detail |
|--------|--------|
| **What** | Sync profiles across machines via cloud service |
| **Why Avoid** | Scope creep. `.planning/` is in git already — commit and push for "sync" |
| **What Instead** | Git is the sync mechanism. Profile in config.json, committed |

### AF-06: Profile Inheritance/Composition
| Aspect | Detail |
|--------|--------|
| **What** | "extends: balanced" to create custom profiles based on presets |
| **Why Avoid** | YAGNI. Three presets + editable mappings is sufficient |
| **What Instead** | Fork a preset by editing its mappings |

### AF-07: Automatic Profile Selection Based on Task
| Aspect | Detail |
|--------|--------|
| **What** | Auto-detect task complexity and select profile |
| **Why Avoid** | Magic is confusing. User should explicitly choose quality/cost tradeoff |
| **What Instead** | User picks profile explicitly. Predictable > "smart" |

### AF-08: Undo/History for Profile Changes
| Aspect | Detail |
|--------|--------|
| **What** | `/gsd-settings --undo` to revert last profile change |
| **Why Avoid** | Git provides history. Overengineering simple config changes |
| **What Instead** | `git diff .planning/config.json`, `git checkout .planning/config.json` |

---

## Feature Dependencies

```
TS-05 (Config Format)
    └── TS-04 (Persistence) ─┐
    └── TS-06 (Display Names) ─┤
                               └── TS-01 (View Current)

TS-03 (Validation)
    └── TS-02 (Quick Switch)

DIFF-01 (Preset Profiles) ─┬── DIFF-02 (Per-Stage Overrides)
                           ├── DIFF-04 (Editable Mappings)
                           └── DIFF-06 (Preview)

DIFF-02 (Per-Stage Overrides) ── DIFF-05 (Frontmatter Rewriting)

DIFF-01 + DIFF-02 ── DIFF-03 (Interactive Editor)

DIFF-01 ── DIFF-07 (Cost Estimation) [nice-to-have, not blocking]
```

**Critical path for MVP:**
1. TS-05 → TS-04 → TS-01 (config storage and viewing)
2. TS-03 → TS-02 (profile switching)
3. DIFF-01 → DIFF-02 (preset system with stages)

---

## Complexity Assessment

| Feature | Complexity | Effort | Notes |
|---------|------------|--------|-------|
| **TS-01: View Current** | Low | <1hr | Read config.json, format output |
| **TS-02: Quick Switch** | Low | <1hr | Parse arg, update config, validate |
| **TS-03: Validation** | Low | <30min | Check against known profiles list |
| **TS-04: Persistence** | Low | <30min | JSON read/write to config.json |
| **TS-05: Config Format** | Low | <30min | JSON schema definition |
| **TS-06: Display Names** | Low | <30min | Static mapping, format in output |
| **DIFF-01: Preset Profiles** | Low | 1-2hr | Three hardcoded presets with model mappings |
| **DIFF-02: Per-Stage Overrides** | Medium | 2-3hr | Extend config schema, merge logic |
| **DIFF-03: Interactive Editor** | Medium | 3-4hr | TUI flow with prompts, validation |
| **DIFF-04: Editable Mappings** | Medium | 2-3hr | Config schema for custom model names |
| **DIFF-05: Frontmatter Rewriting** | High | 4-6hr | Parse agents, update model fields, preserve structure |
| **DIFF-06: Preview** | Low | 1hr | Diff display before applying |
| **DIFF-07: Cost Estimation** | Medium | 2hr | Pricing data, calculation display |

**Total MVP (TS-* + DIFF-01/02):** ~6-8 hours
**Full Feature Set:** ~18-24 hours

---

## MVP Recommendation

**MVP must include:**
1. All table stakes (TS-01 through TS-06) — non-negotiable for basic functionality
2. DIFF-01: Preset profiles — core value proposition
3. DIFF-02: Per-stage overrides — differentiates from Claude Code's limited opusplan

**Defer to post-MVP:**
- DIFF-03: Interactive editor — nice UX but not blocking
- DIFF-04: Editable mappings — power user feature
- DIFF-05: Frontmatter rewriting — complex, can be manual initially
- DIFF-06: Preview — polish
- DIFF-07: Cost estimation — nice to have

**Rationale:** MVP should let users switch between quality/balanced/budget profiles with per-stage control. Interactive editing and frontmatter automation are improvements, not essentials.

---

## Sources

| Source | Type | Confidence | Used For |
|--------|------|------------|----------|
| Claude Code docs (settings) | Official docs | HIGH | Settings patterns, scopes, model config |
| Claude Code docs (model-config) | Official docs | HIGH | Model aliases, opusplan behavior |
| GSD-OpenCode codebase | Direct inspection | HIGH | Agent structure, frontmatter format |
| npm config docs | Official docs | HIGH | CLI config command patterns |
| GitHub code search | Community patterns | MEDIUM | Real-world profile/config implementations |

---

## Open Questions

1. **Default profile on fresh install:** Should quality, balanced, or budget be default? (Recommend: balanced)
2. **Config location:** `.planning/config.json` or separate `.planning/profiles.json`? (Recommend: extend config.json)
3. **Frontmatter model field:** What's the exact field name in agent frontmatter? (Need to verify: likely `model:` in YAML)
