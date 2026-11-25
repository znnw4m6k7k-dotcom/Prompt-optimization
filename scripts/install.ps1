$ErrorActionPreference = "Stop"

$Package = if ($env:PROMPT_REFINERY_PACKAGE) { $env:PROMPT_REFINERY_PACKAGE } else { "prompt-refinery" }
$Version = if ($env:PROMPT_REFINERY_VERSION) { $env:PROMPT_REFINERY_VERSION } else { "latest" }
$MinNodeMajor = 20

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js is required. Install Node.js $MinNodeMajor+ first."
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm is required. Install Node.js $MinNodeMajor+ first."
}

$NodeMajor = [int](node -p "process.versions.node.split('.')[0]")
if ($NodeMajor -lt $MinNodeMajor) {
  throw "Node.js $MinNodeMajor+ is required; found $(node --version)."
}

Write-Host "Installing $Package@$Version..."
npm install --global "$Package@$Version"
if ($LASTEXITCODE -ne 0) {
  throw "npm install failed with exit code $LASTEXITCODE."
}

prompt-refinery --version
Write-Host ""
Write-Host "Try:"
Write-Host '  prfy "Turn this rough request into an executable prompt" --target auto'
