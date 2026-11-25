# Deployment and distribution

Requirements: Node.js 20+, no runtime dependencies, npm for installation. The offline compiler needs no network, key, or GPU.

## npm

```bash
npm install -g prompt-refinery@0.1.0
prompt-refinery --version
prfy --help
```

Or:

```bash
npx -y prompt-refinery@0.1.0 --help
```

Pin exact versions in CI.

## Homebrew / Scoop

Replace the SHA-256 placeholders in `packaging/`, publish to a tap/bucket, then install. Both depend on Node and do not ship a separate compiled binary.

## Script installers

`scripts/install.sh` and `scripts/install.ps1` check Node, run `npm install -g`, and verify `--version`. They do not download arbitrary binaries or run postinstall hooks.

## Enterprise

Use an internal npm mirror, pin versions, restrict providers, bind HTTP to loopback, and add TLS/token/rate limiting before remote exposure. Use local Ollama or a self-hosted endpoint for sensitive data. Never bake API keys into images.

## Upgrade and rollback

```bash
npm install -g prompt-refinery@0.1.1
npm install -g prompt-refinery@0.1.0
```

Read `CHANGELOG.md` and `docs/versioning.md` before upgrading.

## Health

```bash
prompt-refinery doctor
curl -s http://127.0.0.1:4317/healthz
```

`doctor` checks configuration and provider resolution without making a model call.
