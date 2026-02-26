/**
 * GitChecker - Git status checking for uncommitted changes
 *
 * Features:
 * - Check if files have uncommitted changes
 * - Parse git status --porcelain output
 * - Format warnings for display
 * - Detect if we're in a git repository
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve, relative } from 'node:path';

const execAsync = promisify(exec);

/**
 * @typedef {Object} GitStatus
 * @property {string} file - File path
 * @property {string} status - Status code (modified, added, deleted, renamed, untracked)
 * @property {string} x - First character of porcelain status
 * @property {string} y - Second character of porcelain status
 */

/**
 * Class for checking git repository status
 */
export class GitChecker {
  /**
   * @param {Object} options
   * @param {string} [options.cwd=process.cwd()] - Working directory
   */
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
  }

  /**
   * Check if the current directory is a git repository
   * @returns {Promise<boolean>}
   */
  async isGitRepository() {
    try {
      await execAsync('git rev-parse --git-dir', { cwd: this.cwd });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the git repository root
   * @returns {Promise<string|null>}
   */
  async getRepoRoot() {
    try {
      const { stdout } = await execAsync('git rev-parse --show-toplevel', { cwd: this.cwd });
      return stdout.trim();
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse git status --porcelain output
   * @returns {Promise<GitStatus[]>}
   */
  async getStatus() {
    try {
      const { stdout } = await execAsync('git status --porcelain', { cwd: this.cwd });

      if (!stdout.trim()) {
        return [];
      }

      const lines = stdout.trim().split('\n');
      const statuses = [];

      for (const line of lines) {
        if (line.length < 4) continue;

        // Porcelain format: XY PATH or XY ORIG_PATH -> RENAME_PATH
        const x = line[0];
        const y = line[1];
        const pathPart = line.substring(3);

        // Parse the path (handle renames)
        let file;
        let originalFile = null;

        if (pathPart.includes(' -> ')) {
          const parts = pathPart.split(' -> ');
          originalFile = parts[0];
          file = parts[1];
        } else {
          file = pathPart;
        }

        const status = this.parseStatusCode(x, y);

        statuses.push({
          file,
          originalFile,
          status,
          x,
          y
        });
      }

      return statuses;
    } catch (error) {
      return [];
    }
  }

  /**
   * Parse git status codes into readable status
   * @param {string} x - Index status
   * @param {string} y - Working tree status
   * @returns {string}
   */
  parseStatusCode(x, y) {
    // If X is not space, change is staged
    if (x !== ' ') {
      switch (x) {
        case 'M': return 'modified';
        case 'A': return 'added';
        case 'D': return 'deleted';
        case 'R': return 'renamed';
        case 'C': return 'copied';
        case 'U': return 'updated-but-unmerged';
      }
    }

    // Otherwise check working tree
    switch (y) {
      case 'M': return 'modified';
      case 'A': return 'added';
      case 'D': return 'deleted';
      case 'R': return 'renamed';
      case 'C': return 'copied';
      case 'U': return 'updated-but-unmerged';
      case '?': return 'untracked';
      case '!': return 'ignored';
      default: return 'unknown';
    }
  }

  /**
   * Check which files have uncommitted changes
   * @param {string[]} filePaths - Files to check
   * @returns {Promise<GitStatus[]>}
   */
  async checkUncommittedChanges(filePaths) {
    if (!(await this.isGitRepository())) {
      return [];
    }

    const repoRoot = await this.getRepoRoot();
    if (!repoRoot) {
      return [];
    }

    const allStatuses = await this.getStatus();
    const changedFiles = [];

    // Resolve file paths to absolute paths
    const resolvedFiles = filePaths.map(f => resolve(this.cwd, f));

    for (const status of allStatuses) {
      const statusPath = resolve(repoRoot, status.file);

      // Check if this status file matches any of our target files
      for (const targetPath of resolvedFiles) {
        if (statusPath === targetPath || statusPath.startsWith(targetPath + '/')) {
          changedFiles.push(status);
          break;
        }
      }
    }

    return changedFiles;
  }

  /**
   * Format a warning message for changed files
   * @param {GitStatus[]} changedFiles
   * @returns {string}
   */
  formatWarning(changedFiles) {
    if (changedFiles.length === 0) {
      return '';
    }

    const lines = [];
    lines.push('');
    lines.push('⚠️  Warning: The following files have uncommitted changes:');
    lines.push('');

    for (const file of changedFiles) {
      const status = file.status.charAt(0).toUpperCase() + file.status.slice(1);
      lines.push(`   ${file.file} (${status})`);
    }

    lines.push('');
    lines.push('   Consider committing your changes before proceeding.');
    lines.push('   Backups will be created, but uncommitted work may be harder to recover.');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Check if a specific file has uncommitted changes
   * @param {string} filePath
   * @returns {Promise<boolean>}
   */
  async hasUncommittedChanges(filePath) {
    const changes = await this.checkUncommittedChanges([filePath]);
    return changes.length > 0;
  }

  /**
   * Get a summary of the git status
   * @returns {Promise<Object>}
   */
  async getSummary() {
    const isRepo = await this.isGitRepository();

    if (!isRepo) {
      return {
        isRepository: false,
        hasUncommittedChanges: false,
        modifiedCount: 0,
        stagedCount: 0,
        untrackedCount: 0
      };
    }

    const statuses = await this.getStatus();

    const modified = statuses.filter(s => s.status === 'modified').length;
    const staged = statuses.filter(s => s.x !== ' ').length;
    const untracked = statuses.filter(s => s.status === 'untracked').length;

    return {
      isRepository: true,
      hasUncommittedChanges: statuses.length > 0,
      modifiedCount: modified,
      stagedCount: staged,
      untrackedCount: untracked,
      totalChanges: statuses.length
    };
  }
}

export default GitChecker;
