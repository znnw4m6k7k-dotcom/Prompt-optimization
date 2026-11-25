# HTTP API

Default base URL: `http://127.0.0.1:4317`

```bash
prfy serve
```

The server binds to loopback by default. If a token is configured, `/v1/*` requires `Authorization: Bearer <token>`. Non-loopback binding is refused without a token. Put remote deployments behind TLS and a reverse proxy.

## POST /v1/enhance

```json
{
  "prompt": "Analyze the attached campaign spend and write an executive report.",
  "target": "data",
  "mode": "fast",
  "locale": "en",
  "maxChars": 12000
}
```

Fields:

| Field | Required | Notes |
| --- | --- | --- |
| prompt | yes | 1–20,000 characters |
| target | no | `auto/general/code/writing/research/agent/data/image` |
| mode | no | `fast/balanced/quality` |
| locale | no | `auto/zh-CN/en` |
| maxChars | no | 500–60,000 advisory limit |

Response `200`:

```json
{
  "requestId": "8f3f0f4e-...",
  "enhancedPrompt": "You are a rigorous data analyst...",
  "changes": ["Added analysis steps", "Added output contract"],
  "assumptions": [],
  "questions": ["What time range should the analysis cover?"],
  "provider": "heuristic",
  "model": "deterministic-v1",
  "mode": "fast",
  "quality": {
    "score": 93,
    "band": "excellent",
    "dimensions": [],
    "warnings": []
  },
  "meta": {
    "version": "0.1.0",
    "target": "data",
    "locale": "en",
    "complexity": 2,
    "missing": ["audience"],
    "durationMs": 4,
    "usage": null,
    "warnings": []
  }
}
```

## Other endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/healthz` | Liveness |
| GET | `/v1/capabilities` | Targets, modes, provider, limits |
| GET | `/openapi.yaml` | OpenAPI 3.1 contract |

## Errors

```json
{
  "error": { "code": "INVALID_OPTION", "message": "target must be one of: ..." },
  "requestId": "..."
}
```

Status codes: 400 input/JSON, 401 auth, 413 body/input too large, 415 media type, 502 provider failure, 500 config.

## curl

```bash
curl -s http://127.0.0.1:4317/v1/enhance \
  -H 'content-type: application/json' \
  -d '{"prompt":"Turn this into an executable task","target":"agent"}' \
  | jq -r '.enhancedPrompt'
```

Do not expose the service publicly without authentication, TLS, and rate limiting. The request schema intentionally does not accept `baseUrl`, `apiKey`, or `model`, to avoid request-level SSRF and credential abuse.
