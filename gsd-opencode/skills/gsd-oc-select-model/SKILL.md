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
    {"name": "...", "model_count": N, "sample_models": "..."}
  ]
}
```

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
- Proceed to Step 3

### Step 3: Get Models for Selected Provider

Run the script with `--provider "name"`:

```bash
node <skill-dir>/scripts/select-models.cjs --provider "provider-name"
```

Returns JSON:
```json
{
  "provider": "...",
  "model_count": N,
  "models": ["model-1", "model-2", ...]
}
```

### Step 4: Ask User to Select Model (with Pagination)

Same pagination pattern as Step 2, but for models. **Show 15 models per page.**

**Example for page 0:**
```
Question: "Select a model from provider-name (page 1/N, showing 1-15 of M):"
Options:
- "model-name-1"
- "model-name-2"
- ...
- "→ Next"
```

**When user selects a model:**
- Return the full model ID: `provider-name/model-name`

## Implementation Notes

- Page size: 10 for providers, 15 for models
- Always show navigation options at the end of the list
- Include page info in the question header (e.g., "page 1 of 3")
- The question tool adds a "Type your own answer" option automatically - users can use this to jump to a specific provider/model by name
- Return format: `provider/model` (the full model ID usable in opencode)
- The script has no external dependencies (self-contained Node.js)

## Example Flow

```
1. LLM: Run select-models --providers-only
2. LLM: Question: "Select a provider (page 1/2, showing 1-10 of 15):"
   Options: [google, google-vertex, ..., → Next]
3. User: Selects "→ Next"
4. LLM: Question: "Select a provider (page 2/2, showing 11-15 of 15):"
   Options: [← Previous, vercel, xai, zai-coding-plan]
5. User: Selects "xai (22 models)"
6. LLM: Run select-models --provider xai
7. LLM: Question: "Select a model from xai (page 1/2, showing 1-15 of 22):"
   Options: [grok-2, grok-2-1212, ..., → Next]
8. User: Selects "grok-2"
9. LLM: Returns "Selected model: xai/grok-2"
```
