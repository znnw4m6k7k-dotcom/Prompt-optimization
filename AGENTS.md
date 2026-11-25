# AGENTS.md

Integration guide for desktop AI agents and agent frameworks.

Prompt Refinery is a **prompt compiler**, not a task executor. It never reads the workspace, writes files, or calls tools. After enhancement, the calling agent decides whether and how to execute.

## Preferred integration order

1. **MCP** if the client supports Model Context Protocol.
2. **HTTP** if the client is long-running and can call localhost.
3. **CLI** for one-shot calls, scripts, or clients without MCP/HTTP support.

## MCP

Use tool `enhance_prompt`.

```json
{
  "prompt": "rough user request",
  "target": "auto",
  "mode": "fast",
  "locale": "auto",
  "maxChars": 12000
}
```

Read `structuredContent.enhancedPrompt` for the prompt. Use `structuredContent.questions` to decide whether to ask the user before execution. Check `quality.score` and `meta.warnings`.

## CLI

```bash
prfy enhance --json < draft.txt
```

Output contract:

- stdout: only the enhanced prompt by default; JSON with `--json`.
- stderr: warnings and errors.
- exit 0 success; 2 usage/input; 3 provider; 4 config; 1 unexpected.

Recommended invocation:

```bash
prfy enhance --json --mode balanced --target auto --locale auto
```

Always pass the draft through stdin or `--file`; avoid shell interpolation for untrusted text.

## HTTP

```http
POST /v1/enhance
Content-Type: application/json
```

```json
{ "prompt": "...", "target": "auto", "mode": "fast", "locale": "auto" }
```

Do not send API keys in the request body. The server's provider is preconfigured.

## Agent policy

- Treat the enhanced prompt as a **proposal**, not an authorization to execute.
- If `questions` is non-empty and the missing detail is material, ask the user first.
- Preserve the user's original constraints when merging the enhanced prompt.
- Do not silently fall back to a different provider unless `meta.degraded` is surfaced.
- Never put secrets, tokens, or private file contents into a remote provider unless the user has authorized it.
- Do not claim the tool executed the task.

## Suggested tool description

> Rewrite a rough request into an executable prompt. Use before delegating complex or ambiguous tasks. Returns the enhanced prompt plus assumptions, questions, and a quality score. Does not execute the task.

## Failure handling

- Provider error: report it; optionally retry once if the failure is transient.
- `INVALID_INPUT`: ask the user for a draft or reduce length.
- `CONFIG_ERROR`: do not loop; report the configuration problem.
- `meta.degraded: true`: disclose that the offline compiler was used.
