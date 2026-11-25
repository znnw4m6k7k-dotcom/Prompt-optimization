import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../src/server.js';
import { loadConfig } from '../src/config.js';

function config(extra = {}) {
  return {
    ...loadConfig({ configPath: '/tmp/prompt-refinery-api-missing.json', env: {} }),
    provider: 'heuristic',
    ...extra,
  };
}

test('HTTP API enhances prompts, reports health, and serves capabilities', async (t) => {
  const server = await startServer({ config: config(), host: '127.0.0.1', port: 0 });
  t.after(() => server.close());

  const health = await fetch(`${server.url}/healthz`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, 'ok');

  const capabilities = await fetch(`${server.url}/v1/capabilities`);
  assert.equal(capabilities.status, 200);
  const caps = await capabilities.json();
  assert.ok(caps.targets.includes('agent'));
  assert.equal(caps.provider, 'heuristic');

  const response = await fetch(`${server.url}/v1/enhance`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      prompt: '把这个需求整理成给 agent 执行的任务',
      target: 'agent',
      locale: 'zh-CN',
    }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.enhancedPrompt.includes('## 任务目标'));
  assert.equal(body.provider, 'heuristic');
  assert.ok(body.requestId);
});

test('HTTP API rejects invalid JSON and unknown endpoints', async (t) => {
  const server = await startServer({ config: config(), host: '127.0.0.1', port: 0 });
  t.after(() => server.close());

  const bad = await fetch(`${server.url}/v1/enhance`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{',
  });
  assert.equal(bad.status, 400);
  assert.equal((await bad.json()).error.code, 'INVALID_JSON');

  const missing = await fetch(`${server.url}/nope`);
  assert.equal(missing.status, 404);
});

test('HTTP API enforces bearer auth when configured', async (t) => {
  const server = await startServer({
    config: config(),
    host: '127.0.0.1',
    port: 0,
    token: 'test-secret',
  });
  t.after(() => server.close());

  const denied = await fetch(`${server.url}/v1/enhance`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: '写一份周报' }),
  });
  assert.equal(denied.status, 401);

  const allowed = await fetch(`${server.url}/v1/enhance`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer test-secret',
    },
    body: JSON.stringify({ prompt: '写一份周报', locale: 'zh-CN' }),
  });
  assert.equal(allowed.status, 200);
});
