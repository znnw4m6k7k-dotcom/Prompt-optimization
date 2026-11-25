# 版本管理与发布

## 1. 版本号

遵循 [Semantic Versioning 2.0.0](https://semver.org/)：

```text
MAJOR.MINOR.PATCH
```

- `MAJOR`：不兼容的 CLI 参数、HTTP 契约或 MCP 行为变化；
- `MINOR`：向后兼容的新功能（新 target、新 Provider、新端点）；
- `PATCH`：向后兼容的修复、文档和性能改进。

`0.x` 阶段：

- 仍遵循 SemVer 语义，但 API 可能在小版本中调整；
- 任何不兼容变更必须在 `CHANGELOG.md` 中显式标注；
- 生产使用应锁定精确版本。

## 2. 接口版本

- **HTTP**：路径版本 `/v1`。`/v1` 内只做向后兼容变更。
- **MCP**：工具名 `enhance_prompt` 稳定；输入字段只增不改；必要时新增工具而不是破坏旧工具。
- **CLI**：命令和 flags 稳定；废弃 flag 至少保留一个 MINOR 周期，并在 stderr 提示。

## 3. 废弃流程

1. 在 `CHANGELOG.md` 标记 deprecated；
2. 文档给出替代方案；
3. 运行时输出 warning；
4. 至少一个 MINOR 周期后移除；
5. 移除时提升 MAJOR（`0.x` 提升 MINOR）。

## 4. 发布清单

- [ ] `npm test` 通过；
- [ ] `npm run check` 通过；
- [ ] `npm run eval` 不低于基线；
- [ ] 更新 `CHANGELOG.md`；
- [ ] 更新 `package.json` 版本；
- [ ] 更新 OpenAPI `info.version`；
- [ ] 更新 Homebrew / Scoop 模板的版本和 hash；
- [ ] 打 tag `vX.Y.Z`；
- [ ] GitHub Release 附 npm tarball 和 SHA-256；
- [ ] npm 发布启用 provenance；
- [ ] 发布后跑一次 `npx prompt-refinery@X.Y.Z --version` 和 MCP smoke test。

## 5. 分支与提交

- `main` 始终可发布；
- 功能分支 `feat/<slug>`；
- 修复分支 `fix/<slug>`；
- 文档分支 `docs/<slug>`；
- 提交使用 Conventional Commits：`feat:`、`fix:`、`docs:`、`test:`、`refactor:`、`chore:`。

## 6. 兼容性承诺

- CLI 默认输出只包含增强后的提示词，便于管道；新增元数据只能通过 `--json`。
- HTTP 成功响应字段只增不删；新增字段必须可选。
- 错误码只增不改；已有错误码语义不变。
- 环境变量只增不删；废弃时保留旧名并 warning。
