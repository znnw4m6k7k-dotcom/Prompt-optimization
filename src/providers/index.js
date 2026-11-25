import { ConfigError } from '../core/errors.js';
import { HeuristicProvider } from './heuristic.js';
import { OpenAICompatibleProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { OllamaProvider } from './ollama.js';

const DEFAULT_MODELS = Object.freeze({
  openai: 'gpt-4.1-mini',
  anthropic: 'claude-3-5-haiku-latest',
  ollama: 'qwen2.5:7b-instruct',
});

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function chooseAutoProvider(config, env) {
  if (config.baseUrl) {
    const host = hostOf(config.baseUrl);
    if (config.baseUrl.includes('11434') || config.baseUrl.includes('/ollama')) return 'ollama';
    if (host.includes('anthropic')) return 'anthropic';
    return 'openai';
  }
  if (env.PROMPT_REFINERY_API_KEY_ENV) return 'openai';
  if (env.OPENAI_API_KEY || env.PROMPT_REFINERY_API_KEY) return 'openai';
  if (env.ANTHROPIC_API_KEY) return 'anthropic';
  if (env.OLLAMA_HOST) return 'ollama';
  return 'heuristic';
}

function resolveApiKey(config, provider, env) {
  if (config.apiKeyEnv) {
    const value = env[config.apiKeyEnv];
    if (!value) {
      throw new ConfigError(`apiKeyEnv points to "${config.apiKeyEnv}", but that environment variable is empty.`);
    }
    return value;
  }
  if (provider === 'openai') return env.PROMPT_REFINERY_API_KEY || env.OPENAI_API_KEY || null;
  if (provider === 'anthropic') return env.PROMPT_REFINERY_API_KEY || env.ANTHROPIC_API_KEY || null;
  return null;
}

export function createProvider(config, { env = process.env } = {}) {
  const requested = config.provider || 'auto';
  const provider = requested === 'auto' ? chooseAutoProvider(config, env) : requested;

  if (provider === 'heuristic') return new HeuristicProvider();

  if (provider === 'openai') {
    const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    const apiKey = resolveApiKey(config, provider, env);
    if (!apiKey && hostOf(baseUrl) === 'api.openai.com') {
      throw new ConfigError(
        'OpenAI provider selected but no API key was found. Set OPENAI_API_KEY or PROMPT_REFINERY_API_KEY.',
      );
    }
    return new OpenAICompatibleProvider({
      baseUrl,
      apiKey,
      model: config.model || DEFAULT_MODELS.openai,
      timeoutMs: config.timeoutMs,
      jsonMode: config.jsonMode,
    });
  }

  if (provider === 'anthropic') {
    const apiKey = resolveApiKey(config, provider, env);
    if (!apiKey) {
      throw new ConfigError(
        'Anthropic provider selected but no API key was found. Set ANTHROPIC_API_KEY or PROMPT_REFINERY_API_KEY.',
      );
    }
    return new AnthropicProvider({
      baseUrl: config.baseUrl || 'https://api.anthropic.com/v1',
      apiKey,
      model: config.model || DEFAULT_MODELS.anthropic,
      timeoutMs: config.timeoutMs,
    });
  }

  if (provider === 'ollama') {
    return new OllamaProvider({
      baseUrl: config.baseUrl || env.OLLAMA_HOST || 'http://127.0.0.1:11434',
      model: config.model || DEFAULT_MODELS.ollama,
      timeoutMs: config.timeoutMs,
    });
  }

  throw new ConfigError(`Unsupported provider: ${provider}`);
}

export function publicProviderInfo(provider) {
  return {
    provider: provider.id,
    model: provider.model,
    network: provider.id !== 'heuristic',
  };
}
