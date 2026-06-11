if (Test-Path .env.local.backup) {
  Copy-Item .env.local.backup .env -Force
  Write-Host "Restored .env.local.backup to .env."
} else {
  Write-Host ".env.local.backup was not found."
}
