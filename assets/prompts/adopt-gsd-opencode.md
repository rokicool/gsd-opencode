# /create-prompt @./prompts/adopt-gsd-opencode.md

Take ./src/get-shit-done system of metaprompts for Claude Code and build similar system for opencode. The auditory is any application developer.

There are several complications.

1. The main goal is ability to run the get-shit-done propmpts as commands in opencode. All the tools, agents, names related to Claude Code should be translated to similar tools, agents, names for OpenCode.
2. Examine opencode documentation https://opencode.ai/docs.
3. The config folder for opencode is ~/.config/opencode OR .opencode/ (not ~/.claude).
4. Claude Code supports "/gsd:subcommand" syntax for the command. Opencode doesn't support ":" in command names. Add "name: gsd-<name-of-command>" to the header of every command
5. In ./src/get-shit-done the custom commands are located in the ./src/get-shit-done/commands/gsd. It is a Cloud Code notation. In OpenCode the same commands must be put into ./gsd-opencode/command/gsd folder. Important: "command" instead of "commands"
6. All ./srg/get-shit-done/**/*.md files must be transleted to ./gsd-opencode/get-shit-done files and all the specific names, tools, agents related to Claude Code must be translated to releveant names, tools, agents to Open Code.
7. When there is a metaprompt that expects 'All argiments', update that line with ($ARGUMENTS) variable
8. Replace Claude Code tools with similar OpenCode tools.
9. Replace Claude Code agent names with similar OpenCode agents names.
10. The author of the prompts is TACHES (https://github.com/glittercowboy/get-shit-done).
11. The name of the current project is "gds-opencode".
12. When original prompt uses "<sub>something</sub>" tags - replace the tags with one star '*': *something\* in the OpenCode adopted version
13. Do not modify:

- ./README.md
- ./assets/\*
- ./gsd-opencode/bin/\*
- ./gsd-opencode/package.json
- ./src/\*
