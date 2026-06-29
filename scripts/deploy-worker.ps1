Write-Host "Deploying FbReels Auth Worker..."
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $scriptDir "..\worker")

try {
    npx wrangler deploy
    Write-Host ""
    Write-Host "Done! Note your worker URL (e.g., https://fb-reels-auth.xxxx.workers.dev)"
    Write-Host "Then update __WORKER_URL__ in src/main.js, src/remote.js, and service.js"
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}
