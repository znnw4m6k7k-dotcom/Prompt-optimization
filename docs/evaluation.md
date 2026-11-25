# Evaluation

The goal is not to prove a prompt is universally better. It is to measure, reproducibly:

1. whether intent and facts are preserved;
2. whether execution structure improves;
3. whether the gain justifies latency and cost.

## Golden set

`evals/cases.jsonl` contains one JSON object per case:

```json
{
  "id": "zh-data-01",
  "prompt": "把这份推广费用表分析一下，写份报告给领导汇报",
  "target": "data",
  "locale": "zh-CN",
  "mustInclude": ["## 任务目标", "## 输出要求", "## 完成标准"],
  "minScore": 80
}
```

Coverage should include all targets, Chinese and English, short and long drafts, missing information, numbers/proper nouns, prompt-injection text, and length limits.

## Run

```bash
npm run eval
```

For a remote provider:

```bash
PROMPT_REFINERY_PROVIDER=openai \
PROMPT_REFINERY_MODEL=your-model-id \
OPENAI_API_KEY=... \
npm run eval
```

The runner reports pass/fail, required-section hits, rubric score, latency, pass rate, mean score, and p50 latency. `--json` emits machine-readable output for CI.

## Metrics

Automatic:

| Metric | Gate |
| --- | --- |
| Structure completeness | ≥ 95% |
| JSON parse rate | ≥ 99% |
| Mean rubric score | ≥ 80 |
| Length compliance | ≥ 95% |
| p50 latency | within product budget |

Human:

- intent preservation (blind pairwise review);
- fabricated facts;
- downstream agent follow-up reduction;
- pairwise preference versus raw draft.

## Rubric limits

The rubric is structural. It can be gamed by adding headings, cannot prove semantic correctness, and may penalize high-quality non-template prompts. Use it for regression and obvious defects, not as the sole quality claim. LLM-as-judge can be used for cheap pre-screening but must be calibrated against human labels.

## Future work

Add intent-preservation labels, fact consistency checks for numbers/entities/dates, downstream task success, multi-model comparisons, and calibrated judge models.
