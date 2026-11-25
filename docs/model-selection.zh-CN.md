# 模型选型依据

## 1. 选型目标不是“最强”，而是“够用且稳定”

提示词增强是一个**中等上下文、中短输出、强格式约束**的任务。它不需要模型会解高难数学题，但非常依赖：

- 不改变用户意图；
- 不编造事实；
- 稳定输出 JSON；
- 中文表达自然；
- 延迟低、成本可控；
- 数据合规。

因此，模型能力过剩会带来成本和延迟浪费，能力不足则表现为结构残缺、意图漂移或 JSON 解析失败。

## 2. 评分公式

建议按以下加权评分选型：

```text
score(model) =
  0.30 × intent_preservation
+ 0.15 × json_stability
+ 0.15 × language_quality
+ 0.15 × latency
+ 0.10 × cost
+ 0.05 × context_window
+ 0.10 × compliance
```

每项归一化到 0–1。权重可按产品阶段调整：

- 桌面交互：提高 latency 权重；
- 批量处理：提高 cost 权重；
- 法务/医疗/金融：提高 compliance 权重，必要时只允许本地模型。

## 3. 模型档位

| 档位 | 典型形态 | 适用任务 | 优点 | 风险 |
| --- | --- | --- | --- | --- |
| 规则编译器 | 无模型 | 简单、结构清楚、离线 | 零成本、零延迟、稳定 | 语义能力有限 |
| 小模型 | 7B–14B instruct，4-bit 量化 | 短提示、个人使用、隐私场景 | 本地、低成本 | 复杂约束容易漏 |
| 中型通用模型 | 30B–70B 级或 frontier 小模型 | 大多数日常增强 | 质量/成本平衡 | 需要云端或较强本地硬件 |
| 强通用模型 | frontier 通用模型 | 长文档、多约束、复杂 Agent 任务 | 意图保持和结构更好 | 成本、延迟、数据出境 |
| 推理模型 | 带长思考的模型 | 多阶段规划、复杂约束 | 复杂任务更强 | 慢、贵，简单任务浪费 |

具体模型家族可选 Qwen、Llama、Mistral、DeepSeek、GPT、Claude、GLM、Kimi 等，但**不要按榜单直接选**。同一家族不同版本、量化方式、推理框架都会显著影响 JSON 稳定性和中文质量。

## 4. 场景推荐

### 个人桌面、离线优先

```text
Provider: ollama
Model: 7B–14B instruct，Q4_K_M 或同等量化
Mode: fast
```

适合：笔记整理、邮件改写、简单代码任务、个人知识管理。

### 企业内网、数据不出域

```text
Provider: OpenAI-compatible（自建 vLLM/SGLang/TGI）
Model: 经过评测的 14B–32B instruct
Mode: balanced
```

要求：有 GPU 资源、能做并发和超时控制、有内部评测集。

### SaaS 产品、追求稳定

```text
Provider: OpenAI-compatible
Model: 中型通用模型或 frontier 小模型
Mode: fast 默认，复杂任务 balanced
```

要求：按租户做限流、记录用量、设置预算上限、敏感数据脱敏。

### 复杂 Agent 任务

```text
Provider: 强通用模型
Mode: balanced 或 quality
Target: agent
```

重点不是写得更长，而是明确工具权限、停止条件、不可逆操作审批和失败重试上限。

## 5. 路由策略

`0.1.0` 不做自动多模型路由；`auto` 只决定“使用已配置 Provider 还是离线编译器”。后续路由可按以下规则：

```text
if no provider or no network: heuristic
else if len(draft) < 600 and complexity <= 3: small model, fast
else if complexity <= 6: mid model, balanced
else: strong model, quality
```

路由必须可解释、可回退，并记录命中的规则，不能黑盒决定。

## 6. 评测门槛

候选模型进入默认配置前，至少通过：

| 指标 | 门槛 |
| --- | --- |
| JSON 可解析率 | ≥ 99% |
| 意图保持率 | ≥ 95% |
| 事实新增率（编造） | ≤ 1% |
| rubric 平均分 | ≥ 80 |
| 人工偏好胜率 | ≥ 55%（相对基线） |
| p95 延迟 | 符合产品预算 |
| 单次成本 | 符合产品预算 |

评测集必须覆盖中英文、七种 target、长草稿、缺信息、带注入文本和超长输出场景。

## 7. 当前默认值

| Provider | 默认模型 | 说明 |
| --- | --- | --- |
| heuristic | `deterministic-v1` | 离线规则编译器 |
| openai | `gpt-4.1-mini` | 仅为示例默认值，生产必须显式配置 |
| anthropic | `claude-3-5-haiku-latest` | 仅为示例默认值，生产必须显式配置 |
| ollama | `qwen2.5:7b-instruct` | 本地入门配置 |

默认模型会随生态变化调整。生产部署应通过 `PROMPT_REFINERY_MODEL` 固定版本，不要依赖“latest”。

## 8. 为什么不做“模型投票”

多模型投票会增加成本、延迟和故障面，而提示词增强的收益主要来自结构补全，不是模型间差异。只有在高价值、低并发场景，才值得用 `quality` 模式做候选生成；不建议默认开启。
