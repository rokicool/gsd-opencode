# Features Research: npm CLI Tool Lifecycle Management

**Project:** gsd-opencode  
**Domain:** npm CLI tool features and capabilities  
**Date:** 2025-02-01  
**Confidence:** HIGH

## Feature Categories

### Table Stakes (Must Have)

Features users expect from any npm CLI tool. Without these, users will be frustrated or unable to use the tool effectively.

#### Installation & Distribution

| Feature | Priority | Complexity | Notes |
|---------|----------|------------|-------|
| **npm package.json** | P0 | Low | Proper metadata, bin entries, engines |
| **Global installation** | P0 | Low | `npm install -g gsd-opencode` |
| **Local installation** | P0 | Low | `npm install --save-dev` or npx |
| **npx support** | P0 | Low | `npx gsd-opencode` without install |
| **Lifecycle scripts** | P0 | Medium | prepare, postinstall with guards |

#### Core Functionality

| Feature | Priority | Complexity | Notes |
|---------|----------|------------|-------|
| **Multi-runtime support** | P0 | Medium | Claude Code, OpenCode, Gemini CLI |
| **Global vs local install modes** | P0 | Medium | --global, --local flags |
| **Custom config directory** | P0 | Low | --config-dir override |
| **Interactive prompts** | P0 | Low | When no flags provided |
| **Help documentation** | P0 | Low | --help flag with usage examples |

#### File Operations

| Feature | Priority | Complexity | Notes |
|---------|----------|------------|-------|
| **Path replacement** | P0 | Medium | Replace repo-local paths on install |
| **Directory copying** | P0 | Low | Recursive copy with transformation |
| **VERSION file creation** | P0 | Low | For update detection |
| **Clean uninstall** | P0 | High | Remove all installed files (note: npm v7+ removed preuninstall) |

### Differentiators (Competitive Advantage)

Features that set gsd-opencode apart from generic npm CLI tools.

#### Multi-Runtime Support

| Feature | Priority | Complexity | Notes |
|---------|----------|------------|-------|
| **Runtime auto-detection** | P1 | Medium | Detect Claude vs OpenCode vs Gemini |
| **Runtime-specific paths** | P1 | Medium | ~/.claude vs ~/.config/opencode vs ~/.gemini |
| **Cross-runtime migration** | P2 | High | Move config between runtimes |

#### AI Integration

| Feature | Priority | Complexity | Notes |
|---------|----------|------------|-------|
| **Slash command installation** | P1 | Medium | Install /gsd-* commands |
| **Agent definitions** | P1 | Medium | Install AI agent prompts |
| **Template system** | P1 | Medium | Project initialization templates |
| **Statusline integration** | P1 | Medium | Show context in AI assistant UI |

#### Update Management

| Feature | Priority | Complexity | Notes |
|---------|----------|------------|-------|
| **Version checking** | P1 | Medium | Check npm registry vs installed |
| **Update notifications** | P1 | Low | Show available updates |
| **Auto-update hooks** | P2 | High | Automatic background updates |
| **Migration scripts** | P2 | High | Handle breaking changes |

### Nice to Have (v2+)

Features that add value but aren't critical for v1.

| Feature | Priority | Complexity | Value |
|---------|----------|------------|-------|
| **Plugin system** | P2 | High | Third-party extensions |
| **Configuration wizard** | P2 | Medium | Interactive setup beyond install |
| **Backup/restore** | P2 | Medium | Save/restore configuration |
| **Telemetry** | P3 | Low | Usage analytics (opt-in) |
| **Documentation site** | P3 | Medium | Web-based docs |

### Anti-Features (Deliberately NOT Building)

Features that would harm the user experience or violate project principles.

| Feature | Reason |
|---------|--------|
| **GUI interface** | CLI-only by design; keeps it simple and scriptable |
| **Database persistence** | File-based state is intentional for version control |
| **Real-time collaboration** | Single-user workflow is the target use case |
| **Cloud hosting** | Local-first architecture; no external dependencies |
| **Automatic global install** | User must explicitly choose global vs local |
| **Silent install** | Interactive by default; explicit flags for automation |

## Feature Dependencies

```
Core Installation
├── Path Replacement (depends on: File Operations)
├── Multi-Runtime Support (depends on: Core Installation)
│   └── Runtime-Specific Paths
├── Update Checking (depends on: VERSION file)
└── Statusline (depends on: Hooks installation)

Lifecycle Integration
├── prepare script (no deps)
├── postinstall script (depends on: Core Installation)
└── Uninstall command (depends on: Core Installation)
```

## Complexity Analysis

### Low Complexity (1-2 days)

- npm package.json setup
- Help documentation
- VERSION file creation
- Update notifications
- Basic lifecycle scripts

### Medium Complexity (3-5 days)

- Multi-runtime support
- Path replacement logic
- Interactive prompts
- Statusline integration
- Version checking

### High Complexity (1-2 weeks)

- Clean uninstall (npm v7+ limitation)
- Plugin system
- Cross-runtime migration
- Auto-update hooks
- Migration scripts

## User Journey

### First-Time User

1. **Discovery**: Finds gsd-opencode on npm/GitHub
2. **Install**: Runs `npx gsd-opencode` or `npm install -g gsd-opencode`
3. **Setup**: Interactive prompts for runtime and location
4. **Verification**: Runs `/gsd-help` in AI assistant
5. **First Use**: Creates first project with `/gsd-new-project`

### Returning User

1. **Update Check**: Sees update notification on session start
2. **Update**: Runs `npm update -g gsd-opencode`
3. **Migration**: Any needed config updates handled automatically
4. **Continue**: Existing projects continue working

### Power User

1. **Custom Config**: Uses `--config-dir` for multiple setups
2. **Automation**: Uses flags instead of interactive prompts
3. **CI/CD**: Integrates into automated workflows
4. **Extension**: Creates custom templates and agents

## Validation Criteria

### Table Stakes Validation

- [ ] Can install globally: `npm install -g gsd-opencode`
- [ ] Can install locally: `npm install --save-dev gsd-opencode`
- [ ] Can run via npx: `npx gsd-opencode`
- [ ] Shows help: `gsd-opencode --help`
- [ ] Installs to correct runtime directory
- [ ] Uninstall removes all files (manual command)

### Differentiators Validation

- [ ] Works with Claude Code, OpenCode, and Gemini
- [ ] Slash commands appear in AI assistant
- [ ] Statusline shows context
- [ ] Update checking works
- [ ] Path replacement correct

## Confidence Assessment

| Category | Confidence | Notes |
|----------|------------|-------|
| Table Stakes | HIGH | Standard npm patterns, well-documented |
| Differentiators | HIGH | Based on existing working implementation |
| Anti-Features | HIGH | Explicit project principles |
| Dependencies | MEDIUM | Some features depend on others |

---
*Features research completed: 2025-02-01*
