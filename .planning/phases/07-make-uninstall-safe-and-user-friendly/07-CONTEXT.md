# Phase 07: Make Uninstall Safe and User-Friendly - Context

**Gathered:** 2026-02-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Enhance the `uninstall` command with a **manifest-based safety system** that ensures ONLY files created by gsd-opencode are deleted. The system tracks all installed files but enforces strict namespace boundaries to protect user data.

**Critical Safety Rule**: Under NO circumstances may the uninstaller delete files or folders not explicitly created by gsd-opencode. If a folder contains even one non-gsd-opencode file, the entire folder must be preserved.

**Allowed Deletion Namespaces**:
- `agents/gsd-*` (gsd-opencode specific agents)
- `command/gsd/*` (gsd-opencode specific commands)
- `skills/gsd-*/` (gsd-opencode specific skills)
- `get-shit-done/` (entire folder - fully owned by gsd-opencode)

**Protected Areas** (NEVER delete):
- Shared folders in `~/.config/opencode/` root
- User-created folders
- Any folder containing non-gsd-opencode files
- Configuration files not explicitly installed by gsd-opencode

</domain>

<decisions>
## Implementation Decisions

### Manifest System
- **Location**: `INSTALLED_FILES.json` in installation root (alongside VERSION)
- **Format**: JSON array with objects containing:
  - `path`: Full absolute path to file
  - `relativePath`: Path relative to install root
  - `size`: File size in bytes
  - `hash`: SHA256 checksum for integrity verification
- **Scope**: Tracks ALL files touched by gsd-opencode (complete audit trail)
- **Creation**: Generated during install/update operations
- **Usage**: Uninstall only removes files in allowed namespaces, even if manifest tracks others

### Uninstall Behavior
- **Missing manifest**: Fallback to hardcoded list of allowed namespaces (`gsd-*` paths)
  - Still safe - only touches known gsd-opencode directories
  - Shows warning: "Manifest missing - using fallback mode"
- **Modified files**: Show warning but proceed with removal
  - Warning format: "⚠ File modified: [path] - will remove anyway"
  - Rationale: If it's in an allowed namespace, gsd-opencode owns it
- **Missing files**: Skip silently (no error)
  - Already gone = already uninstalled
  - Continue with remaining files
- **Directory cleanup**: Only remove directories if empty after removing manifest files
  - Check directory contents after file removal
  - If non-empty (contains non-gsd-opencode files), preserve directory
  - Show message: "📁 Preserved: [dir] (contains non-gsd-opencode files)"

### Dry-Run Mode (--dry-run)
- **Three-category display**:
  1. **Will Remove** (✓): Files in allowed namespaces that will be deleted
  2. **Will Skip** (⚠): Files in allowed namespaces that are already missing
  3. **Will Preserve** (○): Directories that will be kept (non-empty or outside namespaces)
- **Statistics summary**:
  - Total files to remove
  - Total size to free
  - Number of directories preserved
  - Number of directories that will be removed (empty after cleanup)
- **No actual deletion**: Purely informational preview

### Typed Confirmation
- **Confirmation word**: "uninstall" (lowercase)
- **Case sensitivity**: Case-insensitive (accept "Uninstall", "UNINSTALL")
- **Safety summary shown before prompt**:
  ```
  Safety Summary:
  • 47 files will be removed
  • 3 directories will be removed (will be empty)
  • 2 directories preserved (contain non-gsd-opencode files)
  • Backup will be created at: ~/.config/opencode/.uninstall-backups/
  ```
- **Retry logic**: If typed incorrectly, show error and allow 3 attempts
- **Ctrl+C handling**: Return null (cancelled), exit with code 130

### Backup Strategy
- **Default behavior**: ALWAYS create backup before deletion
- **Backup location**: `.uninstall-backups/` in installation root
- **Backup contents**: Only files being removed (from allowed namespaces)
- **Backup naming**: Date-stamped: `YYYY-MM-DD_HH-MM-SS_filename.ext`
- **Retention**: Keep last 5 backups (configurable via constants)
- **--no-backup flag**: Allow skipping backup (user takes responsibility)
- **Backup failure**: Log warning but continue with uninstall
  - Warning: "⚠ Backup creation failed: [reason] - continuing without backup"

### Warning/Output Design
- **Warning prominence**: High visibility with red/yellow colors
- **Warning header**: 
  ```
  ╔══════════════════════════════════════════════════════════════╗
  ║  WARNING: DESTRUCTIVE OPERATION                              ║
  ╚══════════════════════════════════════════════════════════════╝
  ```
- **Namespace protection notice**: 
  - "Only removing files in gsd-opencode namespaces (gsd-*)"
  - "User files in other directories will be preserved"
- **File listing**: Show first 10 files, then "... and 37 more files"
- **Directory tree**: Minimal - show top-level directories only

### Force Override (--force)
- **With manifest present**: Skip typed confirmation entirely
  - Still shows summary and performs backup (unless --no-backup)
  - Immediate execution after summary
- **Without manifest**: Fallback to hardcoded namespaces (still safe)
  - --force still works (doesn't require extra flags)
  - Shows warning about fallback mode
- **No dangerous override**: There is NO flag to bypass namespace protection
  - Namespaces are enforced regardless of flags
  - Cannot accidentally delete shared folders

### Recovery Instructions
- **Success message includes**:
  - "✓ Uninstall complete"
  - "📦 Backup location: [path]"
  - "🔄 Recovery: Copy files from backup to reinstall"
  - "⚠ Backups retained for [N] days"
- **Recovery command hint**: 
  - "To restore: cp -r ~/.config/opencode/.uninstall-backups/2026-02-11_*/* ~/.config/opencode/"

### OpenCode's Discretion
- Exact backup retention count (suggested: 5)
- Specific warning color schemes
- Exact formatting of file lists (table vs tree vs simple list)
- Backup compression (if any)
- Progress indication during backup/removal (spinner style)
- Error message wording (within the constraints above)

</decisions>

<specifics>
## Specific Ideas

### Namespace Protection Examples
The user emphasized specific paths:
```
SAFE TO DELETE:
  ~/.config/opencode/agents/gsd-debugger/
  ~/.config/opencode/agents/gsd-planner/
  ~/.config/opencode/command/gsd/install.js
  ~/.config/opencode/get-shit-done/

NEVER DELETE:
  ~/.config/opencode/agents/user-custom-agent/
  ~/.config/opencode/command/other-tool/
  ~/.config/opencode/config.json (user config)
```

### Manifest Example
```json
[
  {
    "path": "/home/user/.config/opencode/agents/gsd-debugger/SKILL.md",
    "relativePath": "agents/gsd-debugger/SKILL.md",
    "size": 2847,
    "hash": "sha256:a1b2c3..."
  }
]
```

### Critical Principle
"If folder 'agents' contains at least ONE file not related to gsd-opencode, YOU SHOULD NEVER delete 'agents' folder!" - Only delete specific gsd-* subdirectories.

</specifics>

<deferred>
## Deferred Ideas

**Scheduled uninstalls** - Allow users to schedule uninstall for later. Belongs in future lifecycle management phase.

**Cloud backup option** - Backup to S3 or similar before uninstall. New capability requiring cloud integration.

**Undo command** - Dedicated `gsd-opencode undo` command for one-click recovery. Nice-to-have enhancement.

**Partial uninstall** - Selectively uninstall only certain components (e.g., just agents, keep commands). More granular than current scope.

**Archive mode** - Instead of deleting, move to an archive folder for later review. Alternative to backup.

</deferred>

---

*Phase: 07-make-uninstall-safe-and-user-friendly*
*Context gathered: 2026-02-11*
