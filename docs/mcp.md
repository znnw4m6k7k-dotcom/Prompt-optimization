# MCP integration

Prompt Refinery exposes an MCP server over stdio. JSON-RPC messages are read from stdin and responses are written to stdout. Logs go to stderr only.

```bash
prfy mcp
```

## Client configuration

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

For local development:

```json
{
  "mcpServers": {
    "prompt-refinery": {
      "command": "node",
      "args": ["/absolute/path/to/prompt-refinery/bin/prompt-refinery.js", "mcp"],
      "env": { "PROMPT_REFINERY_PROVIDER": "heuristic" }
    }
  }
}
```

## Tool: `enhance_prompt`

Input:

```json
{
  "prompt": "Turn this into an executable agent task",
  "target": "agent",
  "mode": "fast",
  "locale": "en",
  "maxChars": 12000
}
```

Output:

- `content[0].text`: the enhanced prompt, for text-only clients.
- `structuredContent`: the full result, including changes, assumptions, questions, quality, and meta.
- `isError`: whether the tool call failed.

The tool advertises `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: false`, `openWorldHint: true`. It does not modify the workspace; it may call an external model provider.

## Protocol

- JSON-RPC 2.0 over newline-delimited stdio.
- Supports `initialize`, `ping`, `tools/list`, `tools/call`.
- Protocol versions: `2024-11-05`, `2025-03-26`, `2025-06-18`.
- Unknown method: `-32601`; invalid params: `-32602`.
- Tool business failures use `isError: true` inside a successful JSON-RPC result.

## Smoke test

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke"}}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  | PROMPT_REFINERY_PROVIDER=heuristic prfy mcp
```

Do not expose secrets in shared client configuration. When a remote provider is used, the draft leaves the machine.
