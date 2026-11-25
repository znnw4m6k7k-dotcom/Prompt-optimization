# Security model

## Assets

Drafts (possibly confidential), provider API keys, server token, generated prompts, and metadata. The tool itself does not access the filesystem.

## Trust boundary

```text
MCP client / CLI / HTTP  (untrusted input)
        │
        ▼
Prompt Refinery  (text transformation, no tools)
        │  only when a remote provider is configured
        ▼
Model provider
```

## Threats and mitigations

| Threat | Mitigation |
| --- | --- |
| Local HTTP abuse | Loopback by default; optional bearer token |
| Accidental public bind | Refuse non-loopback bind without a token |
| Memory exhaustion | 1 MB body limit; 20k character prompt limit |
| Prompt injection | Draft isolated in JSON data; no tools; explicit system rule |
| System prompt leakage | Prompt forbids disclosure; output is text only |
| API key leakage | Keys from env only; config summary redacts |
| SSRF | HTTP API does not accept `baseUrl`, `model`, or `apiKey` |
| Supply chain | Zero runtime dependencies; no postinstall; lockfile; npm provenance |

## Data flow

`heuristic` stays local. OpenAI-compatible and Anthropic send the draft to the configured endpoint. Ollama sends it to the configured local or intranet endpoint. The service does not persist prompts or log request bodies.

## Prompt injection

The draft may contain attempts to override instructions. It is treated as data, not an instruction channel. The compiler prompt forbids disclosure and scope changes. Because the service has no file, network, or command tools, the blast radius is limited to generated text. Prompt injection is not fully eliminable; do not use this as a security filter.

## Deployment

Use loopback by default. For remote access, use TLS, a reverse proxy, bearer auth, and rate limiting. Use local models for sensitive data. Rotate keys and never commit them.

Report vulnerabilities according to [SECURITY.md](../SECURITY.md).
