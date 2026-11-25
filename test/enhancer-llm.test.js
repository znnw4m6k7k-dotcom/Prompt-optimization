import test from 'node:test';
import assert from 'node:assert/strict';
import { enhancePrompt } from '../src/core/enhancer.js';
import { loadConfig } from '../src/config.js';
import { ProviderError } from '../src/core/errors.js';

const config = {
  ...loadConfig({ configPath: '/tmp/prompt-refinery-llm-missing.json', env: {} }),
  provider: 'heuristic',
};

const strong = `You are a data analyst. Complete the task.

## Objective
Analyze the supplied table and report anomalies.

## Input
Use the attached file and state missing fields.

## Execution requirements
1. Inspect the schema.
2. Calculate trends.
3. Verify key figures.

## Output contract
- Give three findings.
- Use a Markdown table.
- List data gaps.

## Constraints and boundaries
- Do not invent data.
- State when data is insufficient.

## Definition of done
Every finding is traceable to the source.`;

function mockProvider(responses) {
  let index = 0;
  const calls = [];
  return {
    provider: {
      id: 'mock',
      model: 'mock-1',
      async generate(options) {
        calls.push(options);
        const response = responses[Math.min(index, responses.length - 1)];
        index += 1;
        if (response instanceof Error) throw response;
        return {
          text: JSON.stringify(response),
          model: 'mock-1',
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
        };
      },
    },
    calls,
  };
}

test('LLM path returns parsed JSON and accumulates usage', async () => {
  const mock = mockProvider([
    {
      enhancedPrompt: strong,
      changes: ['Added structure'],
      assumptions: [],
      questions: [],
    },
  ]);

  const result = await enhancePrompt(
    'Analyze the table',
    { target: 'data', mode: 'fast', locale: 'en' },
    { config, provider: mock.provider },
  );

  assert.equal(result.provider, 'mock');
  assert.equal(result.model, 'mock-1');
  assert.equal(result.quality.score >= 80, true);
  assert.equal(result.meta.usage.totalTokens, 30);
  assert.deepEqual(result.changes, ['Added structure']);
});

test('balanced mode repairs a weak candidate', async () => {
  const mock = mockProvider([
    {
      enhancedPrompt: 'Do the task.',
      changes: [],
      assumptions: [],
      questions: [],
    },
    {
      enhancedPrompt: strong,
      changes: ['Added structure', 'Added output contract'],
      assumptions: [],
      questions: [],
    },
  ]);

  const result = await enhancePrompt(
    'Analyze the table',
    { target: 'data', mode: 'balanced', locale: 'en' },
    { config, provider: mock.provider },
  );

  assert.equal(mock.calls.length, 2);
  assert.ok(result.quality.score >= 80);
  assert.ok(result.changes.includes('Added output contract'));
});

test('provider failure can fall back to the offline compiler', async () => {
  const mock = mockProvider([new ProviderError('upstream down')]);
  const result = await enhancePrompt(
    '把材料整理成给客户看的方案',
    {
      target: 'writing',
      locale: 'zh-CN',
      fallbackToHeuristic: true,
    },
    { config, provider: mock.provider },
  );

  assert.equal(result.provider, 'heuristic');
  assert.equal(result.meta.degraded, true);
  assert.ok(result.meta.warnings.some((warning) => warning.includes('offline compiler')));
});
