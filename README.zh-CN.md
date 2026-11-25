# Prompt Refinery（提示词精炼厂）

把模糊需求编译成桌面 AI Agent 可以直接执行的提示词。

Prompt Refinery 是一个本地优先、模型无关的开源工具，提供三种一等接口：

- **CLI**：任何能执行 shell 的 Agent 都能调用。
- **HTTP JSON API**：适合桌面应用、浏览器扩展和本地服务。
- **MCP Server**：适合 Claude Desktop、Cursor 等支持 Model Context Protocol 的客户端。

它不绑定某一家模型：没有 API Key 时使用内置的确定性编译器离线工作；也可以接入 OpenAI 兼容接口、Anthropic 或 Ollama。服务本身不持久化提示词。

> 当前状态：`0.1.0` 参考实现。仓库已经准备好 npm、Homebrew、Scoop 和脚本安装方式；正式发布前请使用自己的 npm scope 或替换下载地址。本项目是独立开源项目，不隶属于任何桌面 AI 产品厂商。

## 它解决什么问题

普通 Agent 往往拿到一句模糊需求就立刻执行，于是只能猜。Prompt Refinery 在正式执行前插入一个**有边界**的步骤：

```text
原始草稿 → 校验 → 任务分析 → 提示词编译 → 质量评分 → 可执行提示词
```

这个工具**不执行任务**，也**不读取工作区**。它只返回增强后的提示词、修改说明、假设、待确认问题和确定性的质量评分。

## 快速开始

需要 Node.js 20 或更高版本。

```bash
npm install -g prompt-refinery

prfy "把这份推广费用表分析一下，写份报告给领导汇报" --target data
```

从标准输入读取，并输出机器可读 JSON：

```bash
cat draft.txt | prfy enhance --mode balanced --json
```

完全离线运行：

```bash
prfy "给 agent 写一个自动整理下载目录的任务" --provider heuristic
```

接入 OpenAI 兼容模型：

```bash
export OPENAI_API_KEY="..."
export PROMPT_REFINERY_MODEL="your-model-id"
prfy "把这段需求改成可执行的研究任务" --mode balanced
```

启动本地 HTTP API：

```bash
prfy serve --port 4317
curl -s http://127.0.0.1:4317/v1/enhance \
  -H 'content-type: application/json' \
  -d '{"prompt":"把这个需求整理成任务","target":"agent"}'
```

启动 MCP stdio 服务：

```bash
prfy mcp
```

MCP 客户端配置示例：

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

## 三种调用方式

| 接口 | 传输方式 | 适用场景 |
| --- | --- | --- |
| CLI | argv / stdin / stdout | 任何能执行命令的 Agent 或脚本 |
| HTTP | `POST /v1/enhance` | 桌面应用、浏览器扩展、本地服务 |
| MCP | stdio 上的 JSON-RPC | 支持 MCP 的桌面 AI 客户端 |

共用参数：

- `target`：`auto`、`general`、`code`、`writing`、`research`、`agent`、`data`、`image`
- `mode`：`fast` 一次改写；`balanced` 评分低时再修复；`quality` 生成两个候选后择优并修复
- `locale`：`auto`、`zh-CN`、`en`
- `maxChars`：建议输出长度

## 底层逻辑

```text
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ CLI / HTTP / │──▶│ 规范化与校验 │──▶│ 任务分析      │
│ MCP 适配层   │   │              │   │ 语言/类型/缺口│
└──────────────┘   └──────────────┘   └──────┬───────┘
                                             │
                       ┌─────────────────────▼─────────────────────┐
                       │ 编译器                                    │
                       │ 离线模板 或 instruction-tuned LLM          │
                       └─────────────────────┬─────────────────────┘
                                             │
                       ┌─────────────────────▼─────────────────────┐
                       │ 可选修复 / 候选择优                        │
                       └─────────────────────┬─────────────────────┘
                                             │
                       ┌─────────────────────▼─────────────────────┐
                       │ 确定性评分 + 结构化响应契约                │
                       └───────────────────────────────────────────┘
```

本项目**不训练基础大模型**。它是在 instruction-following、decoder-only Transformer 模型之上的编排层，并提供确定性离线兜底。未来小模型路线（LoRA + 偏好优化 + 量化）写在架构文档中，但不属于 v0.1.0 的实现范围。

关键原则：

1. **保留意图，不替用户做决定**：原始事实、数字、名称、语言和约束必须保留。
2. **补全任务结构**：目标、输入、执行步骤、输出契约、边界、完成标准。
3. **显式处理信息缺口**：缺少关键信息时提问或标注假设，不编造默认值。
4. **控制长度**：提示词不是越长越好；长提示会稀释关键约束。
5. **确定性评分**：用规则 rubric 检查结构，不把模型自评当作唯一质量依据。
6. **模型可替换**：推理后端是适配器，不是产品核心。

深入阅读：

- [架构与模型技术路线](docs/architecture.zh-CN.md)
- [模型选型依据](docs/model-selection.zh-CN.md)
- [HTTP API](docs/api.zh-CN.md)
- [MCP 集成](docs/mcp.zh-CN.md)
- [Provider 配置](docs/providers.zh-CN.md)
- [部署与分发](docs/deployment.zh-CN.md)
- [评测方法](docs/evaluation.zh-CN.md)
- [安全模型](docs/security.zh-CN.md)
- [版本管理](docs/versioning.zh-CN.md)
- [路线图](docs/roadmap.zh-CN.md)

## 安装方式

### npm / npx

```bash
npm install -g prompt-refinery
npx prompt-refinery --help
```

在 CI 中锁定版本：

```bash
npm install -g prompt-refinery@0.1.0
```

### Homebrew

模板位于 `packaging/homebrew/prompt-refinery.rb`。替换 npm tarball 的 SHA-256 并发布到 tap 后：

```bash
brew install <owner>/tap/prompt-refinery
```

### Scoop

模板位于 `packaging/scoop/prompt-refinery.json`。替换 hash 并发布到 bucket 后：

```powershell
scoop bucket add prompt-refinery https://github.com/<owner>/scoop-prompt-refinery
scoop install prompt-refinery
```

### 脚本安装

Unix：

```bash
curl -fsSL https://raw.githubusercontent.com/znnw4m6k7k-dotcom/Prompt-optimization/main/scripts/install.sh | sh
```

Windows PowerShell：

```powershell
irm https://raw.githubusercontent.com/znnw4m6k7k-dotcom/Prompt-optimization/main/scripts/install.ps1 | iex
```

脚本安装要求 Node.js 20+，内部委托给 npm，不执行任意 postinstall 代码。

## 配置

优先级：

```text
CLI 参数 > 环境变量 > 配置文件 > 默认值
```

默认配置路径：

- macOS/Linux：`~/.config/prompt-refinery/config.json`（或 `$XDG_CONFIG_HOME`）
- Windows：`%APPDATA%\prompt-refinery\config.json`

示例：

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

API Key 只从环境变量读取，不写入配置文件。详见 [Provider 配置](docs/providers.zh-CN.md)。

## 隐私与安全

- HTTP 服务默认只监听 `127.0.0.1`。
- 没有 Bearer Token 时拒绝绑定非回环地址。
- 服务不落盘、不记录提示词。
- 使用远程 Provider 时，草稿会发送给该 Provider；需要内网或离线时使用 `heuristic` 或本地 Ollama。
- 服务没有任何工具权限，不能读取工作区。
- 提示词文本被视为不可信数据，编译器提示中明确隔离指令通道。

完整威胁模型见 [SECURITY.zh-CN.md](SECURITY.zh-CN.md)。

## 开发

```bash
git clone https://github.com/znnw4m6k7k-dotcom/Prompt-optimization.git
cd prompt-refinery
npm link
npm test
npm run check
npm run eval
```

运行时零依赖，测试使用 Node.js 内置 test runner。

## 目录结构

```text
bin/                 可执行入口
src/core/            分析器、编译器提示、离线模板、评分器、编排器
src/providers/       OpenAI 兼容、Anthropic、Ollama 适配器
src/server.js        HTTP API
src/mcp.js           MCP stdio 服务
src/cli.js           CLI 解析与命令
schemas/             JSON Schema
openapi/             OpenAPI 3.1 契约
packaging/           Homebrew 与 Scoop 模板
evals/               黄金测试集
scripts/             安装与评测脚本
docs/                架构、API、模型选型、安全文档
.github/             CI、发布流程、Issue 模板
```

## 贡献

欢迎贡献新的 target profile、Provider 适配器、评测用例和文档翻译。请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

Apache-2.0。明确的专利授权和宽松条款适合被商业桌面客户端集成。选择理由见 [许可证说明](docs/licensing.zh-CN.md)，全文见 [LICENSE](LICENSE) 与 [NOTICE](NOTICE)。
