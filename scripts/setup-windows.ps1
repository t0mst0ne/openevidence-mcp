$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..")
Set-Location $RepoRoot

npm install
npm run build

Write-Host "Setup complete."
Write-Host "Next: paste browser cookies into cookies.json and run: npm run login"
