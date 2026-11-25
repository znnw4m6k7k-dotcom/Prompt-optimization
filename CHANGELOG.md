# Changelog

All notable changes to this project are documented here. The format follows Keep a Changelog and the project uses Semantic Versioning.

## [Unreleased]

## [0.1.0] - 2026-11-25

### Added

- Deterministic offline prompt compiler with seven target profiles.
- Model-agnostic providers: OpenAI-compatible, Anthropic, Ollama.
- `fast`, `balanced`, and `quality` enhancement modes.
- Deterministic 100-point quality rubric with warnings.
- CLI with stdin, file, JSON output, config, doctor, serve, and MCP commands.
- Local HTTP API with `/v1/enhance`, capability discovery, bearer auth, and request limits.
- MCP stdio server exposing `enhance_prompt`.
- JSON Schemas and OpenAPI 3.1 contract.
- Evaluation harness and bilingual golden cases.
- npm, Homebrew, Scoop, and script installation templates.
- CI matrix and release workflow.
- Architecture, model selection, API, MCP, provider, security, evaluation, versioning, and roadmap docs.

### Security

- Loopback-only default bind.
- Refuses non-loopback bind without a token.
- API keys from environment only.
- No prompt persistence or logging.
- No runtime dependencies and no postinstall scripts.
