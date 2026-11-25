# Versioning and releases

Semantic Versioning 2.0.0:

- `MAJOR`: incompatible CLI/HTTP/MCP behavior;
- `MINOR`: backward-compatible features;
- `PATCH`: backward-compatible fixes.

During `0.x`, incompatible changes may occur in a minor release and must be called out in `CHANGELOG.md`. Pin exact versions in production.

## Interface versions

- HTTP: `/v1` path; backward-compatible changes only within `v1`.
- MCP: `enhance_prompt` is stable; add fields/tools rather than breaking existing ones.
- CLI: commands and flags are stable; deprecations get at least one minor cycle.

## Deprecation

Mark in changelog, document a replacement, emit a runtime warning, keep for at least one minor cycle, then remove with the appropriate version bump.

## Release checklist

- [ ] `npm test`
- [ ] `npm run check`
- [ ] `npm run eval` meets baseline
- [ ] update `CHANGELOG.md`
- [ ] bump `package.json`
- [ ] update OpenAPI `info.version`
- [ ] update Homebrew/Scoop version and hashes
- [ ] tag `vX.Y.Z`
- [ ] GitHub Release with npm tarball and SHA-256
- [ ] npm publish with provenance
- [ ] smoke test `npx prompt-refinery@X.Y.Z --version` and MCP handshake

## Compatibility

- CLI default output stays prompt-only; metadata only via `--json`.
- HTTP response fields are additive.
- Error codes are additive; existing semantics do not change.
- Env vars are additive; deprecated names keep working with a warning.
