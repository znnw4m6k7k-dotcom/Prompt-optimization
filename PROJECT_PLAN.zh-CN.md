# Prompt Refinery 项目方案

## 1. 项目定义

**一句话**：把模糊的用户需求编译成桌面 AI Agent 可直接执行的提示词。

**目标用户**：

- 桌面 AI 客户端用户：希望“一句话需求”也能得到稳定结果；
- Agent 开发者：需要在执行前增加一个可观测、可回退的提示词优化步骤；
- 企业内网用户：需要离线或本地模型方案；
- 工具厂商：希望通过 MCP/CLI/HTTP 快速集成提示词增强能力。

**非目标**：

- 不做通用 Agent 框架；
- 不执行任务、不调用工具、不读取工作区；
- 不保证下游任务一定成功；
- 不默认收集提示词或训练数据。

## 2. 核心交互

```text
用户草稿
   │
   ├─ CLI: prfy enhance --json
   ├─ HTTP: POST /v1/enhance
   └─ MCP: tools/call enhance_prompt
          │
          ▼
   规范化 → 任务分析 → 编译 → 质量评分
          │
          ▼
 enhancedPrompt + changes + assumptions + questions + quality
          │
          ▼
 调用方决定：直接展示 / 追问用户 / 交给下游 Agent 执行
```

关键设计：**增强与执行分离**。工具只返回提示词，执行权在调用方。

## 3. 技术架构

### 3.1 分层

| 层 | 模块 | 职责 |
| --- | --- | --- |
| 接口层 | `src/cli.js`, `src/server.js`, `src/mcp.js` | 参数、鉴权、协议、错误码 |
| 编排层 | `src/core/enhancer.js` | 模式、候选、修复、降级 |
| 分析层 | `src/core/analyzer.js` | 语言、目标、复杂度、缺口 |
| 编译层 | `src/core/heuristic.js`, `src/core/llm.js` | 离线模板 / LLM 改写 |
| 模型层 | `src/providers/*` | OpenAI 兼容、Anthropic、Ollama |
| 质量层 | `src/core/rubric.js` | 结构化评分与 warning |
| 契约层 | `schemas/`, `openapi/` | JSON Schema、OpenAPI 3.1 |

### 3.2 数据流

1. 校验输入长度、参数和 Content-Type；
2. 分析语言、target、复杂度和信息缺口；
3. `heuristic` 或 LLM 编译；
4. `balanced/quality` 按需修复或候选选择；
5. 100 分 rubric 评分；
6. 返回结构化结果。

### 3.3 模型架构与优化原理

本项目不训练基础模型。它把 instruction-following、decoder-only Transformer 作为可替换推理后端：

```text
P(y | x) = Π P(y_t | x, y_<t)
```

- 通过 supervised instruction tuning 学会遵循改写指令；
- 通过偏好优化改善格式遵循和意图保持；
- 通过 JSON 输出契约和确定性 rubric 约束结果；
- 通过 fast/balanced/quality 控制质量与成本。

优化目标不是“更长”，而是在约束下最大化质量：

```text
max Q(p | d)
s.t. intent(p)=intent(d), facts(p)⊆facts(d),
     len(p)≤L, cost(p)≤C, latency(p)≤T
```

详细模型选型见 [model-selection.zh-CN.md](docs/model-selection.zh-CN.md)，架构见 [architecture.zh-CN.md](docs/architecture.zh-CN.md)。

## 4. 接口方案

### CLI

```bash
prfy enhance --json < draft.txt
```

默认 stdout 只输出增强后的提示词；`--json` 输出完整元数据。退出码：0 成功、2 输入/用法、3 Provider、4 配置、1 未知错误。

### HTTP

```http
POST /v1/enhance
Content-Type: application/json
```

默认 `127.0.0.1:4317`；非回环绑定必须有 Bearer token。请求不接受 `baseUrl`、`model`、`apiKey`，避免 SSRF 和凭据滥用。

### MCP

stdio JSON-RPC，工具 `enhance_prompt`，支持 `2024-11-05`、`2025-03-26`、`2025-06-18`。stdout 只写协议消息，日志写 stderr。

## 5. 安装与分发

| 方式 | 命令 | 适用 |
| --- | --- | --- |
| npm 全局 | `npm i -g prompt-refinery` | 通用 |
| npx | `npx -y prompt-refinery` | 免安装、CI |
| Homebrew | `brew install <tap>/prompt-refinery` | macOS/Linux |
| Scoop | `scoop install prompt-refinery` | Windows |
| 脚本 | `curl .../install.sh \| sh` | 快速安装 |

分发原则：

- Node 20+，运行时零依赖；
- 无 postinstall；
- 锁定版本；
- npm provenance；
- Release 附 tarball + SHA-256。

## 6. 质量与评测

自动指标：结构完整率、JSON 可解析率、rubric 平均分、长度合规率、p50 延迟。

人工指标：意图保持、事实新增、下游追问减少、成对偏好。

当前黄金集 12 条，覆盖中英文、七种 target、缺失信息和提示注入；`npm run eval` 输出通过率、平均分和延迟。

## 7. 版本与许可证

- SemVer 2.0.0；
- HTTP `/v1` 路径版本；
- MCP 工具名稳定，字段只增不改；
- 废弃至少保留一个 MINOR 周期；
- Apache-2.0：宽松 + 明确专利授权，适合商业桌面客户端集成。

## 8. 社区结构

```text
.github/             CI、发布、Issue/PR 模板
CONTRIBUTING.md      开发、测试、扩展指南
CODE_OF_CONDUCT.md   行为准则
SECURITY.md          漏洞报告
docs/adr/            架构决策记录
docs/                中英文接口与设计文档
evals/               可复现评测集
packaging/           包管理器模板
```

贡献路径：

- 新 target profile；
- 新 Provider；
- 评测用例；
- 文档翻译；
- 安装包维护；
- 安全审计。

## 9. 交付阶段

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| v0.1.0 | 核心、三接口、测试、文档、分发模板 | 已完成 |
| v0.2.0 | 100+ 评测、路由、重试/熔断 | 计划 |
| v0.3.0 | 7B–14B LoRA/DPO 小模型实验 | 计划 |
| v1.0.0 | 协议冻结、正式分发、治理 | 计划 |

## 10. 验收标准

- `npm test` 全部通过；
- `npm run eval` 通过率 ≥ 90%；
- CLI、HTTP、MCP 从 npm tarball 安装后可运行；
- 无运行时依赖；
- 非回环无 token 拒绝启动；
- 文档相对链接无断链；
- 许可证、版本、发布流程齐全。

## 11. 风险与对策

| 风险 | 对策 |
| --- | --- |
| 模型改变用户意图 | 评测集 + 人工抽检 + 保守提示 |
| 结构评分被刷高 | rubric 只作回归门槛，不替代语义评估 |
| 远程模型泄露数据 | 默认离线，远程需显式配置 |
| API 被滥用 | 回环默认、token、body 限制 |
| 包名/分发被抢注 | 发布前锁定 npm scope 与 tap/bucket |
| 提示注入 | 数据/指令隔离、无工具权限、下游审批 |
