# Model Profile Resolution

Resolve model profile once at the start of orchestration, then use it for all task spawns.

## Resolution Pattern

```bash
MODEL_PROFILE=$(cat .planning/config.json 2>/dev/null | grep -o '"model_profile"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
```

Default: `simple` if not set or config missing.

## Lookup Table

@$HOME/.config/opencode/get-shit-done/references/model-profiles.md

Look up the agent in the table for the resolved profile. Pass the model parameter to subagent calls:

```
@gsd-planner "..."
# model is resolved from profile lookup
```

**Note:** Opus-tier agents resolve to `"inherit"` (not `"opus"`). This causes the agent to use the parent session's model, avoiding conflicts with organization policies that may block specific opus versions.

If `model_profile` is `"adaptive"`, agents resolve to role-based assignments (opus/sonnet/haiku based on agent type).

If `model_profile` is `"inherit"`, all agents resolve to `"inherit"` (useful for OpenCode `/model`).

## Usage

1. Resolve once at orchestration start
2. Store the profile value
3. Look up each agent's model from the table when spawning
4. Model is resolved automatically from profile for each subagent call
