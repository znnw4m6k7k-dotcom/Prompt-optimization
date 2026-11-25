# MCP 集成

Prompt Refinery 通过 **stdio** 提供 MCP Server，适合桌面 AI 客户端直接安装和调用。

## 启动

```bash
prfy mcp
```

协议消息从 stdin 读取，响应写到 stdout。日志只写 stderr，不会污染 JSON-RPC 通道。

Provider 配置与 CLI 相同，通过环境变量或配置文件设置。

## 客户端配置

### 发布后使用 npx

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

使用云端模型：

```json
{
  "mcpServers": {
    "prompt-refinery": {
      "command": "npx",
      "args": ["-y", "prompt-refinery", "mcp"],
      "env": {
        "PROMPT_REFINERY_PROVIDER": "openai",
        "PROMPT_REFINERY_MODEL": "your-model-id",
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

### 本地开发

```json
{
  "mcpServers": {
    "prompt-refinery": {
      "command": "node",
      "args": ["/absolute/path/to/prompt-refinery/bin/prompt-refinery.js", "mcp"],
      "env": {
        "PROMPT_REFINERY_PROVIDER": "heuristic"
      }
    }
  }
}
```

不同客户端的配置文件位置不同，请放到其 MCP 配置入口；不要修改本项目的示例路径为相对路径。

## Tool：`enhance_prompt`

输入：

```json
{
  "prompt": "把这个需求整理成 Agent 可执行的任务",
  "target": "agent",
  "mode": "fast",
  "locale": "zh-CN",
  "maxChars": 12000
}
```

输出包含：

- `content[0].text`：增强后的提示词，便于只读文本的客户端使用；
- `structuredContent`：完整结果，含 changes、assumptions、questions、quality、meta；
- `isError`：工具执行是否失败。

`annotations` 声明：

```json
{
  "readOnlyHint": true,
  "destructiveHint": false,
  "idempotentHint": false,
  "openWorldHint": true
}
```

`readOnlyHint` 表示不修改用户环境；`openWorldHint` 表示可能访问外部模型服务。

## 协议细节

- JSON-RPC 2.0，一行一个消息；
- 支持 `initialize`、`ping`、`tools/list`、`tools/call`；
- 协议版本：`2024-11-05`、`2025-03-26`、`2025-06-18`；
- 不支持批量请求；
- 未知方法返回 `-32601`；
- 参数错误返回 `-32602`；
- 工具业务失败返回 `isError: true`，不是 JSON-RPC 错误。

## 手工测试

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke"}}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  | PROMPT_REFINERY_PROVIDER=heuristic prfy mcp
```

## 安全边界

- MCP 客户端授予本工具的权限应仅为“读取/调用”；
- 工具不访问文件系统、不调用其他工具；
- 使用远程模型时，草稿会离开本机；
- 不要把 API Key 写进共享的客户端配置仓库；
- 工具返回的提示词可能包含用户原文，客户端应按敏感数据处理。
