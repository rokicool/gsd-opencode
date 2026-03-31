---
name: gsd-set-profile
description: Switch model profile for GSD agents (simple/smart/genius/inherit)
argument-hint: <profile (simple|smart|genius|inherit)>
model: haiku
permissions:
   bash: true
---

Show the following output to the user verbatim, with no extra commentary:

!`node "$HOME/.config/opencode/get-shit-done/bin/gsd-tools.cjs" config-set-model-profile $ARGUMENTS --raw`
