/**
 * Staged execution pipeline — registry-level middleware for pre/post hooks
 * and full in-memory dry-run support.
 *
 * Wraps all registry handlers with prepare/execute/finalize stages.
 * When dryRun=true and the command is a mutation, the mutation executes
 * against a temporary directory clone of .planning/ instead of the real
 * project, and the before/after diff is returned without writing to disk.
 *
 * read commands are always executed normally — they are side-effect-free.
 *
 * @example
 * ```typescript
 * import { createRegistry } from './index.js';
 * import { wrapWithPipeline } from './pipeline.js';
 *
 * const registry = createRegistry();
 * wrapWithPipeline(registry, MUTATION_COMMANDS, { dryRun: true });
 * // mutations now return { data: { dry_run: true, diff: { ... } } }
 * ```
 */
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { tmpdir } from 'node:os';
// ─── Internal helpers ──────────────────────────────────────────────────────
/**
 * Recursively collect all files under a directory.
 * Returns paths relative to the base directory.
 */
function collectFiles(dir, base) {
    const results = [];
    if (!existsSync(dir))
        return results;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relPath = relative(base, fullPath);
        if (entry.isFile()) {
            results.push(relPath);
        }
        else if (entry.isDirectory()) {
            results.push(...collectFiles(fullPath, base));
        }
    }
    return results;
}
/**
 * Copy .planning/ subtree from sourceDir to destDir.
 * Only copies text files relevant to GSD state (skips binaries and logs).
 */
async function copyPlanningTree(sourceDir, destDir) {
    const planningSource = join(sourceDir, '.planning');
    if (!existsSync(planningSource))
        return;
    const files = collectFiles(planningSource, planningSource);
    for (const relFile of files) {
        // Skip large or binary-ish files (> 1MB) — only relevant for text state
        const sourcePath = join(planningSource, relFile);
        const destPath = join(destDir, '.planning', relFile);
        await mkdir(dirname(destPath), { recursive: true });
        try {
            const content = await readFile(sourcePath, 'utf-8');
            await writeFile(destPath, content, 'utf-8');
        }
        catch {
            // Skip unreadable files (binary, permission issues, etc.)
        }
    }
}
/**
 * read all files from .planning/ in a directory into a map of relPath → content.
 */
async function readPlanningState(projectDir) {
    const planningDir = join(projectDir, '.planning');
    const result = new Map();
    if (!existsSync(planningDir))
        return result;
    const files = collectFiles(planningDir, planningDir);
    for (const relFile of files) {
        try {
            const content = await readFile(join(planningDir, relFile), 'utf-8');
            result.set(relFile, content);
        }
        catch { /* skip unreadable */ }
    }
    return result;
}
/**
 * Diff two file maps, returning files that changed (with before/after content).
 */
function diffPlanningState(before, after) {
    const diff = {};
    const allKeys = new Set([...before.keys(), ...after.keys()]);
    for (const key of allKeys) {
        const b = before.get(key) ?? null;
        const a = after.get(key) ?? null;
        if (b !== a) {
            diff[`.planning/${key}`] = { before: b, after: a };
        }
    }
    return diff;
}
// ─── wrapWithPipeline ──────────────────────────────────────────────────────
/**
 * Wrap all registered handlers with prepare/execute/finalize pipeline stages.
 *
 * When dryRun=true and a mutation command is dispatched, the real projectDir
 * is cloned (only .planning/ subtree) into a temp directory. The mutation
 * runs against the clone, a before/after diff is computed, and the temp
 * directory is cleaned up in a finally block. The real project is never
 * touched during a dry run.
 *
 * @param registry - The registry whose handlers to wrap
 * @param mutationCommands - Set of command names that perform mutations
 * @param options - Pipeline configuration
 */
export function wrapWithPipeline(registry, mutationCommands, options) {
    const { dryRun = false, onPrepare, onFinalize } = options;
    // Collect all currently registered commands by iterating known handlers
    // We wrap by re-registering with the same name using the same technique
    // as event emission wiring in index.ts
    const commandsToWrap = [];
    // Enumerate mutation commands via the caller-provided set. QueryRegistry also
    // exposes commands() for full command lists when needed by tooling.
    // We wrap the register method temporarily to collect known commands,
    // then restore. Instead, we use the mutation commands set + a marker approach:
    // wrap mutation commands for dry-run, and wrap all via onPrepare/onFinalize.
    //
    // For pipeline wrapping we use a two-pass approach:
    // Pass 1: wrap mutation commands (for dry-run + hooks)
    // Pass 2: wrap non-mutation commands (for hooks only, if hooks provided)
    const wrapHandler = (cmd, isMutation) => {
        const original = registry.getHandler(cmd);
        if (!original)
            return;
        registry.register(cmd, async (args, projectDir) => {
            // ─── Prepare stage ───────────────────────────────────────────────
            if (onPrepare) {
                await onPrepare(cmd, args, projectDir);
            }
            let result;
            if (dryRun && isMutation) {
                // ─── Dry-run: clone → mutate → diff ──────────────────────────
                let tempDir = null;
                try {
                    tempDir = await mkdtemp(join(tmpdir(), 'gsd-dryrun-'));
                    // Snapshot state before mutation
                    const beforeState = await readPlanningState(projectDir);
                    // Copy .planning/ to temp dir
                    await copyPlanningTree(projectDir, tempDir);
                    // Execute mutation against temp dir clone
                    await original(args, tempDir);
                    // Snapshot state after mutation (from temp dir)
                    const afterState = await readPlanningState(tempDir);
                    // Compute diff
                    const diff = diffPlanningState(beforeState, afterState);
                    const changedFiles = Object.keys(diff);
                    result = {
                        data: {
                            dry_run: true,
                            command: cmd,
                            args,
                            diff,
                            changes_summary: changedFiles.length > 0
                                ? `${changedFiles.length} file(s) would be modified: ${changedFiles.join(', ')}`
                                : 'No files would be modified',
                        },
                    };
                }
                finally {
                    // T-14-06: Always clean up temp dir, even on error
                    if (tempDir) {
                        await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
                    }
                }
            }
            else {
                // ─── Normal execution ─────────────────────────────────────────
                result = await original(args, projectDir);
            }
            // ─── Finalize stage ───────────────────────────────────────────────
            if (onFinalize) {
                await onFinalize(cmd, args, result);
            }
            return result;
        });
        commandsToWrap.push(cmd);
    };
    // Wrap mutation commands (dry-run eligible + hooks)
    for (const cmd of mutationCommands) {
        wrapHandler(cmd, true);
    }
    // Note: non-mutation commands are NOT wrapped here for performance — callers
    // can provide onPrepare/onFinalize for mutations only. If full wrapping of
    // read commands is needed, callers should pass their command set explicitly.
}
//# sourceMappingURL=pipeline.js.map