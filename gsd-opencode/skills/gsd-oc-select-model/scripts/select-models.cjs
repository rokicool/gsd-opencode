#!/usr/bin/env node

const { execSync } = require('child_process');

function checkOpenCodeAvailable() {
  try {
    execSync('which opencode', { stdio: 'pipe' });
    return true;
  } catch {
    console.error('Error: opencode CLI not found.');
    console.error('Please install opencode first.');
    console.error('');
    console.error('See: https://opencode.ai for installation instructions.');
    process.exit(1);
  }
}

function getModels(provider = null) {
  const cmd = provider 
    ? `opencode models "${provider}"`
    : `opencode models`;
  
  try {
    const output = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    const stderr = error.stderr ? error.stderr.toString().trim() : '';
    console.error(`Error: Failed to run opencode models: ${stderr || error.message}`);
    process.exit(1);
  }
}

function groupByProviders(models) {
  const providers = {};
  for (const model of models) {
    const slashIndex = model.indexOf('/');
    if (slashIndex === -1) continue;
    const provider = model.substring(0, slashIndex);
    const modelName = model.substring(slashIndex + 1);
    if (!providers[provider]) {
      providers[provider] = [];
    }
    providers[provider].push(modelName);
  }
  return providers;
}

function truncateSample(models, maxLen = 30) {
  const samples = models.slice(0, 3);
  let result = samples.map(m => {
    if (m.length <= maxLen) return m;
    return m.substring(0, maxLen - 3) + '...';
  }).join(', ');
  
  if (result.length > maxLen) {
    result = result.substring(0, maxLen - 3) + '...';
  }
  return result;
}

function outputProviders() {
  const models = getModels();
  const providers = groupByProviders(models);
  
  const providerList = Object.entries(providers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, modelList]) => ({
      name,
      model_count: modelList.length,
      sample_models: truncateSample(modelList)
    }));
  
  const output = {
    provider_count: providerList.length,
    providers: providerList
  };
  
  console.log(JSON.stringify(output, null, 2));
}

function outputProviderModels(provider) {
  const models = getModels(provider);
  const filtered = models.filter(m => m.startsWith(provider + '/'));
  
  if (filtered.length === 0) {
    console.error(`Error: No models found for provider "${provider}".`);
    console.error('Run with --providers-only to see available providers.');
    process.exit(1);
  }
  
  const modelNames = filtered.map(m => m.substring(provider.length + 1));
  
  const output = {
    provider,
    model_count: modelNames.length,
    models: modelNames.sort()
  };
  
  console.log(JSON.stringify(output, null, 2));
}

function printHelp() {
  console.log(`
Usage: select-models [options]

Options:
  --providers-only        List providers with sample models
  --provider <name>       List all models for a specific provider
  -h, --help              Show this help message

Examples:
  select-models --providers-only
  select-models --provider google
`);
}

const args = process.argv.slice(2);

if (args.includes('-h') || args.includes('--help')) {
  printHelp();
  process.exit(0);
}

checkOpenCodeAvailable();

const providersOnlyIndex = args.indexOf('--providers-only');
const providerIndex = args.indexOf('--provider');

if (providersOnlyIndex !== -1 && providerIndex !== -1) {
  console.error('Error: --providers-only and --provider cannot be used together.');
  console.error('Use --providers-only to discover providers, then --provider "name" to see models.');
  process.exit(1);
}

if (providersOnlyIndex !== -1) {
  outputProviders();
} else if (providerIndex !== -1) {
  const providerName = args[providerIndex + 1];
  if (!providerName) {
    console.error('Error: --provider requires a provider name.');
    process.exit(1);
  }
  outputProviderModels(providerName);
} else {
  printHelp();
  process.exit(1);
}
