# ADR 0002: MCP as a first-class interface

- Status: accepted
- Date: 2026-11-25

## Context

Desktop AI clients increasingly support MCP, but many agents can only run shell commands or call HTTP. Supporting only one transport would exclude a large class of integrations.

## Decision

Treat CLI, HTTP, and MCP as first-class interfaces over the same core. MCP uses stdio and exposes one tool, `enhance_prompt`. stdout is reserved for JSON-RPC; logs go to stderr.

## Consequences

- MCP clients can install the tool without custom glue.
- Protocol tests are required.
- Tool output must support both text-only and structured-content clients.
- The CLI remains the universal fallback.

## Alternatives considered

- MCP-only: simpler, but excludes shell-based agents.
- HTTP-only: requires a daemon and port management.
