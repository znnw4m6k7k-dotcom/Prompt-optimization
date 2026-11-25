# ADR 0003: Offline compiler as baseline

- Status: accepted
- Date: 2026-11-25

## Context

Prompt enhancement should work without an API key, network, or GPU. It also needs a deterministic baseline for tests and regression measurement.

## Decision

Implement a rule-based compiler that produces a structured prompt from target profiles. It is the default when no provider is configured, an optional fallback, and the baseline for evaluation.

## Consequences

- Zero-cost, zero-latency, offline operation.
- Stable output for tests.
- Limited semantic understanding.
- The LLM path must demonstrate measurable improvement over this baseline.

## Alternatives considered

- Require an LLM: better semantics, but no offline mode and higher barrier.
- Tiny local model only: hardware-dependent and harder to test deterministically.
