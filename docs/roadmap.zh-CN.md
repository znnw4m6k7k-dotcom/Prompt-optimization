# 路线图

## v0.1.0 — 参考实现（当前）

- 确定性离线编译器；
- OpenAI-compatible / Anthropic / Ollama Provider；
- fast / balanced / quality；
- CLI、HTTP、MCP；
- 七种 target profile；
- 确定性 rubric；
- JSON Schema、OpenAPI、测试与评测脚本；
- npm / Homebrew / Scoop / 脚本安装模板。

## v0.2.0 — 评测与路由

- 扩充中英文黄金集到 100+；
- 意图保持与事实新增标注；
- 按复杂度/语言/target 的可解释路由；
- Provider 级重试与熔断；
- 成本与 token 预算；
- 结构化输出失败率监控；
- 更完整的 Windows 测试。

## v0.3.0 — 小模型实验

- 7B–14B instruct 基座；
- LoRA/QLoRA 微调；
- DPO 偏好对；
- GGUF 量化；
- 与通用 Provider 的同集对比；
- 端侧加载与内存评估。

## v1.0.0 — 稳定协议

- CLI/HTTP/MCP 契约冻结；
- API `v1` 兼容性承诺；
- 发布治理与安全响应流程；
- 多语言文档；
- 包管理器正式分发；
- 稳定的评测基线。

## 明确不做

- 不做通用 Agent 框架；
- 不接管工具调用；
- 不默认收集提示词；
- 不承诺“提示词保证正确结果”；
- 不追求模型数量最大化。
