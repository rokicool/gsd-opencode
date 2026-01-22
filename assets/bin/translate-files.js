#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Translation rules from Claude Code to OpenCode
 */
const translationRules = {
  // Frontmatter and command names
  gsd: (content) => content.replace(/gsd:/g, 'gsd-'),

  // Path transformations
  paths: (content) =>
    content
      .replace(/~\/\.claude\/get-shit-done/g, '~/.config/opencode/get-shit-done')
      .replace(/~\/\.claude\//g, '~/.config/opencode/')
      .replace(/\.opencode\/get-shit-done\//g, '.opencode/get-shit-done/'),

  // Project references
  project: (content) =>
    content
      .replace(/get-shit-done-cc/g, 'gsd-opencode')
      .replace(/glittercowboy/g, 'rokicool')
      .replace(/https:\/\/raw\.githubusercontent\.com\/glittercowboy\/get-shit-done/g,
              'https://raw.githubusercontent.com/rokicool/gsd-opencode'),

  // Tools
  tools: (content) =>
    content
      .replace(/AskUserQuestion/g, 'question')
      .replace(/\bRead\b/g, 'read')
      .replace(/\bWrite\b/g, 'write')
      .replace(/\bEdit\b/g, 'edit')
      .replace(/\bBash\b/g, 'bash')
      .replace(/\bGlob\b/g, 'glob')
      .replace(/\bGrep\b/g, 'grep')
      .replace(/WebFetch\b/g, 'webfetch'),

  // Agent references (keep agent names as-is)
  agents: (content) => content,

  // Commands
  commands: (content) =>
    content
      .replace(/\/clear/g, '/new')
      .replace(/\/gsd:/g, '/gsd-'),

  // Tag syntax
  tags: (content) => content.replace(/<sub>/g, '*').replace(/<\/sub>/g, '*'),

  // Terminology
  terminology: (content) =>
    content
      .replace(/\bClaude Code\b/g, 'OpenCode')
      .replace(/\bClaude\b(?! Code)/g, 'OpenCode')
      .replace(/general-purpose/g, 'general'),

  // Variables
  variables: (content) => content.replace(/All arguments become/g, '$ARGUMENTS'),

  // MCP server references - mark as optional
  mcp: (content) =>
    content.replace(/mcp__context7__\*/g, '(optional MCP tool)'),

  // Additional forbidden strings and edge cases
  additional: (content) =>
    content
      .replace(/subagent_type="Explore"/g, 'mode="subagent"')
      .replace(/SlashCommand/g, 'Command')
      .replace(/\bTodoWrite\b/g, 'todowrite')
      .replace(/\bWebSearch\b/g, 'webfetch')
      .replace(/\bBashOutput\b/g, '(bash output)')
      .replace(/rokicool\/get-shit-done/g, 'rokicool/gsd-opencode')
      // Color conversion for agents
      .replace(/color: cyan/g, 'color: "#00FFFF"')
      .replace(/color: orange/g, 'color: "#FFA500"')
      .replace(/color: yellow/g, 'color: "#FFFF00"')
      .replace(/color: blue/g, 'color: "#0000FF"')
      .replace(/color: green/g, 'color: "#008000"')
      .replace(/color: purple/g, 'color: "#800080"')
      .replace(/color: red/g, 'color: "#FF0000"')
      // Cleanup tool lists in frontmatter
      .replace(/tools: read, write, edit, bash, grep, glob, webfetch/g, 'tools: read, write, edit, bash, grep, glob, webfetch')
      .replace(/tools: read, write, bash, grep, glob, webfetch, webfetch/g, 'tools: read, write, bash, grep, glob, webfetch'),
};

/**
 * Apply all translation rules to content
 */
function translateContent(content) {
  let translated = content;

  // Apply all rules in order
  for (const [name, rule] of Object.entries(translationRules)) {
    translated = rule(translated);
  }

  // Post-processing: Remove "Task" from allowed-tools/tools lists (not applicable to OpenCode)
  translated = translated.replace(/^allowed-tools:/gm, 'tools:')
    .replace(/^  - Task/gm, '')
    .replace(/^  - Task \(invoke via @agent mention\)/gm, '');

  return translated;
}

/**
 * Translate a single file
 */
function translateFile(sourcePath, targetPath) {
  try {
    console.log(`Translating: ${sourcePath} -> ${targetPath}`);

    // Read source file
    const content = fs.readFileSync(sourcePath, 'utf8');

    // Translate content
    const translated = translateContent(content);

    // Ensure target directory exists
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Write translated file
    fs.writeFileSync(targetPath, translated, 'utf8');

    console.log(`  ✓ Translated successfully`);
    return true;
  } catch (error) {
    console.error(`  ✗ Error: ${error.message}`);
    return false;
  }
}

/**
 * Translate all files in a category (handles subdirectories recursively)
 */
function translateCategory(sourceDir, targetDir, pattern = '*.md') {
  const items = fs.readdirSync(sourceDir);

  let translatedCount = 0;
  let failedCount = 0;

  for (const item of items) {
    const sourcePath = path.join(sourceDir, item);

    const stat = fs.statSync(sourcePath);

    if (stat.isDirectory()) {
      // Recursively translate subdirectory
      const subTargetDir = path.join(targetDir, item);
      const result = translateCategory(sourcePath, subTargetDir, pattern);
      translatedCount += result.translated;
      failedCount += result.failed;
    } else if (item.endsWith('.md')) {
      // Translate file
      const targetPath = path.join(targetDir, item);

      if (translateFile(sourcePath, targetPath)) {
        translatedCount++;
      } else {
        failedCount++;
      }
    }
  }

  return { translated: translatedCount, failed: failedCount, total: translatedCount + failedCount };
}

/**
 * Main function
 */
function main() {
  // Get to the root directory of the project (not assets/bin)
  const baseDir = path.dirname(path.join(__dirname, '..'));
  const sourceBase = path.join(baseDir, 'original/get-shit-done');
  const targetBase = path.join(baseDir, 'gsd-opencode');

  console.log('🚀 Starting translation from Claude Code to OpenCode');
  console.log(`📂 Source: ${sourceBase}`);
  console.log(`📂 Target: ${targetBase}`);
  console.log('');

  const results = {
    commands: { source: path.join(sourceBase, 'commands/gsd'), target: path.join(targetBase, 'command/gsd') },
    agents: { source: path.join(sourceBase, 'agents'), target: path.join(targetBase, 'agents') },
    references: { source: path.join(sourceBase, 'get-shit-done/references'), target: path.join(targetBase, 'get-shit-done/references') },
    templates: { source: path.join(sourceBase, 'get-shit-done/templates'), target: path.join(targetBase, 'get-shit-done/templates') },
    workflows: { source: path.join(sourceBase, 'get-shit-done/workflows'), target: path.join(targetBase, 'get-shit-done/workflows') },
  };

  const summary = {};

  // Translate each category
  for (const [category, paths] of Object.entries(results)) {
    console.log(`\n📋 Translating ${category}...`);

    if (!fs.existsSync(paths.source)) {
      console.log(`  ⚠️  Source directory not found: ${paths.source}`);
      summary[category] = { translated: 0, failed: 0, total: 0 };
      continue;
    }

    const result = translateCategory(paths.source, paths.target);
    summary[category] = result;

    console.log(`  ✓ ${result.translated}/${result.total} files translated`);
    if (result.failed > 0) {
      console.log(`  ✗ ${result.failed} files failed`);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Translation Summary');
  console.log('='.repeat(60));

  let totalTranslated = 0;
  let totalFailed = 0;

  for (const [category, result] of Object.entries(summary)) {
    console.log(`\n${category}:`);
    console.log(`  Translated: ${result.translated}`);
    console.log(`  Failed: ${result.failed}`);
    console.log(`  Total: ${result.total}`);
    totalTranslated += result.translated;
    totalFailed += result.failed;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Grand Total: ${totalTranslated} translated, ${totalFailed} failed`);
  console.log('='.repeat(60));

  if (totalFailed > 0) {
    console.log('\n⚠️  Some files failed to translate. Please check the errors above.');
    process.exit(1);
  } else {
    console.log('\n✅ All files translated successfully!');
    console.log('🎉 Don\'t forget to run the forbidden strings check:');
    console.log('   node ./assets/bin/check-forbidden-strings.js');
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { translateContent, translateFile, translateCategory };
