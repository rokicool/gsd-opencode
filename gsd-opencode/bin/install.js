#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");

// Colors
const cyan = "\x1b[36m";
const green = "\x1b[32m";
const yellow = "\x1b[33m";
const dim = "\x1b[2m";
const gray = "\x1b[90m";
const white = "\x1b[37m";
const reset = "\x1b[0m";

// Get version from package.json
const pkg = require("../package.json");

const banner = `
${cyan}   ██████╗ ███████╗██████╗
  ██╔════╝ ██╔════╝██╔══██╗
  ██║  ███╗███████╗██║  ██║
  ██║   ██║╚════██║██║  ██║
  ╚██████╔╝███████║██████╔╝
   ╚═════╝ ╚══════╝╚═════╝${reset}

                                   ${white}▄${reset}
  ${gray}█▀▀█${reset} ${gray}█▀▀█${reset} ${gray}█▀▀█${reset} ${gray}█▀▀▄${reset} ${white}█▀▀▀${reset} ${white}█▀▀█${reset} ${white}█▀▀█${reset} ${white}█▀▀█${reset}
  ${gray}█░░█${reset} ${gray}█░░█${reset} ${gray}█▀▀▀${reset} ${gray}█░░█${reset} ${white}█░░░${reset} ${white}█░░█${reset} ${white}█░░█${reset} ${white}█▀▀▀${reset}
  ${gray}▀▀▀▀${reset} ${gray}█▀▀▀${reset} ${gray}▀▀▀▀${reset} ${gray}▀  ▀${reset} ${white}▀▀▀▀${reset} ${white}▀▀▀▀${reset} ${white}▀▀▀▀${reset} ${white}▀▀▀▀${reset}

  Get Shit Done ${dim}v${pkg.version}${reset}
  A meta-prompting, context engineering and spec-driven
  development system for Cloude Code by TÂCHES
  (adopted for OpenCode by rokicool and GLM4.7)

`;

// Parse args
const args = process.argv.slice(2);
const hasGlobal = args.includes("--global") || args.includes("-g");
const hasLocal = args.includes("--local") || args.includes("-l");

// Parse --config-dir argument
function parseConfigDirArg() {
  const configDirIndex = args.findIndex(
    (arg) => arg === "--config-dir" || arg === "-c",
  );
  if (configDirIndex !== -1) {
    const nextArg = args[configDirIndex + 1];
    // Error if --config-dir is provided without a value or next arg is another flag
    if (!nextArg || nextArg.startsWith("-")) {
      console.error(`  ${yellow}--config-dir requires a path argument${reset}`);
      process.exit(1);
    }
    return nextArg;
  }
  // Also handle --config-dir=value format
  const configDirArg = args.find(
    (arg) => arg.startsWith("--config-dir=") || arg.startsWith("-c="),
  );
  if (configDirArg) {
    return configDirArg.split("=")[1];
  }
  return null;
}
const explicitConfigDir = parseConfigDirArg();
const hasHelp = args.includes("--help") || args.includes("-h");

console.log(banner);

// Show help if requested
if (hasHelp) {
  console.log(`  ${yellow}Usage:${reset} npx gsd-opencode [options]

  ${yellow}Options:${reset}
    ${cyan}-g, --global${reset}              Install globally (to OpenCode config directory)
    ${cyan}-l, --local${reset}               Install locally (to .opencode in current directory)
    ${cyan}-c, --config-dir <path>${reset}   Specify custom OpenCode config directory
    ${cyan}-h, --help${reset}                Show this help message

  ${yellow}Examples:${reset}
    ${dim}# Install to default ~/.config/opencode directory${reset}
    npx gsd-opencode --global

    ${dim}# Install to custom config directory (for multiple OpenCode accounts)${reset}
    npx gsd-opencode --global --config-dir ~/.opencode-bc

    ${dim}# Using environment variable${reset}
    OPENCODE_CONFIG_DIR=~/.opencode-bc npx gsd-opencode --global

    ${dim}# Install to current project only${reset}
    npx gsd-opencode --local

  ${yellow}Notes:${reset}
    The --config-dir option is useful when you have multiple OpenCode
    configurations (e.g., for different subscriptions). It takes priority
    over the OPENCODE_CONFIG_DIR environment variable.
  `);
  process.exit(0);
}

/**
 * Expand ~ to home directory (shell doesn't expand in env vars passed to node)
 */
function expandTilde(filePath) {
  if (filePath && filePath.startsWith("~/")) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

/**
 * Recursively copy directory, replacing paths in .md files
 */
function copyWithPathReplacement(srcDir, destDir, pathPrefix) {
  fs.mkdirSync(destDir, { recursive: true });

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyWithPathReplacement(srcPath, destPath, pathPrefix);
    } else if (entry.name.endsWith(".md")) {
      // Replace repo-local prompt references so installed prompts work outside this repo.
      // IMPORTANT: order matters to avoid double-rewrites.
      let content = fs.readFileSync(srcPath, "utf8");

      // 1) @-references to this repo → install-relative @-references
      //    @gsd-opencode/... → @~/.config/opencode/... (global)
      //    @gsd-opencode/... → @./.opencode/... (local)
      content = content.replace(/@gsd-opencode\//g, `@${pathPrefix}`);

      // 2) Plain (non-@) repo-local paths → install-relative paths
      //    gsd-opencode/... → ~/.config/opencode/... (global)
      //    gsd-opencode/... → ./.opencode/... (local)
      content = content.replace(/\bgsd-opencode\//g, pathPrefix);

      // 3) Back-compat: rewrite legacy Claude paths → OpenCode paths
      // NOTE: keep these rewrites verbatim for backward compatibility.
      content = content.replace(/~\/\.claude\//g, pathPrefix);
      content = content.replace(/\.\/\.claude\//g, "./.opencode/");

      fs.writeFileSync(destPath, content);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Install to the specified directory
 */
function install(isGlobal) {
  const src = path.join(__dirname, "..");
  // Priority: explicit --config-dir arg > OPENCODE_CONFIG_DIR env var > default ~/.config/opencode
  const configDir =
    expandTilde(explicitConfigDir) ||
    expandTilde(process.env.OPENCODE_CONFIG_DIR);
  const defaultGlobalDir =
    configDir || path.join(os.homedir(), ".config", "opencode");
  const opencodeDir = isGlobal
    ? defaultGlobalDir
    : path.join(process.cwd(), ".opencode");

  const locationLabel = isGlobal
    ? opencodeDir.replace(os.homedir(), "~")
    : opencodeDir.replace(process.cwd(), ".");

  // Path prefix for file references
  // Use actual path when OPENCODE_CONFIG_DIR is set, otherwise use ~ shorthand
  const pathPrefix = isGlobal
    ? configDir
      ? `${opencodeDir}/`
      : "~/.config/opencode/"
    : "./.opencode/";

  function scanForUnresolvedRepoLocalTokens(destRoot) {
    const tokenRegex = /@gsd-opencode\/|\bgsd-opencode\//g;
    const maxHits = 10;
    const hits = [];

    function walk(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (hits.length >= maxHits) return;

        const filePath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(filePath);
          continue;
        }

        if (!entry.name.endsWith(".md")) continue;

        const content = fs.readFileSync(filePath, "utf8");
        tokenRegex.lastIndex = 0;
        if (!tokenRegex.test(content)) continue;

        // Capture a readable snippet (first matching line)
        const lines = content.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          tokenRegex.lastIndex = 0;
          if (tokenRegex.test(lines[i])) {
            hits.push({
              file: filePath,
              line: i + 1,
              snippet: lines[i].trim().slice(0, 200),
            });
            break;
          }
        }
      }
    }

    walk(destRoot);

    if (hits.length > 0) {
      console.log(
        `\n  ${yellow}⚠️  Install sanity check: unresolved repo-local tokens found${reset}`,
      );
      console.log(
        `  ${yellow}This may cause commands like /gsd-settings to fail in other repos (ENOENT).${reset}`,
      );
      console.log(`  ${dim}Showing up to ${maxHits} matches:${reset}`);

      for (const hit of hits) {
        const displayPath = isGlobal
          ? hit.file.replace(os.homedir(), "~")
          : hit.file.replace(process.cwd(), ".");
        console.log(
          `  - ${displayPath}:${hit.line}\n    ${dim}${hit.snippet}${reset}`,
        );
      }

      console.log("");
    }
  }

  console.log(`  Installing to ${cyan}${locationLabel}${reset}\n`);

  // Create commands directory (singular "command" not "commands")
  const commandsDir = path.join(opencodeDir, "command");
  fs.mkdirSync(commandsDir, { recursive: true });

  // Copy commands/gsd with path replacement
  const gsdSrc = path.join(src, "command", "gsd");
  const gsdDest = path.join(commandsDir, "gsd");
  copyWithPathReplacement(gsdSrc, gsdDest, pathPrefix);
  console.log(`  ${green}✓${reset} Installed command/gsd`);

  // Copy agents  with path replacement
  const agentsSrc = path.join(src, "agents");
  const agentsDest = path.join(opencodeDir, "agents");
  copyWithPathReplacement(agentsSrc, agentsDest, pathPrefix);
  console.log(`  ${green}✓${reset} Installed agents`);

  // Copy get-shit-done skill with path replacement
  const skillSrc = path.join(src, "get-shit-done");
  const skillDest = path.join(opencodeDir, "get-shit-done");
  copyWithPathReplacement(skillSrc, skillDest, pathPrefix);
  console.log(`  ${green}✓${reset} Installed get-shit-done`);

  // Post-install diagnostic (do not fail install).
  scanForUnresolvedRepoLocalTokens(opencodeDir);

  // Create VERSION file
  fs.writeFileSync(path.join(skillDest, "VERSION"), `v${pkg.version}`);
  console.log(`  ${green}✓${reset} Created VERSION file`);

  console.log(`
  ${green}Done!${reset} Run ${cyan}/gsd-help${reset} to get started.
  `);
}

/**
 * Prompt for install location
 */
function promptLocation() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const configDir =
    expandTilde(explicitConfigDir) ||
    expandTilde(process.env.OPENCODE_CONFIG_DIR);
  const globalPath =
    configDir || path.join(os.homedir(), ".config", "opencode");
  const globalLabel = globalPath.replace(os.homedir(), "~");

  console.log(`  ${yellow}Where would you like to install?${reset}

  ${cyan}1${reset}) Global ${dim}(${globalLabel})${reset} - available in all projects
  ${cyan}2${reset}) Local  ${dim}(./.opencode)${reset} - this project only
  `);

  rl.question(`  Choice ${dim}[1]${reset}: `, (answer) => {
    rl.close();
    const choice = answer.trim() || "1";
    const isGlobal = choice !== "2";
    install(isGlobal);
  });
}

// Main
if (hasGlobal && hasLocal) {
  console.error(`  ${yellow}Cannot specify both --global and --local${reset}`);
  process.exit(1);
} else if (explicitConfigDir && hasLocal) {
  console.error(`  ${yellow}Cannot use --config-dir with --local${reset}`);
  process.exit(1);
} else if (hasGlobal) {
  install(true);
} else if (hasLocal) {
  install(false);
} else {
  promptLocation();
}
