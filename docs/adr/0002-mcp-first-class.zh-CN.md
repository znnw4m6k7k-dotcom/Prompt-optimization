# ADR 0002：MCP 作为一等接口

- 状态：已接受
- 日期：2026-11-25

## 背景

桌面 AI 客户端越来越普遍地支持 MCP，但很多 Agent 只能执行 shell 或调用 HTTP。只支持一种传输会排除大量集成场景。

## 决策

CLI、HTTP、MCP 共享同一核心。MCP 使用 stdio，只暴露一个工具 `enhance_prompt`。stdout 只写 JSON-RPC，日志写 stderr。

## 后果

- MCP 客户端无需自定义胶水即可安装；
- 需要协议级测试；
- 工具输出同时支持纯文本和结构化内容客户端；
- CLI 仍是通用兜底。

## 备选方案

- 只做 MCP：简单，但排除 shell Agent；
- 只做 HTTP：需要守护进程和端口管理。
