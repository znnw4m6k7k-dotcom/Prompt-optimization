# 部署与分发

## 1. 运行要求

- Node.js 20+；
- 无运行时 npm 依赖；
- 需要 npm 仅用于安装/升级；
- HTTP/MCP 都通过同一个可执行文件启动。

离线编译器不需要网络、API Key 或 GPU。使用远程 Provider 时需要能访问对应端点。

## 2. npm（推荐）

```bash
npm install -g prompt-refinery@0.1.0
prompt-refinery --version
prfy --help
```

不全局安装，直接运行：

```bash
npx -y prompt-refinery@0.1.0 --help
```

CI 中锁定精确版本，不使用 `latest`。

## 3. Homebrew

1. 发布 npm tarball；
2. 计算 SHA-256；
3. 替换 `packaging/homebrew/prompt-refinery.rb` 中的 hash；
4. 放入 tap 仓库；
5. `brew install <owner>/tap/prompt-refinery`。

公式依赖 `node`，不下载预编译二进制。

## 4. Scoop

1. 发布 npm tarball；
2. 计算 SHA-256；
3. 替换 `packaging/scoop/prompt-refinery.json` 中的 hash；
4. 放入 bucket；
5. `scoop bucket add ... && scoop install prompt-refinery`。

Windows 下使用 `bin/prompt-refinery.cmd` 作为 shim。

## 5. 脚本安装

```bash
curl -fsSL .../scripts/install.sh | sh
```

```powershell
irm .../scripts/install.ps1 | iex
```

脚本只做三件事：检查 Node、执行 `npm install -g`、验证 `--version`。不下载任意二进制，不执行 postinstall。

## 6. 企业环境

- 使用内部 npm registry 镜像；
- 固定版本和完整性校验；
- 关闭不需要的 Provider；
- 将 HTTP 服务限制在回环地址；
- 如需共享服务，使用 TLS + token + 反向代理 + 限流；
- 对敏感数据使用本地 Ollama 或自建模型；
- 不在镜像层写入 API Key。

## 7. 升级与回滚

```bash
npm install -g prompt-refinery@0.1.1
```

回滚：

```bash
npm install -g prompt-refinery@0.1.0
```

升级前查看 `CHANGELOG.md` 和 `docs/versioning.zh-CN.md`。`0.x` 阶段仍需锁定精确版本。

## 8. 健康检查

```bash
prompt-refinery doctor
curl -s http://127.0.0.1:4317/healthz
```

`doctor` 只检查配置和 Provider 解析，不发起模型请求。

## 9. 发布产物校验

每个 Release 应包含：

- npm tarball；
- `SHA256SUMS`；
- changelog；
- npm provenance 证明。

部署前验证：

```bash
shasum -a 256 prompt-refinery-0.1.0.tgz
npm view prompt-refinery@0.1.0 dist.integrity
```
