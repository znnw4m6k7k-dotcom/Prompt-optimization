import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { ConfigError } from './core/errors.js';
import { DEFAULT_OPTIONS, normalizeOptions } from './core/options.js';

export const DEFAULT_CONFIG = Object.freeze({
  ...DEFAULT_OPTIONS,
  apiKeyEnv: null,
  server: {
    host: '127.0.0.1',
    port: 4317,
  },
});

export function getConfigPath(env = process.env) {
  if (env.PROMPT_REFINERY_CONFIG) return env.PROMPT_REFINERY_CONFIG;
  if (process.platform === 'win32') {
    const appData = env.APPDATA || join(homedir(), 'AppData', 'Roaming');
    return join(appData, 'prompt-refinery', 'config.json');
  }
  const base = env.XDG_CONFIG_HOME || join(homedir(), '.config');
  return join(base, 'prompt-refinery', 'config.json');
}

function readJsonFile(path) {
  try {
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('root must be a JSON object');
    }
    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw new ConfigError(`Could not read config file: ${path}`, {
      reason: error.message,
    });
  }
}

function envInt(env, name) {
  return env[name] === undefined ? undefined : Number.parseInt(env[name], 10);
}

function envBool(env, name) {
  if (env[name] === undefined) return undefined;
  return ['1', 'true', 'yes', 'on'].includes(String(env[name]).toLowerCase());
}

export function loadConfig({ configPath, env = process.env } = {}) {
  const resolvedPath = configPath || getConfigPath(env);
  const fileConfig = readJsonFile(resolvedPath);

  const merged = {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    server: {
      ...DEFAULT_CONFIG.server,
      ...(fileConfig.server && typeof fileConfig.server === 'object' ? fileConfig.server : {}),
    },
  };

  const envOverrides = {
    provider: env.PROMPT_REFINERY_PROVIDER,
    model: env.PROMPT_REFINERY_MODEL,
    baseUrl: env.PROMPT_REFINERY_BASE_URL,
    apiKeyEnv: env.PROMPT_REFINERY_API_KEY_ENV,
    target: env.PROMPT_REFINERY_TARGET,
    mode: env.PROMPT_REFINERY_MODE,
    locale: env.PROMPT_REFINERY_LOCALE,
    maxChars: envInt(env, 'PROMPT_REFINERY_MAX_CHARS'),
    maxInputChars: envInt(env, 'PROMPT_REFINERY_MAX_INPUT_CHARS'),
    timeoutMs: envInt(env, 'PROMPT_REFINERY_TIMEOUT_MS'),
    maxTokens: envInt(env, 'PROMPT_REFINERY_MAX_TOKENS'),
    fallbackToHeuristic: envBool(env, 'PROMPT_REFINERY_FALLBACK_TO_HEURISTIC'),
    jsonMode: envBool(env, 'PROMPT_REFINERY_JSON_MODE'),
  };

  for (const [key, value] of Object.entries(envOverrides)) {
    if (value !== undefined) merged[key] = value;
  }

  if (!merged.baseUrl && merged.provider === 'ollama' && env.OLLAMA_HOST) {
    merged.baseUrl = env.OLLAMA_HOST;
  }

  merged.server = {
    ...merged.server,
    host: env.PROMPT_REFINERY_SERVER_HOST || merged.server.host,
    port: envInt(env, 'PROMPT_REFINERY_SERVER_PORT') || merged.server.port,
  };

  const normalized = normalizeOptions(
    {
      target: merged.target,
      mode: merged.mode,
      locale: merged.locale,
      maxChars: merged.maxChars,
      maxInputChars: merged.maxInputChars,
      provider: merged.provider,
      model: merged.model,
      baseUrl: merged.baseUrl,
      timeoutMs: merged.timeoutMs,
      temperature: merged.temperature,
      maxTokens: merged.maxTokens,
      jsonMode: merged.jsonMode,
      fallbackToHeuristic: merged.fallbackToHeuristic,
    },
    DEFAULT_OPTIONS,
  );

  return {
    ...normalized,
    apiKeyEnv: merged.apiKeyEnv || null,
    server: {
      host: String(merged.server.host),
      port: Number(merged.server.port),
    },
    configPath: resolvedPath,
    configFound: Object.keys(fileConfig).length > 0,
  };
}

export function configSummary(config) {
  return {
    configPath: config.configPath,
    configFound: config.configFound,
    provider: config.provider,
    model: config.model,
    baseUrl: config.baseUrl,
    apiKeyEnv: config.apiKeyEnv,
    target: config.target,
    mode: config.mode,
    locale: config.locale,
    maxChars: config.maxChars,
    maxInputChars: config.maxInputChars,
    timeoutMs: config.timeoutMs,
    fallbackToHeuristic: config.fallbackToHeuristic,
    server: { ...config.server },
  };
}
