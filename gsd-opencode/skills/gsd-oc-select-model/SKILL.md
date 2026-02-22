---
name: gsd-oc-select-model
description: Interactive model selection workflow with paginated navigation. Use when users want to select a model interactively - guides them through provider selection then model selection using the question tool with pagination support for large lists.
---

# Select Model Skill

Interactive workflow to select an AI model from opencode's available providers and models.

## Script Location

The script is bundled with this skill at:
```
scripts/select-models.cjs
```

Run with:
```bash
node <skill-dir>/scripts/select-models.cjs [options]
```

Where `<skill-dir>` is the installation directory of this skill.

## Workflow

### Step 1: Get Providers

Run the script with `--providers-only` to get the list of providers:

```bash
node <skill-dir>/scripts/select-models.cjs --providers-only
```

Returns JSON:
```json
{
  "provider_count": N,
  "providers": [
    {"name": "...", "model_count": N, "sample_models": "...", "has_sub_providers": true|false}
  ]
}
```

**Key field:** `has_sub_providers` - indicates if this provider has a hierarchical structure (3-level) or flat structure (2-level).

### Step 2: Ask User to Select Provider (with Pagination)

Use the question tool with paginated options. **Show 10 providers per page.**

**Pagination pattern:**
- For each page, include navigation options as needed:
  - `"→ Next"` - to go to next page (include when not on last page)
  - `"← Previous"` - to go to previous page (include when not on first page)
- Track current page index (0-based)
- Label the provider options clearly: show name and model count

**Example for page 0 (first 10 providers):**
```
Question: "Select a provider (page 1/N, showing 1-10 of M):"
Options:
- "google (28 models)"
- "google-vertex (27 models)"
- ...
- "→ Next"
```

**When user selects "→ Next":**
- Increment page index
- Call question tool again with next 10 providers

**When user selects "← Previous":**
- Decrement page index
- Call question tool again with previous 10 providers

**When user selects a provider:**
- Save the selected provider name
- Save `has_sub_providers` flag from the provider data
- Proceed to Step 3

### Step 3: Check Provider Hierarchy

After provider selection, run the script to check if the provider has sub-providers:

```bash
node <skill-dir>/scripts/select-models.cjs --provider "provider-name"
```

**Returns one of two JSON structures:**

**A. For flat providers (2-level flow):**
```json
{
  "provider": "openai",
  "model_count": 5,
  "models": ["gpt-4", "gpt-3.5-turbo", ...]
}
```
- `models` array present → Proceed to Step 5 (2-level flow)

**B. For hierarchical providers (3-level flow):**
```json
{
  "provider": "synthetic",
  "has_sub_providers": true,
  "sub_provider_count": 3,
  "sub_providers": [
    {"name": "deepseek-ai", "model_count": 5, "sample_models": "..."},
    {"name": "nvidia", "model_count": 4, "sample_models": "..."},
    ...
  ]
}
```
- `has_sub_providers: true` → Proceed to Step 4 (3-level flow)
- Save the `sub_providers` array for the next step

### Step 4: Sub-Provider Selection (3-level flow only)

**Only for hierarchical providers.** Use the question tool with paginated options. **Show 10 sub-providers per page.**

**Breadcrumb format:** `Provider: {name} > Select a sub-provider (page X/Y, showing A-B of M)`

**Example for page 0:**
```
Question: "Provider: synthetic > Select a sub-provider (page 1/1, showing 1-3 of 3):"
Options:
- "deepseek-ai (5 models)"
- "nvidia (4 models)"
- "perplexity-ai (3 models)"
- "← Back"
```

**Navigation:**
- `"→ Next"` / `"← Previous"` - standard pagination
- `"← Back"` - returns to provider selection (Step 2), preserves `provider_page`

**When user selects a sub-provider:**
- Save the selected sub-provider name
- Proceed to Step 5

### Step 5: Model Selection

**For 2-level flow:** Use models from Step 3 response

**For 3-level flow:** Run the script with both provider and sub-provider:

```bash
node <skill-dir>/scripts/select-models.cjs --provider "provider-name" --sub-provider "sub-provider-name"
```

Returns JSON:
```json
{
  "provider": "synthetic",
  "sub_provider": "deepseek-ai",
  "model_count": 5,
  "models": ["DeepSeek-R1", "DeepSeek-V3", ...]
}
```

**Pagination:** **Show 15 models per page.**

**Breadcrumb format varies by flow:**
- 2-level: `Provider: {name} > Select a model (page X/Y, showing A-B of M)`
- 3-level: `Provider: {p} > Sub-provider: {sp} > Select a model (page X/Y, showing A-B of M)`

**Example for 2-level flow (page 0):**
```
Question: "Provider: openai > Select a model (page 1/1, showing 1-5 of 5):"
Options:
- "gpt-4"
- "gpt-3.5-turbo"
- "..."
- "← Back"
```

**Example for 3-level flow (page 0):**
```
Question: "Provider: synthetic > Sub-provider: deepseek-ai > Select a model (page 1/1, showing 1-5 of 5):"
Options:
- "DeepSeek-R1"
- "DeepSeek-V3"
- "..."
- "← Back"
```

**Navigation:**
- `"→ Next"` / `"← Previous"` - standard pagination
- `"← Back"` - returns to provider selection (2-level) or sub-provider selection (3-level)

**When user selects a model:**
- Return the full model ID:
  - 2-level: `provider/model-name`
  - 3-level: `provider/sub-provider/model-name`

## Breadcrumb Navigation

Breadcrumbs appear in the question header to orient the user at each selection level.

### Breadcrumb Formats

| Level | Format | Example |
|-------|--------|---------|
| Provider selection | `Select a provider (page X/Y, showing A-B of M)` | "Select a provider (page 1/3, showing 1-10 of 25)" |
| Sub-provider selection (3-level) | `Provider: {name} > Select a sub-provider (page X/Y, showing A-B of M)` | "Provider: synthetic > Select a sub-provider (page 1/2, showing 1-10 of 15)" |
| Model selection (2-level) | `Provider: {name} > Select a model (page X/Y, showing A-B of M)` | "Provider: openai > Select a model (page 1/1, showing 1-5 of 5)" |
| Model selection (3-level) | `Provider: {p} > Sub-provider: {sp} > Select a model (page X/Y, showing A-B of M)` | "Provider: synthetic > Sub-provider: deepseek-ai > Select a model (page 1/1, showing 1-5 of 5)" |

### Implementation Notes

- **Separator:** Use `" > "` (space-angle-space) between levels for readability
- **Current context:** Always show the selected provider/sub-provider name to orient the user
- **Page info:** Include `(page X/Y, showing A-B of M)` at the end of the breadcrumb
- **Internal vs display:** Page indices are 0-based internally, displayed as 1-based to users

## Navigation and State Management

### "← Back" Navigation

The `"← Back"` option allows users to return to previous levels:

| Current Level | "← Back" Goes To | State Preserved |
|---------------|------------------|-----------------|
| Sub-provider selection | Provider selection | `provider_page` |
| Model selection (2-level) | Provider selection | `provider_page` |
| Model selection (3-level) | Sub-provider selection | `sub_provider_page`, `provider_page` |

### State Variables to Track

Maintain these variables at the conversation level:

| Variable | Type | Description |
|----------|------|-------------|
| `provider_page` | number (0-based) | Current provider page index |
| `sub_provider_page` | number (0-based) | Current sub-provider page index (3-level only) |
| `model_page` | number (0-based) | Current model page index |
| `selected_provider` | string | Name of the selected provider (for breadcrumbs) |
| `selected_sub_provider` | string | Name of the selected sub-provider (3-level only) |
| `has_sub_providers` | boolean | Whether the selected provider is hierarchical |

### Pagination State Preservation

When navigating back, preserve the page index so the user returns to the same page they were on:

- **Sub-provider → Provider:** `provider_page` is preserved; user sees the same provider list page
- **Models → Sub-provider (3-level):** `sub_provider_page` is preserved; user sees the same sub-provider list page
- **Models → Provider (2-level):** `provider_page` is preserved; user sees the same provider list page

**Implementation:** Store page indices before navigating to the next level, restore when user selects `"← Back"`.

## Implementation Notes

- **Page size:** 10 for providers/sub-providers, 15 for models
- **Navigation options:** Always show `"→ Next"` and/or `"← Previous"` at the end of the option list (before `"← Back"` in 3-level flows)
- **Page info:** Include `(page X/Y, showing A-B of M)` in the question header for orientation
- **State persistence:** Page indices and selections persist at conversation level
- **Back option:** `"← Back"` appears as the last option in the question list when not at the top level
- **Type your own:** The question tool adds a "Type your own answer" option automatically - users can use this to jump to a specific provider/model by name
- **Return formats:**
  - 2-level: `provider/model` (e.g., `xai/grok-2`)
  - 3-level: `provider/sub-provider/model` (e.g., `synthetic/deepseek-ai/DeepSeek-R1`)
- **Dependencies:** The script has no external dependencies (self-contained Node.js)
- **Indices:** Page indices are 0-based internally, displayed as 1-based to users

## Example Flows

### Example 1: 2-Level Flow (Flat Provider)

This is the standard flow for providers without sub-providers (e.g., openai, xai, google).

```
1. LLM: Run select-models --providers-only
2. LLM: Question: "Select a provider (page 1/2, showing 1-10 of 15):"
   Options: [google, google-vertex, ..., → Next]
3. User: Selects "→ Next"
4. LLM: Question: "Select a provider (page 2/2, showing 11-15 of 15):"
   Options: [← Previous, vercel, xai, zai-coding-plan]
5. User: Selects "xai (22 models)"
6. LLM: Run select-models --provider xai
   Response: {"provider": "xai", "model_count": 22, "models": [...]}
7. LLM: Question: "Provider: xai > Select a model (page 1/2, showing 1-15 of 22):"
   Options: [grok-2, grok-2-1212, ..., → Next, ← Back]
8. User: Selects "grok-2"
9. LLM: Returns "Selected model: xai/grok-2"
```

### Example 2: 3-Level Flow (Hierarchical Provider) with Back Navigation

This flow demonstrates hierarchical provider selection with back navigation (e.g., synthetic).

**State tracking:**
- `provider_page` = 0, `selected_provider` = "synthetic"
- `sub_provider_page` = 0, `selected_sub_provider` = "deepseek-ai"
- `model_page` = 0

```
1. LLM: Run select-models --providers-only
   Response includes: {"name": "synthetic", "model_count": 100, "has_sub_providers": true, ...}
2. LLM: Question: "Select a provider (page 1/3, showing 1-10 of 25):"
   Options: [google, synthetic (100 models, 12 sub-providers), ..., → Next]
3. User: Selects "synthetic"
   State: provider_page = 0, selected_provider = "synthetic", has_sub_providers = true
4. LLM: Run select-models --provider synthetic
   Response: {"provider": "synthetic", "has_sub_providers": true, "sub_providers": [...]}
5. LLM: Question: "Provider: synthetic > Select a sub-provider (page 1/2, showing 1-10 of 12):"
   Options: [deepseek-ai (5 models), nvidia (4 models), ..., → Next, ← Back]
6. User: Selects "deepseek-ai"
   State: sub_provider_page = 0, selected_sub_provider = "deepseek-ai"
7. LLM: Run select-models --provider synthetic --sub-provider deepseek-ai
   Response: {"provider": "synthetic", "sub_provider": "deepseek-ai", "model_count": 5, "models": [...]}
8. LLM: Question: "Provider: synthetic > Sub-provider: deepseek-ai > Select a model (page 1/1, showing 1-5 of 5):"
   Options: [DeepSeek-R1, DeepSeek-V3, ..., ← Back]
9. User: Selects "← Back" (wants to choose different sub-provider)
10. LLM: Question: "Provider: synthetic > Select a sub-provider (page 1/2, showing 1-10 of 12):"
    Options: [deepseek-ai (5 models), nvidia (4 models), ..., → Next, ← Back]
    (Note: Returns to same page due to preserved sub_provider_page = 0)
11. User: Selects "nvidia"
    State: sub_provider_page = 0 (preserved), selected_sub_provider = "nvidia"
12. LLM: Run select-models --provider synthetic --sub-provider nvidia
13. LLM: Question: "Provider: synthetic > Sub-provider: nvidia > Select a model (page 1/1, showing 1-4 of 4):"
    Options: [Llama-3.1-8B, ..., ← Back]
14. User: Selects "Llama-3.1-8B"
15. LLM: Returns "Selected model: synthetic/nvidia/Llama-3.1-8B"
```

### Example 3: Back Navigation from Models to Providers (2-Level)

Demonstrates state preservation when navigating back in a 2-level flow.

```
1. LLM: Run select-models --providers-only
2. LLM: Question: "Select a provider (page 1/3, showing 1-10 of 28):"
   Options: [google, ..., → Next]
3. User: Selects "→ Next" (twice) to reach page 3
4. LLM: Question: "Select a provider (page 3/3, showing 21-28 of 28):"
   Options: [← Previous, xai, zai-coding-plan]
   State: provider_page = 2
5. User: Selects "xai"
6. LLM: Run select-models --provider xai
7. LLM: Question: "Provider: xai > Select a model (page 1/2, showing 1-15 of 22):"
   Options: [grok-2, ..., → Next, ← Back]
8. User: Selects "← Back" (wants to choose different provider)
9. LLM: Question: "Select a provider (page 3/3, showing 21-28 of 28):"
   Options: [← Previous, xai, zai-coding-plan]
   (Note: Returns to page 3 due to preserved provider_page = 2)
10. User: Selects "zai-coding-plan"
11. LLM: Run select-models --provider zai-coding-plan
12. LLM: Returns "Selected model: zai-coding-plan/plan-1"
```
