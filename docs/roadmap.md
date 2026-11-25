# Roadmap

## v0.1.0 — reference implementation

- deterministic offline compiler;
- OpenAI-compatible, Anthropic, and Ollama providers;
- fast/balanced/quality;
- CLI, HTTP, MCP;
- seven target profiles;
- deterministic rubric;
- JSON Schema, OpenAPI, tests, evaluation harness;
- npm/Homebrew/Scoop/script templates.

## v0.2.0 — evaluation and routing

- 100+ bilingual golden cases;
- intent-preservation and fabrication labels;
- explainable routing by complexity/language/target;
- provider retries and circuit breaking;
- token/cost budgets;
- Windows CI hardening.

## v0.3.0 — small-model experiment

- 7B–14B instruct base;
- LoRA/QLoRA;
- DPO preference pairs;
- GGUF quantization;
- same-set comparison against generic providers;
- on-device memory and startup evaluation.

## v1.0.0 — stable protocols

- freeze CLI/HTTP/MCP contracts;
- `v1` compatibility guarantee;
- release governance and security response;
- multilingual docs;
- official package-manager distribution;
- stable evaluation baseline.

## Non-goals

Not a general agent framework, not a tool executor, no prompt collection by default, no guarantee of correct downstream results.
