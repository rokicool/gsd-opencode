# Pitfalls Research: Model Profile Management

**Domain:** YAML frontmatter manipulation and config-driven behavior in OpenCode commands
**Researched:** 2026-01-20
**Confidence:** HIGH (based on Context7 docs + real-world GitHub usage patterns)

---

## Critical Pitfalls

Mistakes that can cause data loss, file corruption, or major rework.

### Pitfall 1: Line Width Wrapping Corrupts Long Values

**What goes wrong:** When stringifying YAML back to frontmatter, js-yaml and gray-matter default to wrapping lines at 80 characters. This silently corrupts long URLs, descriptions, or multi-part values by inserting newlines.

**Why it happens:** Default `lineWidth: 80` in js-yaml's `dump()` function wraps long strings into multi-line YAML. When parsing back, the value is different from the original.

**Warning signs:**
- Long `description:` values get split across multiple lines
- URLs with query parameters become invalid
- Values that worked before suddenly fail

**Prevention:**
```typescript
// ALWAYS use lineWidth: -1 when preserving existing content
matter.stringify(content, data, { lineWidth: -1 });

// Or with js-yaml directly
yaml.dump(data, { lineWidth: -1 });
```

**Verified by:** GitHub docs codebase uses `{ lineWidth: -1 }` on all frontmatter operations. See: [github/docs src/ghes-releases/scripts/deprecate/update-content.ts](https://github.com/github/docs/blob/main/src/ghes-releases/scripts/deprecate/update-content.ts)

**Which phase should address:** Implementation phase — all frontmatter write operations.

---

### Pitfall 2: YAML Special Characters in Values

**What goes wrong:** Values containing YAML special characters (`:`, `#`, `{`, `}`, `[`, `]`, `*`, `&`, `!`, `|`, `>`, `'`, `"`, `%`, `@`) cause parsing errors or silent data corruption when not properly quoted.

**Why it happens:** YAML parsers interpret unquoted special characters as syntax. A model name like `opencode/claude-3:opus` or a description with `:` followed by space becomes multi-part.

**Specific examples in this project:**
- Model identifiers: `opencode/glm-4.7-free` (forward slash could cause issues)
- Description fields may contain colons: `description: Planning model: uses GLM-4.7`

**Warning signs:**
- Parsed data doesn't match what was written
- Parse errors on previously valid files
- Values truncated at colon or hash symbol

**Prevention:**
```typescript
// Use forceQuotes for values that may contain special characters
yaml.dump(data, { 
  lineWidth: -1,
  quotingType: '"',
  forceQuotes: false  // Let js-yaml decide when quotes are needed
});

// Validate values before writing
function needsQuoting(value: string): boolean {
  return /[:#\[\]{}*&!|>'"%@]/.test(value);
}
```

**Which phase should address:** Implementation phase — validation layer before write.

---

### Pitfall 3: Markdown Body Corruption via Content Boundary Detection

**What goes wrong:** The markdown body after frontmatter is corrupted or lost because the frontmatter delimiter (`---`) appears in the content (e.g., in code blocks demonstrating YAML syntax).

**Why it happens:** Naive regex-based parsing stops at the first `---` after the opening delimiter. gray-matter handles this correctly, but custom parsers often don't.

**Example of problematic content:**
```markdown
---
model: opencode/glm-4.7-free
---

Here's an example frontmatter:

---
title: Example
---
```

**Warning signs:**
- Content after code blocks is missing
- Files with YAML examples in body get truncated
- Agent documentation examples disappear

**Prevention:**
- **Use gray-matter** — it handles nested delimiters correctly
- Never implement custom frontmatter parsing with simple regex
- Test with agent files containing YAML examples in body

**Verified by:** gray-matter README explicitly lists this as a solved problem: "Have no problem with complex content, including non-front-matter fenced code blocks that contain examples of YAML front matter."

**Which phase should address:** Stack selection phase — choose gray-matter, not custom parser.

---

### Pitfall 4: YAML Type Coercion Surprises

**What goes wrong:** Values that look like booleans or numbers get converted. Model names like `true`, version numbers like `1.0`, or profile names like `yes` are silently type-converted.

**js-yaml v3 to v4 migration issue:**
```javascript
// String '0123456789' may become number 123456789
// String 'yes' may become boolean true
// String '1.0' may become number 1
```

**Why it happens:** YAML 1.1 has aggressive type inference. `yes`, `no`, `on`, `off`, `true`, `false`, `null`, etc. are reserved.

**Warning signs:**
- Boolean `true` appears where string `"true"` was expected
- Number `1` appears where string `"1.0"` was expected
- Profile named "yes" becomes boolean

**Prevention:**
```typescript
// Force string types for known string fields
yaml.dump(data, {
  lineWidth: -1,
  noCompatMode: true,  // Don't quote 'yes', 'no' as YAML 1.1 requires
  quotingType: '"'
});

// Or validate after parsing
if (typeof parsed.model !== 'string') {
  throw new Error('model must be a string');
}
```

**Which phase should address:** Implementation phase — type validation after parse.

---

## Moderate Pitfalls

Mistakes that cause delays, debugging sessions, or technical debt.

### Pitfall 5: Deep Merge vs Shallow Overwrite in Config

**What goes wrong:** Updating `config.json` with new profile settings clobbers existing settings instead of merging.

**Scenario:**
```json
// Before: config.json
{ "theme": "dark", "model_profile": "quality" }

// User updates model_profiles
// After (WRONG): 
{ "model_profiles": { "custom": {...} } }  // theme lost!

// After (CORRECT):
{ "theme": "dark", "model_profile": "quality", "model_profiles": { "custom": {...} } }
```

**Why it happens:** Using simple object spread or `Object.assign()` without deep merge for nested objects.

**Warning signs:**
- User settings disappear after profile change
- Config file gets progressively smaller
- Unrelated settings reset to defaults

**Prevention:**
```typescript
// Deep merge, not overwrite
function mergeConfig(base: Config, updates: Partial<Config>): Config {
  return {
    ...base,
    ...updates,
    // Deep merge nested objects
    model_profiles: {
      ...(base.model_profiles || {}),
      ...(updates.model_profiles || {})
    }
  };
}

// Read-modify-write pattern
const existing = JSON.parse(fs.readFileSync(configPath));
const merged = mergeConfig(existing, newSettings);
fs.writeFileSync(configPath, JSON.stringify(merged, null, 2));
```

**Which phase should address:** Implementation phase — config write operations.

---

### Pitfall 6: Missing Agent Files Not Detected Early

**What goes wrong:** The command runs, claims success, but agent files weren't actually updated because paths were wrong or files were missing.

**Why it happens:** Silent failures when:
- Agent file path is incorrect
- File exists but has no frontmatter
- File has frontmatter but no `model:` key to update

**Warning signs:**
- Profile "changed" but agents still use old model
- Command succeeds but behavior doesn't change
- Works on one machine, fails on another (path differences)

**Prevention:**
```typescript
// Fail fast on missing files
const agentPaths = [
  '.opencode/agents/gsd-executor.md',
  '.opencode/agents/gsd-planner.md',
  // ... all 11 agents
];

for (const path of agentPaths) {
  if (!fs.existsSync(path)) {
    throw new Error(`Agent file not found: ${path}`);
  }
}

// Validate frontmatter exists before attempting modification
const parsed = matter(content);
if (!parsed.data || Object.keys(parsed.data).length === 0) {
  throw new Error(`No frontmatter in ${path}`);
}
```

**Which phase should address:** Implementation phase — validation before write loop.

---

### Pitfall 7: Comment and Formatting Loss

**What goes wrong:** YAML comments in frontmatter are lost when parsing and re-stringifying. Formatting preferences (spacing, ordering) may change.

**Why it happens:** Standard YAML parsers discard comments during parsing. When stringifying, key order and formatting may differ from original.

**Warning signs:**
- Comments explaining frontmatter keys disappear
- Key ordering changes on each save
- Files show as "modified" in git with no semantic change

**Prevention:**
- **Accept this limitation** for frontmatter (no comments expected in gsd-opencode agents)
- Use `eemeli/yaml` library (not js-yaml) if comment preservation is critical
- For this project: frontmatter is simple, no comments expected — low risk

**From eemeli/yaml Context7 docs:** The library supports comment preservation via `parseDocument()` and node-level comment properties.

**Which phase should address:** Stack selection — decide if gray-matter + js-yaml is sufficient (likely yes for this use case).

---

### Pitfall 8: Encoding and BOM Issues

**What goes wrong:** Files with UTF-8 BOM or different encodings cause parsing failures or invisible corruption.

**Why it happens:** Windows editors sometimes add BOM. Files may be saved in different encodings.

**Warning signs:**
- Parse errors on first character
- Invisible characters at start of file
- Works on Mac/Linux, fails on Windows

**Prevention:**
```typescript
// Explicitly specify encoding and strip BOM
const content = fs.readFileSync(path, 'utf-8')
  .replace(/^\uFEFF/, ''); // Strip BOM if present

// Write with consistent encoding
fs.writeFileSync(path, content, { encoding: 'utf-8' });
```

**Which phase should address:** Implementation phase — file I/O wrapper functions.

---

## Minor Pitfalls

Annoyances that are easily fixable but worth knowing.

### Pitfall 9: Trailing Newline Inconsistency

**What goes wrong:** Files end up with inconsistent trailing newlines (none, one, multiple), causing git diffs on every save.

**Why it happens:** gray-matter and YAML stringifiers have different behaviors around trailing newlines.

**Warning signs:**
- Every profile switch shows file as modified
- Git diffs show only whitespace changes
- Pre-commit hooks complain about trailing whitespace

**Prevention:**
```typescript
// Normalize to exactly one trailing newline
function normalizeContent(content: string): string {
  return content.trimEnd() + '\n';
}
```

**Which phase should address:** Implementation phase — post-process after stringify.

---

### Pitfall 10: Empty String vs Missing Key Confusion

**What goes wrong:** Setting `model: ""` vs removing the `model:` key have different behaviors. Code doesn't distinguish between "no model specified" and "explicitly empty model."

**Why it happens:** Semantic difference between:
- `{ model: "" }` — explicitly empty
- `{ }` — key not present
- `{ model: undefined }` — may serialize differently

**Warning signs:**
- Default model behavior inconsistent
- "No model" vs "use default" confusion
- JSON/YAML round-trip changes semantics

**Prevention:**
```typescript
// Explicit handling
if (profile.model === undefined) {
  // Remove key entirely — use OpenCode default
  delete data.model;
} else if (profile.model === '') {
  // Empty string — probably an error
  throw new Error('Empty model string not allowed');
} else {
  // Set specific model
  data.model = profile.model;
}
```

**Which phase should address:** Design phase — decide semantics, implement in execution phase.

---

## Idempotency Issues

Special section for safe repeatability.

### Pitfall 11: Non-Idempotent Writes

**What goes wrong:** Running the same profile command twice produces different results, or each run modifies files even when no change is needed.

**Why it happens:**
- Re-ordering keys on stringify
- Adding/removing quotes inconsistently
- Timestamp or metadata that changes each run

**Warning signs:**
- Git shows changes after setting same profile twice
- Files modified even when profile didn't change
- Automated runs create noise commits

**Prevention:**
```typescript
// Compare before writing
const newContent = matter.stringify(body, newData, { lineWidth: -1 });
const existingContent = fs.readFileSync(path, 'utf-8');

if (newContent !== existingContent) {
  fs.writeFileSync(path, newContent);
  console.log(`Updated: ${path}`);
} else {
  console.log(`Unchanged: ${path}`);
}
```

**Which phase should address:** Implementation phase — skip-if-unchanged pattern.

---

### Pitfall 12: Partial Failure Without Rollback

**What goes wrong:** Updating 6 of 11 agent files succeeds, then file 7 fails, leaving the system in inconsistent state.

**Why it happens:** No transaction or rollback mechanism for multi-file operations.

**Warning signs:**
- Some agents have new model, others have old
- Profile shows as "changed" but behavior is mixed
- Manual recovery required

**Prevention:**
```typescript
// Option 1: Collect all changes, validate, then apply
const changes: Array<{path: string, content: string}> = [];

for (const agent of agents) {
  const newContent = generateContent(agent);
  // Validate before adding to batch
  matter(newContent); // Throws if invalid
  changes.push({ path: agent.path, content: newContent });
}

// All validated — now apply
for (const { path, content } of changes) {
  fs.writeFileSync(path, content);
}

// Option 2: Backup before modification
const backup = agents.map(a => ({
  path: a.path,
  content: fs.readFileSync(a.path, 'utf-8')
}));

try {
  // ... apply changes ...
} catch (error) {
  // Rollback
  for (const { path, content } of backup) {
    fs.writeFileSync(path, content);
  }
  throw error;
}
```

**Which phase should address:** Implementation phase — choose atomic strategy.

---

## Error Handling Pitfalls

### Pitfall 13: Silent Parse Failures

**What goes wrong:** Invalid YAML is silently ignored, returning empty data instead of throwing.

**Why it happens:** Some parsers default to returning `{}` on parse errors.

**Warning signs:**
- Corrupted file appears to work
- Data silently reset to empty
- Debugging mystery behaviors

**Prevention:**
```typescript
// gray-matter doesn't throw on empty/missing frontmatter — check explicitly
const parsed = matter(content);

if (parsed.isEmpty) {
  throw new Error(`Empty or missing frontmatter: ${path}`);
}

if (!parsed.data.name) {
  throw new Error(`Agent ${path} missing required 'name' field`);
}
```

**Which phase should address:** Implementation phase — validation after every parse.

---

### Pitfall 14: Unhelpful Error Messages

**What goes wrong:** User sees "YAML parse error at line 3" but can't determine which file or what's wrong.

**Why it happens:** Raw YAML parser errors lack context.

**Prevention:**
```typescript
try {
  const parsed = matter(content);
} catch (error) {
  throw new Error(
    `Failed to parse frontmatter in ${path}: ${error.message}\n` +
    `Hint: Check for unquoted special characters (: # [ ] { })`
  );
}
```

**Which phase should address:** Implementation phase — error wrapping.

---

## Prevention Strategies Summary

| Category | Strategy | Implementation |
|----------|----------|----------------|
| Line wrapping | Always use `lineWidth: -1` | All stringify calls |
| Special chars | Let js-yaml auto-quote, validate after parse | Write + parse operations |
| Content boundary | Use gray-matter, never custom regex | Stack selection |
| Type coercion | Validate types after parse | Parse wrapper function |
| Config merge | Deep merge, not overwrite | Config update function |
| Missing files | Fail fast with clear errors | Pre-flight validation |
| Idempotency | Compare before write, skip unchanged | Write wrapper function |
| Atomicity | Batch validate then apply, or backup/rollback | Multi-file operations |
| Error handling | Wrap errors with file path and hints | All parse/write operations |

---

## Phase-Specific Checklist

### Stack Selection Phase
- [ ] Choose gray-matter (handles nested delimiters correctly)
- [ ] Confirm js-yaml bundled with gray-matter is sufficient (no comment preservation needed)

### Design Phase
- [ ] Define semantics for missing vs empty `model:` key
- [ ] Decide on atomicity strategy (batch-validate or backup-rollback)
- [ ] Define required vs optional frontmatter fields

### Implementation Phase
- [ ] All stringify calls use `{ lineWidth: -1 }`
- [ ] Validate types after every parse
- [ ] Check files exist before modification loop
- [ ] Skip-if-unchanged pattern for idempotency
- [ ] Deep merge for config updates
- [ ] Error messages include file paths
- [ ] Strip BOM in file reads
- [ ] Normalize trailing newlines

### Testing Phase
- [ ] Test with YAML special characters in model names
- [ ] Test with missing agent files
- [ ] Test idempotency (run command twice, verify no-op second time)
- [ ] Test partial failure recovery
- [ ] Test long description values (ensure no wrapping)
- [ ] Test round-trip preservation (parse -> stringify -> parse matches)

---

## Sources

| Source | Type | Confidence |
|--------|------|------------|
| gray-matter GitHub README | Official docs | HIGH |
| eemeli/yaml Context7 docs | Official docs | HIGH |
| js-yaml Context7 docs | Official docs | HIGH |
| github/docs codebase | Production usage | HIGH |
| GitHub code search patterns | Real-world usage | MEDIUM |
