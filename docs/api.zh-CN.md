# HTTP API

默认地址：`http://127.0.0.1:4317`

```bash
prfy serve
```

## 鉴权

默认不鉴权，因为只监听回环地址。

绑定非回环地址时必须设置 token，否则服务拒绝启动：

```bash
export PROMPT_REFINERY_SERVER_TOKEN="$(openssl rand -hex 32)"
prfy serve --host 0.0.0.0 --port 4317
```

请求头：

```http
Authorization: Bearer <token>
```

`GET /healthz` 和 `GET /v1/capabilities` 不要求鉴权；`/v1/*` 在配置 token 后要求鉴权。生产环境应放在 TLS 反向代理后面。

## POST /v1/enhance

请求：

```json
{
  "prompt": "把这份推广费用表分析一下，写份报告给领导汇报",
  "target": "data",
  "mode": "fast",
  "locale": "zh-CN",
  "maxChars": 12000
}
```

字段：

| 字段 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- |
| prompt | 是 | string | 1–20,000 字符 |
| target | 否 | enum | `auto/general/code/writing/research/agent/data/image` |
| mode | 否 | enum | `fast/balanced/quality` |
| locale | 否 | enum | `auto/zh-CN/en` |
| maxChars | 否 | integer | 500–60,000，建议上限 |

成功响应：`200`

```json
{
  "requestId": "8f3f0f4e-...",
  "enhancedPrompt": "你是严谨的数据分析师……",
  "changes": ["补充了分析步骤", "增加了输出契约"],
  "assumptions": [],
  "questions": ["分析口径和时间范围是什么？"],
  "provider": "heuristic",
  "model": "deterministic-v1",
  "mode": "fast",
  "quality": {
    "score": 93,
    "band": "excellent",
    "dimensions": [
      { "id": "objective", "label": "目标明确度", "score": 20, "max": 20, "note": "检测到目标章节" }
    ],
    "warnings": []
  },
  "meta": {
    "version": "0.1.0",
    "target": "data",
    "locale": "zh-CN",
    "complexity": 2,
    "missing": ["audience"],
    "durationMs": 4,
    "usage": null,
    "warnings": []
  }
}
```

## 其他端点

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/healthz` | 存活检查 |
| GET | `/v1/capabilities` | 可用 target、mode、Provider、限制 |
| GET | `/openapi.yaml` | OpenAPI 3.1 契约 |

## 错误格式

```json
{
  "error": {
    "code": "INVALID_OPTION",
    "message": "target must be one of: ..."
  },
  "requestId": "..."
}
```

| HTTP | code | 场景 |
| ---: | --- | --- |
| 400 | `INVALID_JSON` / `INVALID_INPUT` / `INVALID_OPTION` | 请求格式或参数错误 |
| 401 | `UNAUTHORIZED` | token 缺失或错误 |
| 413 | `PAYLOAD_TOO_LARGE` / `INPUT_TOO_LARGE` | body 超过 1 MB 或 prompt 过长 |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | 非 `application/json` |
| 502 | `PROVIDER_ERROR` / `INVALID_MODEL_OUTPUT` | 上游模型失败 |
| 500 | `CONFIG_ERROR` | 配置错误 |

## curl 示例

```bash
curl -s http://127.0.0.1:4317/v1/enhance \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $PROMPT_REFINERY_SERVER_TOKEN" \
  -d '{
    "prompt": "把这份会议纪要整理成给客户看的项目周报",
    "target": "writing",
    "mode": "balanced",
    "locale": "zh-CN"
  }' | jq -r '.enhancedPrompt'
```

## 安全建议

- 不要直接暴露到公网。
- 必须远程访问时启用 token + TLS + 反向代理限流。
- 不要在 URL 或日志中传递 token。
- 服务不记录提示词；反向代理也不应记录 body。
- 不要把 `baseUrl` 暴露为请求级参数，避免 SSRF。
