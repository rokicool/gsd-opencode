# Forbidden Strings Checker

A Node.js utility that replicates the "Check forbidden strings in antipatterns" job from the GitHub Actions validation workflow.

## Purpose

This utility scans files for forbidden strings as defined in `assets/antipatterns.toml`. It helps maintain code quality and consistency by ensuring that prohibited patterns are not present in the codebase.

## How It Works

The utility:
1. Reads configuration from `assets/antipatterns.toml`
2. Scans the specified folder (default: `./gsd-opencode/`)
3. Checks files matching the pattern (default: `*.md`)
4. Excludes configured directories
5. Reports any forbidden strings found

## Running Locally

### Prerequisites
- Node.js (version 12 or higher)
- Dependencies installed: `npm install` (required for TOML parsing)

### Basic Usage

From the project root directory:

```bash
# Install dependencies if not already done
npm install

# Run the checker
node assets/bin/check-forbidden-strings.js
```

### Command Line Options

```bash
# Show help
node assets/bin/check-forbidden-strings.js --help

# Show version
node assets/bin/check-forbidden-strings.js --version
```

### Examples

```bash
# Check all markdown files for forbidden strings
node assets/bin/check-forbidden-strings.js

# Get help with available options
node assets/bin/check-forbidden-strings.js -h
```

## Configuration

The checker is configured via `assets/antipatterns.toml`:

```toml
[checklist]
folder = "./gsd-opencode/"
file = "*.md"
exclude_dir = "node_modules,.git"
forbidden_strings = [
    "Claude",
    "Claude Code",
    "<sub>",
    "general-purpose",
    # ... more strings
]
```

### Configuration Options

- **folder**: Directory to scan (relative to project root)
- **file**: File pattern to match (supports wildcards)
- **exclude_dir**: Comma-separated list of directories to exclude
- **forbidden_strings**: Array of strings that are not allowed in files

## Output Examples

### Success
```
🔍 Checking forbidden strings from antipatterns.toml...
📁 Scanning folder: ./gsd-opencode/
📄 File pattern: *.md
🚫 Exclude dirs: none
⚠️  Forbidden strings: 10 strings to check

📋 Found 25 files to check

✅ No forbidden strings found
🎉 All files passed the check!
```

### Violations Found
```
🔍 Checking forbidden strings from antipatterns.toml...
📁 Scanning folder: ./gsd-opencode/
📄 File pattern: *.md
🚫 Exclude dirs: none
⚠️  Forbidden strings: 10 strings to check

📋 Found 25 files to check

❌ Forbidden strings detected:

❌ Found "Claude" in ./gsd-opencode/workflows/example.md:15
   Line 15: Claude assisted with this implementation

❌ Found "<sub>" in ./gsd-opencode/references/guide.md:42
   Line 42: <sub>This is a subscript</sub>

💥 Total violations: 2
```

## Integration with CI/CD

This utility is automatically run in the GitHub Actions workflow (`.github/workflows/validate.yml`) as part of the validation process. The step "Check forbidden strings in antipatterns" uses the same logic.

## Troubleshooting

### Common Issues

1. **"antipatterns.toml not found"**: Ensure the file exists in the `assets/` directory
2. **"Could not read file"**: Check file permissions and ensure files are accessible
3. **"No forbidden_strings array found"**: Verify the TOML file has the correct format

### Debug Mode

The utility provides detailed output about:
- Which folder is being scanned
- File patterns being used
- Directories being excluded
- Number of files found
- Specific violations with line numbers

## Error Codes

- **Exit 1**: Forbidden strings found or configuration error
- **Exit 0**: No violations found (success)

## Development

To modify the checker:
1. Edit `assets/bin/check-forbidden-strings.js`
2. Test locally with `node assets/bin/check-forbidden-strings.js`
3. Update this README if adding new features

The utility requires `@iarna/toml` for proper TOML parsing, which is already included in the project's package.json dependencies.