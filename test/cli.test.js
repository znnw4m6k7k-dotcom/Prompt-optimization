import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const BIN = fileURLToPath(new URL('../bin/prompt-refinery.js', import.meta.url));

function run(args, input) {
  return spawnSync(process.execPath, [BIN, ...args], {
    input,
    encoding: 'utf8',
    env: {
      ...process.env,
      PROMPT_REFINERY_PROVIDER: 'heuristic',
      PROMPT_REFINERY_CONFIG: '/tmp/prompt-refinery-cli-missing.json',
    },
  });
}

test('CLI prints version and help', () => {
  const version = run(['--version']);
  assert.equal(version.status, 0);
  assert.match(version.stdout, /^\d+\.\d+\.\d+/);

  const help = run(['--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /prompt-refinery enhance/);
  assert.match(help.stdout, /prompt-refinery mcp/);
});

test('CLI accepts stdin and emits only the prompt by default', () => {
  const result = run(['enhance', '--target', 'data', '--locale', 'zh-CN'], '分析这个 Excel 表');
  assert.equal(result.status, 0);
  assert.match(result.stdout, /## 任务目标/);
  assert.doesNotMatch(result.stdout, /requestId/);
});

test('CLI --json returns machine-readable metadata', () => {
  const result = run(
    ['enhance', '把这段会议纪要整理成待办', '--target', 'general', '--json'],
    undefined,
  );
  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.provider, 'heuristic');
  assert.ok(Array.isArray(payload.changes));
  assert.ok(payload.quality.score > 0);
});

test('CLI reports usage errors with a non-zero exit code', () => {
  const result = run(['enhance', 'hello', '--target', 'nope']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /target must be one of/);
});

test('CLI reports unreadable files as usage errors', () => {
  const result = run(['enhance', '--file', '/tmp/prompt-refinery-does-not-exist.txt']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Could not read file/);
});
