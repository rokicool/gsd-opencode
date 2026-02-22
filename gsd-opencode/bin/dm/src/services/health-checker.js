/**
 * Health checker service for verifying installation integrity.
 *
 * This module provides comprehensive health checking capabilities for
 * GSD-OpenCode installations. It can verify file existence, version matching,
 * and file integrity through hash comparison. Works in conjunction with
 * ScopeManager to handle both global and local installations.
 *
 * @module health-checker
 */

import fs from 'fs/promises';
import path from 'path';
import { ScopeManager } from './scope-manager.js';
import { hashFile } from '../utils/hash.js';
import { DIRECTORIES_TO_COPY, VERSION_FILE } from '../../lib/constants.js';
import { StructureDetector, STRUCTURE_TYPES } from './structure-detector.js';

/**
 * Manages health verification for GSD-OpenCode installations.
 *
 * This class provides methods to verify installation integrity through
 * multiple check categories: file existence, version matching, and file
 * integrity (hash-based). It uses ScopeManager for path resolution and
 * follows the established service layer pattern.
 *
 * @class HealthChecker
 * @example
 * const scope = new ScopeManager({ scope: 'global' });
 * const health = new HealthChecker(scope);
 *
 * // Check all aspects
 * const result = await health.checkAll({ expectedVersion: '1.0.0' });
 * if (result.passed) {
 *   console.log('Installation is healthy');
 * } else {
 *   console.log(`Issues found: ${result.categories.files.checks.filter(c => !c.passed).length} files`);
 * }
 */
export class HealthChecker {
  /**
   * Creates a new HealthChecker instance.
   *
   * @param {ScopeManager} scopeManager - ScopeManager instance for path resolution
   * @throws {Error} If scopeManager is not provided or invalid
   *
   * @example
   * const scope = new ScopeManager({ scope: 'global' });
   * const health = new HealthChecker(scope);
   */
  constructor(scopeManager) {
    if (!scopeManager) {
      throw new Error('ScopeManager instance is required');
    }

    if (typeof scopeManager.getTargetDir !== 'function') {
      throw new Error('Invalid ScopeManager: missing getTargetDir method');
    }

    this.scopeManager = scopeManager;
    this.targetDir = scopeManager.getTargetDir();
    this.structureDetector = new StructureDetector(this.targetDir);
  }

  /**
   * Detects the directory structure and returns status information.
   *
   * Uses StructureDetector to determine if the installation uses the old
   * (command/gsd/), new (commands/gsd/), dual (both), or no structure.
   *
   * @returns {Promise<Object>} Structure detection results
   * @property {string} type - One of STRUCTURE_TYPES (old, new, dual, none)
   * @property {string} label - Human-readable label for the structure
   * @property {boolean} needsMigration - True if migration is recommended
   * @property {boolean} isHealthy - True if structure is valid (new or none)
   *
   * @example
   * const structure = await health.detectStructure();
   * if (structure.needsMigration) {
   *   console.log(`Migration needed: ${structure.label}`);
   * }
   */
  async detectStructure() {
    const structure = await this.structureDetector.detect();

    const status = {
      type: structure,
      label: this._getStructureLabel(structure),
      needsMigration: structure === STRUCTURE_TYPES.OLD || structure === STRUCTURE_TYPES.DUAL,
      isHealthy: structure === STRUCTURE_TYPES.NEW || structure === STRUCTURE_TYPES.NONE
    };

    return status;
  }

  /**
   * Gets a human-readable label for a structure type.
   *
   * @private
   * @param {string} type - One of STRUCTURE_TYPES values
   * @returns {string} Human-readable label
   */
  _getStructureLabel(type) {
    const labels = {
      [STRUCTURE_TYPES.OLD]: 'Legacy (command/gsd/)',
      [STRUCTURE_TYPES.NEW]: 'Current (commands/gsd/)',
      [STRUCTURE_TYPES.DUAL]: 'Dual (both structures)',
      [STRUCTURE_TYPES.NONE]: 'No command structure'
    };
    return labels[type] || 'Unknown';
  }

  /**
   * Verifies that all required files and directories exist.
   *
   * Checks each directory in DIRECTORIES_TO_COPY and the VERSION file.
   * Returns structured results suitable for CLI output.
   *
   * @returns {Promise<Object>} File verification results
   * @property {boolean} passed - True if all required files exist
   * @property {Array} checks - Detailed check results for each file/directory
   *
   * @example
   * const result = await health.verifyFiles();
   * console.log(result.passed); // true/false
   * console.log(result.checks);
   * // [
   * //   { name: 'agents directory', passed: true, path: '/.../agents' },
   * //   { name: 'VERSION file', passed: true, path: '/.../VERSION' }
   * // ]
   */
  async verifyFiles() {
    const checks = [];
    let allPassed = true;

    // Check each required directory
    for (const dirName of DIRECTORIES_TO_COPY) {
      const dirPath = path.join(this.targetDir, dirName);
      try {
        const stats = await fs.stat(dirPath);
        const passed = stats.isDirectory();
        checks.push({
          name: `${dirName} directory`,
          passed,
          path: dirPath
        });
        if (!passed) allPassed = false;
      } catch (error) {
        checks.push({
          name: `${dirName} directory`,
          passed: false,
          path: dirPath,
          error: error.code === 'ENOENT' ? 'Directory not found' : error.message
        });
        allPassed = false;
      }
    }

    // Check VERSION file
    const versionPath = path.join(this.targetDir, VERSION_FILE);
    try {
      const stats = await fs.stat(versionPath);
      const passed = stats.isFile();
      checks.push({
        name: 'VERSION file',
        passed,
        path: versionPath
      });
      if (!passed) allPassed = false;
    } catch (error) {
      checks.push({
        name: 'VERSION file',
        passed: false,
        path: versionPath,
        error: error.code === 'ENOENT' ? 'File not found' : error.message
      });
      allPassed = false;
    }

    return {
      passed: allPassed,
      checks
    };
  }

  /**
   * Verifies that the installed version matches the expected version.
   *
   * Reads the VERSION file and compares its content with the expected
   * version string. Handles cases where VERSION file doesn't exist.
   *
   * @param {string} expectedVersion - The expected version string (e.g., '1.0.0')
   * @returns {Promise<Object>} Version verification results
   * @property {boolean} passed - True if version matches
   * @property {string|null} installed - The installed version, or null if not found
   * @property {string} expected - The expected version that was checked
   * @property {Array} checks - Detailed check results
   *
   * @example
   * const result = await health.verifyVersion('1.0.0');
   * console.log(result.passed); // true if VERSION contains '1.0.0'
   * console.log(result.installed); // '1.0.0' or null
   */
  async verifyVersion(expectedVersion) {
    if (!expectedVersion || typeof expectedVersion !== 'string') {
      throw new Error('Expected version must be a non-empty string');
    }

    const versionPath = path.join(this.targetDir, VERSION_FILE);
    let installedVersion = null;
    let passed = false;
    let error = null;

    try {
      const content = await fs.readFile(versionPath, 'utf-8');
      installedVersion = content.trim();
      passed = installedVersion === expectedVersion;
    } catch (err) {
      if (err.code === 'ENOENT') {
        error = 'VERSION file not found';
      } else if (err.code === 'EACCES') {
        error = 'Permission denied reading VERSION file';
      } else {
        error = err.message;
      }
    }

    return {
      passed,
      installed: installedVersion,
      expected: expectedVersion,
      checks: [{
        name: 'version match',
        passed,
        installed: installedVersion,
        expected: expectedVersion,
        error
      }]
    };
  }

  /**
   * Verifies file integrity by checking that key files are readable.
   *
   * For v1, this performs basic integrity checks by verifying that
   * sample files from each required directory exist and are readable.
   * Future versions may compare against known-good hashes.
   *
   * @returns {Promise<Object>} Integrity verification results
   * @property {boolean} passed - True if all integrity checks pass
   * @property {Array} checks - Detailed check results for each file
   *
   * @example
   * const result = await health.verifyIntegrity();
   * console.log(result.passed); // true/false
   * console.log(result.checks);
   * // [
   * //   { file: '/.../agents/README.md', passed: true },
   * //   { file: '/.../command/gsd/help.md', passed: true }
   * // ]
   */
  async verifyIntegrity() {
    const checks = [];
    let allPassed = true;

    // Check sample files from each required directory
    // These represent key files that should always exist
    const sampleFiles = [
      { dir: 'agents', file: 'gsd-executor.md' },
      { dir: 'command', file: 'gsd/help.md' },
      { dir: 'get-shit-done', file: 'templates/summary.md' }
    ];

    for (const { dir, file } of sampleFiles) {
      const filePath = path.join(this.targetDir, dir, file);
      try {
        // Try to read and hash the file
        const hash = await hashFile(filePath);
        const passed = hash !== null;
        checks.push({
          file: filePath,
          hash,
          passed,
          relative: path.join(dir, file)
        });
        if (!passed) allPassed = false;
      } catch (error) {
        checks.push({
          file: filePath,
          hash: null,
          passed: false,
          relative: path.join(dir, file),
          error: error.code === 'ENOENT' ? 'File not found' : error.message
        });
        allPassed = false;
      }
    }

    // Also verify VERSION file is readable (counts as integrity check)
    const versionPath = path.join(this.targetDir, VERSION_FILE);
    try {
      const content = await fs.readFile(versionPath, 'utf-8');
      checks.push({
        file: versionPath,
        hash: null, // We don't hash VERSION file
        passed: true,
        relative: VERSION_FILE
      });
    } catch (error) {
      checks.push({
        file: versionPath,
        hash: null,
        passed: false,
        relative: VERSION_FILE,
        error: error.code === 'ENOENT' ? 'File not found' : error.message
      });
      allPassed = false;
    }

    return {
      passed: allPassed,
      checks
    };
  }

  /**
   * Checks if a structure type can be repaired.
   *
   * Determines if the given structure type can be automatically repaired
   * (migrated from old to new structure).
   *
   * @param {string} structureType - One of STRUCTURE_TYPES values
   * @returns {boolean} True if structure can be repaired
   *
   * @example
   * const canRepair = healthChecker.canRepairStructure(STRUCTURE_TYPES.OLD);
   * // Returns true
   */
  canRepairStructure(structureType) {
    return structureType === STRUCTURE_TYPES.OLD ||
           structureType === STRUCTURE_TYPES.DUAL;
  }

  /**
   * Gets repair recommendation for structure issues.
   *
   * Returns appropriate repair command and message based on structure state.
   *
   * @param {string} structureType - One of STRUCTURE_TYPES values
   * @returns {Object} Repair recommendation
   * @property {boolean} canRepair - True if repair is possible
   * @property {string|null} command - Repair command to run
   * @property {string} message - Human-readable recommendation
   *
   * @example
   * const recommendation = healthChecker.getStructureRecommendation(STRUCTURE_TYPES.DUAL);
   * console.log(recommendation.command); // 'gsd-opencode repair --fix-structure'
   */
  getStructureRecommendation(structureType) {
    const canRepair = this.canRepairStructure(structureType);

    if (!canRepair) {
      return {
        canRepair: false,
        command: null,
        message: structureType === STRUCTURE_TYPES.NEW
          ? 'Structure is up to date'
          : 'No structure detected'
      };
    }

    const isDual = structureType === STRUCTURE_TYPES.DUAL;
    return {
      canRepair: true,
      command: 'gsd-opencode repair --fix-structure',
      message: isDual
        ? 'Dual structure detected (both old and new exist). Run repair --fix-structure to consolidate.'
        : 'Old structure detected (command/gsd/). Run repair --fix-structure to migrate.'
    };
  }

  /**
   * Runs all health checks and returns aggregated results.
   *
   * This is the main entry point for health verification. It runs
   * file existence, version matching, and integrity checks, then
   * aggregates the results with an overall pass/fail status and
   * suggested exit code.
   *
   * @param {Object} options - Check options
   * @param {string} [options.expectedVersion] - Expected version for version check
   * @param {boolean} [options.verbose=false] - Include verbose output
   * @returns {Promise<Object>} Complete health check results
   * @property {boolean} passed - True if all checks pass
   * @property {number} exitCode - Suggested exit code (0 for healthy, 1 for issues)
   * @property {Object} categories - Results from each check category
   * @property {Object} categories.files - File existence check results
   * @property {Object} categories.version - Version match check results
   * @property {Object} categories.integrity - Integrity check results
   * @property {Object} categories.structure - Structure check results with repair info
   *
   * @example
   * const result = await health.checkAll({ expectedVersion: '1.0.0' });
   * console.log(result.passed); // true/false
   * console.log(result.exitCode); // 0 or 1
   * console.log(result.categories.files.passed); // etc.
   * console.log(result.categories.structure.repairCommand); // 'gsd-opencode repair --fix-structure'
   */
  async checkAll(options = {}) {
    const { expectedVersion, verbose = false } = options;

    // Run all checks in parallel including structure detection
    const [filesResult, integrityResult, structureResult] = await Promise.all([
      this.verifyFiles(),
      this.verifyIntegrity(),
      this.detectStructure()
    ]);

    // Version check only if expectedVersion provided
    let versionResult = null;
    if (expectedVersion) {
      versionResult = await this.verifyVersion(expectedVersion);
    }

    // Determine overall status
    // Dual structure is considered unhealthy (requires action)
    const allResults = [filesResult.passed, integrityResult.passed];
    if (versionResult) {
      allResults.push(versionResult.passed);
    }

    // Structure check: NEW and NONE are healthy, OLD and DUAL need attention
    // DUAL structure causes failure (non-zero exit code)
    const structureHealthy = structureResult.type === STRUCTURE_TYPES.NEW ||
                             structureResult.type === STRUCTURE_TYPES.NONE;
    if (!structureHealthy) {
      allResults.push(false);
    }

    // Add repair information to structure result
    const repairRecommendation = this.getStructureRecommendation(structureResult.type);
    const enhancedStructureResult = {
      ...structureResult,
      canRepair: repairRecommendation.canRepair,
      repairCommand: repairRecommendation.command,
      repairMessage: repairRecommendation.message
    };

    const allPassed = allResults.every(r => r);

    return {
      passed: allPassed,
      exitCode: allPassed ? 0 : 1,
      categories: {
        files: filesResult,
        version: versionResult,
        integrity: integrityResult,
        structure: enhancedStructureResult
      }
    };
  }
}

/**
 * Default export for the health-checker module.
 *
 * @example
 * import { HealthChecker } from './services/health-checker.js';
 * const scope = new ScopeManager({ scope: 'global' });
 * const health = new HealthChecker(scope);
 * const result = await health.checkAll({ expectedVersion: '1.0.0' });
 */
export default {
  HealthChecker
};
