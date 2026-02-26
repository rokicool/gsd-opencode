/**
 * SubmoduleService - Git submodule operations for gsd-copy-from-original script
 *
 * Handles all git operations on the original/get-shit-done submodule:
 * - Verify submodule initialization
 * - Get commit info (hash, version tag)
 * - Detect changes between commits using git diff-tree
 * - Check submodule readiness
 */

import { exec } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * Default path to the TÂCHES submodule
 */
const DEFAULT_SUBMODULE_PATH = './original/get-shit-done';

/**
 * @typedef {Object} CommitInfo
 * @property {string} hash - Full commit hash
 * @property {string} shortHash - Short commit hash (7 chars)
 * @property {string|null} version - Version tag if available (e.g., 'v1.20.5')
 * @property {string} date - Commit date in ISO format
 */

/**
 * @typedef {Object} ChangeDetectionResult
 * @property {boolean} hasChanges - Whether there are changes between commits
 * @property {string[]} files - List of changed file paths (relative to submodule root)
 * @property {string} fromCommit - Source commit hash (or 'none' for first sync)
 * @property {string} toCommit - Target commit hash
 * @property {string|null} message - Status message
 */

/**
 * @typedef {Object} SubmoduleStatus
 * @property {boolean} initialized - Whether the submodule is initialized
 * @property {boolean} hasGit - Whether .git exists in submodule
 * @property {string|null} path - Absolute path to submodule
 * @property {string|null} error - Error message if not initialized
 */

/**
 * Error class for submodule-related errors
 */
export class SubmoduleError extends Error {
  /**
   * @param {string} message - Error message
   * @param {string} code - Error code for programmatic handling
   * @param {string} suggestion - Suggested fix for the user
   */
  constructor(message, code, suggestion = null) {
    super(message);
    this.name = 'SubmoduleError';
    this.code = code;
    this.suggestion = suggestion;
  }
}

/**
 * Class for git submodule operations
 */
export class SubmoduleService {
  /**
   * @param {Object} options - Configuration options
   * @param {string} [options.submodulePath] - Path to the submodule
   */
  constructor(options = {}) {
    this.submodulePath = resolve(options.submodulePath || DEFAULT_SUBMODULE_PATH);
  }

  /**
   * Check if a path exists and is accessible
   * @param {string} filePath - Path to check
   * @returns {Promise<boolean>}
   */
  async pathExists(filePath) {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Execute a git command in the submodule directory
   * @param {string} command - Git command to execute (without 'git' prefix)
   * @returns {Promise<{stdout: string, stderr: string}>}
   * @throws {SubmoduleError} If command fails
   */
  async execGit(command) {
    try {
      const fullCommand = `git ${command}`;
      const result = await execAsync(fullCommand, {
        cwd: this.submodulePath,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large diffs
      });
      return result;
    } catch (error) {
      // Check if it's a submodule initialization issue
      if (error.message.includes('not a git repository') ||
          error.message.includes('does not have a commit checked out')) {
        throw new SubmoduleError(
          'Submodule not initialized',
          'SUBMODULE_NOT_INITIALIZED',
          'Run: git submodule update --init --recursive'
        );
      }
      throw new SubmoduleError(
        `Git command failed: ${command}`,
        'GIT_COMMAND_FAILED',
        error.message
      );
    }
  }

  /**
   * Check if the submodule is initialized and ready for operations
   * @returns {Promise<boolean>}
   */
  async isInitialized() {
    const gitPath = join(this.submodulePath, '.git');
    return this.pathExists(gitPath);
  }

  /**
   * Get detailed submodule status
   * @returns {Promise<SubmoduleStatus>}
   */
  async getStatus() {
    const initialized = await this.isInitialized();

    if (!initialized) {
      return {
        initialized: false,
        hasGit: false,
        path: this.submodulePath,
        error: 'Submodule not initialized. Run: git submodule update --init --recursive'
      };
    }

    const submoduleExists = await this.pathExists(this.submodulePath);
    if (!submoduleExists) {
      return {
        initialized: false,
        hasGit: false,
        path: null,
        error: 'Submodule directory does not exist'
      };
    }

    return {
      initialized: true,
      hasGit: true,
      path: this.submodulePath,
      error: null
    };
  }

  /**
   * Verify submodule is initialized, throw helpful error if not
   * @throws {SubmoduleError} If submodule is not initialized
   * @returns {Promise<void>}
   */
  async verifySubmodule() {
    const status = await this.getStatus();

    if (!status.initialized) {
      throw new SubmoduleError(
        status.error || 'Submodule not initialized',
        'SUBMODULE_NOT_INITIALIZED',
        'Run: git submodule update --init --recursive'
      );
    }
  }

  /**
   * Get current commit information from submodule HEAD
   * @returns {Promise<CommitInfo>}
   * @throws {SubmoduleError} If submodule is not initialized
   */
  async getCommitInfo() {
    await this.verifySubmodule();

    // Get full commit hash
    const { stdout: hash } = await this.execGit('rev-parse HEAD');
    const fullHash = hash.trim();

    // Get short hash
    const { stdout: shortHash } = await this.execGit('rev-parse --short HEAD');
    const short = shortHash.trim();

    // Get commit date
    const { stdout: dateOutput } = await this.execGit('log -1 --format=%aI');
    const date = dateOutput.trim();

    // Try to get version tag (describe)
    let version = null;
    try {
      const { stdout: describeOutput } = await this.execGit('describe --tags --exact-match 2>/dev/null || echo ""');
      const tag = describeOutput.trim();
      if (tag && tag.startsWith('v')) {
        version = tag;
      }
    } catch {
      // No tag on this commit, try to find the nearest tag
      try {
        const { stdout: describeOutput } = await this.execGit('describe --tags --abbrev=0 2>/dev/null || echo ""');
        const tag = describeOutput.trim();
        if (tag && tag.startsWith('v')) {
          version = tag;
        }
      } catch {
        // No tags at all
        version = null;
      }
    }

    return {
      hash: fullHash,
      shortHash: short,
      version,
      date
    };
  }

  /**
   * Detect changes between commits using git diff-tree
   * @param {string|null} sinceCommit - Starting commit hash (null for all changes from HEAD)
   * @returns {Promise<ChangeDetectionResult>}
   * @throws {SubmoduleError} If submodule is not initialized
   */
  async detectChanges(sinceCommit = null) {
    await this.verifySubmodule();

    // Get current commit info
    const currentInfo = await this.getCommitInfo();

    if (sinceCommit && sinceCommit === currentInfo.hash) {
      return {
        hasChanges: false,
        files: [],
        fromCommit: sinceCommit,
        toCommit: currentInfo.hash,
        message: 'Already up to date - no changes since last sync'
      };
    }

    // Build diff-tree command
    // git diff-tree --no-commit-id --name-only -r <range>
    let diffCommand;
    if (sinceCommit) {
      // Compare between two commits
      diffCommand = `diff-tree --no-commit-id --name-only -r ${sinceCommit}..${currentInfo.hash}`;
    } else {
      // No previous commit - list all tracked files
      // Use ls-tree to get all files in HEAD
      diffCommand = `ls-tree --name-only -r HEAD`;
    }

    try {
      const { stdout } = await this.execGit(diffCommand);
      const files = stdout
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      // Remove duplicates (can happen with merge commits in diff-tree)
      const uniqueFiles = [...new Set(files)];

      if (sinceCommit) {
        return {
          hasChanges: uniqueFiles.length > 0,
          files: uniqueFiles,
          fromCommit: sinceCommit,
          toCommit: currentInfo.hash,
          message: uniqueFiles.length > 0
            ? `Found ${uniqueFiles.length} changed file(s)`
            : 'No changes detected'
        };
      } else {
        // First sync - all files are "changed"
        return {
          hasChanges: true,
          files: uniqueFiles,
          fromCommit: 'none',
          toCommit: currentInfo.hash,
          message: `First sync - ${uniqueFiles.length} file(s) to sync`
        };
      }
    } catch (error) {
      // If sinceCommit doesn't exist, treat as first sync
      if (error.message?.includes('bad revision') || error.message?.includes('unknown revision')) {
        // Fallback to listing all files
        const { stdout } = await this.execGit('ls-tree --name-only -r HEAD');
        const files = stdout
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);

        return {
          hasChanges: true,
          files,
          fromCommit: 'none',
          toCommit: currentInfo.hash,
          message: `First sync (commit not found) - ${files.length} file(s) to sync`
        };
      }
      throw error;
    }
  }

  /**
   * Get the submodule version from the package.json or VERSION file
   * @returns {Promise<string|null>}
   */
  async getVersion() {
    await this.verifySubmodule();

    // Try VERSION file first
    try {
      const versionPath = join(this.submodulePath, 'VERSION');
      const content = await readFile(versionPath, 'utf-8');
      return content.trim();
    } catch {
      // VERSION file doesn't exist
    }

    // Try package.json
    try {
      const packagePath = join(this.submodulePath, 'package.json');
      const content = await readFile(packagePath, 'utf-8');
      const pkg = JSON.parse(content);
      return pkg.version || null;
    } catch {
      // package.json doesn't exist or invalid
    }

    // Fall back to git tag
    const info = await this.getCommitInfo();
    return info.version;
  }

  /**
   * Get the URL of the submodule's remote origin
   * @returns {Promise<string|null>}
   */
  async getRemoteUrl() {
    await this.verifySubmodule();

    try {
      const { stdout } = await this.execGit('config --get remote.origin.url');
      return stdout.trim() || null;
    } catch {
      return null;
    }
  }

  /**
   * Check if there are uncommitted changes in the submodule
   * @returns {Promise<boolean>}
   */
  async hasUncommittedChanges() {
    await this.verifySubmodule();

    try {
      const { stdout } = await this.execGit('status --porcelain');
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }
}

export default SubmoduleService;
