# Model selection

Prompt enhancement is a medium-context, short-output, format-constrained task. The goal is not the strongest model; it is the cheapest model that reliably preserves intent, avoids fabrication, and returns parseable JSON.

## Selection score

```text
score =
  0.30 * intent_preservation
+ 0.15 * json_stability
+ 0.15 * language_quality
+ 0.15 * latency
+ 0.10 * cost
+ 0.05 * context_window
+ 0.10 * compliance
```

Adjust weights by product context: latency for interactive desktop use, cost for batch use, compliance for regulated data.

## Tiers

| Tier | Typical form | Use | Trade-off |
| --- | --- | --- | --- |
| Deterministic | no model | simple/offline | no semantics |
| Small | 7B–14B instruct, 4-bit | personal, private | weaker on complex constraints |
| Mid | 30B–70B or frontier small | default daily work | cloud or strong local hardware |
| Strong | frontier general | long, multi-constraint | cost and latency |
| Reasoning | long-thinking models | complex planning | slow and expensive |

Do not choose by leaderboard alone. JSON adherence, Chinese quality, and instruction preservation vary by version, quantization, and serving stack.

## Recommended setups

- **Offline personal**: Ollama, 7B–14B instruct, Q4_K_M, `fast`.
- **Private enterprise**: self-hosted OpenAI-compatible endpoint (vLLM/SGLang/TGI), 14B–32B, `balanced`.
- **SaaS**: mid-tier model, `fast` default, `balanced` for complex tasks, per-tenant quotas.
- **Complex agents**: strong model, `agent` target, explicit tool permissions and stop conditions.

## Defaults in v0.1.0

| Provider | Default model | Note |
| --- | --- | --- |
| heuristic | `deterministic-v1` | offline compiler |
| openai | `gpt-4.1-mini` | example only; pin a model in production |
| anthropic | `claude-3-5-haiku-latest` | example only; pin a model in production |
| ollama | `qwen2.5:7b-instruct` | local starter |

Defaults may change. Pin `PROMPT_REFINERY_MODEL` in production.

## Evaluation gates

Before becoming a default, a candidate should achieve:

- JSON parse rate ≥ 99%;
- intent preservation ≥ 95%;
- fabricated-fact rate ≤ 1%;
- mean rubric score ≥ 80;
- human preference win rate ≥ 55% versus baseline;
- p95 latency and unit cost within budget.

Use the evaluation harness in [evaluation.md](evaluation.md). Routing policy is described in [architecture.md](architecture.md); v0.1.0 does not perform multi-model routing.
