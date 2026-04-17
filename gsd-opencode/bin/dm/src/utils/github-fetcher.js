/**
 * GitHub tarball downloader.
 *
 * Downloads a GitHub repo as a gzipped tarball using the GitHub API,
 * extracts it to a temp directory, and returns the path to the extracted root.
 *
 * Uses only Node.js built-ins (https, fs, child_process) — no extra deps.
 *
 * @module github-fetcher
 */

import https from 'https';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import path from 'path';

const execFileAsync = promisify(execFile);

/**
 * Downloads a GitHub repo tarball and extracts it to a temp directory.
 *
 * @param {string} owner - GitHub organization or user (e.g. "remotion-dev")
 * @param {string} repo - Repository name (e.g. "skills")
 * @param {string} [ref] - Branch, tag, or commit SHA (default: "HEAD")
 * @returns {Promise<{extractedDir: string, cleanup: () => Promise<void>}>}
 *   extractedDir: path to the top-level directory inside the archive
 *   cleanup: async function to remove the temp directory when done
 */
export async function downloadGitHubTarball(owner, repo, ref = 'HEAD') {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `skills-${owner}-${repo}-`));
  const tarPath = path.join(tempDir, 'archive.tar.gz');

  try {
    await downloadFile(
      `https://api.github.com/repos/${owner}/${repo}/tarball/${ref}`,
      tarPath
    );

    await execFileAsync('tar', ['-xzf', tarPath, '-C', tempDir]);

    // GitHub tarballs extract to a single top-level dir like "owner-repo-<sha>/"
    const entries = await fs.readdir(tempDir);
    const extractedName = entries.find(e => e !== 'archive.tar.gz');
    if (!extractedName) {
      throw new Error('Tarball extraction produced no directory');
    }

    const extractedDir = path.join(tempDir, extractedName);

    return {
      extractedDir,
      cleanup: () => fs.rm(tempDir, { recursive: true, force: true })
    };
  } catch (error) {
    await fs.rm(tempDir, { recursive: true, force: true });
    throw error;
  }
}

/**
 * Downloads a URL to a local file, following redirects.
 *
 * @param {string} url - HTTPS URL to download
 * @param {string} destPath - Local file path to write to
 * @returns {Promise<void>}
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const makeRequest = (requestUrl) => {
      const options = new URL(requestUrl);
      const reqOptions = {
        hostname: options.hostname,
        path: options.pathname + options.search,
        headers: {
          'User-Agent': 'gsd-opencode-skills-cli',
          'Accept': 'application/vnd.github+json'
        }
      };

      https.get(reqOptions, (res) => {
        // Follow redirects (GitHub API returns 302 to S3)
        if (res.statusCode === 301 || res.statusCode === 302) {
          res.resume();
          makeRequest(res.headers.location);
          return;
        }

        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode} fetching ${requestUrl}`));
          return;
        }

        const file = createWriteStream(destPath);
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
        file.on('error', (err) => {
          file.close();
          reject(err);
        });
      }).on('error', reject);
    };

    makeRequest(url);
  });
}
