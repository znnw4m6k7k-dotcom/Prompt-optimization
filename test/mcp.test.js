import test from 'node:test';
import assert from 'node:assert/strict';
import { createMcpHandler } from '../src/mcp.js';
import { loadConfig } from '../src/config.js';

const config = {
  ...loadConfig({ configPath: '/tmp/prompt-refinery-mcp-missing.json', env: {} }),
  provider: 'heuristic',
};

test('MCP handshake exposes the enhance_prompt tool', async () => {
  const handle = createMcpHandler({ config });
  const initialized = await handle({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test' } },
  });
  assert.equal(initialized.result.protocolVersion, '2024-11-05');
  assert.equal(initialized.result.serverInfo.name, 'prompt-refinery');

  const listed = await handle({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  assert.equal(listed.result.tools.length, 1);
  assert.equal(listed.result.tools[0].name, 'enhance_prompt');
  assert.deepEqual(listed.result.tools[0].inputSchema.required, ['prompt']);
});

test('MCP tools/call returns text and structured content', async () => {
  const handle = createMcpHandler({ config });
  const response = await handle({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'enhance_prompt',
      arguments: { prompt: '把材料整理成给客户看的方案', target: 'writing', locale: 'zh-CN' },
    },
  });
  assert.equal(response.result.isError, false);
  assert.ok(response.result.content[0].text.includes('## 任务目标'));
  assert.equal(response.result.structuredContent.provider, 'heuristic');
});

test('MCP errors are protocol-safe', async () => {
  const handle = createMcpHandler({ config });
  const unknown = await handle({ jsonrpc: '2.0', id: 4, method: 'unknown/method' });
  assert.equal(unknown.error.code, -32601);

  const badTool = await handle({
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: { name: 'other', arguments: {} },
  });
  assert.equal(badTool.error.code, -32602);
});
