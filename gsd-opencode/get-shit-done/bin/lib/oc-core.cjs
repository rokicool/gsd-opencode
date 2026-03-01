/**
 * oc-core.cjs — Shared utilities for gsd-oc-tools CLI
 *
 * Provides common functions for output formatting, error handling, file operations.
 * Follows gsd-tools.cjs architecture pattern.
 */

const fs = require('fs');
const path = require('path');

/**
 * Output result in JSON envelope format
 * Large payloads (>50KB) are written to temp file with @file: prefix
 *
 * @param {Object} result - The result data to output
 * @param {boolean} raw - If true, output raw value instead of envelope
 * @param {*} rawValue - The raw value to output if raw=true
 */
function output(result, raw = false, rawValue = null) {
  let outputData;

  if (raw && rawValue !== null) {
    outputData = rawValue;
  } else {
    outputData = result;
  }

  const outputStr = JSON.stringify(outputData, null, 2);

  // Large payload handling (>50KB)
  if (outputStr.length > 50 * 1024) {
    const tempFile = path.join(require('os').tmpdir(), `gsd-oc-${Date.now()}.json`);
    fs.writeFileSync(tempFile, outputStr, 'utf8');
    console.log(`@file:${tempFile}`);
  } else {
    console.log(outputStr);
  }
}

/**
 * Output error in standardized envelope format to stderr
 *
 * @param {string} message - Error message
 * @param {string} code - Error code (e.g., 'CONFIG_NOT_FOUND', 'INVALID_JSON')
 */
function error(message, code = 'UNKNOWN_ERROR') {
  const errorEnvelope = {
    success: false,
    error: {
      code,
      message
    }
  };
  console.error(JSON.stringify(errorEnvelope, null, 2));
  process.exit(1);
}

/**
 * Safely read a file, returning null on failure
 *
 * @param {string} filePath - Path to file
 * @returns {string|null} File contents or null
 */
function safeReadFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return null;
  }
}

/**
 * Create timestamped backup of a file
 *
 * @param {string} filePath - Path to file to backup
 * @param {string} backupDir - Directory for backups (.opencode-backups/)
 * @returns {string|null} Backup file path or null on failure
 */
function createBackup(filePath, backupDir = '.opencode-backups') {
  try {
    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Read original file
    const content = fs.readFileSync(filePath, 'utf8');

    // Create timestamped filename (YYYYMMDD-HHmmss-SSS format)
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[-:T]/g, '')
      .replace(/\.\d{3}Z$/, '')
      .replace(/(\d{8})(\d{6})(\d{3})/, '$1-$2-$3');

    const fileName = path.basename(filePath);
    const backupFileName = `${timestamp}-${fileName}`;
    const backupPath = path.join(backupDir, backupFileName);

    // Write backup
    fs.writeFileSync(backupPath, content, 'utf8');

    return backupPath;
  } catch (err) {
    return null;
  }
}

module.exports = {
  output,
  error,
  safeReadFile,
  createBackup
};
