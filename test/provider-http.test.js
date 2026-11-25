import test from 'node:test';
import assert from 'node:assert/strict';
import { OpenAICompatibleProvider } from '../src/providers/openai.js';
import { AnthropicProvider } from '../src/providers/anthropic.js';
import { OllamaProvider } from '../src/providers/ollama.js';
import { ProviderError } from '../src/core/errors.js';

async function withFetch(handler, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

test('OpenAI-compatible provider parses chat completions and usage', async () => {
  let capturedUrl = '';
  let capturedBody = null;
  const provider = new OpenAICompatibleProvider({
    baseUrl: 'http://example.test/v1',
    apiKey: 'secret',
    model: 'test-model',
    timeoutMs: 5000,
  });

  const result = await withFetch(
    async (url, init) => {
      capturedUrl = String(url);
      capturedBody = JSON.parse(init.body);
      return new Response(
        JSON.stringify({
          model: 'test-model-2026',
          choices: [{ message: { content: '{"enhancedPrompt":"ok"}' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    },
    () => provider.generate({ messages: [{ role: 'user', content: 'hi' }] }),
  );

  assert.equal(capturedUrl, 'http://example.test/v1/chat/completions');
  assert.equal(capturedBody.response_format.type, 'json_object');
  assert.equal(result.text, '{"enhancedPrompt":"ok"}');
  assert.equal(result.usage.totalTokens, 15);
});

test('OpenAI-compatible provider surfaces HTTP errors without keys', async () => {
  const provider = new OpenAICompatibleProvider({
    baseUrl: 'http://example.test/v1',
    apiKey: 'secret',
    model: 'test-model',
    timeoutMs: 5000,
  });

  await withFetch(
    async () => new Response('nope', { status: 401 }),
    async () => {
      await assert.rejects(
        () => provider.generate({ messages: [] }),
        (error) => error instanceof ProviderError && !error.message.includes('secret'),
      );
    },
  );
});

test('Anthropic provider separates system and messages', async () => {
  let captured = null;
  const provider = new AnthropicProvider({
    baseUrl: 'https://api.anthropic.test/v1',
    apiKey: 'secret',
    model: 'claude-test',
    timeoutMs: 5000,
  });

  const result = await withFetch(
    async (_url, init) => {
      captured = JSON.parse(init.body);
      return new Response(
        JSON.stringify({
          model: 'claude-test',
          content: [{ type: 'text', text: 'hello' }],
          usage: { input_tokens: 3, output_tokens: 2 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    },
    () =>
      provider.generate({
        messages: [
          { role: 'system', content: 'system' },
          { role: 'user', content: 'user' },
        ],
      }),
  );

  assert.equal(captured.system, 'system');
  assert.deepEqual(captured.messages, [{ role: 'user', content: 'user' }]);
  assert.equal(result.usage.totalTokens, 5);
});

test('Ollama provider uses chat endpoint and JSON format', async () => {
  let capturedUrl = '';
  let capturedBody = null;
  const provider = new OllamaProvider({
    baseUrl: 'http://127.0.0.1:11434',
    model: 'qwen-test',
    timeoutMs: 5000,
  });

  const result = await withFetch(
    async (url, init) => {
      capturedUrl = String(url);
      capturedBody = JSON.parse(init.body);
      return new Response(
        JSON.stringify({
          model: 'qwen-test',
          message: { content: '{"enhancedPrompt":"ok"}' },
          prompt_eval_count: 6,
          eval_count: 3,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    },
    () => provider.generate({ messages: [{ role: 'user', content: 'hi' }] }),
  );

  assert.equal(capturedUrl, 'http://127.0.0.1:11434/api/chat');
  assert.equal(capturedBody.format, 'json');
  assert.equal(result.usage.totalTokens, 9);
});
