---
name: gsd-set-profile
description: Switch model profile for GSD agents (simple/smart/genius/inherit)
argument-hint: "<profile (simple|smart|genius|inherit)>"
permissions:
   bash: true
---

<objective>
Switch the model profile for GSD agents to adjust quality vs speed tradeoffs.

Accepts profiles: `simple` (fastest, cheapest), `smart` (balanced), `genius` (highest quality), `inherit` (use orchestrator model).
Configures model selection across all GSD agent workflows via `gsd-sdk query config-set-model-profile`.
</objective>

!`if ! command -v gsd-sdk >/dev/null 2>&1; then printf '⚠ gsd-sdk not found in PATH — /gsd-set-profile requires it.\n\nInstall the GSD SDK:\n  npm install -g @gsd-build/sdk\n\nOr update GSD to get the latest packages:\n  /gsd-update\n'; exit 1; fi; gsd-sdk query config-set-model-profile $ARGUMENTS --raw`
