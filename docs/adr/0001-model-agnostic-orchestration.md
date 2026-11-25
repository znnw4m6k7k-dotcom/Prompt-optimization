# ADR 0001: Model-agnostic orchestration

- Status: accepted
- Date: 2026-11-25

## Context

Desktop agents need prompt enhancement, but model availability, cost, latency, and data-residency requirements differ. Coupling the product to one vendor would make local/offline and self-hosted deployments impossible.

## Decision

Define a small provider contract and keep all product contracts (CLI, HTTP, MCP, schemas) independent of the model. Ship OpenAI-compatible, Anthropic, and Ollama adapters. Use a deterministic compiler when no provider is available.

## Consequences

- One stable interface across providers.
- More adapter code and provider-specific error handling.
- Quality varies by model; evaluation must be provider-specific.
- No vendor lock-in.

## Alternatives considered

- Single vendor SDK: simpler, but violates local/private deployment goals.
- Train a proprietary model: high cost and no evidence it is needed for v0.1.0.
