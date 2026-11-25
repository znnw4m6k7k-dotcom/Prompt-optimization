#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { enhancePrompt } from '../src/core/enhancer.js';
import { loadConfig } from '../src/config.js';

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const limitIndex = args.indexOf('--limit');
const limit = limitIndex >= 0 ? Number.parseInt(args[limitIndex + 1], 10) : null;

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: node scripts/eval.js [--json] [--limit N]

Provider and mode are read from the normal configuration/env:
  PROMPT_REFINERY_PROVIDER=heuristic npm run eval
  PROMPT_REFINERY_PROVIDER=openai PROMPT_REFINERY_MODEL=... OPENAI_API_KEY=... npm run eval
`);
  process.exit(0);
}

const cases = readFileSync(new URL('../evals/cases.jsonl', import.meta.url), 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`Invalid JSONL at line ${index + 1}: ${error.message}`);
    }
  })
  .slice(0, Number.isFinite(limit) ? limit : undefined);

const config = loadConfig();
const results = [];

for (const testCase of cases) {
  const started = performance.now();
  try {
    const result = await enhancePrompt(
      testCase.prompt,
      {
        target: testCase.target,
        locale: testCase.locale,
        mode: process.env.PROMPT_REFINERY_MODE || config.mode,
      },
      { config },
    );
    const elapsed = performance.now() - started;
    const missing = (testCase.mustInclude || []).filter(
      (section) => !result.enhancedPrompt.includes(section),
    );
    const passed = missing.length === 0 && result.quality.score >= (testCase.minScore ?? 0);
    results.push({
      id: testCase.id,
      passed,
      score: result.quality.score,
      latencyMs: Math.round(elapsed),
      missing,
      provider: result.provider,
      model: result.model,
      warnings: result.meta.warnings,
    });
  } catch (error) {
    results.push({
      id: testCase.id,
      passed: false,
      score: 0,
      latencyMs: Math.round(performance.now() - started),
      missing: testCase.mustInclude || [],
      error: error.message,
      warnings: [],
    });
  }
}

const passed = results.filter((result) => result.passed).length;
const average = results.length
  ? results.reduce((sum, result) => sum + result.score, 0) / results.length
  : 0;
const sortedLatencies = results.map((result) => result.latencyMs).sort((a, b) => a - b);
const p50 = sortedLatencies.length
  ? sortedLatencies[Math.floor((sortedLatencies.length - 1) / 2)]
  : 0;
const passRate = results.length ? passed / results.length : 0;
const summary = {
  provider: config.provider,
  model: config.model,
  mode: process.env.PROMPT_REFINERY_MODE || config.mode,
  total: results.length,
  passed,
  failed: results.length - passed,
  passRate: Number(passRate.toFixed(4)),
  averageScore: Number(average.toFixed(1)),
  p50LatencyMs: p50,
  results,
};

if (jsonOutput) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(`Prompt Refinery eval — ${summary.provider}/${summary.model || 'auto'} (${summary.mode})`);
  console.log('');
  for (const result of results) {
    const status = result.passed ? 'PASS' : 'FAIL';
    const suffix = result.missing?.length ? ` missing: ${result.missing.join(', ')}` : '';
    const error = result.error ? ` error: ${result.error}` : '';
    console.log(
      `${status}  ${String(result.score).padStart(3)}  ${String(result.latencyMs).padStart(5)}ms  ${result.id}${suffix}${error}`,
    );
  }
  console.log('');
  console.log(
    `Pass ${passed}/${results.length} (${(passRate * 100).toFixed(1)}%), avg ${summary.averageScore}, p50 ${p50}ms`,
  );
}

process.exitCode = passRate >= 0.9 ? 0 : 1;
