import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePrompt, detectTarget } from '../src/core/analyzer.js';
import { enhancePrompt } from '../src/core/enhancer.js';
import { normalizeOptions, validateDraft } from '../src/core/options.js';
import { buildHeuristicResult } from '../src/core/heuristic.js';
import { PromptRefineryError } from '../src/core/errors.js';
import { loadConfig } from '../src/config.js';

const CONFIG = loadConfig({ configPath: '/tmp/prompt-refinery-test-missing.json', env: {} });

test('detectTarget recognizes common task families', () => {
  assert.equal(detectTarget('修复这个 bug，补单元测试').target, 'code');
  assert.equal(detectTarget('把 Excel 数据做成图表').target, 'data');
  assert.equal(detectTarget('帮我写一篇公众号文章').target, 'writing');
  assert.equal(detectTarget('调研竞品并给出来源').target, 'research');
  assert.equal(detectTarget('让 agent 自动调用工具完成任务').target, 'agent');
  assert.equal(detectTarget('生成一张海报图片').target, 'image');
});

test('analyzePrompt detects Chinese locale and missing slots', () => {
  const analysis = analyzePrompt('帮我分析一下', { target: 'auto', locale: 'auto' });
  assert.equal(analysis.locale, 'zh-CN');
  assert.equal(analysis.target, 'general');
  assert.ok(analysis.missing.includes('output'));
  assert.ok(analysis.complexity >= 1);
});

test('heuristic compiler produces a structured executable prompt', () => {
  const draft = '把这份推广费用表分析一下，写份报告给领导汇报';
  const analysis = analyzePrompt(draft, { target: 'data', locale: 'auto' });
  const result = buildHeuristicResult(draft, analysis, normalizeOptions({ maxChars: 12000 }));
  assert.match(result.enhancedPrompt, /## 任务目标/);
  assert.match(result.enhancedPrompt, /## 输出要求/);
  assert.match(result.enhancedPrompt, /## 约束与边界/);
  assert.match(result.enhancedPrompt, /## 完成标准/);
  assert.ok(result.enhancedPrompt.includes(draft));
  assert.ok(result.questions.length > 0);
  assert.ok(result.enhancedPrompt.length <= 12000);
});

test('heuristic compiler switches to English for English drafts', () => {
  const draft = 'Analyze this spreadsheet and write a report for leadership.';
  const analysis = analyzePrompt(draft, { target: 'data', locale: 'auto' });
  const result = buildHeuristicResult(draft, analysis, normalizeOptions({}));
  assert.equal(analysis.locale, 'en');
  assert.match(result.enhancedPrompt, /## Objective/);
  assert.match(result.enhancedPrompt, /## Output contract/);
});

test('enhancePrompt returns a deterministic offline result', async () => {
  const result = await enhancePrompt(
    '把这段会议纪要整理成待办清单，标出负责人',
    { target: 'general', locale: 'zh-CN' },
    { config: CONFIG },
  );
  assert.equal(result.provider, 'heuristic');
  assert.equal(result.mode, 'fast');
  assert.ok(result.requestId);
  assert.ok(result.quality.score >= 55);
  assert.ok(result.enhancedPrompt.includes('## 任务目标'));
  assert.ok(result.meta.durationMs >= 0);
});

test('maxChars uses the compact template when needed', () => {
  const draft = '把这份很长的材料整理成报告。'.repeat(30);
  const analysis = analyzePrompt(draft, { target: 'writing', locale: 'zh-CN' });
  const result = buildHeuristicResult(draft, analysis, normalizeOptions({ maxChars: 800 }));
  assert.ok(result.enhancedPrompt.length <= 800);
  assert.ok(result.warnings.length > 0);
});

test('validation rejects empty and oversized input', () => {
  assert.throws(() => validateDraft('   '), (error) => error.code === 'INVALID_INPUT');
  assert.throws(
    () => validateDraft('x'.repeat(30), 20),
    (error) => error.code === 'INPUT_TOO_LARGE',
  );
  assert.throws(
    () => normalizeOptions({ target: 'unknown' }),
    (error) => error instanceof PromptRefineryError && error.code === 'INVALID_OPTION',
  );
});
