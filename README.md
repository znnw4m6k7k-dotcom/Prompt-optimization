# Prompt Refinery

Turn rough requests into executable prompts for desktop AI agents.

Prompt Refinery is a small, local-first prompt compiler with three first-class interfaces:

- **CLI** for any agent that can execute a shell command.
- **HTTP JSON API** for apps, extensions, and remote development environments.
- **MCP server** for Claude Desktop, Cursor, and other Model Context Protocol clients.

It is model-agnostic: use the built-in deterministic compiler offline, or connect an OpenAI-compatible endpoint, Anthropic, or Ollama. Prompts are not persisted by the service.

> Status: `0.1.0` reference implementation. The package is prepared for npm and package-manager distribution; publish it under your own scope before using registry install commands in production. This is an independent open-source project and is not affiliated with any desktop AI product vendor.

## Why

Most agents accept a one-line request and immediately start executing. When the request is vague, the agent guesses. Prompt Refinery inserts one bounded step before execution:

```text
rough draft -> normalize -> analyze -> compile -> rubric check -> executable prompt
```

The tool **does not execute the request** and **does not access the workspace**. It only returns a better prompt plus change notes, assumptions, questions, and a deterministic quality score.

## Quick start

Requires Node.js 20 or newer.

```bash
npm install -g prompt-refinery

prfy "把这份推广费用表分析一下，写份报告给领导汇报" --target data
```

Read a draft from stdin and return machine-readable JSON:

```bash
cat draft.txt | prfy enhance --mode balanced --json
```

Run entirely offline with the deterministic compiler:

```bash
prfy "给 agent 写一个自动整理下载目录的任务" --provider heuristic
```

Connect an OpenAI-compatible model:

```bash
export OPENAI_API_KEY="..."
export PROMPT_REFINERY_MODEL="your-model-id"
prfy "Turn this into an executable research brief" --mode balanced
```

Start the local HTTP API:

```bash
prfy serve --port 4317
curl -s http://127.0.0.1:4317/v1/enhance \
  -H 'content-type: application/json' \
  -d '{"prompt":"把这个需求整理成任务","target":"agent"}'
```

Start an MCP server over stdio:

```bash
prfy mcp
```

Example MCP client configuration:

```json
{
  "mcpServers": {
    "prompt-refinery": {
      "command": "npx",
      "args": ["-y", "prompt-refinery", "mcp"],
      "env": {
        "PROMPT_REFINERY_PROVIDER": "heuristic"
      }
    }
  }
}
```

## Interfaces

| Interface | Transport | Best for |
| --- | --- | --- |
| CLI | argv / stdin / stdout | Any shell-capable agent or script |
| HTTP | `POST /v1/enhance` | Desktop apps, browser extensions, local services |
| MCP | JSON-RPC over stdio | MCP-compatible desktop AI clients |

All interfaces share the same core options: `target`, `mode`, `locale`, and `maxChars`.

Targets: `auto`, `general`, `code`, `writing`, `research`, `agent`, `data`, `image`.

Modes:

- `fast`: one rewrite pass.
- `balanced`: rewrite, then repair only when the deterministic rubric is below threshold.
- `quality`: generate two candidates, select by rubric, then repair if still weak.

## How it works

```text
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ CLI / HTTP / │──▶│ Normalizer   │──▶│ Analyzer      │
│ MCP adapter  │   │ validation   │   │ target/locale │
└──────────────┘   └──────────────┘   └──────┬───────┘
                                             │
                       ┌─────────────────────▼─────────────────────┐
                       │ Compiler                                  │
                       │ offline templates OR instruction-tuned LLM│
                       └─────────────────────┬─────────────────────┘
                                             │
                       ┌─────────────────────▼─────────────────────┐
                       │ Optional repair / candidate selection     │
                       └─────────────────────┬─────────────────────┘
                                             │
                       ┌─────────────────────▼─────────────────────┐
                       │ Deterministic rubric + response contract  │
                       └───────────────────────────────────────────┘
```

The project does not train a foundation model. It uses a model-agnostic orchestration layer over instruction-following, decoder-only Transformer models, with a deterministic offline fallback. A future small-model track (LoRA + preference optimization + quantization) is described in the architecture docs but is not part of v0.1.0.

Read more:

- [Architecture and model strategy](docs/architecture.md)
- [Model selection](docs/model-selection.md)
- [HTTP API](docs/api.md)
- [MCP integration](docs/mcp.md)
- [Providers](docs/providers.md)
- [Deployment](docs/deployment.md)
- [Evaluation](docs/evaluation.md)
- [Security model](docs/security.md)
- [Versioning](docs/versioning.md)
- [Roadmap](docs/roadmap.md)

## Installation

### npm / npx

```bash
npm install -g prompt-refinery
npx prompt-refinery --help
```

Pin a version in CI:

```bash
npm install -g prompt-refinery@0.1.0
```

### Homebrew

A formula template lives at `packaging/homebrew/prompt-refinery.rb`. Replace the tarball SHA-256, publish it to a tap, then:

```bash
brew install <owner>/tap/prompt-refinery
```

### Scoop

A manifest template lives at `packaging/scoop/prompt-refinery.json`. Replace the hash, publish it to a bucket, then:

```powershell
scoop bucket add prompt-refinery https://github.com/<owner>/scoop-prompt-refinery
scoop install prompt-refinery
```

### Script installer

Unix:

```bash
curl -fsSL https://raw.githubusercontent.com/znnw4m6k7k-dotcom/Prompt-optimization/main/scripts/install.sh | sh
```

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/znnw4m6k7k-dotcom/Prompt-optimization/main/scripts/install.ps1 | iex
```

The script installers require Node.js 20+ and delegate to npm. They do not run arbitrary post-install code.

## Configuration

Configuration precedence:

```text
CLI flags > environment variables > config file > defaults
```

Default config path:

- macOS/Linux: `~/.config/prompt-refinery/config.json` (or `$XDG_CONFIG_HOME`)
- Windows: `%APPDATA%\prompt-refinery\config.json`

Example:

```json
{
  "provider": "openai",
  "model": "your-model-id",
  "baseUrl": "https://api.openai.com/v1",
  "target": "auto",
  "mode": "fast",
  "timeoutMs": 45000,
  "server": {
    "host": "127.0.0.1",
    "port": 4317
  }
}
```

API keys are read from environment variables only. See [Providers](docs/providers.md).

## Privacy and security

- The HTTP server binds to `127.0.0.1` by default.
- Non-loopback binding is refused unless a bearer token is configured.
- Prompts are not written to disk or logged by the service.
- When a remote provider is configured, the draft is sent to that provider. Use `heuristic` or a local Ollama endpoint for air-gapped use.
- The service has no tool access and cannot read the workspace.
- Treat prompt text as untrusted data; the compiler prompt explicitly isolates it from the instruction channel.

See [SECURITY.md](SECURITY.md) for the threat model and reporting process.

## Development

```bash
git clone https://github.com/znnw4m6k7k-dotcom/Prompt-optimization.git
cd prompt-refinery
npm link
npm test
npm run check
npm run eval
```

No runtime dependencies. Tests use the Node.js built-in test runner.

## Project structure

```text
bin/                 executable entry points
src/core/            analyzer, prompts, heuristic compiler, rubric, orchestrator
src/providers/       OpenAI-compatible, Anthropic, Ollama adapters
src/server.js        HTTP API
src/mcp.js           MCP stdio server
src/cli.js           CLI parser and commands
schemas/             JSON Schemas
openapi/             OpenAPI 3.1 contract
packaging/           Homebrew and Scoop templates
evals/               golden cases
scripts/             installers and evaluation runner
docs/                architecture, API, model selection, security
.github/             CI, release workflow, issue templates
```

## Contributing

Contributions are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md). Good first issues include new target profiles, provider adapters, evaluation cases, and documentation translations.

## License

Apache-2.0. The explicit patent grant and permissive terms fit infrastructure that may be embedded in commercial desktop clients. See [license rationale](docs/licensing.md), [LICENSE](LICENSE), and [NOTICE](NOTICE).
