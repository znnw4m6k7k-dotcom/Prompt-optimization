import test from 'node:test';
import assert from 'node:assert/strict';
import { createProvider } from '../src/providers/index.js';
import { loadConfig } from '../src/config.js';

const base = {
  ...loadConfig({ configPath: '/tmp/prompt-refinery-provider-missing.json', env: {} }),
  provider: 'auto',
};

test('auto provider falls back to the offline compiler without credentials', () => {
  const provider = createProvider(base, { env: {} });
  assert.equal(provider.id, 'heuristic');
  assert.equal(provider.model, 'deterministic-v1');
});

test('auto provider selects OpenAI when OPENAI_API_KEY is present', () => {
  const provider = createProvider(base, { env: { OPENAI_API_KEY: 'sk-test' } });
  assert.equal(provider.id, 'openai');
  assert.equal(provider.baseUrl, 'https://api.openai.com/v1');
});

test('explicit OpenAI-compatible local endpoint does not require a key', () => {
  const provider = createProvider(
    { ...base, provider: 'openai', baseUrl: 'http://127.0.0.1:8000/v1' },
    { env: {} },
  );
  assert.equal(provider.id, 'openai');
  assert.equal(provider.apiKey, null);
});

test('official OpenAI endpoint without a key fails early', () => {
  assert.throws(
    () => createProvider({ ...base, provider: 'openai' }, { env: {} }),
    (error) => error.code === 'CONFIG_ERROR',
  );
});

test('Ollama uses its default local endpoint and model', () => {
  const provider = createProvider({ ...base, provider: 'ollama' }, { env: {} });
  assert.equal(provider.id, 'ollama');
  assert.equal(provider.baseUrl, 'http://127.0.0.1:11434');
});
