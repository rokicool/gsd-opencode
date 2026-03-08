**Context**

This is a translation/migration project from get-shit-done-cc (Claude Code) to gsd-opencode (OpenCode)
One of the steps is to use 

assets/bin/translate.js config.json 

utility to replace strings according to the assets/prompts/TRANSLATION-MAPPING.md.

By default assets/bin/translate.js does not perform any changes. All rules must be coded as config.json.

**The task**

Generate a suitable assets/configs/config.json file to comply with assets/prompts/TRANSLATION-MAPPING.md. This file must include all the logic to be executed by assets/bin/translate.js and replace Claude Code based syntax with OpenCode based syntax.

**References**

assets/bin/TRANSLATION.md
assets/prompts/TRANSLATION-MAPPING.md

**DO NOT**

Do not translate anything! You task is to analyze and create assets/configs/config.json file for the future use.
