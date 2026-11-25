# Providers

Prompt Refinery supports:

- `heuristic`: built-in deterministic offline compiler;
- `openai`: any OpenAI-compatible `/chat/completions` endpoint;
- `anthropic`: Anthropic Messages API;
- `ollama`: local Ollama;
- `auto`: environment-based selection.

## Auto selection

1. `baseUrl` containing `11434` or `/ollama` → Ollama.
2. `baseUrl` host containing `anthropic` → Anthropic.
3. Other `baseUrl` → OpenAI-compatible.
4. `PROMPT_REFINERY_API_KEY_ENV`, `OPENAI_API_KEY`, or `PROMPT_REFINERY_API_KEY` → OpenAI.
5. `ANTHROPIC_API_KEY` → Anthropic.
6. `OLLAMA_HOST` → Ollama.
7. Otherwise → heuristic.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PROMPT_REFINERY_PROVIDER` | `auto/heuristic/openai/anthropic/ollama` |
| `PROMPT_REFINERY_MODEL` | Model id; pin in production |
| `PROMPT_REFINERY_BASE_URL` | Provider base URL |
| `PROMPT_REFINERY_API_KEY_ENV` | Name of env var holding the key |
| `PROMPT_REFINERY_API_KEY` | Generic key (prefer provider-specific) |
| `OPENAI_API_KEY` | OpenAI key |
| `ANTHROPIC_API_KEY` | Anthropic key |
| `OLLAMA_HOST` | Ollama endpoint |
| `PROMPT_REFINERY_TIMEOUT_MS` | Request timeout, default 45000 |
| `PROMPT_REFINERY_MAX_TOKENS` | Output token limit |
| `PROMPT_REFINERY_JSON_MODE` | Send OpenAI `response_format` |
| `PROMPT_REFINERY_FALLBACK_TO_HEURISTIC` | Degrade to offline compiler on failure |

## OpenAI-compatible

Works with OpenAI, compatible gateways, vLLM, SGLang, TGI, LiteLLM, and OneAPI.

```bash
export PROMPT_REFINERY_PROVIDER=openai
export PROMPT_REFINERY_BASE_URL=https://api.openai.com/v1
export PROMPT_REFINERY_MODEL=your-model-id
export OPENAI_API_KEY=sk-...
prfy "Turn this into an executable agent task" --target agent
```

`baseUrl` should include the version path. The request goes to `${baseUrl}/chat/completions`.

Disable JSON mode if the endpoint rejects `response_format`:

```bash
export PROMPT_REFINERY_JSON_MODE=false
```

## Anthropic

```bash
export PROMPT_REFINERY_PROVIDER=anthropic
export PROMPT_REFINERY_MODEL=claude-...
export ANTHROPIC_API_KEY=...
prfy "Turn this into a research brief" --target research
```

## Ollama

```bash
ollama serve
ollama pull qwen2.5:7b-instruct
export PROMPT_REFINERY_PROVIDER=ollama
export PROMPT_REFINERY_MODEL=qwen2.5:7b-instruct
prfy "Turn this into an executable task"
```

Default endpoint: `http://127.0.0.1:11434`; requests go to `/api/chat` with `format: json`.

## Secrets

API keys are read from environment variables only. Config files should contain `apiKeyEnv`, not the key. `prfy config show` redacts the key. HTTP requests cannot override `baseUrl`, `model`, or `apiKey`, preventing request-level SSRF and credential abuse.

## Failure behavior

Provider failures return `PROVIDER_ERROR` (HTTP 502). If `fallbackToHeuristic` is enabled, the result is generated offline and marked with `meta.degraded: true`. Silent degradation is off by default.
