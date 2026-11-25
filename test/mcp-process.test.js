import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const BIN = fileURLToPath(new URL('../bin/prompt-refinery.js', import.meta.url));

test('MCP server keeps stdout clean and completes a stdio session', async () => {
  const child = spawn(process.execPath, [BIN, 'mcp'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PROMPT_REFINERY_PROVIDER: 'heuristic',
      PROMPT_REFINERY_CONFIG: '/tmp/prompt-refinery-process-missing.json',
    },
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });

  child.stdin.write(
    `${JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'test' },
      },
    })}\n`,
  );
  child.stdin.write(
    `${JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'enhance_prompt',
        arguments: { prompt: 'Fix the flaky checkout test', target: 'code', locale: 'en' },
      },
    })}\n`,
  );
  child.stdin.end();

  const code = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('MCP process timed out'));
    }, 5000);
    child.once('error', reject);
    child.once('close', (exitCode) => {
      clearTimeout(timer);
      resolve(exitCode);
    });
  });

  assert.equal(code, 0);
  const lines = stdout.trim().split('\n').map((line) => JSON.parse(line));
  assert.equal(lines.length, 2);
  assert.equal(lines[0].result.serverInfo.name, 'prompt-refinery');
  assert.equal(lines[1].result.isError, false);
  assert.match(lines[1].result.content[0].text, /## Objective/);
  assert.match(stderr, /MCP ready/);
});
