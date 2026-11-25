# Packaging

These templates are release inputs, not live package-manager entries.

## Before publishing

1. Publish `prompt-refinery@X.Y.Z` to npm.
2. Download `https://registry.npmjs.org/prompt-refinery/-/prompt-refinery-X.Y.Z.tgz`.
3. Compute SHA-256:
   - macOS/Linux: `sha256sum prompt-refinery-X.Y.Z.tgz`
   - Windows: `Get-FileHash .\prompt-refinery-X.Y.Z.tgz -Algorithm SHA256`
4. Replace `REPLACE_WITH_NPM_TARBALL_SHA256` in the Homebrew formula and Scoop manifest.
5. Update versions in both templates.
6. Publish to a Homebrew tap / Scoop bucket.

Do not commit a real hash for an unpublished tarball. npm repacks if source files change.

## Homebrew

The formula installs the npm tarball contents into `libexec`, depends on `node`, and symlinks `prompt-refinery` and `prfy`.

## Scoop

The manifest depends on `nodejs`, extracts the npm tarball, and shims the Windows `.cmd` wrapper.

## Verification

```bash
brew audit --strict --new-formula prompt-refinery
brew install --build-from-source prompt-refinery
prompt-refinery --version
```

```powershell
scoop install .\prompt-refinery.json
prompt-refinery --version
```
