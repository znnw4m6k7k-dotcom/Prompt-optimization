import { PromptRefineryError } from './errors.js';

export const TARGETS = Object.freeze([
  'auto',
  'general',
  'code',
  'writing',
  'research',
  'agent',
  'data',
  'image',
]);

export const MODES = Object.freeze(['fast', 'balanced', 'quality']);
export const LOCALES = Object.freeze(['auto', 'zh-CN', 'en']);
export const PROVIDERS = Object.freeze(['auto', 'heuristic', 'openai', 'anthropic', 'ollama']);

export const DEFAULT_OPTIONS = Object.freeze({
  target: 'auto',
  mode: 'fast',
  locale: 'auto',
  maxChars: 12000,
  maxInputChars: 20000,
  provider: 'auto',
  model: null,
  baseUrl: null,
  timeoutMs: 45000,
  temperature: 0.2,
  maxTokens: 4096,
  jsonMode: true,
  fallbackToHeuristic: false,
});

function asInt(value, name, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new PromptRefineryError(
      'INVALID_OPTION',
      `${name} must be an integer between ${min} and ${max}.`,
      { details: { option: name } },
    );
  }
  return parsed;
}

function asNumber(value, name, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new PromptRefineryError(
      'INVALID_OPTION',
      `${name} must be a number between ${min} and ${max}.`,
      { details: { option: name } },
    );
  }
  return parsed;
}

function asBoolean(value, name) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  throw new PromptRefineryError('INVALID_OPTION', `${name} must be a boolean.`, {
    details: { option: name },
  });
}

function asEnum(value, name, allowed) {
  const normalized = String(value).toLowerCase();
  if (!allowed.includes(normalized)) {
    throw new PromptRefineryError(
      'INVALID_OPTION',
      `${name} must be one of: ${allowed.join(', ')}.`,
      { details: { option: name, allowed } },
    );
  }
  return normalized;
}

export function normalizeOptions(raw = {}, base = DEFAULT_OPTIONS) {
  const options = { ...base, ...raw };

  options.target = asEnum(options.target, 'target', TARGETS);
  options.mode = asEnum(options.mode, 'mode', MODES);
  options.provider = asEnum(options.provider, 'provider', PROVIDERS);

  if (!LOCALES.includes(options.locale)) {
    throw new PromptRefineryError(
      'INVALID_OPTION',
      `locale must be one of: ${LOCALES.join(', ')}.`,
      { details: { option: 'locale', allowed: LOCALES } },
    );
  }

  options.maxChars = asInt(options.maxChars, 'maxChars', 500, 60000);
  options.maxInputChars = asInt(options.maxInputChars, 'maxInputChars', 1, 100000);
  options.timeoutMs = asInt(options.timeoutMs, 'timeoutMs', 1000, 300000);
  options.maxTokens = asInt(options.maxTokens, 'maxTokens', 256, 32000);
  options.temperature = asNumber(options.temperature, 'temperature', 0, 2);
  options.fallbackToHeuristic = asBoolean(
    options.fallbackToHeuristic,
    'fallbackToHeuristic',
  );
  options.jsonMode = asBoolean(options.jsonMode, 'jsonMode');

  if (options.model !== null && options.model !== undefined) {
    options.model = String(options.model).trim();
    if (!options.model) options.model = null;
  }

  if (options.baseUrl !== null && options.baseUrl !== undefined) {
    options.baseUrl = String(options.baseUrl).trim().replace(/\/+$/, '');
    if (options.baseUrl) {
      try {
        const url = new URL(options.baseUrl);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol');
      } catch {
        throw new PromptRefineryError(
          'INVALID_OPTION',
          'baseUrl must be a valid http(s) URL.',
          { details: { option: 'baseUrl' } },
        );
      }
    } else {
      options.baseUrl = null;
    }
  }

  return options;
}

export function validateDraft(draft, maxInputChars = 20000) {
  if (typeof draft !== 'string') {
    throw new PromptRefineryError('INVALID_INPUT', 'prompt must be a string.');
  }
  const normalized = draft.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    throw new PromptRefineryError('INVALID_INPUT', 'prompt must not be empty.');
  }
  if (normalized.length > maxInputChars) {
    throw new PromptRefineryError(
      'INPUT_TOO_LARGE',
      `prompt exceeds maxInputChars (${maxInputChars}).`,
      { status: 413, details: { length: normalized.length, maxInputChars } },
    );
  }
  return normalized;
}
