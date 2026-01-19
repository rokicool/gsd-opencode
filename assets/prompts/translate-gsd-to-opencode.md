
# /create-prompt @./prompts/translate-gsd-to-opencode.md

Take ./original/get-shit-done system of metaprompts for Claude Code and build similar system for opencode. The auditory is any application developer.

There are several complications.

1. The main goal is ability to run the get-shit-done propmpts as commands in OpenCode (https://opencode.ai). All the tools, agents, names related to Claude Code should be translated to similar tools, agents, names for OpenCode.
2. Examine OpenCode documentation https://opencode.ai/docs.
3. The config folder for opencode is ~/.config/opencode OR .opencode/ (not ~/.claude).
4. Claude Code supports "/gsd:subcommand" syntax for the command. Opencode doesn't support ":" in command names. Add "name: gsd-<name-of-command>" to the header of every command
5. In ./original/get-shit-done the custom commands are located in the ./orginial/get-shit-done/commands/gsd. It is a Cloud Code notation. In OpenCode the same commands must be put into ./gsd-opencode/command/gsd folder. Important: "command" instead of "commands"
6. All 
    - ./original/get-shit-done/get-shit-done/references/*.md files must be transleted to ./gsd-opencode/get-shit-done/references/*.md files and all the specific names, tools, agents related to Claude Code must be translated to releveant names, tools, agents to OpenCode.
    - ./original/get-shit-done/get-shit-done/templates/*.md files must be transleted to ./gsd-opencode/get-shit-done/templates/*.md files and all the specific names, tools, agents related to Claude Code must be translated to releveant names, tools, agents to OpenCode.
    - ./original/get-shit-done/get-shit-done/workflows/*.md files must be transleted to ./gsd-opencode/get-shit-done/workflows/*.md files and all the specific names, tools, agents related to Claude Code must be translated to releveant names, tools, agents to OpenCode.
7. All ./original/agents/*.md files must be translated to ./gsd-opencode/agents files with all the names, tools related to Claude Code must be translated to releveant names, tools, agents to Open Code. Here is the link to official OpenCode Agents documentation - https://opencode.ai/docs/agents/.
8. When there is a metaprompt that expects 'All argiments', update that line with `$ARGUMENTS` variable
9. Replace Claude Code tools with similar OpenCode tools.
10. Replace Claude Code agent names with similar OpenCode agents names.
11. The author of the prompts is TACHES (https://github.com/glittercowboy/get-shit-done).
12. The name of the current project is "gds-opencode".
13. All references in target folder (./gsd-opencode) to `get-shit-done-cc` should be replaced with `gsd-opencode`
14. All references in target folder (./gsd-opencode) to `https://raw.githubusercontent.com/glittercowboy/get-shit-done` should be replaced with `https://raw.githubusercontent.com/rokicool/gsd-opencode`
15. When original prompt uses "<sub>something</sub>" tags - replace the tags with one star '*': *something\* in the OpenCode adopted version
16. When orignial prompt uses "/clear" command - replace it with "/new" command
17. Forbidden strings in the target (./gsd-opencode) folder:
    There is a utility "assets/bin/check-forbidden-strings.js" that can check the "gsd-opencode/" for forbidden strings. You can utilize the utility to final check the translation.
18. You can define /TRANSLATION-MAPPING.md document to reference for every translation prompt.
19. DO NOT modify:
- ./README.md
- ./assets/*
- ./gsd-opencode/bin/*
- ./gsd-opencode/package.json
- ./original/*

====

./original/get-shit-done/README.md file and create /out-README.md file with content updated from Claude Code infrastructure to OpenCode. You can use assets/prompts/TRANSLATION-MAPPING.md file as guidance.

If there is unsertainty use web documentation https://opencode.ai/docs and https://code.claude.com/docs/en/

====

Use assets/prompts/TRANSLATION-MAPPING.md document to update all Agent definiion files in gsd-opencode/agents folder from Claude Code to OpenCode notation.
Translate color to it's HEX definiton.
