# Contributing to Prompt Refinery

Thanks for helping improve Prompt Refinery. This project favors small, testable changes over broad rewrites.

## Development setup

Requirements:

- Node.js 20+
- npm 10+
- Git

```bash
git clone https://github.com/znnw4m6k7k-dotcom/Prompt-optimization.git
cd prompt-refinery
npm install
npm link
npm test
npm run check
npm run eval
```

There are no runtime dependencies. `npm install` only creates the lockfile and local links.

## Project map

| Path | Responsibility |
| --- | --- |
| `src/core/analyzer.js` | language, target, complexity, missing-slot analysis |
| `src/core/templates.js` | target profiles and deterministic prompt templates |
| `src/core/heuristic.js` | offline compiler |
| `src/core/llm.js` | compiler/critic prompts and response parsing |
| `src/core/rubric.js` | deterministic quality score |
| `src/core/enhancer.js` | orchestration, modes, fallback |
| `src/providers/` | model adapters |
| `src/server.js` | HTTP API |
| `src/mcp.js` | MCP stdio server |
| `src/cli.js` | CLI |
| `evals/cases.jsonl` | golden cases |

## Adding a target profile

1. Add the target to `TARGETS` in `src/core/options.js`.
2. Add keyword hints in `src/core/analyzer.js`.
3. Add `zh` and `en` profiles in `src/core/templates.js`.
4. Add at least two golden cases (zh/en) in `evals/cases.jsonl`.
5. Update `schemas/enhance-input.schema.json`, `openapi/openapi.yaml`, and MCP input schema.
6. Update README and docs.
7. Run `npm test && npm run eval`.

Target profiles must not invent domain requirements. They should add only what is necessary to execute the request reliably.

## Adding a provider

Implement the provider contract:

```js
{
  id: 'provider-name',
  model: 'model-id',
  async generate({ messages, temperature, maxTokens }) {
    return { text, model, usage: { inputTokens, outputTokens, totalTokens } };
  }
}
```

Checklist:

- normalize usage;
- timeout handling;
- no secrets in errors/logs;
- parse JSON mode or rely on prompt-level JSON;
- add tests for configuration and error paths;
- document env vars and base URL semantics;
- update `PROVIDERS` in `src/core/options.js` and auto-selection logic.

## Tests

```bash
npm test
npm run test:coverage
npm run check
npm run eval
```

Requirements:

- new behavior needs tests;
- bug fixes need a regression test;
- API changes need a test that asserts the wire contract;
- MCP changes need a handler-level or process-level test;
- do not weaken tests to make a change pass.

## Code style

- ESM, Node 20+, no transpiler.
- Runtime zero dependencies; discuss before adding one.
- Keep functions small and deterministic where possible.
- No prompt text logging.
- Error messages should be actionable and free of secrets.
- Use ASCII quotes in code and config files.

## Commit and PR

Use Conventional Commits:

```text
feat: add research target profile
fix: handle empty model JSON
docs: clarify Ollama setup
test: cover MCP tool errors
```

A PR should include:

- problem and approach;
- behavior changes;
- test evidence;
- security/privacy impact;
- documentation updates;
- linked issue, if any.

## Security

Do not open a public issue for an unfixed vulnerability. Follow [SECURITY.md](SECURITY.md).

## Translations

Chinese and English docs should stay in sync for public interfaces. If you change an interface, update both `docs/foo.md` and `docs/foo.zh-CN.md`.

## Decision records

Architecture-level changes need an ADR in `docs/adr/`. Keep it short: context, decision, consequences, alternatives.
