---
name: gsd-note
description: Zero-friction idea capture. Append, list, or promote notes to todos.
argument-hint: "<text> | list | promote <N> [--global]"
permissions:
   read: true
   write: true
   glob: true
   grep: true
---
<objective>
Zero-friction idea capture — one write call, one confirmation line.

Three subcommands:
- **append** (default): Save a timestamped note file. No questions, no formatting.
- **list**: Show all notes from project and global scopes.
- **promote**: Convert a note into a structured todo.

Runs inline — no task, no question, no bash.
</objective>

<execution_context>
@$HOME/.config/opencode/get-shit-done/workflows/note.md
@$HOME/.config/opencode/get-shit-done/references/ui-brand.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
Execute the note workflow from @$HOME/.config/opencode/get-shit-done/workflows/note.md end-to-end.
Capture the note, list notes, or promote to todo — depending on arguments.
</process>
