# Distribution Manager

GSD-OpenCode includes a comprehensive package manager for installing, maintaining, and updating the GSD system. Once installed via npm, you have access to a full CLI for managing your GSD installation.

## Installation Overview

The distribution system supports two installation scopes:

| Scope | Location | Best For |
|-------|----------|----------|
| **Global** | `~/.config/opencode/` | System-wide availability across all projects |
| **Local** | `./.opencode/` | Project-specific installation, version control |

## Available Commands

After running `npx gsd-opencode` or installing globally, you have access to these commands:

### Core Distribution Commands

```bash
# Install GSD (interactive - prompts for global/local)
gsd-opencode install

# Install globally (system-wide)
gsd-opencode install --global
gsd-opencode install -g

# Install locally (current project only)
gsd-opencode install --local
gsd-opencode install -l

# Show installation status
gsd-opencode list

# Check installation health
gsd-opencode check

# Repair broken installation
gsd-opencode repair

# Update to latest version
gsd-opencode update

# Remove installation
gsd-opencode uninstall
```

### Configuration Commands

```bash
# View current settings
gsd-opencode config

# Get specific setting value
gsd-opencode config get <key>

# Set configuration value
gsd-opencode config set <key> <value>

# Reset to defaults
gsd-opencode config reset

# List all settings
gsd-opencode config list
```

## Detailed Usage Examples

### Install Command

**Interactive installation** (recommended for first-time users):
```bash
gsd-opencode install
# Prompts: Where would you like to install?
# → Global (~/.config/opencode/) - Install globally for all projects
# → Local (./.opencode/) - Install locally in current directory
```

**Non-interactive installation** (perfect for CI/CD, Docker, scripts):
```bash
# Install globally without prompts
gsd-opencode install --global
gsd-opencode install -g

# Install locally without prompts
gsd-opencode install --local
gsd-opencode install -l

# With verbose output for debugging
gsd-opencode install --local --verbose

# Specify custom config directory
gsd-opencode install --global --config-dir /custom/path
```

**Handling existing installations:**
```bash
# When an existing installation is detected, you'll be prompted:
# → Repair - Fix issues while preserving other files
# → Fresh install - Remove existing files and reinstall
# → Cancel - Keep current installation

gsd-opencode install --local  # Automatically handles existing installations
```

**What happens during install:**
1. **Pre-flight checks** - Verifies source directory, target permissions, and disk space
2. **Existing installation detection** - Prompts for repair vs fresh install
3. **Safe cleanup** - Only removes gsd-opencode files (preserves other config)
4. **Copies directories** - agents/, command/, and get-shit-done/
5. **Path replacement** - Replaces `@gsd-opencode/` references in .md files with actual paths
6. **Creates VERSION file** - Tracks installed version for updates
7. **Atomic operations** - Uses temp-then-move to prevent partial installations
8. **Creates manifest** - Tracks all installed files for safe uninstallation

### List Command

```bash
# Show all installations
gsd-opencode list
# Output:
# GSD-OpenCode Installation Status
# ========================================
# Global: ~/.config/opencode/
#   Version: 1.9.4
#   Status: Healthy
# 
# Local: ./.opencode/
#   Version: 1.9.4
#   Status: Healthy

# Show only global installation
gsd-opencode list --global

# Show only local installation
gsd-opencode list --local

# JSON output for scripting
gsd-opencode list --json
```

### Check Command

**Comprehensive health verification:**
```bash
# Check all installations (global and local)
gsd-opencode check
# Output:
# GSD-OpenCode Installation Health
# ================================
# 
# Global Installation Health
# ================================
# Required Files
#   ✓ agents/gsd-planner/agent.js
#   ✓ agents/gsd-executor/agent.js
#   ✓ command/gsd/new-project.js
#   ...
#
# Version Verification
#   ✓ Version: 1.10.0 - OK
#
# File Integrity
#   ✓ All files verified
#
# Directory Structure
#   ✓ Modern structure (commands/) - OK
#
# All checks passed - Installation is healthy

# Check specific scope
gsd-opencode check --global
gsd-opencode check --local
gsd-opencode check -g
gsd-opencode check -l

# Verbose output for debugging
gsd-opencode check --verbose
```

**What gets checked:**
- **Required Files** - Verifies all core files exist (agents, commands, skills)
- **Version Verification** - Compares installed version with expected version
- **File Integrity** - Detects corrupted or modified files (hash-based verification)
- **Directory Structure** - Detects legacy vs modern structure:
  - Legacy: `command/gsd/` (old)
  - Modern: `commands/gsd/` (new)
  - Dual: Both structures detected (needs migration)

**Exit codes:**
- `0` - Installation is healthy
- `1` - Issues detected (missing files, version mismatch, corruption, dual structure)

### Repair Command

```bash
# Detect and fix issues (shows summary first, asks for confirmation)
gsd-opencode repair
# Output:
# Issues Detected:
#   Missing Files: 2
#   Path Issues: 1
# 
# Do you want to proceed with repairs? (y/N)

# Repair specific scope
gsd-opencode repair --global
gsd-opencode repair --local
```

**What repair fixes:**
- Missing files (reinstalls from source)
- Corrupted/modified files (replaces with fresh copies)
- Path reference issues (re-applies path replacement in .md files)
- Creates backup before making destructive changes

### Update Command

```bash
# Check for updates and install latest version
gsd-opencode update
# Output:
# Current version: 1.9.4
# Latest version: 1.9.5
# 
# Do you want to update? (y/N)

# Update from beta channel
gsd-opencode update --beta

# Update to specific version
gsd-opencode update 1.9.5

# Update specific scope
gsd-opencode update --global
gsd-opencode update --local
```

**Update features:**
- Checks npm registry for latest version
- Preserves installation scope (global stays global, local stays local)
- Creates backup before updating
- Performs full install procedure including path replacement
- Shows progress during update

### Uninstall Command

**Safe removal with namespace protection:**
```bash
# Remove installation (shows summary, requires typed confirmation)
gsd-opencode uninstall
# Output:
# ╔══════════════════════════════════════════════════════════════╗
# ║  ⚠️  WARNING: DESTRUCTIVE OPERATION                          ║
# ╚══════════════════════════════════════════════════════════════╝
# 
# Scope: global
# Location: ~/.config/opencode/
# 
# 📋 Files that will be removed (142):
#   ✓ agents/gsd-planner/agent.js
#   ✓ command/gsd/new-project.js
#   ...
# 
# 📊 Safety Summary:
#   • 142 files will be removed (284.5 KB)
#   • Backup will be created in: gsd-opencode-backups/
# 
# ⚠️  This will permanently remove the files listed above
# Type "yes" to confirm:
```

**Auto-detection (no flags needed):**
```bash
# Automatically detects and removes the only existing installation
gsd-opencode uninstall
# If both global and local exist, use --global or --local to specify
```

**Dry run mode (preview without removing):**
```bash
# See what would be removed without actually removing anything
gsd-opencode uninstall --dry-run
gsd-opencode uninstall --global --dry-run
```

**Skip confirmation (scripting):**
```bash
# Force uninstall without typed confirmation (still shows summary)
gsd-opencode uninstall --force
gsd-opencode uninstall --global --force
```

**Backup control:**
```bash
# Create backup before removal (default behavior)
gsd-opencode uninstall

# Skip backup creation (user takes responsibility)
gsd-opencode uninstall --no-backup
```

**Scope-specific uninstall:**
```bash
gsd-opencode uninstall --global
gsd-opencode uninstall --local
gsd-opencode uninstall -g
gsd-opencode uninstall -l
```

**Safety features:**
- **Namespace protection** - Only removes files in gsd-opencode namespaces (gsd-*, get-shit-done/)
- **Directory preservation** - Keeps directories containing non-gsd-opencode files
- **Manifest-based tracking** - Uses INSTALLED_FILES.json to know exactly what was installed
- **Typed confirmation** - Requires typing "yes" to prevent accidental removal
- **Automatic backup** - Creates timestamped backup before removal
- **Dry run mode** - Preview changes before committing

### Config Command

```bash
# View all settings
gsd-opencode config

# Get a specific value
gsd-opencode config get mode
# Output: interactive

# Set a value
gsd-opencode config set mode yolo

# Reset to defaults
gsd-opencode config reset

# List all settings
gsd-opencode config list
# Output:
# Setting              Value
# -------------------  -----------
# mode                 interactive
# depth                standard
# commit_docs          true
```

## Path Replacement Explained

GSD uses `@gsd-opencode/` as a placeholder in .md files that gets replaced during installation:

**Before installation (in source files):**
```markdown
See @gsd-opencode/workflows/execute-plan.md for details.
```

**After global installation:**
```markdown
See ~/.config/opencode/workflows/execute-plan.md for details.
```

**After local installation:**
```markdown
See /path/to/your/project/.opencode/workflows/execute-plan.md for details.
```

This allows GSD files to reference each other correctly regardless of where they're installed.

## Global vs Local: When to Use Each

**Use Global when:**
- You want GSD available in all projects
- You work on many different codebases
- You want a single installation to maintain

**Use Local when:**
- You want GSD version-controlled with your project
- Different projects need different GSD versions
- You're working in a shared/reproducible environment (Docker, CI)
- You want to customize GSD for a specific project

**Can I use both?** Yes! You can have global for most work and local for specific projects. Use `--global` or `--local` flags to target the specific installation.

## Troubleshooting Installation Issues

**Permission denied during global install:**
```bash
# Option 1: Use local install instead
gsd-opencode install --local

# Option 2: Fix permissions
sudo chown -R $(whoami) ~/.config
```

**Commands not found after install:**
```bash
# Verify installation
gsd-opencode list

# Check that files exist
ls ~/.config/opencode/command/gsd/  # global
ls ./.opencode/command/gsd/          # local

# Restart OpenCode to reload commands
```

**Path issues after moving project (local install):**
```bash
# Reinstall to fix paths
cd /new/project/path
gsd-opencode install --local --force
# Or use repair
gsd-opencode repair --local
```

**"Already installed" when you want to reinstall:**
```bash
# Uninstall first, then reinstall
gsd-opencode uninstall --force
gsd-opencode install --local
```

## Docker/Container Usage

For containerized environments, use absolute paths:

```dockerfile
# Set config directory explicitly
ENV OPENCODE_CONFIG_DIR=/home/appuser/.config/opencode

# Install globally in Dockerfile
RUN npx gsd-opencode --global
```

Or use local install for project-specific setup:
```bash
# In your project directory inside container
gsd-opencode install --local
```
