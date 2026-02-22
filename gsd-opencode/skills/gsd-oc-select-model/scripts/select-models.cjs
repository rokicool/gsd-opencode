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
    const rest = model.substring(slashIndex + 1);
    if (!providers[provider]) {
      providers[provider] = [];
    }
    providers[provider].push(rest);
  }
  return providers;
}

function hasSubProviders(modelNames) {
  // Check if any model name contains a slash (indicating sub-provider structure)
  return modelNames.some(name => name.includes('/'));
}

function groupBySubProviders(modelNames) {
  const subProviders = {};
  const directModels = [];
  
  for (const name of modelNames) {
    const slashIndex = name.indexOf('/');
    if (slashIndex === -1) {
      // Direct model (no sub-provider)
      directModels.push(name);
    } else {
      // Has sub-provider
      const subProvider = name.substring(0, slashIndex);
      const modelName = name.substring(slashIndex + 1);
      if (!subProviders[subProvider]) {
        subProviders[subProvider] = [];
      }
      subProviders[subProvider].push(modelName);
    }
  }
  
  return { subProviders, directModels };
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
    .map(([name, modelList]) => {
      const subProviderInfo = groupBySubProviders(modelList);
      const hasSubProvidersFlag = Object.keys(subProviderInfo.subProviders).length > 0;
      const subProviderCount = Object.keys(subProviderInfo.subProviders).length;
      
      // For sample_models, show both direct models and sub-provider examples
      let sampleModels;
      if (hasSubProvidersFlag) {
        const subNames = Object.keys(subProviderInfo.subProviders).slice(0, 2);
        sampleModels = subNames.map(s => `${s}/...`).join(', ');
      } else {
        sampleModels = truncateSample(modelList);
      }
      
      return {
        name,
        model_count: modelList.length,
        sample_models: sampleModels,
        has_sub_providers: hasSubProvidersFlag,
        sub_provider_count: subProviderCount
      };
    });
  
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
  
  // Extract model names after provider prefix
  const modelNames = filtered.map(m => m.substring(provider.length + 1));
  
  // Check if this provider has sub-providers
  const subProviderInfo = groupBySubProviders(modelNames);
  const hasSubProvidersFlag = Object.keys(subProviderInfo.subProviders).length > 0;
  
  if (hasSubProvidersFlag) {
    // Build sub-providers list
    const subProvidersList = Object.entries(subProviderInfo.subProviders)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([subName, subModels]) => ({
        name: subName,
        model_count: subModels.length,
        sample_models: truncateSample(subModels)
      }));
    
    const output = {
      provider,
      has_sub_providers: true,
      sub_provider_count: subProvidersList.length,
      sub_providers: subProvidersList
    };
    
    // Include direct models if any
    if (subProviderInfo.directModels.length > 0) {
      output.direct_models = subProviderInfo.directModels.sort();
      output.direct_model_count = subProviderInfo.directModels.length;
    }
    
    console.log(JSON.stringify(output, null, 2));
  } else {
    // Flat structure
    const output = {
      provider,
      has_sub_providers: false,
      model_count: modelNames.length,
      models: modelNames.sort()
    };
    
    console.log(JSON.stringify(output, null, 2));
  }
}

function outputSubProviderModels(provider, subProvider) {
  const models = getModels(provider);
  const prefix = `${provider}/${subProvider}/`;
  const filtered = models.filter(m => m.startsWith(prefix));
  
  if (filtered.length === 0) {
    console.error(`Error: No models found for sub-provider "${subProvider}" in provider "${provider}".`);
    console.error(`Run with --provider "${provider}" to see available sub-providers.`);
    process.exit(1);
  }
  
  // Extract model names after provider/sub-provider prefix
  const modelNames = filtered.map(m => m.substring(prefix.length));
  
  const output = {
    provider,
    sub_provider: subProvider,
    model_count: modelNames.length,
    models: modelNames.sort()
  };
  
  console.log(JSON.stringify(output, null, 2));
}

function printHelp() {
  console.log(`
Usage: select-models [options]

Options:
  --providers-only                    List providers with sample models
  --provider <name>                   List all models/sub-providers for a provider
  --provider <name> --sub-provider <sub>  List models for a specific sub-provider
  -h, --help                          Show this help message

Examples:
  select-models --providers-only
  select-models --provider nvidia
  select-models --provider nvidia --sub-provider deepseek-ai
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
const subProviderIndex = args.indexOf('--sub-provider');

// Validate argument combinations
if (providersOnlyIndex !== -1 && providerIndex !== -1) {
  console.error('Error: --providers-only and --provider cannot be used together.');
  console.error('Use --providers-only to discover providers, then --provider "name" to see models.');
  process.exit(1);
}

if (subProviderIndex !== -1 && providerIndex === -1) {
  console.error('Error: --sub-provider requires --provider to be specified.');
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
  
  if (subProviderIndex !== -1) {
    const subProviderName = args[subProviderIndex + 1];
    if (!subProviderName) {
      console.error('Error: --sub-provider requires a sub-provider name.');
      process.exit(1);
    }
    outputSubProviderModels(providerName, subProviderName);
  } else {
    outputProviderModels(providerName);
  }
} else {
  printHelp();
  process.exit(1);
}
