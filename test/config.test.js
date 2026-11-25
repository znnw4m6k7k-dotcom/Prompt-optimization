import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configSummary, loadConfig } from '../src/config.js';

test('config file values load and environment overrides win', () => {
  const dir = mkdtempSync(join(tmpdir(), 'prompt-refinery-config-'));
  const path = join(dir, 'config.json');
  writeFileSync(
    path,
    JSON.stringify({
      provider: 'heuristic',
      target: 'code',
      mode: 'balanced',
      maxChars: 5000,
      server: { host: '127.0.0.1', port: 5000 },
    }),
  );

  try {
    const config = loadConfig({
      configPath: path,
      env: { PROMPT_REFINERY_MODE: 'fast', PROMPT_REFINERY_MAX_CHARS: '7000' },
    });
    assert.equal(config.target, 'code');
    assert.equal(config.mode, 'fast');
    assert.equal(config.maxChars, 7000);
    assert.equal(config.server.port, 5000);
    assert.equal(config.configFound, true);

    const summary = configSummary(config);
    assert.equal(summary.configPath, path);
    assert.equal('apiKey' in summary, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('malformed config produces a typed configuration error', () => {
  const dir = mkdtempSync(join(tmpdir(), 'prompt-refinery-config-'));
  const path = join(dir, 'config.json');
  writeFileSync(path, '{not json');
  try {
    assert.throws(
      () => loadConfig({ configPath: path, env: {} }),
      (error) => error.code === 'CONFIG_ERROR',
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
