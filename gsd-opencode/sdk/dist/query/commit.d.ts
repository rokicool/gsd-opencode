/**
 * Git commit and check-commit query handlers.
 *
 * Ported from get-shit-done/bin/lib/commands.cjs (cmdCommit, cmdCheckCommit)
 * and core.cjs (execGit). Provides commit creation with message sanitization
 * and pre-commit validation.
 *
 * @example
 * ```typescript
 * import { commit, checkCommit } from './commit.js';
 *
 * await commit(['docs: update state', '.planning/STATE.md'], '/project');
 * // { data: { committed: true, hash: 'abc1234', message: 'docs: update state', files: [...] } }
 *
 * await checkCommit([], '/project');
 * // { data: { can_commit: true, reason: 'commit_docs_enabled', ... } }
 * ```
 */
import type { QueryHandler } from './utils.js';
/**
 * Run a git command in the given working directory.
 *
 * Ported from core.cjs lines 531-542.
 *
 * @param cwd - Working directory for the git command
 * @param args - Git command arguments (e.g., ['commit', '-m', 'msg'])
 * @returns Object with exitCode, stdout, and stderr
 */
export declare function execGit(cwd: string, args: string[]): {
    exitCode: number;
    stdout: string;
    stderr: string;
};
/**
 * Sanitize a commit message to prevent prompt injection.
 *
 * Ported from security.cjs sanitizeForPrompt.
 * Strips zero-width characters, null bytes, and neutralizes
 * known injection markers that could hijack agent context.
 *
 * @param text - Raw commit message
 * @returns Sanitized message safe for git commit
 */
export declare function sanitizeCommitMessage(text: string): string;
/**
 * Stage files and create a git commit.
 *
 * Checks commit_docs config (unless --force), sanitizes message,
 * stages specified files (or all .planning/), and commits.
 *
 * @param args - args[0]=message, remaining=file paths or flags (--force, --amend, --no-verify)
 * @param projectDir - Project root directory
 * @returns QueryResult with commit result
 */
export declare const commit: QueryHandler;
/**
 * Validate whether a commit can proceed.
 *
 * Checks commit_docs config and staged file state.
 *
 * @param _args - Unused
 * @param projectDir - Project root directory
 * @returns QueryResult with { can_commit, reason, commit_docs, staged_files }
 */
export declare const checkCommit: QueryHandler;
export declare const commitToSubrepo: QueryHandler;
//# sourceMappingURL=commit.d.ts.map