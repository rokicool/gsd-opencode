---
phase: 05-frontmatter-rewriting
verified: 2026-01-21T18:40:32Z
status: gaps_found
score: 3/4 must-haves verified
gaps:
  - truth: "Per-stage overrides apply correct model to each stage's agents"
    status: failed
    reason: "Override storage is documented (profiles.custom_overrides.*) but applyProfile() uses getPresetConfig() which does not merge custom_overrides, so agent rewrites will ignore per-stage overrides."
    artifacts:
      - path: "gsd-opencode/get-shit-done/lib/config.md"
        issue: "getPresetConfig() returns preset mapping but never overlays profiles.custom_overrides"
      - path: "gsd-opencode/get-shit-done/lib/agents.md"
        issue: "applyProfile() uses getPresetConfig(presetName) stageModels and never applies overrides"
      - path: "gsd-opencode/agents/gsd-set-profile.md"
        issue: "Edit flow stores profiles.custom_overrides, but confirm path still calls applyProfile(newProfile) (no edited mapping passed)"
    missing:
      - "Config helper that returns effective stage models (preset + custom_overrides)"
      - "applyProfile() to use effective stage models (including overrides) when rewriting agent frontmatter"
      - "gsd-set-profile confirm flow to apply edited stage models to rewriting (either via effective config or passing edited mapping)"
---

# Phase 5: Frontmatter Rewriting Verification Report

**Phase Goal:** Profile changes update agent file frontmatter with per-stage overrides.
**Verified:** 2026-01-21T18:40:32Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Changing profile rewrites `model:` frontmatter in all 11 agent files | ✓ VERIFIED | `agents.md` defines `applyProfile()` which iterates `planning/execution/verification` stages via `getAgentsForStage()` and rewrites each agent using `rewriteFrontmatter()` (see `### applyProfile(presetName)` and `### rewriteFrontmatter(agentInfo, newModel)`). |
| 2 | Per-stage overrides apply correct model to each stage's agents | ✗ FAILED | `gsd-set-profile.md` documents editing and persisting `profiles.custom_overrides.{stage}`, but `config.md:getPresetConfig()` does not apply overrides and `agents.md:applyProfile()` only uses `getPresetConfig(presetName)` stageModels. |
| 3 | Frontmatter rewriting preserves all other keys and body content | ✓ VERIFIED | `agents.md:serializeFrontmatter()` explicitly preserves key order (except `model` reposition), preserves `tools:` block verbatim, and appends body content from `bodyStart` unchanged.
| 4 | Rewriting is idempotent (same profile twice = same result) | ✓ VERIFIED | `agents.md:applyProfile()` checks `currentModel === stageModel` and adds agent to `unchanged` without rewriting.

**Score:** 3/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---------|----------|--------|---------|
| `gsd-opencode/get-shit-done/lib/agents.md` | `serializeFrontmatter()`, `rewriteFrontmatter()`, `applyProfile()` procedures for rewriting agent frontmatter | ✓ VERIFIED | Exists and is substantive (~903 lines). Contains `function serializeFrontmatter`, `function rewriteFrontmatter`, `function applyProfile` pseudocode blocks. |
| `gsd-opencode/agents/gsd-set-profile.md` | Command flow that applies profile changes after confirmation | ✓ VERIFIED | Exists and is substantive (~411 lines). References `@gsd-opencode/get-shit-done/lib/agents.md` and instructs calling `applyProfile(newProfile)` on confirm. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `gsd-opencode/agents/gsd-set-profile.md` | `gsd-opencode/get-shit-done/lib/agents.md` | `@` reference in `<context>` | ✓ WIRED | `@gsd-opencode/get-shit-done/lib/agents.md` present in context. |
| `applyProfile()` (`agents.md`) | `getPresetConfig()` (`config.md`) | stage model lookup | ✓ WIRED | `agents.md` calls `getPresetConfig(presetName)` to obtain `stageModels`. |
| `applyProfile()` (`agents.md`) | `validateAllAgents()` (`agents.md`) | pre-validation before write | ✓ WIRED | `agents.md` calls `validateAllAgents()` and aborts before rewriting if invalid. |
| `applyProfile()` (`agents.md`) | per-stage overrides (`profiles.custom_overrides`) | merge/overlay into stageModels | ✗ NOT WIRED | No helper exists to merge `custom_overrides` into the stage model mapping used for rewriting. |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|------------|--------|----------------|
| AGNT-01: Profile changes rewrite `model:` frontmatter in agent files | ✓ SATISFIED | — |
| PROF-02: User can set per-stage model overrides | ✗ BLOCKED | Overrides are stored/documented but never applied to rewriting (and no “effective mapping” function exists). |

### Anti-Patterns Found

No TODO/FIXME/placeholder patterns found in the key phase artifacts (`agents.md`, `gsd-set-profile.md`).

### Human Verification (Recommended after gap closure)

Even after wiring overrides correctly, this phase should be manually exercised because it mutates files on disk.

#### 1. Apply profile rewrites agent frontmatter

**Test:** Run `/gsd-set-profile quality` and confirm.

**Expected:** The 11 stage agent files (`gsd-opencode/agents/gsd-*.md`, excluding `gsd-set-profile.md`) now contain a `model:` key in frontmatter matching the profile’s per-stage models.

**Why human:** Requires running the interactive command flow and observing real file diffs.

#### 2. Idempotency (second run produces no diffs)

**Test:** Re-run `/gsd-set-profile quality` and confirm.

**Expected:** Command reports `modified: 0`, `unchanged: 11` (or equivalent), and `git diff` shows no changes.

**Why human:** Requires running the command twice and checking filesystem changes.

## Gaps Summary

The repo contains a detailed frontmatter rewrite design (`serializeFrontmatter`, `rewriteFrontmatter`, `applyProfile`) and the `/gsd-set-profile` command is wired to reference it. However, the phase goal explicitly includes **per-stage overrides**, and the current design stores overrides (`profiles.custom_overrides`) without ever applying them to the stage→model mapping used for rewriting. As a result, agent `model:` frontmatter updates will follow only preset values and ignore overrides.

---

_Verified: 2026-01-21T18:40:32Z_
_Verifier: OpenCode (gsd-verifier)_
