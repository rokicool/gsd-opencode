/**
 * `skills add <package>` command.
 *
 * Fetches a skill pack from GitHub and installs it to the OpenCode skills directory.
 *
 * Supported package format:
 *   owner/repo           → https://github.com/owner/repo (HEAD)
 *   owner/repo#ref       → specific branch, tag, or commit
 *
 * Skills are installed to:
 *   Global: ~/.config/opencode/skills/
 *   Local:  ./.opencode/skills/
 *
 * Installed skills are tracked in skills/.third-party-manifest.json,
 * separate from the GSD-OpenCode manifest to avoid interference.
 *
 * @module skills-add
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import ora from 'ora';
import chalk from 'chalk';
import { downloadGitHubTarball } from '../utils/github-fetcher.js';
import { promptInstallScope } from '../utils/interactive.js';
import { logger } from '../utils/logger.js';
import { ERROR_CODES, DEFAULT_CONFIG_DIR, LOCAL_CONFIG_DIR } from '../../lib/constants.js';

const THIRD_PARTY_MANIFEST = '.third-party-manifest.json';

/**
 * Resolves the skills installation directory.
 *
 * @param {'global'|'local'} scope
 * @returns {string} Absolute path to the skills/ directory
 */
function resolveSkillsDir(scope) {
  if (scope === 'global') {
    return path.join(os.homedir(), DEFAULT_CONFIG_DIR, 'skills');
  }
  return path.join(process.cwd(), LOCAL_CONFIG_DIR, 'skills');
}

/**
 * Parses a package string into owner, repo, and optional ref.
 *
 * @param {string} pkg - e.g. "remotion-dev/skills" or "remotion-dev/skills#main"
 * @returns {{ owner: string, repo: string, ref: string }}
 */
function parsePackage(pkg) {
  const [repoRef, ...rest] = pkg.split('#');
  const ref = rest.join('#') || 'HEAD';
  const parts = repoRef.split('/');

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(
      `Invalid package format "${pkg}". Expected: owner/repo or owner/repo#ref`
    );
  }

  return { owner: parts[0], repo: parts[1], ref };
}

/**
 * Finds skill directories inside the extracted tarball.
 *
 * Looks for:
 *   1. A top-level "skills/" subdirectory containing skill dirs
 *   2. Any directories containing a SKILL.md file (the repo itself is a skill pack)
 *
 * @param {string} extractedDir - Root of the extracted archive
 * @returns {Promise<Array<{name: string, srcPath: string}>>}
 */
async function findSkills(extractedDir) {
  const skills = [];

  // Check for a skills/ subdirectory
  const skillsSubdir = path.join(extractedDir, 'skills');
  try {
    const stat = await fs.stat(skillsSubdir);
    if (stat.isDirectory()) {
      const entries = await fs.readdir(skillsSubdir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          skills.push({ name: entry.name, srcPath: path.join(skillsSubdir, entry.name) });
        }
      }
      if (skills.length > 0) return skills;
    }
  } catch {
    // No skills/ subdir — fall through to direct scan
  }

  // Scan root for directories containing SKILL.md
  const entries = await fs.readdir(extractedDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillMd = path.join(extractedDir, entry.name, 'SKILL.md');
    try {
      await fs.access(skillMd);
      skills.push({ name: entry.name, srcPath: path.join(extractedDir, entry.name) });
    } catch {
      // Not a skill dir
    }
  }

  return skills;
}

/**
 * Reads or initialises the third-party manifest file.
 *
 * @param {string} skillsDir
 * @returns {Promise<Object>}
 */
async function readManifest(skillsDir) {
  const manifestPath = path.join(skillsDir, THIRD_PARTY_MANIFEST);
  try {
    const content = await fs.readFile(manifestPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { installedAt: {}, packages: {} };
  }
}

/**
 * Writes the third-party manifest file.
 *
 * @param {string} skillsDir
 * @param {Object} manifest
 */
async function writeManifest(skillsDir, manifest) {
  const manifestPath = path.join(skillsDir, THIRD_PARTY_MANIFEST);
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
}

/**
 * Recursively copies a directory.
 *
 * @param {string} src
 * @param {string} dest
 */
async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Main handler for `skills add <package>`.
 *
 * @param {string} pkg - Package string, e.g. "remotion-dev/skills"
 * @param {Object} options
 * @param {boolean} [options.global]
 * @param {boolean} [options.local]
 * @param {boolean} [options.dryRun]
 * @param {boolean} [options.verbose]
 * @returns {Promise<number>} Exit code
 */
export async function skillsAddCommand(pkg, options = {}) {
  let parsed;
  try {
    parsed = parsePackage(pkg);
  } catch (err) {
    logger.error(err.message);
    logger.info('');
    logger.info('Usage: skills add <owner/repo>');
    logger.info('       skills add <owner/repo#ref>');
    return ERROR_CODES.GENERAL_ERROR;
  }

  const { owner, repo, ref } = parsed;

  // Determine scope
  let scope;
  if (options.global) {
    scope = 'global';
  } else if (options.local) {
    scope = 'local';
  } else {
    scope = await promptInstallScope();
    if (!scope) {
      logger.info('Installation cancelled.');
      return ERROR_CODES.SUCCESS;
    }
  }

  const skillsDir = resolveSkillsDir(scope);

  logger.info('');
  logger.info(chalk.bold(`Installing ${chalk.cyan(`${owner}/${repo}`)} → ${chalk.dim(skillsDir)}`));
  logger.info('');

  // Download
  const dlSpinner = ora(`Downloading ${owner}/${repo}@${ref}...`).start();
  let extractedDir, cleanup;
  try {
    ({ extractedDir, cleanup } = await downloadGitHubTarball(owner, repo, ref));
    dlSpinner.succeed(`Downloaded ${owner}/${repo}`);
  } catch (err) {
    dlSpinner.fail(`Download failed: ${err.message}`);
    if (err.message.includes('HTTP 404')) {
      logger.error(`Repository "${owner}/${repo}" not found on GitHub.`);
    } else if (err.message.includes('HTTP 403')) {
      logger.error('GitHub API rate limit hit. Try again later or set GITHUB_TOKEN env var.');
    }
    return ERROR_CODES.GENERAL_ERROR;
  }

  // Find skills in the archive
  let skills;
  try {
    skills = await findSkills(extractedDir);
  } catch (err) {
    logger.error(`Failed to read extracted archive: ${err.message}`);
    await cleanup();
    return ERROR_CODES.GENERAL_ERROR;
  }

  if (skills.length === 0) {
    logger.warn(`No skills found in ${owner}/${repo}.`);
    logger.info('Expected: a "skills/" directory or directories containing SKILL.md at the root.');
    await cleanup();
    return ERROR_CODES.GENERAL_ERROR;
  }

  if (options.dryRun) {
    logger.info(chalk.yellow('[dry-run] Would install:'));
    for (const skill of skills) {
      logger.info(`  ${chalk.green('+')} ${skill.name} → ${path.join(skillsDir, skill.name)}`);
    }
    await cleanup();
    return ERROR_CODES.SUCCESS;
  }

  // Install
  const installSpinner = ora(`Installing ${skills.length} skill(s)...`).start();
  try {
    await fs.mkdir(skillsDir, { recursive: true });

    const installed = [];
    for (const skill of skills) {
      const destPath = path.join(skillsDir, skill.name);
      await copyDir(skill.srcPath, destPath);
      installed.push(skill.name);
    }

    // Update manifest
    const manifest = await readManifest(skillsDir);
    manifest.packages[`${owner}/${repo}`] = {
      ref,
      installedAt: new Date().toISOString(),
      skills: installed
    };
    await writeManifest(skillsDir, manifest);

    installSpinner.succeed(`Installed ${installed.length} skill(s)`);
  } catch (err) {
    installSpinner.fail(`Installation failed: ${err.message}`);
    await cleanup();
    return ERROR_CODES.GENERAL_ERROR;
  }

  await cleanup();

  logger.info('');
  logger.info(chalk.green('✓') + ` Successfully installed ${chalk.cyan(`${owner}/${repo}`)}`);
  logger.info('');
  for (const skill of skills) {
    logger.info(`  ${chalk.dim('→')} ${skill.name}`);
  }
  logger.info('');

  return ERROR_CODES.SUCCESS;
}
