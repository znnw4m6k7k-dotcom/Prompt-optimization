# Provider 配置

Prompt Refinery 通过统一接口适配不同模型后端：

- `heuristic`：内置确定性编译器，离线；
- `openai`：任意 OpenAI-compatible `/chat/completions`；
- `anthropic`：Anthropic Messages API；
- `ollama`：本地 Ollama；
- `auto`：按环境自动选择。

## 选择顺序

`provider: auto`：

1. 配置了 `baseUrl`：
   - 包含 `11434` 或 `/ollama` → Ollama；
   - host 包含 `anthropic` → Anthropic；
   - 其他 → OpenAI-compatible。
2. `PROMPT_REFINERY_API_KEY_ENV` → OpenAI-compatible。
3. `OPENAI_API_KEY` 或 `PROMPT_REFINERY_API_KEY` → OpenAI。
4. `ANTHROPIC_API_KEY` → Anthropic。
5. `OLLAMA_HOST` → Ollama。
6. 都没有 → `heuristic`。

显式设置 `PROMPT_REFINERY_PROVIDER` 可以覆盖自动选择。

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `PROMPT_REFINERY_PROVIDER` | `auto/heuristic/openai/anthropic/ollama` |
| `PROMPT_REFINERY_MODEL` | 模型 ID；生产必须固定 |
| `PROMPT_REFINERY_BASE_URL` | Provider base URL |
| `PROMPT_REFINERY_API_KEY_ENV` | API Key 所在环境变量名 |
| `PROMPT_REFINERY_API_KEY` | 通用 API Key（不建议长期使用） |
| `OPENAI_API_KEY` | OpenAI 默认 Key |
| `ANTHROPIC_API_KEY` | Anthropic 默认 Key |
| `OLLAMA_HOST` | Ollama 地址 |
| `PROMPT_REFINERY_TIMEOUT_MS` | 请求超时，默认 45000 |
| `PROMPT_REFINERY_MAX_TOKENS` | 最大输出 token |
| `PROMPT_REFINERY_JSON_MODE` | OpenAI-compatible 是否发送 `response_format` |
| `PROMPT_REFINERY_FALLBACK_TO_HEURISTIC` | Provider 失败时是否降级 |

## OpenAI-compatible

适用于 OpenAI、Azure OpenAI 兼容网关、vLLM、SGLang、TGI、LiteLLM、OneAPI 等。

```bash
export PROMPT_REFINERY_PROVIDER=openai
export PROMPT_REFINERY_BASE_URL=https://api.openai.com/v1
export PROMPT_REFINERY_MODEL=your-model-id
export OPENAI_API_KEY=sk-...
prfy "把这个需求改成可执行任务" --target agent
```

自建无鉴权端点：

```bash
export PROMPT_REFINERY_BASE_URL=http://127.0.0.1:8000/v1
export PROMPT_REFINERY_MODEL=your-local-model
unset OPENAI_API_KEY
```

`baseUrl` 应包含版本路径（如 `/v1`），实际请求为 `${baseUrl}/chat/completions`。

如果 Provider 不支持 `response_format: {"type":"json_object"}`，设置：

```bash
export PROMPT_REFINERY_JSON_MODE=false
```

## Anthropic

```bash
export PROMPT_REFINERY_PROVIDER=anthropic
export PROMPT_REFINERY_MODEL=claude-...
export ANTHROPIC_API_KEY=...
prfy "Turn this into an executable research brief" --target research
```

默认 base URL 为 `https://api.anthropic.com/v1`。

## Ollama

```bash
ollama serve
ollama pull qwen2.5:7b-instruct

export PROMPT_REFINERY_PROVIDER=ollama
export PROMPT_REFINERY_MODEL=qwen2.5:7b-instruct
prfy "整理这个需求" --target general
```

默认地址 `http://127.0.0.1:11434`，请求 `${baseUrl}/api/chat`，并启用 `format: json`。

## 配置文件

```json
{
  "provider": "openai",
  "model": "your-model-id",
  "baseUrl": "https://api.openai.com/v1",
  "timeoutMs": 45000,
  "jsonMode": true,
  "fallbackToHeuristic": false
}
```

API Key 不要写入配置文件。使用环境变量或 `apiKeyEnv` 指向的环境变量。

## 密钥处理

- 服务不读取或打印密钥；
- `prfy config show` 只显示 `apiKeyEnv` 名称，不显示值；
- 错误信息不包含 Authorization header；
- HTTP API 不接受请求级 `apiKey`、`baseUrl`、`model`，避免 SSRF 和凭据滥用。

## 超时与降级

- 默认超时 45 秒；
- 超时返回 `PROVIDER_ERROR`（HTTP 502）；
- 设置 `PROMPT_REFINERY_FALLBACK_TO_HEURISTIC=true` 后，Provider 失败会返回离线编译器结果，并在 `meta.degraded` 标记；
- 生产环境建议保留失败可见性，不要默认静默降级。
