#!/usr/bin/env sh
set -eu

PACKAGE="${PROMPT_REFINERY_PACKAGE:-prompt-refinery}"
VERSION="${PROMPT_REFINERY_VERSION:-latest}"
MIN_NODE_MAJOR=20

fail() {
  printf 'error: %s\n' "$1" >&2
  exit 1
}

command -v node >/dev/null 2>&1 || fail "Node.js is required. Install Node.js ${MIN_NODE_MAJOR}+ first."
command -v npm >/dev/null 2>&1 || fail "npm is required. Install Node.js ${MIN_NODE_MAJOR}+ first."

node -e "
const major = Number(process.versions.node.split('.')[0]);
if (!Number.isFinite(major) || major < ${MIN_NODE_MAJOR}) {
  console.error('Node.js ${MIN_NODE_MAJOR}+ is required; found ' + process.version);
  process.exit(1);
}
" || fail "Unsupported Node.js version."

printf 'Installing %s@%s...\n' "$PACKAGE" "$VERSION"
npm install --global "$PACKAGE@$VERSION"

if command -v prompt-refinery >/dev/null 2>&1; then
  printf 'Installed: '
  prompt-refinery --version
else
  fail "Install finished, but prompt-refinery is not on PATH. Check npm's global bin directory."
fi

printf '\nTry:\n  prfy "把你的需求写得更清楚" --target auto\n'
